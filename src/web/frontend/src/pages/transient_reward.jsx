import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { fetchFunctionItemItemList, fetchTransientData } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';
import UserBestTradeTable from '../components/user_best_trade_table.jsx';

export default function TransientReward({setting}) {
  const [searchText, setSearchText] = useState(null);
  const [itemPollStatus, setItemPollStatus] = useState({
    'taskId': null,
    'status': "done",
    'data': null,
    'progress': null
  });

  const { isPending: transientIsPending, error: transientError, data: transientData } = useQuery({
    queryKey: ['transient_data'],
    queryFn: () => fetchTransientData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  let itemList = useMemo(() => transientData?.[searchText] ?? [], [transientData, searchText]);

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
  
  let itemTable = null;
  if (searchText !== null && itemPollStatus.data) {
    itemTable = itemPollStatus.data;
  }


  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white my-2">
        <p>Transient Reward</p>
      </div>
      <SearchBar 
        placeholder="Search transient rewards..."
        items={transientIsPending || transientError ? [] : Object.keys(transientData)}
        nameKey={null}
        searchMode="contains"
        setSearchText={setSearchText} />
      {searchText && itemPollStatus.status === "in_progress" ? <LoadingProgress message="Loading" progress={itemPollStatus.progress} /> : null}
      {searchText && itemPollStatus.status === "error" ? <Error message={`ERROR: ${itemPollStatus.error}`} /> : null}
      {itemPollStatus.status === "done" && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

