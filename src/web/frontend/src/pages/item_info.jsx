import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchFunctionItemSearchText } from '../api/fetch.jsx';

export default function ItemInfo({setting}) {
  const [searchText, setSearchText] = useState(null);

  const { isPending: marketIsPending, error: marketError, data: marketData } = useQuery({
    queryKey: ['market_data'],
    queryFn: () => fetchMarketData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { isPending: itemIsPending, isFetching: itemIsFetching, error: itemError, data: itemData } = useQuery({
    queryKey: ['function_item', setting.oracle_type, searchText],
    queryFn: () => fetchFunctionItemSearchText(setting.oracle_type, searchText),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: searchText !== null,
  })
  
  let itemTable = null;
  if (searchText !== null && itemData) {
    // we show the items when there's data, even during fetching
    itemTable = itemData;
  }

  return (<>
    <div className="mx-4 my-4">
        <div className="text-2xl font-bold text-white my-2">
            <p>Item Info</p>
        </div>
        <div className="text-white font-mono my-2">
          <p>Type item name (e.g., "Volt Prime Blueprint") to see its market information.</p>
          <p>Will match all substring (e.g., "Volt Prime" matches everything about Volt Prime)</p>
        </div>
        <SearchBar 
          placeholder="Search items..."
          items={marketIsPending || marketError ? [] : Object.keys(marketData.market_data)}
          nameKey={null}
          searchMode="contains"
          setSearchText={setSearchText} />
        {searchText && <div className="text-white my-2">Search Text: {searchText}</div>}
        {searchText && itemIsPending ? <Loading /> : null}
        {searchText && (
          itemError ? <Error /> : 
          <ItemTable itemTable={itemTable} setting={setting} />
        )}
    </div>
  </>);
}

