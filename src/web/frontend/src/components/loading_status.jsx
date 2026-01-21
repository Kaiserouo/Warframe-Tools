export function Loading({ message = 'Loading...' }) {
    let display_message = ` ${message} `;
    return (
        <div className="text-white font-mono my-2 font-extrabold">[{
            display_message.split('').map((char, index) => 
                <span key={index} className="animate-pulse" style={{ animationDelay: `${index * 0.15}s` }}>{char}</span>
            )
        }
        ]
        </div>
    );
}

export function LoadingProgress({ message = 'Loading', progress = null }) {
    /*
        if progress is given, it should be an object with {'current': int, 'total': int}
        if message is 'Loading', will show up something like this:
            Loading: -/-     // if progress is null
            Loading: 3/10    // if progress is {'current': 3, 'total': 10}
    */
    let display_message = ` ${message}: ${progress ? `${progress.current} / ${progress.total}` : '-/-'} `;
    return <Loading message={display_message} />;
}

export function Error({ message = 'ERROR' }) {
    return <div className="text-rose-500 font-mono font-extrabold my-2">[ {message} ]</div>;
}