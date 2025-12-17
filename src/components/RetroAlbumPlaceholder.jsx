import React from 'react';

// Retro album art placeholder with vintage vinyl/cassette aesthetic
export default function RetroAlbumPlaceholder({ className = "", size = 300 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 300 300"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Gradient Background - Vintage Sunset */}
            <defs>
                <linearGradient id="vintageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff6b6b" />
                    <stop offset="50%" stopColor="#ee5a6f" />
                    <stop offset="100%" stopColor="#c44569" />
                </linearGradient>

                <linearGradient id="vinylGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a1a2e" />
                    <stop offset="100%" stopColor="#0f0f1e" />
                </linearGradient>

                <radialGradient id="vinylShine">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
                </radialGradient>
            </defs>

            {/* Background */}
            <rect width="300" height="300" fill="url(#vintageGradient)" />

            {/* Retro Grid Pattern */}
            <g opacity="0.15">
                {[...Array(10)].map((_, i) => (
                    <React.Fragment key={i}>
                        <line
                            x1="0"
                            y1={i * 30}
                            x2="300"
                            y2={i * 30}
                            stroke="#ffffff"
                            strokeWidth="1"
                        />
                        <line
                            x1={i * 30}
                            y1="0"
                            x2={i * 30}
                            y2="300"
                            stroke="#ffffff"
                            strokeWidth="1"
                        />
                    </React.Fragment>
                ))}
            </g>

            {/* Vinyl Record */}
            <g transform="translate(150, 150)">
                {/* Outer vinyl */}
                <circle r="100" fill="url(#vinylGradient)" />

                {/* Grooves */}
                {[...Array(20)].map((_, i) => (
                    <circle
                        key={i}
                        r={95 - i * 4}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="0.5"
                        opacity="0.3"
                    />
                ))}

                {/* Center label */}
                <circle r="30" fill="#1a1a2e" />
                <circle r="28" fill="#ff6b6b" />

                {/* Center hole */}
                <circle r="8" fill="#0f0f1e" />

                {/* Shine effect */}
                <circle r="100" fill="url(#vinylShine)" />

                {/* Music note icon */}
                <g transform="scale(0.8)" opacity="0.9">
                    <path
                        d="M -8,-15 L -8,15 M -8,15 Q -8,20 -3,20 Q 2,20 2,15 Q 2,10 -3,10 Q -8,10 -8,15 M 8,-20 L 8,10 M 8,10 Q 8,15 13,15 Q 18,15 18,10 Q 18,5 13,5 Q 8,5 8,10 M -8,-15 L 8,-20"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </g>

            {/* Retro Text */}
            <text
                x="150"
                y="270"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="14"
                fontFamily="monospace"
                fontWeight="bold"
                opacity="0.7"
            >
                NO ALBUM ART
            </text>

            {/* Scanlines effect */}
            <g opacity="0.05">
                {[...Array(150)].map((_, i) => (
                    <line
                        key={i}
                        x1="0"
                        y1={i * 2}
                        x2="300"
                        y2={i * 2}
                        stroke="#000000"
                        strokeWidth="1"
                    />
                ))}
            </g>
        </svg>
    );
}
