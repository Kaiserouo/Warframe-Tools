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

export default function RivenInfobox({ weaponName }) {
  const { isPending: weaponIsPending, isFetching: weaponIsFetching, error: weaponError, data: weaponData } = {
    isPending: false, isFetching: false, error: null, data: null
  }

  const header = (
      <a 
        className={`${
          weaponIsPending || weaponIsFetching ? 'text-gray-500' : 
          weaponError || (weaponData && Object.keys(weaponData).length === 0) ? 'text-yellow-400' :
          'text-yellow-400 font-bold underline decoration-dashed underline-offset-3'} text-lg font-bold`} 
        href={weaponData && weaponData.market_link ? weaponData.market_link : null}
        target="_blank"
        rel="noopener noreferrer"
      >
        {weaponName}
      </a>
  );

  const content = (
    // !weaponIsPending && !weaponError && weaponData && Object.keys(weaponData).length !== 0 ? 
    //   (<ItemInfoboxInner weaponData={weaponData} />) : 
    //   (<ItemInfoboxInnerNoData weaponName={weaponName} />)
      (<ItemInfoboxInnerNoData weaponName={weaponName} />)
  );
  
  return <Infobox
    header={header}
    content={content}
  />;
}