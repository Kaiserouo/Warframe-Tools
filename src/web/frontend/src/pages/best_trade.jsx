import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemInfobox from '../components/item_infobox.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchBestTrade } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';
import UserBestTradeTable from '../components/user_best_trade_table.jsx';

function SelectedItem({item, qty, setSelectedItems, setting}) {
  const removeAllItem = () => {
    setSelectedItems((prevSelectedItems) => {
      const newSelectedItems = {...prevSelectedItems};
      if (item in newSelectedItems) {
        delete newSelectedItems[item];
      }
      return newSelectedItems;
    });
  };
  const addItem = (qty) => {
    setSelectedItems((prevSelectedItems) => {
      const newSelectedItems = {...prevSelectedItems};
      if (!(item in newSelectedItems)) {
        newSelectedItems[item] = 0;
      }
      newSelectedItems[item] += qty;
      if (newSelectedItems[item] <= 0) {
        delete newSelectedItems[item];
      }
      return newSelectedItems;
    });
  }
  return (
    <span className="inline-block bg-gray-700 border border-gray-500 text-white rounded-full px-3 py-1 font-semibold m-1">
      <ItemInfobox itemName={item} setting={setting} />
      <button className="border rounded border-gray-500 ml-2 px-1 text-white text-sm hover:bg-gray-300" onClick={() => addItem(-1)}>▼</button>
      <span className="px-1">{qty}</span>
      <button className="border rounded border-gray-500 px-1 text-white text-sm hover:bg-gray-300" onClick={() => addItem(1)}>▲</button>
      <button className="ml-2 text-red-400 hover:text-red-600" onClick={removeAllItem}>&times;</button>
    </span>
  );
}

function stringifySelectedItems(selectedItems) {
  return Object.entries(selectedItems).map(([item, qty]) => Array(qty).fill(`${item}`).join(' + ')).join(' + ');
}

export default function BestTrade({setting}) {
  const [selectedItems, setSelectedItems] = useState({
    // 'Serration': 1, 
    // 'Hornet Strike': 1,
  });
  const [submittedItems, setSubmittedItems] = useState({});
  const copiedRef = useRef();

  const [bestTradePollStatus, setBestTradePollStatus] = useState({
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

  // search bar
  const handleSearchBarText = (itemName) => {
    // handle search input: expect whole names, separated by +
    const addedItems = itemName.split('+').map(i => i.trim()).filter(i => i.length > 0);
    const newSelectedItems = {...selectedItems};

    for (const itemName of addedItems) {
      if (!Object.keys(marketData.market_data).includes(itemName)) {
        return;
      }

      if (itemName in newSelectedItems) {
        newSelectedItems[itemName] += 1;
      } else {
        newSelectedItems[itemName] = 1;
      }
    }
    setSelectedItems(newSelectedItems);
  };
  const handleClearAll = () => {
    setSelectedItems({});
  };
  const handleSubmitSelectedItems = () => {
    setSubmittedItems({...selectedItems});
  };

  const handleCopySelectionToClipboard = () => {
    const textToCopy = stringifySelectedItems(selectedItems);
    navigator.clipboard.writeText(textToCopy);
    
    copiedRef.current.classList.remove('hidden');
    setTimeout(() => {
      copiedRef.current.classList.add('hidden');
    }, 2000);
  };

  const bestTradeFetchTaskIdCallback = useCallback(
    async () => fetchBestTrade(setting.oracle_type, submittedItems).then(data => data.task_id),
    [setting.oracle_type, submittedItems]
  );
  const bestTradeHandleSubmit = useCallback(
      makeHandleSubmit(setBestTradePollStatus, bestTradeFetchTaskIdCallback),
      [bestTradeFetchTaskIdCallback]
  );

  useEffect(() => {
    const ignore_obj = { 'ignore': false };
    if (Object.keys(submittedItems).length > 0) {
      bestTradeHandleSubmit(ignore_obj);
    }
    return () => { ignore_obj['ignore'] = true; };
  }, [submittedItems, bestTradeHandleSubmit]);
  
  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white my-2">
        <p>Best Trade</p>
      </div>

      <div className="text-white font-sans my-2">
        <p>Find the best person to trade with from the items you need. Do bulk trading with one person if possible.</p>
        <p>Type whole name <span className='text-gray-400'>(e.g., "Serration")</span>, or separate by "+" <span className='text-gray-400'>(e.g., "Volt Prime Chassis Blueprint + Volt Prime System Blueprint")</span> to add items.</p>
        <p>After inputting all your items, click <span className='text-blue-300'>"Calculate Best Trade"</span> to see the results.</p>
        <p>We show the difference from oracle price to sell price (called variation), the <span className='text-green-400'>more negative (green)</span> the better, the <span className='text-red-400'>more positive (red)</span> the worse.</p>
        <p><b>Please refresh market data regularly to ensure accuracy!</b> Preferrably everytime before <span className='text-blue-300'>"Calculate Best Trade"</span>.</p>
      </div>

      <SearchBar 
        placeholder="Add items..."
        items={marketIsPending || marketError ? [] : Object.keys(marketData.market_data)}
        nameKey={null}
        searchMode="contains"
        setSearchText={handleSearchBarText} />

      <div className='flex my-2'>
        <p className="mr-2 py-1 text-white text-lg font-mono font-semibold">Current Item List: </p>
        <button className="mr-2 px-2 py-1 bg-red-900 hover:bg-red-700 text-white rounded border border-red-300" onClick={handleClearAll}>
          Clear All
        </button>
        <div className='mr-2 relative inline-block'>
          <button className="px-2 py-1 bg-green-900 hover:bg-green-700 text-white rounded border border-green-300" onClick={handleCopySelectionToClipboard}>
            Copy Selection to Clipboard
          </button>
          <div ref={copiedRef} className="hidden absolute inset-0 bottom-full -translate-y-4 flex items-center justify-center">
            <div className="bg-black/70 text-white px-3 py-1 rounded">
              Copied!
            </div>
          </div>
        </div>
        <button className="px-2 py-1 bg-blue-900 hover:bg-blue-700 text-white rounded border border-blue-300" onClick={handleSubmitSelectedItems}>
          <b>Calculate Best Trade</b>
        </button>
      </div>

      <div className='flex flex-wrap'>
        {Object.keys(selectedItems).map((item, index) => (
          <SelectedItem key={index} item={item} qty={selectedItems[item]} setSelectedItems={setSelectedItems} setting={setting} />
        ))}
      </div>
      <br />

      {bestTradePollStatus.status === "in_progress" ? <LoadingProgress message="Loading" progress={bestTradePollStatus.progress} /> : null}
      {bestTradePollStatus.status === "error" ? <Error message={`ERROR: ${bestTradePollStatus.error}`} /> : null}
      {bestTradePollStatus.status === "done" ? <UserBestTradeTable 
          userMap={bestTradePollStatus.data?.user_map} 
          tradeOptions={bestTradePollStatus.data?.trade_options} 
          priceOracle={bestTradePollStatus.data?.price_oracle} 
          setting={setting}
          setSelectedItems={setSelectedItems}
        /> : null}
      
    </div>
  </>);
}