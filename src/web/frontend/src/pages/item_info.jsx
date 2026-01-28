import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchFunctionItemSearchText } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';

export default function ItemInfo({setting}) {
  const [searchText, setSearchText] = useState(null);
  const [itemPollStatus, setItemPollStatus] = useState({
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

  const fetchTaskIdCallback = useCallback(
    async () => fetchFunctionItemSearchText(setting.oracle_type, setting.ducantor_price_override, searchText).then(data => data.task_id),
    [searchText, setting.oracle_type, setting.ducantor_price_override]
  );
  const handleSubmit = useCallback(
    makeHandleSubmit(setItemPollStatus, fetchTaskIdCallback),
    [searchText, setting.oracle_type, setting.ducantor_price_override]
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
    // we show the items when there's data, even during fetching
    itemTable = itemPollStatus.data;
  }

  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Item Info</p>
    </div>
    <div className="text-white font-sans my-2">
      <p>Type item name <span className='text-gray-400'>(e.g., "Volt Prime Blueprint")</span> to see its market information.</p>
      <p>Will match all substring <span className='text-gray-400'>(e.g., "Volt Prime" matches everything about Volt Prime)</span></p>
    </div>
    <SearchBar 
      placeholder="Search items..."
      items={marketIsPending || marketError ? [] : Object.keys(marketData.market_data)}
      nameKey={null}
      searchMode="contains"
      setSearchText={setSearchText} />
    {searchText && <div className="text-white my-2">Search Text: {searchText}</div>}

    {/* we separate the loading progress and error display because if there is still data from last time, we still wanna display that */}
    {searchText && itemPollStatus.status === "in_progress" ? <LoadingProgress message="Loading" progress={itemPollStatus.progress} /> : null}
    {searchText && itemPollStatus.status === "error" ? <Error message={`ERROR: ${itemPollStatus.error}`} /> : null}
    {itemPollStatus.status === "done" && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

