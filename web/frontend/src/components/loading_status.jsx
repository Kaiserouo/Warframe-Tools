export function Loading() {
    return (
        <div className="text-white font-mono my-2">[ Loading
            <span className="animate-pulse">.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.8s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '1.0s' }}>. </span>
            ]
        </div>
    );
}

export function Error() {
    return <div className="text-rose-500 font-mono font-extrabold my-2">[ ERROR ]</div>;
}