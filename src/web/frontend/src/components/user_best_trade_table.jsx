import { useState, useCallback, memo, useMemo } from "react";

function UserBestTradeTitle({user}) {
    return (<>
        <div className="flex justify-between items-center gap-x-4">
            <h3 className="text-lg font-bold text-white">{relic.relic_name} ({relic.level})</h3>
            <p className="text-white font-bold italic">{expected_plat.toFixed(2)} p</p>
        </div>
    </>);
}

function UserBestTradeEntries({user}) {
    // shows e.g., Common - item1, item2, ...
    return  (<>
        <div className="mt-2">
            {Object.entries(relic.rewards).map(([rarity, rewards]) => (
                <div key={rarity} className="mb-2 flex gap-x-4">
                    <h4 className="text-md font-semibold text-yellow-300 w-36 shrink-0">
                        {rarity} ({prob_map[relic.level][rarity] * 100}%)
                    </h4>
                    <ul className="list-disc list-inside">
                        {rewards.map((reward, idx) => (
                            <li key={idx} className="text-white">
                                {reward.item_name} - <span className="font-bold">{reward.price.toFixed(2)}</span> p
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    </>);
}

function UserBestTrade({user, requiredItems, priceOracle, isCollapsed, setIsCollapsed}) {
    ```
    user: {"user_name": str, "url": str, "items": {item_name: {"price": int, "count": int}}}
    requiredItems: {item_name: required_count}
    priceOracle: {item_name: int}
    ```
    const [itemCount, setItemCount] = useState(Object.fromEntries(
        Object.entries(requiredItems).map(([item_name, required_count]) => [item_name, Math.min(user.items[item_name]?.count || 0, required_count)])
    ));
    let bg_color_dark = '';
    let bg_color_light = 'bg-gray-200/50'; 

    return (
        <div className="flex border border-gray-600 rounded my-2" onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className={`p-4 ${bg_color_light} text-white`}>
                {isCollapsed ? '▲' : '▼'}
            </div>
            <div className={`p-4 grow ${bg_color_dark}`}>
                <UserBestTradeTitle user_best_trade={user_best_trade} />
                {!isCollapsed && <UserBestTradeEntries user_best_trade={user_best_trade} />}
            </div>
        </div>
    );
}


// const MemoizedRelic = memo(Relic);
export default function UserBestTradeTable({userTable}) {
    ```
    userTable: [
        {
            "user_name": str,
            "url": str,
            "items": [
            {"item_name": str, "price": int, "count": int}
            ...
            ]
        }
        ...
    ]
    ```


    const [isCollapsed, setIsCollapsed] = useState(Array(relic_table.length).fill(false));
    const [sortAsc, setSortAsc] = useState(null);

    const handleToggle = useCallback((idx, value) => {
        setIsCollapsed(prev => {
            const newIsCollapsed = [...prev];
            newIsCollapsed[idx] = value;
            return newIsCollapsed;
        });
    }, []);

    const sortedRelicTable = [...relic_table];
    if (sortAsc !== null) {
        sortedRelicTable.sort((a, b) => {
            const expectedA = expectedPlats[a.relic_name];
            const expectedB = expectedPlats[b.relic_name];
            return sortAsc ? expectedA - expectedB : expectedB - expectedA;
        });
    }

    const onClickSort = () => {
        setSortAsc(prev => {
            if (prev === null) return true;
            if (prev === true) return false;
            return null;
        });
    };

    return (<>
        <div className="flex gap-2 my-2">
            <button onClick={() => setIsCollapsed(Array(relic_table.length).fill(false))} className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700`}>
                Expand All
            </button>
            <button onClick={() => setIsCollapsed(Array(relic_table.length).fill(true))} className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700`}>
                Collapse All
            </button>
            <button onClick={onClickSort} className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700`}>
                Sort {sortAsc === null ? '' : sortAsc ? '▲' : '▼'}
            </button>
        </div>
        <div className="flex flex-row">
            <div className="flex flex-col">
                {sortedRelicTable.map((relic, idx) => (
                    <MemoizedRelic key={idx} relic={relic} expected_plat={expectedPlats[relic.relic_name]} isCollapsed={isCollapsed[idx]} setIsCollapsed={(value) => handleToggle(idx, value)} />
                ))}
            </div>
        </div>
    </>);
}