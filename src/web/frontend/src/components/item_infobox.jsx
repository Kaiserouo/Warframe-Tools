import { fetchItemInfoboxData } from "../api/fetch";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';

function ItemInfoboxInner({ itemData }) {
  const formatPrice = (price) => {
    return Number.isInteger(price) ? Math.floor(price) : price.toFixed(2);
  };

  const plat = (
    <span className="text-gray-400">p</span>
  )

  return (
    <div className="text-white font-mono min-w-max whitespace-nowrap" onClick={e => {
      e.stopPropagation();  // to prevent clicking the elements outside when clicking inside the infobox
    }}>
      <h2 className="text-lg font-semibold">{itemData.item_name}</h2>
      <div className={`${itemData.type === 'Mod' ? 'flex' : ''} w-fit`}>
        {
          itemData.type === 'Mod' ?
          <img src={itemData.icon_url} alt={itemData.item_name} className={`h-64 mr-2 object-cover`} /> :
          <img src={itemData.thumb_url} alt={itemData.item_name} className={`h-16 object-cover`} />
        }
        <div >
          {itemData.type ? <><span className="text-green-500">{itemData.type}</span><br /></> : null}
          
          <a href={itemData.market_link} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
            Market
          </a> <span> | </span>
          <a href={itemData.wiki_link} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
            Wiki
          </a><br />
          
          <span className="text-yellow-300">Oracle</span> <span className="font-bold">{formatPrice(itemData.oracle_price)}</span>{plat},
          <span className="text-yellow-300"> Lowest</span> <span className="font-bold">{formatPrice(itemData.cur_lowest_sell_price)}</span>{plat}<br />

          <span className="text-purple-400">Sold <span className="text-white">{itemData['48h_volume']}</span> in 48h, <span className="text-white">{itemData['90d_volume']}</span> in 90d</span><br />
          <span className="text-gray-500 text-xs">(Data fetched at {new Intl.DateTimeFormat("en-US", {timeStyle: "medium", dateStyle: "medium",}).format(new Date(Date.parse(itemData['last_update'])))})</span>
        </div>
      </div>
    </div>
  );
}

export default function ItemInfobox({ setting, itemName }) {
  const [showInfobox, setShowInfobox] = useState(false);
  
  const { isPending: itemIsPending, isFetching: itemIsFetching, error: itemError, data: itemData } = useQuery({
    queryKey: ['item_infobox_data', itemName, setting.oracle_type],
    queryFn: () => fetchItemInfoboxData(itemName, setting.oracle_type),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <p 
        className={`${
          itemIsPending || itemIsFetching ? 'text-gray-500' : 
          itemError || (itemData && Object.keys(itemData).length === 0) ? 'text-white' :
          'text-white font-bold underline decoration-dashed underline-offset-3'} font-mono`} 
        onMouseEnter={() => setShowInfobox(true)} 
        onMouseLeave={() => setShowInfobox(false)}
      >
        {itemName}
      </p>
      {showInfobox && !itemIsPending && !itemError && itemData && Object.keys(itemData).length !== 0 && (
        <div 
          className="bg-gray-900 border border-gray-700 rounded p-4 w-fit z-40 inline-block" 
          // style={{ position: 'absolute', top: '100%', left: '0' }}
          style={{ position: 'absolute', top: '0', left: '100%' }}
          onMouseEnter={() => setShowInfobox(true)} 
          onMouseLeave={() => setShowInfobox(false)}
        >
          <ItemInfoboxInner itemData={itemData} />
        </div>
      )}
    </div>
  );
}