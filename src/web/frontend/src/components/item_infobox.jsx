import { fetchItemInfoboxData } from "../api/fetch";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import Infobox from "./infobox";


function ItemInfoboxInner({ itemData }) {
  /* ref. /api/item_infobox response format in server.py 
     note that 'cur_lowest_sell_price' and 'wiki_link' may be null
  */
  const formatPrice = (price) => {
    return Number.isInteger(price) ? Math.floor(price) : price.toFixed(2);
  };

  const plat = (
    <span className="text-gray-400">p</span>
  )
  
  const priceOrigin = itemData.price_origin;
  const priceText = {
    'warframe_market': "Market Price",
    'ducantor': "Ducantor Price",
    'alecaframe': "AlecaFrame Price"
  }[priceOrigin] || "";

  const volumeElement = (() => {
    const elements = [];
    const middleElement = <>, </>;
    if (itemData['24h_volume']) {
      elements.push(<><span className="text-white">{itemData['24h_volume']}</span> in 24h</>);
    }
    if (itemData['48h_volume']) {
      elements.push(<><span className="text-white">{itemData['48h_volume']}</span> in 48h</>);
    }
    if (itemData['90d_volume']) {
      elements.push(<><span className="text-white">{itemData['90d_volume']}</span> in 90d</>);
    }
    if (elements.length === 0) {
      return null;
    }
    const combinedElements = elements.reduce((prev, curr) => [prev, middleElement, curr]);
    return <>
      <span className="text-purple-400">Sold </span>{combinedElements}<br />
    </>
  })();

  return (
    <div className="text-white font-mono min-w-max whitespace-nowrap" onClick={e => {
      e.stopPropagation();  // to prevent clicking the elements outside when clicking inside the infobox
    }}>
      <h2 className="text-lg font-semibold">{itemData.item_name}</h2>
      <div className={`${itemData.type === 'Mod' ? 'flex' : ''} w-fit`}>
        
        {/* image */}
        {
          itemData.type === 'Mod' ?
          <img src={itemData.icon_url} alt={itemData.item_name} className={`h-64 mr-2 object-cover`} /> :
          <img src={itemData.thumb_url} alt={itemData.item_name} className={`h-16 object-cover`} />
        }

        <div >
          {/* item type */}
          {itemData.type ? <><span className="text-green-500">{itemData.type}</span><br /></> : null}
          
          {/* links (Market | Wiki) */}
          <a href={itemData.market_link} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
            Market
          </a> 
          {
            itemData.wiki_link ? (<>
              <span> | </span>
              <a href={itemData.wiki_link} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
                Wiki
              </a>
            </>): null
          }
          <br />

          {/* Price */}
          <span className="text-yellow-300">{priceText}</span> <span className="font-bold">{formatPrice(itemData.price)}</span>{plat}
          {
            itemData.cur_lowest_sell_price ? (<>
              <span className="text-yellow-300">, Lowest</span> <span className="font-bold">{formatPrice(itemData.cur_lowest_sell_price)}</span>{plat}
            </>) : null
          }
          {
            itemData.priceMax && itemData.type && (itemData.type === 'Mod' || itemData.type === 'Arcane') ? (<>
              <span className="text-yellow-300">, R.Max</span> <span className="font-bold">{formatPrice(itemData.priceMax)}</span>{plat}
            </>) : null
          }
          <br />
          
          {/* Volume */}
          {volumeElement}

          {
            itemData['last_update'] ? (<>
              <span className="text-gray-500 text-xs">(Data fetched at {new Intl.DateTimeFormat("en-US", {timeStyle: "medium", dateStyle: "medium",}).format(new Date(Date.parse(itemData['last_update'])))})</span>
            </>) : null
          }
        </div>
      </div>
    </div>
  );
}

export default function ItemInfobox({ setting, itemName }) {
  const { isPending: itemIsPending, isFetching: itemIsFetching, error: itemError, data: itemData } = useQuery({
    queryKey: ['item_infobox_data', itemName, setting.price_origin, setting.oracle_type],
    queryFn: () => fetchItemInfoboxData(itemName, setting.price_origin, setting.oracle_type),
    staleTime: Infinity, // 5 minutes
  })

  const header = (<>
    <a 
      className={`${
        itemIsPending || itemIsFetching ? 'text-gray-500' : 
        itemError || (itemData && Object.keys(itemData).length === 0) ? 'text-white' :
        'text-white font-bold underline decoration-dashed underline-offset-3'} font-mono`} 
      href={itemData && itemData.market_link ? itemData.market_link : null}
      target="_blank"
      rel="noopener noreferrer"
    >
      {itemName}
    </a>
  </>)

  const content = (
    !itemIsPending && !itemError && itemData && Object.keys(itemData).length !== 0 ? 
      <ItemInfoboxInner itemData={itemData} /> : 
      null
  );
  
  return <Infobox header={header} content={content} />;
}

