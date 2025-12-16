import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAudioReactive } from './AudioReactiveContext';

const vertexShaderSource = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;       // Mouse Position (0..1)
uniform float lowFreq;     
uniform float midFreq;     
uniform float highFreq;    
uniform float rawLow;      
uniform float lineThickness;

// Color uniforms
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;

varying vec2 vUv;

// ----------------------------------------------------------------------
// NOISE / GRAIN FUNCTIONS
// ----------------------------------------------------------------------
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float res = mix(mix(hash(i + vec2(0.0, 0.0)), 
                      hash(i + vec2(1.0, 0.0)), f.x),
                  mix(hash(i + vec2(0.0, 1.0)), 
                      hash(i + vec2(1.0, 1.0)), f.x), f.y);
  return res;
}

// ----------------------------------------------------------------------
// GLOW LINE FUNCTION (The "Blur" / "Glow" look)
// ----------------------------------------------------------------------
float glowLine(float y, float targetY, float thickness) {
  float dist = abs(y - targetY);
  return 0.002 / (dist + 0.0001) * thickness;
}

// ----------------------------------------------------------------------
// BULGE FUNCTION
// ----------------------------------------------------------------------
float getBulge(float x, float targetX, float w) {
  float d = abs(x - targetX);
  return smoothstep(w, 0.0, d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = fragCoord.xy / iResolution.xy;
  vec2 uv = p;
  uv.x *= iResolution.x / iResolution.y;
  
  // Aspect corrected mouse
  vec2 m = iMouse * vec2(iResolution.x / iResolution.y, 1.0);
  
  // ----------------------------------------------------------------------
  // BACKGROUND - Fading to Black
  // ----------------------------------------------------------------------
  // Start with almost pure black, tiny gradient at center
  vec3 bg = vec3(0.0, 0.0, 0.01) * (1.0 - abs(p.y - 0.5) * 1.5);
  
  // MOUSE INTERACTION DISTANCE
  // Calculate influence of mouse (more focused now)
  float mouseForce = 0.0;
  if (iMouse.x > 0.0) { 
     float d = distance(uv, m);
     mouseForce = smoothstep(0.15, 0.0, d); // Tighter 0.15 radius (focused)
  }

  // ----------------------------------------------------------------------
  // 5 NEON GLOW LINES with BULGES & MOUSE INTERACTION
  // ----------------------------------------------------------------------
  
  // Mouse displaces lines downwards/upwards
  float mouseDisp = mouseForce * 0.15 * sin(uv.x * 20.0 + iTime * 4.0); // Tighter wave for focus

  // 1. SUB BASS (Purple/Red)
  float pos1 = 0.5 + 0.4 * sin(iTime * 0.3); 
  // Bulge: increased base (0.8) so it's visible without audio
  float bulge1 = 1.0 + 3.0 * getBulge(uv.x, pos1, 0.2) * (0.8 + lowFreq * 0.5);
  // FIX: Modulate Amplitude (sin * (base + freq)) instead of adding offset (+ freq)
  float y1 = 0.2 + mouseDisp * 0.8 + sin(uv.x * 2.0 + iTime * 0.5) * (0.05 + lowFreq * 0.05);
  float g1 = glowLine(p.y, y1, lineThickness * (1.0 + lowFreq) * bulge1);
  
  // 2. KICK (Orange)
  float pos2 = 0.5 + 0.4 * sin(iTime * 0.4 + 2.0);
  float bulge2 = 1.0 + 4.0 * getBulge(uv.x, pos2, 0.15) * (0.8 + rawLow * 0.5); 
  float y2 = 0.35 + mouseDisp * 1.0 + sin(uv.x * 3.0 - iTime * 0.6) * (0.04 + rawLow * 0.05);
  float g2 = glowLine(p.y, y2, lineThickness * (1.0 + rawLow) * bulge2);
  
  // 3. MID (Gold)
  float pos3 = 0.5 + 0.4 * sin(iTime * 0.25 + 4.0);
  float bulge3 = 1.0 + 3.0 * getBulge(uv.x, pos3, 0.2) * (0.8 + midFreq * 0.5);
  float y3 = 0.5 + mouseDisp * 1.2 + sin(uv.x * 4.0 + iTime * 0.4) * (0.04 + midFreq * 0.05);
  float g3 = glowLine(p.y, y3, lineThickness * (1.0 + midFreq) * bulge3);
  
  // 4. HIGH MID (Cyan)
  float pos4 = 0.5 + 0.4 * sin(iTime * 0.35 + 1.0);
  float bulge4 = 1.0 + 2.5 * getBulge(uv.x, pos4, 0.25) * (0.8 + highFreq * 0.5);
  float mixHighMid = (midFreq + highFreq) * 0.5;
  float y4 = 0.65 + mouseDisp * 1.0 + sin(uv.x * 5.0 - iTime * 0.3) * (0.03 + mixHighMid * 0.05);
  float g4 = glowLine(p.y, y4, lineThickness * (1.0 + highFreq) * bulge4);
  
  // 5. HIGH (Blue)
  float pos5 = 0.5 + 0.4 * sin(iTime * 0.2 + 3.0);
  float bulge5 = 1.0 + 2.5 * getBulge(uv.x, pos5, 0.25) * (0.8 + highFreq * 0.5);
  float y5 = 0.8 + mouseDisp * 0.8 + sin(uv.x * 6.0 + iTime * 0.2) * (0.03 + highFreq * 0.05);
  float g5 = glowLine(p.y, y5, lineThickness * (1.0 + highFreq) * bulge5);
  
  // Mix
  vec3 finalColor = bg;
  
  // Add Lines
  finalColor += g1 * color1 * 0.6;
  finalColor += g2 * color2 * 0.6;
  finalColor += g3 * color3 * 0.6;
  finalColor += g4 * color4 * 0.6;
  finalColor += g5 * color5 * 0.6;
  
  // ----------------------------------------------------------------------
  // REDUCED NOISE & VIGNETTE
  // ----------------------------------------------------------------------
  // Visible but subtle grain (Reduced from 0.15 to 0.04)
  float grain = hash(uv * iTime * 10.0);
  
  // Only add grain where there is light to keep blacks black? 
  // User wanted "gradient to fading black", so we keep edges clean.
  finalColor += vec3(grain) * 0.04; 
  
  // Also distort the glow slightly with noise (Blur artifact)
  // finalColor *= 0.9 + 0.2 * noise(uv * 50.0 + iTime); // Removed for darker background

  // Heavy Vignette to ensure Fading Black
  float vig = 1.0 - length(p - 0.5) * 0.7;
  vig = smoothstep(0.0, 0.8, vig);
  finalColor *= vig;

  fragColor = vec4(finalColor, 1.0);
}

void main() {
  vec2 fragCoord = vUv * iResolution;
  vec4 fragColor;
  mainImage(fragColor, fragCoord);
  gl_FragColor = fragColor;
}
`;

const ShaderBackground = () => {
  const containerRef = useRef(null);
  const { isListening, audioStateRef } = useAudioReactive();
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!containerRef.current) return;

    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const uniforms = {
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      iTime: { value: 0 },
      iMouse: { value: new THREE.Vector2(0, 0) }, // Mouse Uniform
      lowFreq: { value: 0 },
      midFreq: { value: 0 },
      highFreq: { value: 0 },
      rawLow: { value: 0 },
      lineThickness: { value: 1.5 }, // Controls Glow Radius

      // Neon Palette
      color1: { value: new THREE.Vector3(1.0, 0.2, 0.5) }, // Neon Pink
      color2: { value: new THREE.Vector3(1.0, 0.6, 0.1) }, // Neon Orange
      color3: { value: new THREE.Vector3(1.0, 0.9, 0.2) }, // Neon Gold
      color4: { value: new THREE.Vector3(0.1, 1.0, 0.8) }, // Neon Cyan
      color5: { value: new THREE.Vector3(0.2, 0.4, 1.0) }, // Neon Blue
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShaderSource,
      fragmentShader: fragmentShaderSource,
      uniforms: uniforms,
      blending: THREE.AdditiveBlending // Crucial for multi-line glow
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    // MOUSE LISTENER
    const handleMouseMove = (e) => {
      // Normalize mouse to 0..1
      uniforms.iMouse.value.x = e.clientX / window.innerWidth;
      uniforms.iMouse.value.y = 1.0 - (e.clientY / window.innerHeight); // Flip Y for GLSL
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Elastic Physics
    let active = true;
    let time = 0;
    let valLow = 0, valMid = 0, valHigh = 0;

    const animate = () => {
      if (!active) return;

      // Calculate average volume for speed modulation
      const volume = (valLow + valMid + valHigh) / 3.0;
      // Base speed (0.002) + Volume Boost (up to 0.02)
      time += 0.002 + (volume * 0.02);

      let targetLow = 0, targetMid = 0, targetHigh = 0;
      if (isListeningRef.current && audioStateRef.current) {
        const bands = audioStateRef.current.bands;
        // MAXIMUM SENSITIVITY BOOST
        targetLow = Math.min(bands.bass * 7.0, 4.0);
        targetMid = Math.min(bands.mid * 6.0, 4.0);
        targetHigh = Math.min(bands.treble * 6.0, 4.0);
      }

      if (Math.abs(targetLow - valLow) < 0.05) targetLow = valLow;
      if (Math.abs(targetMid - valMid) < 0.05) targetMid = valMid;
      if (Math.abs(targetHigh - valHigh) < 0.05) targetHigh = valHigh;

      const smooth = (curr, target) => {
        const diff = Math.abs(target - curr);
        return diff > 0.3 ? 0.2 : 0.05;
      };

      valLow += (targetLow - valLow) * smooth(valLow, targetLow);
      valMid += (targetMid - valMid) * smooth(valMid, targetMid);
      valHigh += (targetHigh - valHigh) * smooth(valHigh, targetHigh);

      uniforms.iTime.value = time;
      uniforms.lowFreq.value = valLow;
      uniforms.midFreq.value = valMid;
      uniforms.highFreq.value = valHigh;
      uniforms.rawLow.value = targetLow;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      material.dispose();
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

export default ShaderBackground;
