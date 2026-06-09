import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { fetchFunctionItemItemList, fetchSyndicateData, fetchMarketData } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';

function OptionToggleButton({ label, isSelected, onClick }) {
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${isSelected ? cnSelected : cnUnselected}`}
      onClick={onClick}>
        {label}
    </button>
  );
}

function FilterOptionSelection({ filterOption, setFilterOption }) {
  /**
   * supports:
   * {
   *    moreThanOneItem: bool,
   *    onlyNegativeVariation: bool,
   * }
   */
  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Filter: </p>

      <OptionToggleButton
        label="Arcane"
        isSelected={filterOption.hasArcaneTag}
        onClick={() => setFilterOption((prev) => ({ ...prev, hasArcaneTag: !prev.hasArcaneTag }))}
      />
      <OptionToggleButton
        label="Mod"
        isSelected={filterOption.hasModTag}
        onClick={() => setFilterOption((prev) => ({ ...prev, hasModTag: !prev.hasModTag }))}
      />
      <OptionToggleButton
        label="Weapon"
        isSelected={filterOption.hasWeaponTag}
        onClick={() => setFilterOption((prev) => ({ ...prev, hasWeaponTag: !prev.hasWeaponTag }))}
      />
    </div>
  </>);
}

export default function Syndicate({setting}) {
  const [searchText, setSearchText] = useState(null);
  const [itemPollStatus, setItemPollStatus] = useState({
    'taskId': null,
    'status': "done",
    'data': null,
    'progress': null
  });
  const [filterOption, setFilterOption] = useState({
    'hasArcaneTag': false,
    'hasModTag': false,
    'hasWeaponTag': false,
  });

  const { isPending: marketIsPending, error: marketError, data: marketData } = useQuery({
    queryKey: ['market_data'],
    queryFn: () => fetchMarketData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  const { isPending: syndicateIsPending, error: syndicateError, data: syndicateData } = useQuery({
    queryKey: ['syndicate_data'],
    queryFn: () => fetchSyndicateData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  let itemList = useMemo(() => {
    const syndicateItems = syndicateData?.[searchText] ?? [];
    let itemList = syndicateItems.map(item => item.name);

    // also filter item list based on the tags
    if (filterOption.hasArcaneTag || filterOption.hasModTag || filterOption.hasWeaponTag) {
      let newItemList = [];
      if (filterOption.hasArcaneTag) {
        newItemList = newItemList.concat(itemList.filter(name => marketData?.market_data?.[name]?.tags?.includes('arcane_enhancement')));
      }
      if (filterOption.hasModTag) {
        newItemList = newItemList.concat(itemList.filter(name => marketData?.market_data?.[name]?.tags?.includes('mod')));
      }
      if (filterOption.hasWeaponTag) {
        newItemList = newItemList.concat(itemList.filter(name => marketData?.market_data?.[name]?.tags?.includes('weapon')));
      }

      // remove duplicates
      itemList = [...new Set(newItemList)];
    }
    return itemList;
  }, [syndicateData, searchText, filterOption, marketData]);

  let standingMap = useMemo(() => {
    const syndicateItems = syndicateData?.[searchText] ?? [];
    const standingMap = {};
    syndicateItems.forEach(item => {
      standingMap[item.name] = item.standing;
    });
    console.log(`standingMap: ${JSON.stringify(standingMap)}`)
    return standingMap;
  }, [syndicateData, searchText]);

  const fetchTaskIdCallback = useCallback(
    async () => fetchFunctionItemItemList(setting.oracle_type, setting.ducantor_price_override, itemList).then(data => data.task_id),
    [itemList, setting.oracle_type, setting.ducantor_price_override]
  );
  const handleSubmit = useCallback(
    makeHandleSubmit(setItemPollStatus, fetchTaskIdCallback),
    [itemList, setting.oracle_type, setting.ducantor_price_override]
  );
  
  useEffect(() => {
    const ignore_obj = { 'ignore': false };
    if (searchText !== null) {
      handleSubmit(ignore_obj);
    }
    return () => { ignore_obj['ignore'] = true; };
  }, [searchText, handleSubmit, setting.oracle_type, setting.ducantor_price_override]);
  
  let itemTable = useMemo(() => {
    // assume the item table is "Name, *, Price, ..."
    let itemTable = null;
    if (searchText !== null && itemPollStatus.data) {
      itemTable = {
        "headers": [...itemPollStatus.data.headers, {"id": "standing", "name": 'Standing', "type": "integer"}, {"id": "plat_per_standing", "name": 'Plat / 10k Standing', "type": "float"}],
        "items": itemPollStatus.data.items.map(item => {
          // we assume there is always a header with id 'name' and 'plat'
          const standing = standingMap[item['name']];
          return {...item, "standing": standing, "plat_per_standing": standing ? item['plat'] / standing * 10000 : null};
        })
      };
    }
    return itemTable;
  }, [searchText, itemPollStatus.data, standingMap, itemList]);


  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white my-2">
        <p>Syndicate</p>
      </div>
      <div className="text-white font-sans my-2">
        <p>Search items in a syndicate.</p>
      </div>
      <SearchBar 
        placeholder="Search syndicates..."
        items={syndicateIsPending || syndicateError ? [] : Object.keys(syndicateData)}
        nameKey={null}
        searchMode="contains"
        setSearchText={setSearchText} />
      
      <FilterOptionSelection filterOption={filterOption} setFilterOption={setFilterOption} />

      {searchText && itemPollStatus.status === "in_progress" ? <LoadingProgress message="Loading" progress={itemPollStatus.progress} /> : null}
      {searchText && itemPollStatus.status === "error" ? <Error message={`ERROR: ${itemPollStatus.error}`} /> : null}
      {itemPollStatus.status === "done" && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

