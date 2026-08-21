import { fetchItemInfoboxData } from "../api/fetch";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import Infobox from "./infobox";

function ItemInfoboxInner({ weaponData }) {
  /* ref. /api/item_infobox response format in server.py 
     note that 'cur_lowest_sell_price' and 'wiki_link' may be null
  */
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
      <h2 className="text-lg font-semibold">{weaponData.item_name}</h2>
      <div className={`${weaponData.type === 'Mod' ? 'flex' : ''} w-fit`}>
        
        {/* image */}
        {
          weaponData.type === 'Mod' ?
          <img src={weaponData.icon_url} alt={weaponData.item_name} className={`h-64 mr-2 object-cover`} /> :
          <img src={weaponData.thumb_url} alt={weaponData.item_name} className={`h-16 object-cover`} />
        }

        <div >
          {/* item type */}
          {weaponData.type ? <><span className="text-green-500">{weaponData.type}</span><br /></> : null}
          
          {/* links (Market | Wiki) */}
          <a href={weaponData.market_link} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
            Market
          </a> 
          {
            weaponData.wiki_link ? (<>
              <span> | </span>
              <a href={weaponData.wiki_link} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
                Wiki
              </a>
            </>): null
          }
          <br />

          {/* Price */}
          <span className="text-yellow-300">{weaponData.ducantor_price_override ? "Ducantor Price" : "Oracle"}</span> <span className="font-bold">{formatPrice(weaponData.oracle_price)}</span>{plat}
          {
            weaponData.cur_lowest_sell_price !== null ? (<>
              <span className="text-yellow-300">, Lowest</span> <span className="font-bold">{formatPrice(weaponData.cur_lowest_sell_price)}</span>{plat}
            </>) : null
          }
          <br />
          
          {/* Volume */}
          {
            (weaponData['48h_volume'] !== null && weaponData['90d_volume'] !== null) ? (<>
              <span className="text-purple-400">Sold <span className="text-white">{weaponData['48h_volume']}</span> in 48h, <span className="text-white">{weaponData['90d_volume']}</span> in 90d</span><br />
            </>) : null
          }
          {
            (weaponData['48h_volume'] === null && weaponData['90d_volume'] !== null) ? (<>
              <span className="text-purple-400">Sold <span className="text-white">{weaponData['90d_volume']}</span> in 90d</span><br />
            </>) : null
          }
          {
            (weaponData['48h_volume'] !== null && weaponData['90d_volume'] === null) ? (<>
              <span className="text-purple-400">Sold <span className="text-white">{weaponData['48h_volume']}</span> in 48h</span><br />
            </>) : null
          }
          <span className="text-gray-500 text-xs">(Data fetched at {new Intl.DateTimeFormat("en-US", {timeStyle: "medium", dateStyle: "medium",}).format(new Date(Date.parse(weaponData['last_update'])))})</span>
        </div>
      </div>
    </div>
  );
}

function ItemInfoboxInnerNoData({ weaponName }) {
  const weaponNameLink = weaponName.replace(/\s/g, "_").toLowerCase();
  const marketLink = `https://warframe.market/auctions/search?type=riven&sort_by=price_asc&weapon_url_name=${weaponNameLink}`;
  const wikiLink = `https://wiki.warframe.com/w/${weaponNameLink}`;
  return (
    <div className="text-white font-mono min-w-max whitespace-nowrap" onClick={e => {
      e.stopPropagation();  // to prevent clicking the elements outside when clicking inside the infobox
    }}>
      <h2 className="text-lg font-semibold">{weaponName}</h2>
      <div >
        {/* links (Market | Wiki) */}
        <a href={marketLink} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
          Market
        </a> 
        <span> | </span>
        <a href={wikiLink} className="text-blue-400 font-bold underline decoration-dashed hover:decoration-solid " target="_blank" rel="noopener noreferrer">
          Wiki
        </a>
      </div>
    </div>
  );
}

export default function RivenInfobox({ weaponName }) {
  // const { isPending: weaponIsPending, isFetching: weaponIsFetching, error: weaponError, data: weaponData } = useQuery({
  //   queryKey: ['riven_infobox_data', weaponName, setting.oracle_type, setting.ducantor_price_override],
  //   queryFn: () => fetchRivenInfoboxData(weaponName, setting.oracle_type, setting.ducantor_price_override),
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  // })
  const { isPending: weaponIsPending, isFetching: weaponIsFetching, error: weaponError, data: weaponData } = {
    isPending: false, isFetching: false, error: null, data: null
  }

  const renderHeader = () => {
      return <a 
        className={`${
          weaponIsPending || weaponIsFetching ? 'text-gray-500' : 
          weaponError || (weaponData && Object.keys(weaponData).length === 0) ? 'text-yellow-400' :
          'text-yellow-400 font-bold underline decoration-dashed underline-offset-3'} text-lg font-bold`} 
        href={weaponData && weaponData.market_link ? weaponData.market_link : null}
        target="_blank"
        rel="noopener noreferrer"
      >
        {weaponName}
      </a>;
  }

  const renderInfoboxContent = () => {
    return (!weaponIsPending && !weaponError && weaponData && Object.keys(weaponData).length !== 0 ? 
      (<ItemInfoboxInner weaponData={weaponData} />) : 
      (<ItemInfoboxInnerNoData weaponName={weaponName} />)
    );
  };
  
  return <Infobox
    renderHeader={renderHeader}
    renderInfoboxContent={renderInfoboxContent}
  />;
}