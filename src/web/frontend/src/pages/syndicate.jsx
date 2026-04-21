import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { fetchFunctionItemItemList, fetchSyndicateData } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';

export default function Syndicate({setting}) {
  const [searchText, setSearchText] = useState(null);
  const [itemPollStatus, setItemPollStatus] = useState({
    'taskId': null,
    'status': "done",
    'data': null,
    'progress': null
  });

  const { isPending: syndicateIsPending, error: syndicateError, data: syndicateData } = useQuery({
    queryKey: ['syndicate_data'],
    queryFn: () => fetchSyndicateData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  let itemList = useMemo(() => {
    const syndicateItems = syndicateData?.[searchText] ?? [];
    const itemList = syndicateItems.map(item => item.name);
    console.log(`itemList: ${JSON.stringify(itemList)}`)
    return itemList;
  }, [syndicateData, searchText]);

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
        "headers": [...itemPollStatus.data.headers, {"name": 'Standing', "type": "integer"}, {"name": 'Plat / 10k Standing', "type": "float"}],
        "items": itemPollStatus.data.items.map(item => {
          const standing = standingMap[item[0]];
          return [...item, standing, standing ? item[2] / standing * 10000 : null];
        })
      };
    }
    return itemTable;
  }, [searchText, itemPollStatus.data]);


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
      {searchText && itemPollStatus.status === "in_progress" ? <LoadingProgress message="Loading" progress={itemPollStatus.progress} /> : null}
      {searchText && itemPollStatus.status === "error" ? <Error message={`ERROR: ${itemPollStatus.error}`} /> : null}
      {itemPollStatus.status === "done" && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

