import { fetchItemInfoboxData } from "../api/fetch";
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import Infobox from "./infobox";

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

export default function RivenVariantsInfobox({ rivenModInfo, header }) {
  const weaponInfo = rivenModInfo.familyUnames.map(uname => {
    const weaponName = rivenModInfo.weaponNameMap[uname] || uname;
    const disposition = rivenModInfo.weaponRivenDispositionMap[uname] || null;
    return { uname, weaponName, disposition };
  });

  const renderHeader = () => {
      return header;
  }

  const renderInfoboxContent = () => {
    return <div className="text-white font-mono min-w-max whitespace-nowrap">
      <h2 className="text-lg font-semibold">Variants for {rivenModInfo.weaponName}</h2>
      <div >
        {weaponInfo.map(info => (
          <p><b className="text-yellow-400">{info.weaponName}</b>: {info.disposition?.toFixed(2) || 'N/A'}x</p>
        ))}
      </div>
    </div>;
  };
  
  return <Infobox
    renderHeader={renderHeader}
    renderInfoboxContent={renderInfoboxContent}
  />;
}