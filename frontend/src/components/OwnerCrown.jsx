function OwnerCrown({ className = "w-5 h-5 text-yellow-500" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M3 20c6 1 12-1 18 0" />
            
            <path d="M3.5 20L2 8l6.5 4 3.5-7 4 7 5-4-1.5 12" />
            
            <path d="M2 5v.01" />
            <path d="M12 2v.01" />
            <path d="M21 5v.01" />
        </svg>
    );
}

export default OwnerCrown;