import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchFunctionItemItemList, fetchTransientData } from '../api/fetch.jsx';

export default function TransientReward({setting}) {
  const [searchText, setSearchText] = useState(null);

  const { isPending: transientIsPending, error: transientError, data: transientData } = useQuery({
    queryKey: ['transient_data'],
    queryFn: () => fetchTransientData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  let itemList = transientData?.[searchText] ?? [];

  const { isPending: itemIsPending, error: itemError, data: itemData } = useQuery({
    queryKey: ['function_item', setting.oracle_type, itemList],
    queryFn: () => fetchFunctionItemItemList(setting.oracle_type, itemList),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
  console.log({itemIsPending, itemError, itemData});
  
  let itemTable = null;
  if (searchText !== null && !itemIsPending && !itemError) {
    itemTable = itemData;
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
        {searchText && <div className="text-white my-2">Search Text: {searchText}</div>}
        {searchText && (
          itemIsPending ? <Loading /> :
          itemError ? <Error /> : 
          <ItemTable itemTable={itemTable} setting={setting} />
        )}
    </div>
  </>);
}

