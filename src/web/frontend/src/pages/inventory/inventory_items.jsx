import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query'
import { queriesInventoryItemsData } from '../../api/fetch.jsx';
import { Loading, LoadingProgress, Error } from '../../components/loading_status.jsx';
import SearchBar from '../../components/search_bar.jsx';
import InventoryItemTable from '../../components/inv_items_table.jsx';

function parseInventoryItems(invQueryData, inventoryData) {
    /*
        make items
        the inventory item info is formed as follows:
            InventoryItemInfos := {category: InventoryItemInfo, ...}
            InventoryItemInfo := {
                uname: str, 
                name: str, 
                searchString: str, 
                category: str
                isUniqueItem: bool, // if the item is unique, won't show the count. count should be 1
                isBlueprint: bool, // if the item is a blueprint, will show the count. count should be 1
                invQueryData: dict,
                blockId: str, // a unique string to identify the block, can be the uname or something else
            }
        category:
            warframes
            weapons
            companions
            appearance (& appearance bps)
            arcanes
            focus (focus lenses)
            gear (& gear bps)
            keys (& key bps)
            resources (& resource/ore bps, voidrig & arbucep bps)
            prime parts (& prime bps)
            imprints
            vehicles
            archwing weapons
            necramechs
            amps
            relics
            miscellaneous (bps of normal weapons / frames / moas / exilus adapter / galariak prime blade / 
                , shards)
    */

    const {
        name_lookup_map: nameLookupMap,
    } = invQueryData;

    function _parseCategory(category, itemDatas, isBlueprint=false) {
        /* 
            return a list of parsed items for the given category 
        */
        const ls = [];
        try {
            for (const itemData of itemDatas) {
                const item = {
                    uname: itemData['ItemType'],
                    name: nameLookupMap[itemData['ItemType']] || null,
                    count: itemData['ItemCount'] || 1,
                    isUniqueItem: !('ItemCount' in itemData),
                    isBlueprint: isBlueprint,
                    category: category,
                    invQueryData: invQueryData,
                    blockId: `${category}__${ls.length}`,
                };
    
                item['searchString'] = `${item['name']}`;
                
                ls.push(item);
            }
        } catch (e) {
            console.error(`Error parsing category ${category}:`, e);
        }
        return ls;
    }

    return {
        'warframe': _parseCategory('warframe', inventoryData['Suits']),
        'weapons (primary)': _parseCategory('weapons (primary)', inventoryData['LongGuns']),
        'weapons (secondary)': _parseCategory('weapons (secondary)', inventoryData['Pistols']),
        'weapons (melee)': _parseCategory('weapons (melee)', inventoryData['Melee']),
        'weapons (archgun)': _parseCategory('weapons (archgun)', inventoryData['SpaceGuns']),
        'weapons (archmelee)': _parseCategory('weapons (archmelee)', inventoryData['SpaceMelee']),
        'companions (sentinels)': _parseCategory('companions (sentinels)', inventoryData['Sentinels']),
        'companions (kubrow)': _parseCategory('companions (kubrow)', inventoryData['KubrowPets']),
        'companions (moa)': _parseCategory('companions (moa)', inventoryData['MoaPets']),
        'appearance (flavor items)': _parseCategory('appearance (flavor items)', inventoryData['FlavourItems']),
        'appearance (weapon skins)': _parseCategory('appearance (weapon skins)', inventoryData['WeaponSkins']),
        'arcanes & mods (unupgraded)': _parseCategory('arcanes & mods (unupgraded)', inventoryData['RawUpgrades']),
        'arcanes & mods (upgraded)': _parseCategory('arcanes & mods (upgraded)', inventoryData['Upgrades']),
        'consumables': _parseCategory('consumables', inventoryData['Consumables']),
        'keys': _parseCategory('keys', inventoryData['LevelKeys']),
        'blueprints': _parseCategory('blueprints', inventoryData['Recipes'], true),
        'decoration': _parseCategory('decoration', inventoryData['ShipDecorations']),
        'ayatan treasures': _parseCategory('ayatan treasures', inventoryData['FusionTreasures']),
        'imprints': _parseCategory('imprints', inventoryData['KubrowPetPrints']),
        'landing craft': _parseCategory('landing craft', inventoryData['Ships']),
        'archwing': _parseCategory('archwing', inventoryData['SpaceSuits']),
        'companion weapons': _parseCategory('companion weapons', inventoryData['SentinelWeapons']),
        'necramech': _parseCategory('necramech', inventoryData['MechSuits']),
        'exalted': _parseCategory('exalted', inventoryData['SpecialItems']),
        'misc': _parseCategory('misc', inventoryData['MiscItems']),
        'amps': _parseCategory('amps', inventoryData['OperatorAmps']),
    }
}

function CurrencyBlock({value, label, iconUrl}) {
    return (<>
    <div className="inline-flex flex-row flex-nowrap items-center justify-center gap-x-2 mr-2 px-2 py-1 border rounded bg-gray-900 text-white border-gray-300 whitespace-nowrap shrink-0">
        <div className="text-white text-lg font-bold">{new Intl.NumberFormat("en-US", {style: "decimal"}).format(value)}</div>
        {iconUrl ? <img src={iconUrl} alt={label} className="w-6 h-6" /> : null}
        <div className="text-white text-sm">{label}</div>
    </div>
    </>);
}

function SyndicateBlock({syndicateDict, remainingStanding, label, iconUrl, showStanding=true, isOperationSupply=false}) {
    /* 
    Args:
        syndicateDict: the dict from inventoryData['Affiliation'] for the given syndicate
        remainingStanding: the remaining standing today, null if you don't wanna show this
        label: the label to display for the syndicate
        iconUrl: the icon url to display for the syndicate
        showStanding: whether to show the standing or not
    */

    // the standings are ALL the standings, i.e., including the previous levels
    // we need to subtract that 
    let minusStanding = {
        [-2]: -27000,
        [-1]: -5000,
        [0]: 0,
        [1]: 5000,
        [2]: 27000,
        [3]: 71000,
        [4]: 141000,
        [5]: 240000,
    }
    if (isOperationSupply) {
        minusStanding = {
            [0]: 0,
            [1]: 1000,
            [2]: 3000,
            [3]: 6000,
        }
    }
    const level = syndicateDict?.['Title'] || 0;
    const standing = (syndicateDict?.['Standing'] || 0) - minusStanding[level];
    return (<>
        <div className="inline-flex flex-row flex-nowrap items-center justify-center gap-x-2 mr-2 px-2 py-1 border rounded bg-neutral-900 text-white border-neutral-500 whitespace-nowrap shrink-0">
            <div className="text-yellow-600 text-lg font-bold">lv.{level}</div>
            {showStanding && <div className="text-white text-sm">{new Intl.NumberFormat("en-US", {style: "decimal"}).format(standing)}</div>}
            {iconUrl ? <img src={iconUrl} alt={label} className="h-6" /> : null}
            <div className="text-white text-sm">{label}</div>
        </div>
    </>);
}

function renderInventoryMetadata(inventoryData) {
    const findItem = (category, name) => {
        return inventoryData[category]?.find(item => item['ItemType'] === name)?.ItemCount || 0;
    };
    const kuva = findItem('MiscItems', '/Lotus/Types/Items/MiscItems/Kuva');
    const ducat = findItem('MiscItems', '/Lotus/Types/Items/MiscItems/PrimeBucks');
    const vosfor = findItem('MiscItems', '/Lotus/Types/Items/MiscItems/DistillPoints');
    const kahlStock = findItem('MiscItems', '/Lotus/Types/Items/MiscItems/KahlCreds');
    const voidTraces = findItem('MiscItems', '/Lotus/Types/Items/MiscItems/VoidTearDrop');

    const sMap = (inventoryData['Affiliations'] || []).reduce((acc, syndicate) => {
        acc[syndicate['Tag']] = syndicate;
        return acc;
    }, {});
    const iD = inventoryData;

    return (<>
    <div className="text-white my-2 flex flex-row flex-wrap w-full gap-y-2">
        <CurrencyBlock value={inventoryData['FusionPoints']} label="Endo" iconUrl="https://wiki.warframe.com/images/IconFusionPoints.png" />
        <CurrencyBlock value={inventoryData['RegularCredits']} label="Credit" iconUrl="https://wiki.warframe.com/images/IconCredits.png" />
        <CurrencyBlock value={inventoryData['PremiumCredits']} label="Platinum" iconUrl="https://wiki.warframe.com/images/Platinum.png" />
        <CurrencyBlock value={inventoryData['PremiumCreditsFree']} label="Free Platinum" iconUrl="https://wiki.warframe.com/images/Platinum.png" />
        <CurrencyBlock value={inventoryData['PrimeTokens']} label="Regal Aya" iconUrl="https://wiki.warframe.com/images/PrimeToken.png" />
        <CurrencyBlock value={kuva} label="Kuva" iconUrl="https://wiki.warframe.com/images/Kuva64.png" />
        <CurrencyBlock value={ducat} label="Ducat" iconUrl="https://wiki.warframe.com/images/OrokinDucats.png" />
        <CurrencyBlock value={vosfor} label="Vosfor" iconUrl="https://wiki.warframe.com/images/Vosfor.png" />
        <CurrencyBlock value={kahlStock} label="Kahl Stock" iconUrl="https://wiki.warframe.com/images/KahlStock.png" />
        <CurrencyBlock value={voidTraces} label="Void Traces" iconUrl="https://wiki.warframe.com/images/LuminousIconLarge.png" />
    </div>


    <div className="text-white my-2 flex flex-row flex-wrap w-full gap-y-2">
        <SyndicateBlock
            syndicateDict={sMap["SteelMeridianSyndicate"]} remainingStanding={iD['DailyAffiliation']}
            label="Steel Meridian" iconUrl="https://wiki.warframe.com/images/SteelMeridianFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["ArbitersSyndicate"]} remainingStanding={iD['DailyAffiliation']}
            label="Arbiters of Hexis" iconUrl="https://wiki.warframe.com/images/ArbitersofHexisFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["CephalonSudaSyndicate"]} remainingStanding={iD['DailyAffiliation']}
            label="Cephalon Suda" iconUrl="https://wiki.warframe.com/images/CephalonSudaFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["PerrinSyndicate"]} remainingStanding={iD['DailyAffiliation']}
            label="The Perrin Sequence" iconUrl="https://wiki.warframe.com/images/ThePerrinSequenceFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["RedVeilSyndicate"]} remainingStanding={iD['DailyAffiliation']}
            label="Red Veil" iconUrl="https://wiki.warframe.com/images/RedVeilFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["NewLokaSyndicate"]} remainingStanding={iD['DailyAffiliation']}
            label="New Loka" iconUrl="https://wiki.warframe.com/images/NewLokaFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["ConclaveSyndicate"]} remainingStanding={iD['DailyAffiliationPvp']}
            label="Conclave" iconUrl="https://wiki.warframe.com/images/ConclaveFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["LibrarySyndicate"]} remainingStanding={iD['DailyAffiliationLibrary']}
            label="Cephalon Simaris" iconUrl="https://wiki.warframe.com/images/CephalonSimarisFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["CetusSyndicate"]} remainingStanding={iD['DailyAffiliationCetus']}
            label="Ostron" iconUrl="https://wiki.warframe.com/images/OstronSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["QuillsSyndicate"]} remainingStanding={iD['DailyAffiliationQuills']}
            label="The Quills" iconUrl="https://wiki.warframe.com/images/TheQuillsSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["SolarisSyndicate"]} remainingStanding={iD['DailyAffiliationSolaris']}
            label="Solaris United" iconUrl="https://wiki.warframe.com/images/SolarisUnitedSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["VentKidsSyndicate"]} remainingStanding={iD['DailyAffiliationVentkids']}
            label="Ventkids" iconUrl="https://wiki.warframe.com/images/VentkidsSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["VoxSyndicate"]} remainingStanding={iD['DailyAffiliationVox']}
            label="Vox Solaris" iconUrl="https://wiki.warframe.com/images/VoxSolarisSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["EntratiSyndicate"]} remainingStanding={iD['DailyAffiliationEntrati']}
            label="Entrati" iconUrl="https://wiki.warframe.com/images/EntratiSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["NecraloidSyndicate"]} remainingStanding={iD['DailyAffiliationNecraloid']}
            label="Necraloid" iconUrl="https://wiki.warframe.com/images/NecraloidSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["EntratiLabSyndicate"]} remainingStanding={iD['DailyAffiliationCavia']}
            label="Cavia" iconUrl="https://wiki.warframe.com/images/CaviaSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["ZarimanSyndicate"]} remainingStanding={iD['DailyAffiliationZariman']}
            label="The Holdfasts" iconUrl="https://wiki.warframe.com/images/HoldfastsSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["KahlSyndicate"]} remainingStanding={null}
            label="Kahl's Garrison" iconUrl="https://wiki.warframe.com/images/GarrisonSyndicateFlag.png" showStanding={false}
        />
        <SyndicateBlock
            syndicateDict={sMap["HexSyndicate"]} remainingStanding={iD['DailyAffiliationHex']}
            label="The Hex" iconUrl="https://wiki.warframe.com/images/TheHexSyndicateFlag.png"
        />
        <SyndicateBlock
            syndicateDict={sMap["EventSyndicate"]} remainingStanding={null} 
            label="Operation Supply" iconUrl="https://wiki.warframe.com/images/OperationSyndicateFlag.png" isOperationSupply={true}
        />
    </div>
    </>);
}

export default function InventoryItems({setting}) {
  const [searchText, setSearchText] = useState(null);

  const { isPending: invQueryIsPending, error: invQueryError, data: invQueryData } = useQueries(queriesInventoryItemsData);

  const inventoryItemInfos = useMemo(
    () => {
      if (!invQueryData || !setting.inventory?.data) 
        return {};
      return parseInventoryItems(invQueryData, setting.inventory?.data);
    },
    [invQueryData, setting.inventory?.data]
  );

  console.log("inventoryItems", invQueryData, inventoryItemInfos, searchText);

  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Inventory Items</p>
    </div>
    <div className="flex flex-row justify-between items-center gap-x-4">
      <div>
        <div className="text-white font-sans my-2">
          <p className="text-yellow-500 font-bold">&lt; Requires inventory file: add that in the Options menu &gt;</p>
          <p>Yes I want a offline inventory viewer.</p>
          <p>See what you have in your inventory, hopefully shows everything you can see in your inventory</p>
        </div>

        <SearchBar 
            placeholder="Search..."
            items={[]}
            nameKey={null}
            searchMode="contains"
            setSearchText={setSearchText}
            searchOnChange={true} />
        {searchText && <div className="text-white my-2">Search Text: {searchText}</div>}
    </div>
    </div>

    {setting.inventory?.data && renderInventoryMetadata(setting.inventory?.data)}
    {invQueryIsPending ? <Loading message="Loading inventory data..." /> : null}
    {invQueryError ? <Error message={`ERROR: ${invQueryError}`} /> : null}

    <InventoryItemTable invQueryData={invQueryData} inventoryItemInfos={inventoryItemInfos} searchText={searchText} />
  </div>
  </>);
}