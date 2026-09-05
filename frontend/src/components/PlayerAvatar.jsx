import React from "react";

const colors = [
    "#ef4444", 
    "#3b82f6", 
    "#22c55e", 
    "#eab308", 
    "#a855f7", 
    "#f97316", 
    "#ec4899",
    "#06b6d4" 
];

function PlayerAvatar({ index, size = 50 }) 
{
    const bodyColor = colors[index];

    const renderFace = () => {
        switch (index) {
            case 0:
                return (
                    <g>
                        <circle cx="40" cy="45" r="6" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="40" cy="45" r="2.5" fill="#111" />
                        <circle cx="60" cy="45" r="6" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="60" cy="45" r="2.5" fill="#111" />
                        <path d="M 40 65 Q 50 75 60 65" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                );
            case 1: 
                return (
                    <g>
                        <circle cx="50" cy="45" r="12" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="50" cy="45" r="5" fill="#111" />
                        <line x1="45" y1="70" x2="55" y2="70" stroke="#111" strokeWidth="3" strokeLinecap="round" />
                    </g>
                );
            case 2:
                return (
                    <g>
                        <path d="M 28 40 L 72 40 L 67 55 L 55 55 L 50 45 L 45 55 L 33 55 Z" fill="#111" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M 45 70 Q 50 75 55 70" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                );
            case 3: // Derp (Googly Eyes)
                return (
                    <g>
                        <circle cx="38" cy="45" r="7" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="35" cy="43" r="2.5" fill="#111" />
                        <circle cx="62" cy="45" r="7" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="65" cy="47" r="2.5" fill="#111" />
                        <circle cx="50" cy="70" r="4" fill="#111" />
                    </g>
                );
            case 4:
                return (
                    <g>
                        <line x1="33" y1="45" x2="47" y2="45" stroke="#111" strokeWidth="3" strokeLinecap="round" />
                        <line x1="53" y1="45" x2="67" y2="45" stroke="#111" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="50" cy="65" r="3.5" fill="#111" />
                    </g>
                );
            case 5:
                return (
                    <g>
                        <path d="M 33 45 Q 40 38 47 45" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <circle cx="60" cy="45" r="6" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="60" cy="45" r="2.5" fill="#111" />
                        <path d="M 40 65 Q 50 75 60 65" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                );
            case 6:
                return (
                    <g>
                        <circle cx="50" cy="35" r="5" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="50" cy="35" r="2" fill="#111" />
                        <circle cx="35" cy="52" r="5" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="35" cy="52" r="2" fill="#111" />
                        <circle cx="65" cy="52" r="5" fill="#fff" stroke="#111" strokeWidth="2" />
                        <circle cx="65" cy="52" r="2" fill="#111" />
                        <line x1="46" y1="72" x2="54" y2="72" stroke="#111" strokeWidth="3" strokeLinecap="round" />
                    </g>
                );
            case 7:
                return (
                    <g>
                        <circle cx="32" cy="55" r="5" fill="#ff7eb3" opacity="0.8" />
                        <circle cx="68" cy="55" r="5" fill="#ff7eb3" opacity="0.8" />
                        
                        <circle cx="40" cy="45" r="3.5" fill="#111" />
                        <circle cx="60" cy="45" r="3.5" fill="#111" />
                        <path d="M 45 65 Q 50 72 55 65" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                );
            default:
                return null;
        }
    };

    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path 
                d="M 25 50 C 25 15, 75 15, 75 50 L 75 85 C 75 93, 68 100, 60 100 L 40 100 C 32 100, 25 93, 25 85 Z" 
                fill={bodyColor} 
                stroke="#111" 
                strokeWidth="4" 
                strokeLinejoin="round" 
            />
            {renderFace()}
        </svg>
    );
}

export default PlayerAvatar;