import { useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation  } from '@tanstack/react-query'
import { Loading, Error } from '../components/loading_status.jsx';
import { queryMarketData, fetchRefreshData } from '../api/fetch.jsx';
import { getInventoryFromFile } from '../utils/inventory.jsx';

const priceOriginOptions = {
  'warframe_market': {
    'name': 'Warframe Market',
    'oracle_type': {
      'default_oracle_price_48h': "Default Oracle Price (48h)",
      'top_30%_avg_in_48h': "Top 30% Avg (48h)",
      'bottom_30%_avg_in_48h': "Bottom 30% Avg (48h)",
      'all_avg_in_48h': "All Avg (48h)",
      'top_30%_avg_in_90d': "Top 30% Avg (90d)",
      'bottom_30%_avg_in_90d': "Bottom 30% Avg (90d)",
      'all_avg_in_90d': "All Avg (90d)",
      'cur_lowest_price': "Current Lowest Price",
    }
  },
  'warframe_market_ducantor': {
    'name': 'Ducantor',
    'oracle_type': {
      'DAY/default_oracle_price_48h': "(DAY) Default Oracle Price (48h)",
      'HOUR/default_oracle_price_48h': "(HOUR) Default Oracle Price (48h)",
      'DAY/top_30%_avg_in_48h': "(DAY) Top 30% Avg (48h)",
      'HOUR/top_30%_avg_in_48h': "(HOUR) Top 30% Avg (48h)",
      'DAY/bottom_30%_avg_in_48h': "(DAY) Bottom 30% Avg (48h)",
      'HOUR/bottom_30%_avg_in_48h': "(HOUR) Bottom 30% Avg (48h)",
      'DAY/all_avg_in_48h': "(DAY) All Avg (48h)",
      'HOUR/all_avg_in_48h': "(HOUR) All Avg (48h)",
      'DAY/top_30%_avg_in_90d': "(DAY) Top 30% Avg (90d)",
      'HOUR/top_30%_avg_in_90d': "(HOUR) Top 30% Avg (90d)",
      'DAY/bottom_30%_avg_in_90d': "(DAY) Bottom 30% Avg (90d)",
      'HOUR/bottom_30%_avg_in_90d': "(HOUR) Bottom 30% Avg (90d)",
      'DAY/all_avg_in_90d': "(DAY) All Avg (90d)",
      'HOUR/all_avg_in_90d': "(HOUR) All Avg (90d)",
      'DAY/cur_lowest_price': "(DAY) Current Lowest Price",
      'HOUR/cur_lowest_price': "(HOUR) Current Lowest Price",
    }
  },
  "alecaframe": {
    'name': 'AlecaFrame',
    'oracle_type': null
  }
}

function SettingItemRefreshMarketData({setting, setSetting}) {
  const [clicked, setClicked] = useState(false);
  console.log("SettingItemRefreshMarketData clicked:", clicked);
  const queryClient = useQueryClient();

  const { isPending: marketIsPending, isFetching: marketIsFetching, error: marketError, data: marketData } = useQuery(queryMarketData);

  const mutation = useMutation({
    mutationFn: () => fetchRefreshData(),
    onSuccess: async () => {
      // If you're invalidating a single query
      await queryClient.invalidateQueries()
    },
  })

  const timeFormat = new Intl.DateTimeFormat("en-US", {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'shortOffset'
  });
  const lastUpdateTime = marketData?.last_update ? timeFormat.format(new Date(Date.parse(marketData.last_update))) : null;

  return (
    <div className="p-4 border-b border-gray-600">
      <p className="text-sm font-semibold mb-2">Refresh Market Data</p>
      {
        marketIsPending || marketIsFetching ? <Loading /> :
        marketError ? <Error /> :
        <p className="text-sm text-gray-300">Last market update time: 
            <span className="font-mono ml-1">
                {lastUpdateTime}
            </span>
        </p>
      }
      <button 
        className={`mt-2 w-full bg-gray-600 text-white p-1 rounded ${mutation.isPending ? "" : "hover:bg-gray-500"}`} 
        onClick={() => mutation.mutate()} 
        disabled={mutation.isPending}>
          {mutation.isPending ? "Refreshing..." : "Refresh Market Data"}
      </button>
    </div>
  );
}

function SettingItemPriceOrigin({setting, setSetting}) {
    const { price_origin: priceOrigin, oracle_type: oracleType } = setting;

    const onChangePriceOrigin = (e) => {
      const newPriceOrigin = e.target.value;
      if (newPriceOrigin === priceOrigin) {
        return;
      }
      let newOracleType = null;
      if (priceOriginOptions[newPriceOrigin] && priceOriginOptions[newPriceOrigin].oracle_type) {
        newOracleType = Object.keys(priceOriginOptions[newPriceOrigin].oracle_type)[0];
      }
      setSetting({...setting, 'price_origin': newPriceOrigin, 'oracle_type': newOracleType});
    }

    const onChangeOracleType = (e) => {
      const newOracleType = e.target.value;
      setSetting({...setting, 'oracle_type': newOracleType});
    };


    return (
      <div className="p-4 border-b border-gray-600">
        <p className="text-sm font-semibold mb-2">Price Origin</p>
        <select
          className="w-full bg-gray-600 text-white p-2 rounded mb-2"
          value={setting.price_origin}
          onChange={onChangePriceOrigin}
        >
          {Object.entries(priceOriginOptions).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>

        <br />

        <p className="text-sm font-semibold mb-2">Oracle Type</p>
        <select
          className="w-full bg-gray-600 text-white p-2 rounded"
          value={oracleType || ""}
          onChange={onChangeOracleType}
          disabled={!priceOriginOptions[priceOrigin].oracle_type}
        >
          {priceOriginOptions[priceOrigin].oracle_type ? 
            Object.entries(priceOriginOptions[priceOrigin].oracle_type).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            )) : 
            <option value="" disabled>N/A</option>}
        </select>
      </div>
    );
}

function SettingInventoryFile({setting, setSetting}) {
  const [loadError, setLoadError] = useState(null);

  const handleFileChange = useCallback(async (e) => {
    if (e.target.files) {
      getInventoryFromFile(e.target.files[0]).then(
        (inventoryJson) => {
          setSetting({...setting, 'inventory': {'data': inventoryJson, 'time': e.target.files[0].lastModified}});
          setLoadError(null);
        },
        (error) => {
          console.error("Error loading inventory file:", error);
          setLoadError(error);
        }
      )
    }
  }, [setSetting]);

  const handleClearInventory = useCallback(() => {
    setSetting({...setting, 'inventory': null});
  }, [setSetting]);

  return (
    <div className="p-4 border-b border-gray-600">
      <p className="text-sm font-semibold mb-2">Inventory File</p>
      <p className="text-sm text-gray-300 mb-2">Select the inventory file (<code>inventory.json, lastData.dat</code>) to use.<br />Will store the data in local storage.</p>
      <p className="text-sm text-gray-300 mb-2">If you use AlecaFrame: Use <code>%localappdata%/AlecaFrame/lastData.dat</code></p>
      <p className="text-sm text-gray-300 mb-2">If you don't: Use <a href="https://github.com/Sainan/warframe-api-helper/releases/latest" target="_blank" rel="noopener noreferrer" className='underline text-blue-400 font-bold'>warframe-api-helper</a> while game is on and logged in</p>
      
      {!setting.inventory && loadError ? (
        <p className="text-sm text-red-400">{loadError}</p>
      ) : null}
      {setting.inventory ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-300">File time: <span className="font-mono">{new Date(setting.inventory.time).toLocaleString()}</span></p>
          <button onClick={handleClearInventory} className="bg-red-900 text-white px-2 py-1 rounded hover:bg-red-600">
            Clear Inventory
          </button>
        </div>
      ) : (
        <input 
          className="w-full bg-gray-600 text-white p-2 rounded"
          type="file" accept="*/*" onChange={handleFileChange} />
      )}
    </div>
  );
}

function NavbarSettingMenuInner({setting, setSetting}) {
  return (
    <div className="mt-2 bg-gray-700 text-white rounded shadow-lg z-10 md:min-w-max">
      {setting.env_setting.is_github_page ? null : <SettingItemRefreshMarketData setting={setting} setSetting={setSetting} />}
      {setting.env_setting.is_github_page ? null : <SettingItemPriceOrigin setting={setting} setSetting={setSetting} />}
      <SettingInventoryFile setting={setting} setSetting={setSetting} />
    </div>
  )
}

function NavbarSettingMenuButton({isOpen, setIsOpen}) {
  return (
      <button
        className="bg-gray-700 text-white px-5 py-2 rounded hover:bg-gray-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        Options {isOpen ? '▲' : '▼'}
      </button>
  );
}

export default function NavbarSettingMenu({setting, setSetting}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="relative max-h-full">
      <NavbarSettingMenuButton isOpen={isOpen} setIsOpen={setIsOpen} />
      {isOpen && (
        // <div className="absolute top-full left-0 overflow-y-auto max-h-[calc(100vh-5rem)] md:relative max-h-maxz-50">
        <div className="relative top-full left-0 overflow-y-auto md:absolute max-h-[calc(30vh)] md:left-auto md:right-0 md:max-h-[calc(100vh-5rem)]">
        {/* // <div className="fixed left-2 right-2 top-2 bottom-2 md:absolute md:top-full md:left-auto md:right-0 md:bottom-auto md:inset-x-auto md:mt-2 md:left-0 md:right-auto max-h-[calc(100vh-1rem)] overflow-y-auto z-50"> */}
          <NavbarSettingMenuInner setting={setting} setSetting={setSetting} />
        </div>
      )}
    </li>
  );
}