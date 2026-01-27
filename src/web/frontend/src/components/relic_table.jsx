import { useState, useCallback, memo, useMemo } from "react";
import ItemInfobox from './item_infobox';

const prob_map = {
  'Intact': {'Common': 0.253, 'Uncommon': 0.11, 'Rare': 0.02},
  'Exceptional': {'Common': 0.233, 'Uncommon': 0.13, 'Rare': 0.04},
  'Flawless': {'Common': 0.20, 'Uncommon': 0.17, 'Rare': 0.06},
  'Radiant': {'Common': 0.167, 'Uncommon': 0.20, 'Rare': 0.10}
}

function calculate_expected_plat(relic, priceOracle) {
  // relic: see Relic component
  let expected_plat = 0.0;
  for (let [rarity, rewards] of Object.entries(relic.rewards)) {
    let prob = prob_map[relic.level][rarity];
    for (let reward of rewards) {
      expected_plat += prob * (priceOracle[reward] ?? 0.0);
    }
  }
  return expected_plat;
}

function RelicTitle({relic, expectedPlat}) {
  return (<>
    <div className="flex justify-between items-center gap-x-4">
      <h3 className="text-lg font-bold text-white">{relic.relic_name} ({relic.level})</h3>
      <p className="text-white font-bold italic">{expectedPlat.toFixed(2)} p</p>
    </div>
  </>);
}

function RelicRewardEntries({relic, priceOracle, setting}) {
  // shows e.g., Common - item1, item2, ...
  // Common -> Uncommon -> Rare
  // return  (<>
  //   <div className="mt-2">
  //     {Object.entries(relic.rewards).map(([rarity, rewards]) => (
  //       <div key={rarity} className="mb-2 flex gap-x-4">
  //         <h4 className="text-md font-semibold text-yellow-300 w-36 shrink-0">
  //           {rarity} ({prob_map[relic.level][rarity] * 100}%)
  //         </h4>
  //         <ul className="list-disc list-inside">
  //           {rewards.map((reward, idx) => (
  //             <li key={idx} className="text-white">
  //               <ItemInfobox setting={setting} itemName={reward} /> - <span className="font-bold">{(priceOracle[reward] ?? 0.0).toFixed(2)}</span> p
  //             </li>
  //           ))}
  //         </ul>
  //       </div>
  //     ))}
  //   </div>
  // </>);
  return  (<>
    <div className="mt-2">
      {['Common', 'Uncommon', 'Rare'].map((rarity) => (
        <div key={rarity} className="mb-2 flex gap-x-4">
          <h4 className="text-md font-semibold text-yellow-300 w-36 shrink-0">
            {rarity} ({prob_map[relic.level][rarity] * 100}%)
          </h4>
          <ul className="list-disc list-inside">
            {relic.rewards[rarity].map((reward, idx) => (
              <li key={idx} className="text-white">
                <ItemInfobox setting={setting} itemName={reward} /> - <span className="font-bold">{(priceOracle[reward] ?? 0.0).toFixed(2)}</span> p
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </>);
}

function Relic({relic, priceOracle, isCollapsed, setIsCollapsed, setting}) {
  `
  relic:{
    'relic_name': str, # e.g., 'Meso S14'
    'level': Literal['Intact' | 'Exceptional' | 'Flawless' | 'Radiant'],
    'rewards': {
      'Common': list[{'item_name': str, 'price': float}],
      'Uncommon': [...],
      'Rare': [...]
    }
  }
  `
  let relic_type = relic.relic_name.split(' ')[0]; // Lith, Meso, Neo, Axi
  
  let expectedPlat = calculate_expected_plat(relic, priceOracle);

  let bg_color_dark = {
    'Lith': 'bg-amber-900/70',
    'Meso': 'bg-gray-800/70',
    'Neo': 'bg-gray-600/70',
    'Axi': 'bg-yellow-800/70'
  }[relic_type] || '';

  let bg_color_light = {
    'Lith': 'bg-amber-300/50',
    'Meso': 'bg-gray-300/50',
    'Neo': 'bg-gray-100/50',
    'Axi': 'bg-yellow-300/50'
  }[relic_type] || 'bg-gray-200/50';

  return (
    <div className="flex border border-gray-600 rounded my-2" onClick={() => setIsCollapsed(!isCollapsed)}>
      <div className={`p-4 ${bg_color_light} text-white`}>
        {isCollapsed ? '▲' : '▼'}
      </div>
      <div className={`p-4 grow ${bg_color_dark}`}>
        <RelicTitle relic={relic} expectedPlat={expectedPlat} />
        {!isCollapsed && <RelicRewardEntries relic={relic} priceOracle={priceOracle} setting={setting} />}
      </div>
    </div>
  );
}


const MemoizedRelic = memo(Relic);
export default function RelicTable({relicTable, priceOracle, setting}) {
  `
  relic_table: [
    'relic_name': str, # e.g., 'Meso S14'
    'level': Literal['Intact' | 'Exceptional' | 'Flawless' | 'Radiant'],
    'rewards': {
      'Common': list[item_name: str],
      'Uncommon': [...],
      'Rare': [...]
    }
  ]
  price_oracle: {item_name: float}

  note: the entries in relic_table is not the same as the one in <Relic />
  if something isn't in price oracle, it is given a price of 0.0
  `

  const [isCollapsed, setIsCollapsed] = useState(Array(relicTable.length).fill(false));
  const [sortAsc, setSortAsc] = useState(null);

  const expectedPlats = useMemo(() => {
    const map = {};
    relicTable.forEach(relic => {
      map[relic.relic_name] = calculate_expected_plat(relic, priceOracle);
    });
    return map;
  }, [relicTable, priceOracle]);

  const handleToggle = useCallback((idx, value) => {
    setIsCollapsed(prev => {
      const newIsCollapsed = [...prev];
      newIsCollapsed[idx] = value;
      return newIsCollapsed;
    });
  }, []);

  const sortedRelicTable = [...relicTable];
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
      <button onClick={() => setIsCollapsed(Array(relicTable.length).fill(false))} className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700`}>
        Expand All
      </button>
      <button onClick={() => setIsCollapsed(Array(relicTable.length).fill(true))} className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700`}>
        Collapse All
      </button>
      <button onClick={onClickSort} className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700`}>
        Sort {sortAsc === null ? '' : sortAsc ? '▲' : '▼'}
      </button>
    </div>
    <div className="flex flex-row">
      <div className="flex flex-col">
        {sortedRelicTable.map((relic, idx) => (
          <MemoizedRelic key={idx} relic={relic} priceOracle={priceOracle} isCollapsed={isCollapsed[idx]} setIsCollapsed={(value) => handleToggle(idx, value)} setting={setting} />
        ))}
      </div>
    </div>
  </>);
}