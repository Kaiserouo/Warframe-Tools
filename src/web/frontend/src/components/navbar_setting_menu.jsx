import { useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation  } from '@tanstack/react-query'
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchRefreshData } from '../api/fetch.jsx';
import { getInventoryFromFile } from '../utils/inventory.jsx';

function SettingItemRefreshMarketData({setting, setSetting}) {
  const [clicked, setClicked] = useState(false);
  console.log("SettingItemRefreshMarketData clicked:", clicked);
  const queryClient = useQueryClient();

  const { isPending: marketIsPending, isFetching: marketIsFetching, error: marketError, data: marketData } = useQuery({
    queryKey: ['market_data'],
    queryFn: () => fetchMarketData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

function SettingItemPriceOracle({setting, setSetting}) {
    return (
      <div className="p-4 border-b border-gray-600">
        <p className="text-sm font-semibold mb-2">Price Oracle</p>
        <select
          className="w-full bg-gray-600 text-white p-2 rounded"
          value={setting.oracle_type}
          onChange={(e) => setSetting({...setting, 'oracle_type': e.target.value})}
        >
          <option value="default_oracle_price_48h">Default Oracle Price (48h)</option>
          <option value="top_30%_avg_in_48h">Top 30% Avg (48h)</option>
          <option value="bottom_30%_avg_in_48h">Bottom 30% Avg (48h)</option>
          <option value="all_avg_in_48h">All Avg (48h)</option>
          <option value="top_30%_avg_in_90d">Top 30% Avg (90d)</option>
          <option value="bottom_30%_avg_in_90d">Bottom 30% Avg (90d)</option>
          <option value="all_avg_in_90d">All Avg (90d)</option>
          <option value="cur_lowest_price">Current Lowest Price</option>
        </select>
      </div>
    );
}

function SettingItemDucantorPriceOverride({setting, setSetting}) {
    return (
      <div className="p-4 border-b border-gray-600">
        <p className="text-sm font-semibold mb-2">Ducantor Price Override</p>
        <p className="text-sm text-gray-300 mb-2">Override oracle price with the price from <a href="https://warframe.market/tools/ducats" target="_blank" rel="noopener noreferrer" className='underline text-blue-400 font-bold'>ducantor page</a><br /> to speed up loading time <i>(only works for prime items)</i></p>
        
        <select
          className="w-full bg-gray-600 text-white p-2 rounded"
          value={setting.ducantor_price_override}
          onChange={(e) => setSetting({...setting, 'ducantor_price_override': e.target.value})}
        >
          <option value="none">No override</option>
          <option value="hour">Override with hourly price (WA 48h)</option>
          <option value="day">Override with daily price (WA 90d)</option>
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
      <SettingItemRefreshMarketData setting={setting} setSetting={setSetting} />
      <SettingItemPriceOracle setting={setting} setSetting={setSetting} />
      <SettingItemDucantorPriceOverride setting={setting} setSetting={setSetting} />
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