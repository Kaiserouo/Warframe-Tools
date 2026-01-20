export function Loading({ message = 'Loading' }) {
    let display_message = message + "...... ";
    return (
        <div className="text-white font-mono my-2 font-extrabold">[ {
            display_message.split('').map((char, index) => 
                <span key={index} className="animate-pulse" style={{ animationDelay: `${index * 0.15}s` }}>{char}</span>
            )
        }
        ]
        </div>
    );
}

export function Error() {
    return <div className="text-rose-500 font-mono font-extrabold my-2">[ ERROR ]</div>;
}