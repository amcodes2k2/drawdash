function StrokeWidthIcon({ size }) {
    return (
        <svg 
            width="100%" 
            height="24" 
            viewBox="0 0 48 24" 
            className="text-black mx-auto"
        >
            <line 
                x1="4" 
                y1="12" 
                x2="44" 
                y2="12" 
                stroke="currentColor" 
                strokeWidth={size} 
            />
        </svg>
    );
}

export default StrokeWidthIcon;