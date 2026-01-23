import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import ItemInfobox from '../components/item_infobox.jsx';
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData } from '../api/fetch.jsx';

function SelectedItem({item, setSelectedItem, selectedItem, setting}) {
    const removeItem = () => {
        const newList = selectedItem.filter(i => i !== item);
        setSelectedItem(newList);
    };
    return (
        <span className="inline-block bg-gray-700 border border-gray-500 text-white rounded-full px-3 py-1 font-semibold m-1">
            <ItemInfobox itemName={item} setting={setting} />
            <button className="ml-2 text-red-400 hover:text-red-600" onClick={removeItem}>&times;</button>
        </span>
    );
}

export default function BestTrade({setting}) {
  const [selectedItemList, setSelectedItemList] = useState(['Serration', 'Hornet Strike']);

  const { isPending: marketIsPending, error: marketError, data: marketData } = useQuery({
    queryKey: ['market_data'],
    queryFn: () => fetchMarketData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const handleSearchBarText = (itemName) => {
    // handle search input: expect whole names, separated by +
    const items = itemName.split('+').map(i => i.trim()).filter(i => i.length > 0);
    const newList = [...selectedItemList];

    for (const item of items) {
        if (!newList.includes(item) && Object.keys(marketData.market_data).includes(item)) {
            newList.push(item);
        }
    }
    setSelectedItemList(newList);
  };
  const handleClearAll = () => {
    setSelectedItemList([]);
  };

  return (<>
    <div className="mx-4 my-4">
        <div className="text-2xl font-bold text-white my-2">
            <p>Best Trade</p>
            <p className='text-red-400 font-extrabold'>NOT FINISHED YET!</p>
        </div>
        <div className="text-white font-mono my-2">
            <p>Type whole name (e.g., "Serration"), or separate by "+" (e.g., "Serration + Hornet Strike")</p>
        </div>
        <SearchBar 
          placeholder="Add items..."
          items={marketIsPending || marketError ? [] : Object.keys(marketData.market_data)}
          nameKey={null}
          searchMode="contains"
          setSearchText={handleSearchBarText} />
        <div className='flex my-2'>
            <p className="mr-2 py-1 text-white text-lg font-mono font-semibold">Current Item List: </p>
            <button className="px-2 py-1 bg-red-900 hover:bg-red-700 text-white rounded border border-red-300" onClick={handleClearAll}>Clear All</button>
            
        </div>
        <div className='flex'>
            {selectedItemList.map((item, index) => (
                <SelectedItem key={index} item={item} setSelectedItem={setSelectedItemList} selectedItem={selectedItemList} setting={setting} />
            ))}
        </div>
    </div>
  </>);
}

