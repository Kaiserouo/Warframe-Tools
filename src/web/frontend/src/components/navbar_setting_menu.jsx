import { useState } from 'react';
import { useQuery, useQueryClient, useMutation  } from '@tanstack/react-query'
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchRefreshData } from '../api/fetch.jsx';

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

  
  return (
    <div className="p-4 border-b border-gray-600">
      {
        marketIsPending || marketIsFetching ? <Loading /> :
        marketError ? <Error /> :
        <p className="text-sm text-gray-300">Last market update time: 
            <span className="font-mono ml-1">
                {new Intl.DateTimeFormat("en-US", {timeStyle: "medium", dateStyle: "medium",}).format(new Date(Date.parse(marketData?.last_update)))}
            </span>
        </p>
      }
      <button className="mt-2 w-full bg-gray-600 text-white p-2 rounded hover:bg-gray-500" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Refresh Market Data
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
          <option value="cur_lowest_price">Current Lowest Price</option>
        </select>
      </div>
    );
}

function NavbarSettingMenuInner({setting, setSetting}) {
  return (
    <div className="mt-2 bg-gray-700 text-white rounded shadow-lg z-10 min-w-max">
      <SettingItemRefreshMarketData setting={setting} setSetting={setSetting} />
      <SettingItemPriceOracle setting={setting} setSetting={setSetting} />
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
    <li className="relative">
      <NavbarSettingMenuButton isOpen={isOpen} setIsOpen={setIsOpen} />
      {isOpen && <div className="absolute right-0"><NavbarSettingMenuInner setting={setting} setSetting={setSetting} /></div>}
    </li>
  );
}