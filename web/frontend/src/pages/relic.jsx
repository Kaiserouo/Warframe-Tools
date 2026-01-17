import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import RelicTable from '../components/relic_table.jsx';
import { Loading, Error } from '../components/loading_status.jsx';

import { fetchRelicData, fetchMarketData, fetchPriceOracle } from '../api/fetch.jsx';

function getRelicTable(relicData, searchType, searchText) {
  const relicTable = [];
  if (searchType === 'item') {
    // we search by item name contained in relic rewards, case insensitive, partial match
    for (let relicName in relicData) {
      let rewards = relicData[relicName];
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
    // we search by full relic name, may be separated by "+"
    for (let relicName of searchText.split('+').map(i => i.trim()).filter(i => i.length > 0)) {
      if (relicName in relicData) {
        relicTable.push({
          'relic_name': relicName,
          'level': 'Radiant',
          'rewards': relicData[relicName]
        });
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

  const relicTable = [];
  const itemList = [];
  if (!marketIsPending && !marketError && marketData &&
      !relicIsPending && !relicError && relicData &&
      searchText !== null) {
    
    relicTable.push(...getRelicTable(relicData, searchType, searchText));
    itemList.push(...getItemListFromRelicTable(relicTable));
  }

  const { isSuccess: oracleIsSuccess, isPending: oracleIsPending, error: oracleError, data: oracleData } = useQuery({
    queryKey: ['function_relic', setting.oracle_type, searchType, searchText],
    queryFn: () => fetchPriceOracle(setting.oracle_type, itemList),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: itemList.length > 0,
  })

  let searchBarItems = [];
  if (searchType === 'relic') {
    if (!relicIsPending && !relicError && relicData) {
      searchBarItems = Object.keys(relicData);
    }
  } else {
    if (!marketIsPending && !marketError && marketData) {
      searchBarItems = Object.keys(marketData.market_data);
    }
  }


  // fetch relic table by searchText and searchType
  // let relicTable = [
  //   {'relic_name': 'Lith O2', 'level': 'Radiant', 'rewards': {'Common': ['Volt Prime Blueprint', 'Bo Prime Blueprint', 'Wyrm Prime Cerebrum'], 'Uncommon': ['Loki Prime Chassis Blueprint'], 'Rare': ['Odonata Prime Wings Blueprint']}}, {'relic_name': 'Meso O3', 'level': 'Radiant', 'rewards': {'Common': ['Loki Prime Neuroptics Blueprint', 'Odonata Prime Systems Blueprint'], 'Uncommon': ['Volt Prime Chassis Blueprint', 'Wyrm Prime Systems'], 'Rare': ['Odonata Prime Wings Blueprint']}}, {'relic_name': 'Neo V8', 'level': 'Radiant', 'rewards': {'Common': ['Loki Prime Blueprint', 'Odonata Prime Harness Blueprint', 'Wyrm Prime Blueprint'], 'Uncommon': ['Bo Prime Handle'], 'Rare': ['Volt Prime Neuroptics Blueprint']}}, {'relic_name': 'Axi L4', 'level': 'Radiant', 'rewards': {'Common': ['Bo Prime Ornament', 'Wyrm Prime Carapace'], 'Uncommon': ['Volt Prime Systems Blueprint', 'Odonata Prime Blueprint'], 'Rare': ['Loki Prime Systems Blueprint']}}, {'relic_name': 'Vanguard L4', 'level': 'Radiant', 'rewards': {'Common': ['Bo Prime Ornament', 'Wyrm Prime Carapace'], 'Uncommon': ['Volt Prime Systems Blueprint', 'Odonata Prime Blueprint'], 'Rare': ['Loki Prime Systems Blueprint']}},
  // ];
  // let priceOracle = {
  //   'Bo Prime Blueprint': 12.25,
  //   'Bo Prime Handle': 16.71875,
  //   'Bo Prime Ornament': 16.470588235294116,
  //   'Loki Prime Blueprint': 10.0,
  //   'Loki Prime Chassis Blueprint': 15.135714285714286,
  //   'Loki Prime Neuroptics Blueprint': 16.21,
  //   'Loki Prime Systems Blueprint': 24.62264150943396,
  //   'Odonata Prime Blueprint': 6.444444444444445,
  //   'Odonata Prime Harness Blueprint': 9.833333333333334,
  //   'Odonata Prime Systems Blueprint': 7.761904761904762,
  //   'Odonata Prime Wings Blueprint': 15.266666666666667,
  //   'Volt Prime Blueprint': 9.803418803418804,
  //   'Volt Prime Chassis Blueprint': 8.456521739130435,
  //   'Volt Prime Neuroptics Blueprint': 14.445859872611464,
  //   'Volt Prime Systems Blueprint': 8.222222222222221,
  //   'Wyrm Prime Blueprint': 11.210526315789474,
  //   'Wyrm Prime Carapace': 10.071428571428571,
  //   'Wyrm Prime Cerebrum': 14.51086956521739,
  //   'Wyrm Prime Systems': 20.688524590163933,
  // };
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
          </div> : null
        }
        <SearchBar 
          placeholder={searchType === 'relic' ? "Search relics..." : "Search items..."}
          items={searchBarItems}
          nameKey={null}
          searchMode="contains"
          setSearchText={setSearchText} />
          
        {searchText && <div className="text-white my-2">Search Text: {searchText}</div>}
        {searchText && (
          oracleIsPending ? <Loading /> :
          oracleError ? <Error /> :
          <RelicTable relicTable={relicTable} priceOracle={oracleData} setting={setting} />
        ) }
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