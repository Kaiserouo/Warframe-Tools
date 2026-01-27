import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import RelicTable from '../components/relic_table.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { makeHandleSubmit } from '../api/task.jsx';
import { fetchRelicData, fetchMarketData, fetchPriceOracle } from '../api/fetch.jsx';

function getRelicTable(relicData, searchType, searchText) {
  const relicTable = [];
  if (searchType === 'item') {
    // we search by item name contained in relic rewards, case insensitive, partial match
    for (let relicName in relicData.relics) {
      let rewards = relicData.relics[relicName];
      let found = false;
      for (let rarity in rewards) {
        for (let item of rewards[rarity]) {
          if (item.toLowerCase().includes(searchText.toLowerCase())) {
            found = true;
            break;
          }
        }
      }
      if (found) {
        relicTable.push({
          'relic_name': relicName,
          'level': 'Radiant',
          'rewards': rewards
        });
      }
    }
  }

  else if (searchType === 'relic') {
    if (searchText.trim().toLowerCase() === 'varzia') {
      // special case: Varzia sells all currently available relics
      for (let relicName of relicData.varzia_relics) {
        relicTable.push({
          'relic_name': relicName,
          'level': 'Radiant',
          'rewards': relicData.relics[relicName]
        });
      }
    } else {
      // we search by full relic name, may be separated by "+"
      for (let relicName of searchText.split('+').map(i => i.trim()).filter(i => i.length > 0)) {
        if (relicName in relicData.relics) {
          relicTable.push({
            'relic_name': relicName,
            'level': 'Radiant',
            'rewards': relicData.relics[relicName]
          });
        }
      }
    }

  }

  return relicTable;
}

function getItemListFromRelicTable(relicTable) {
  const itemSet = new Set();
  for (let relic of relicTable) {
    for (let rarity in relic.rewards) {
      for (let item of relic.rewards[rarity]) {
        // add item to itemList if not already present
        if (!itemSet.has(item)) {
          itemSet.add(item);
        }
      }
    }
  }
  return Array.from(itemSet);
}

export default function Relic({setting}) {
  const [searchText, setSearchText] = useState(null); // null = don't search
  const [searchType, setSearchType] = useState('relic');  // 'relic' or 'item'
  const [oraclePollStatus, setOraclePollStatus] = useState({
    'taskId': null,
    'status': "done",
    'data': null,
    'progress': null
  });

  const { isPending: marketIsPending, error: marketError, data: marketData } = useQuery({
    queryKey: ['market_data'],
    queryFn: () => fetchMarketData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { isPending: relicIsPending, error: relicError, data: relicData } = useQuery({
    queryKey: ['relic_data'],
    queryFn: () => fetchRelicData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const relicTable = useMemo(() => {
    if (!relicIsPending && !relicError && relicData && searchText !== null) {
      return getRelicTable(relicData, searchType, searchText);
    }
    return [];
  }, [relicData, relicIsPending, relicError, searchText, searchType]);

  const itemList = useMemo(() => {
    return getItemListFromRelicTable(relicTable);
  }, [relicTable]);

  // const { isSuccess: oracleIsSuccess, isPending: oracleIsPending, error: oracleError, data: oracleData } = useQuery({
  //   queryKey: ['function_relic', setting.oracle_type, searchType, searchText],
  //   queryFn: () => fetchPriceOracle(setting.oracle_type, itemList),
  //   staleTime: 1 * 60 * 1000, // 1 minute
  //   enabled: itemList.length > 0,
  // })

  const fetchTaskIdCallback = useCallback(
    async () => fetchPriceOracle(setting.oracle_type, setting.ducantor_price_override, itemList).then(data => data.task_id),
    [setting.oracle_type, setting.ducantor_price_override, itemList]
  );
  const handleSubmit = useCallback(
    makeHandleSubmit(setOraclePollStatus, fetchTaskIdCallback),
    [fetchTaskIdCallback]
  );
  
  useEffect(() => {
    const ignore_obj = { 'ignore': false };
    if (itemList.length > 0) {
      handleSubmit(ignore_obj);
    }
    return () => { ignore_obj['ignore'] = true; };
  }, [itemList, handleSubmit]);

  let searchBarItems = [];
  if (searchType === 'relic') {
    if (!relicIsPending && !relicError && relicData) {
      searchBarItems = Object.keys(relicData.relics);
      searchBarItems.push('Varzia');  // add Varzia as a special search term
    }
  } else {
    if (!marketIsPending && !marketError && marketData) {
      searchBarItems = Object.keys(marketData.market_data);
    }
  }

  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white my-2">
        <p>Relic Info</p>
      </div>

      <SearchTypeChoice choices={['relic', 'item']} searchType={searchType} setSearchType={setSearchType} setSearchText={setSearchText} />
      
      {
        searchType === 'item' ? <div className="text-white font-mono my-2">
        <p>Type item name (e.g., "Volt Prime Blueprint") to see which relics contain the item.</p>
        <p>Will match all substring (e.g., "Volt Prime" matches everything about Volt Prime)</p>
        </div> : 
        searchType === 'relic' ? <div className="text-white font-mono my-2">
        <p>Type whole relic name (e.g., "Axi A14"), or separate by "+" (e.g., "Axi A14 + Meso S14")</p>
        <p>You can search "Varzia" to see all currently available relics Varzia sells (may take a minute to fetch all items)</p>
        </div> : null
      }

      <SearchBar 
        placeholder={searchType === 'relic' ? "Search relics..." : "Search items..."}
        items={searchBarItems}
        nameKey={null}
        searchMode="contains"
        setSearchText={setSearchText} />
        
      {searchText && oraclePollStatus.status === "in_progress" ? <LoadingProgress message="Loading" progress={oraclePollStatus.progress} /> : null}
      {searchText && oraclePollStatus.status === "error" ? <Error message={`ERROR: ${oraclePollStatus.error}`} /> : null}
      {oraclePollStatus.status === "done" && oraclePollStatus.data !== null ? <RelicTable relicTable={relicTable} priceOracle={oraclePollStatus.data} setting={setting} /> : null}
    </div>
  </>);
}

function SearchTypeChoice({choices, searchType, setSearchType, setSearchText}) {
  // make buttons for each choice
  function onClick(choice) {
    setSearchText(null);  // reset search text
    setSearchType(choice);
  }
  return (
    <div className="flex gap-2 my-2">
      {choices.map(choice => (
        <button
          key={choice}
          onClick={() => onClick(choice)}
          className={`px-4 py-2 rounded ${
            searchType === choice
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Search by {choice.charAt(0).toUpperCase() + choice.slice(1)}
        </button>
      ))}
    </div>
  );
}