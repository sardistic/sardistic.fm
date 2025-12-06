import React from 'react';

function GlassDistortionFilter() {
    return (
        <svg
            style={{
                position: 'absolute',
                width: 0,
                height: 0,
                pointerEvents: 'none'
            }}
            aria-hidden="true"
        >
            <defs>
                <filter id="glass-distortion" x="-50%" y="-50%" width="200%" height="200%">
                    {/* Create turbulence noise */}
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.015 0.02"
                        numOctaves="4"
                        seed="2"
                        result="turbulence"
                    />

                    {/* Displace the source graphic using the turbulence */}
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="turbulence"
                        scale="8"
                        xChannelSelector="R"
                        yChannelSelector="G"
                        result="displacement"
                    />

                    {/* Blend with original for subtlety */}
                    <feBlend
                        in="displacement"
                        in2="SourceGraphic"
                        mode="normal"
                    />
                </filter>

                <filter id="glass-distortion-strong" x="-50%" y="-50%" width="200%" height="200%">
                    {/* Stronger distortion variant */}
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.02 0.025"
                        numOctaves="5"
                        seed="5"
                        result="turbulence"
                    />

                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="turbulence"
                        scale="15"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </defs>
        </svg>
    );
}

export default GlassDistortionFilter;
