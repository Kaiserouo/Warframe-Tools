
async function tryFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Error fetching ${url}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMarketData() {
  return tryFetchJson('api/get_market_data');
}

export async function fetchRefreshData() {
  return tryFetchJson('api/refresh_all_data');
}

export async function fetchRelicData() {
  return tryFetchJson('api/relic_data');
}

export async function fetchFunctionItemSearchText(oracleType, ducantorPriceOverride, searchText) {
  return tryFetchJson(
    'api/function_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'oracle_type': oracleType,
        'ducantor_price_override': ducantorPriceOverride,
        'search_text': searchText,
      }),
    }
  );
}

export async function fetchFunctionItemItemList(oracleType, ducantorPriceOverride, itemList) {
  return tryFetchJson(
    'api/function_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'oracle_type': oracleType,
        'ducantor_price_override': ducantorPriceOverride,
        'item_list': itemList,
      }),
    }
  );
}

export async function fetchPriceOracle(oracleType, ducantorPriceOverride, itemList) {
  return tryFetchJson(
    'api/price_oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'oracle_type': oracleType,
        'ducantor_price_override': ducantorPriceOverride,
        'item_names': itemList,
      }),
    }
  );
}

export async function fetchSyndicateData() {
  return tryFetchJson('api/syndicate_data');
}

export async function fetchItemInfoboxData(itemName, oracleType, ducantorPriceOverride) {
  return tryFetchJson(
    'api/item_infobox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'oracle_type': oracleType,
        'ducantor_price_override': ducantorPriceOverride,
        'item_name': itemName,
      }),
    }
  );
}

export async function fetchTransientData() {
  return tryFetchJson('api/transient_data');
}

export async function fetchItemOrders(itemList) {
  return tryFetchJson(
    'api/item_orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'item_names': itemList,
      }),
    }
  );
}

export async function fetchBestTrade(oracle_type, spec) {
  return tryFetchJson(
    'api/function_best_trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'oracle_type': oracle_type,
        'spec': spec,
      }),
    }
  );
}

export async function fetchRivenData() {
  return {
    weapon_name_map: await tryFetchJson('api/public_export/data/en/get_weapon_name_map'),
    weapon_type_map: await tryFetchJson('api/public_export/data/en/get_weapon_type_map'),
    weapon_riven_disposition: await tryFetchJson('api/public_export/data/en/get_weapon_riven_disposition'),
    riven_loctag_map: await tryFetchJson('api/public_export/data/en/get_riven_loctag_map'),
    incarnon_weapon_uname: await tryFetchJson('api/public_export/data/en/get_incarnon_weapons'),
    icon_map: await tryFetchJson('api/public_export/data/en/get_icon_map'),
    weapon_uname_family_map: await tryFetchJson('api/wiki/data/get_weapon_uname_family_map'),
    weapon_family_unames_map: await tryFetchJson('api/wiki/data/get_weapon_family_unames_map'),
  };
}
export async function fetchBaroData() {
  return {
    baro_items: await tryFetchJson('api/wiki/data/get_baro_items'),
    mod_name_map: await tryFetchJson('api/public_export/data/en/get_mod_name_map'),
    weapon_name_map: await tryFetchJson('api/public_export/data/en/get_weapon_name_map')
  };
}
export async function fetchPERelicData() {
  return {
    relic_set: await tryFetchJson('api/public_export/data/en/get_relic_set'),
    relic_reward: await tryFetchJson('api/public_export/data/en/get_relic_reward'),
    name_lookup_map: await tryFetchJson('api/public_export/data/en/get_name_lookup_map'),
  };
}
export async function fetchMissingItemChecklistData() {
  return {
    missing_item_checklist: await tryFetchJson('api/missing_item_checklist'),
    mod_name_map: await tryFetchJson('api/public_export/data/en/get_mod_name_map'),
    weapon_name_map: await tryFetchJson('api/public_export/data/en/get_weapon_name_map'),
    icon_map: await tryFetchJson('api/public_export/data/en/get_icon_map'),
  };
}
export async function fetchLoadoutData() {
  return {
    archon_shard_map: await tryFetchJson('api/other/data/get_archon_shard_info'),
    mod_name_map: await tryFetchJson('api/public_export/data/en/get_mod_name_map'),
    warframe_info_map: await tryFetchJson('api/public_export/data/en/get_warframe_info_map'),
    ability_info_map: await tryFetchJson('api/public_export/data/en/get_ability_info_map'),
    icon_map: await tryFetchJson('api/public_export/data/en/get_icon_map'),
    name_lookup_map: await tryFetchJson('api/public_export/data/en/get_name_lookup_map'),

    overframe_item_id_map: await tryFetchJson('api/overframe/data/get_item_id'),
    overframe_mod_id_map: await tryFetchJson('api/overframe/data/get_mod_id'),
    overframe_ability_id_map: await tryFetchJson('api/overframe/data/get_ability_id'),
    overframe_riven_tag_id_map: await tryFetchJson('api/overframe/data/get_riven_tag_id'),
  };
}

// -------------------------------------------------------

/*
  query objects, you can use them for useQuery / useQueries
*/

function _makeQueryCombine(dataNames) {
  /*
    makes combine function for useQueries
    note that useQueries returns an array of query objects. this function combine them into
    a single object, with keys as `dataNames` in the same order as the queries
    e.g., dataNames = ['foo', 'bar'], useQueries data = [fooData, barData], then the returned object would be
    {
      data: {foo: fooData, bar: barData},
      ... // other combined status
    }
  */
  return (postQueries) => {
    const data = postQueries.map((query) => query.data).reduce((acc, data, index) => {
      acc[dataNames[index]] = data;
      return acc;
    }, {})
    return {
      // for data, we return null if we haven't fetched all of the data yet
      data: Object.values(data).some((value) => value === undefined) ? null : data,
      isPending: postQueries.some((query) => query.isPending),
      isFetching: postQueries.some((query) => query.isFetching),
      isError: postQueries.some((query) => query.isError),
      error: postQueries.find((query) => query.isError)?.error || null,
    }
  };
}

function makeStaticQueries(queryConfigs) {
  /*
    e.g., queryConfigs = {
      archon_shard_map: queryArchonShardMap,
      mod_name_map: queryPEModNameMap,
    }
    and the returned data would also be a dict of data with the same keys

    use it with useQueries, e.g., const { isPending, error, data } = useQueries(queriesLoadoutData);
  */
  const keys = Object.keys(queryConfigs);
  return {
    queries: keys.map((key) => queryConfigs[key]),
    combine: _makeQueryCombine(keys),
  }
}

function makeStaticQuery(queryKey, apiUrl) {
  // e.g., query = makeStaticQuery('market_data', 'api/get_market_data'), and then use it with useQuery(query)
  return {
    queryKey: [queryKey],
    queryFn: async () => tryFetchJson(apiUrl),
    staleTime: Infinity
  };
}

// general data
export const queryMarketData = makeStaticQuery('market_data', 'api/get_market_data');
export const queryRelicData = makeStaticQuery('relic_data', 'api/get_relic_data');
export const querySyndicateData = makeStaticQuery('syndicate_data', 'api/syndicate_data');
export const queryTransientData = makeStaticQuery('transient_data', 'api/transient_data');

// WarframePublicExport()
const queryPEWeaponNameMap = makeStaticQuery('pe__weapon_name_map', 'api/public_export/data/en/get_weapon_name_map');
const queryPEWeaponTypeMap = makeStaticQuery('pe__weapon_type_map', 'api/public_export/data/en/get_weapon_type_map');
const queryPEWeaponRivenDisposition = makeStaticQuery('pe__weapon_riven_disposition', 'api/public_export/data/en/get_weapon_riven_disposition');
const queryPERivenLoctagMap = makeStaticQuery('pe__riven_loctag_map', 'api/public_export/data/en/get_riven_loctag_map');
const queryPEIncarnonWeaponUname = makeStaticQuery('pe__incarnon_weapon_uname', 'api/public_export/data/en/get_incarnon_weapons');
const queryPEIconMap = makeStaticQuery('pe__icon_map', 'api/public_export/data/en/get_icon_map');
const queryPEModNameMap = makeStaticQuery('pe__mod_name_map', 'api/public_export/data/en/get_mod_name_map');
const queryPERelicSets = makeStaticQuery('pe__relic_sets', 'api/public_export/data/en/get_relic_sets');
const queryPERelicRewards = makeStaticQuery('pe__relic_rewards', 'api/public_export/data/en/get_relic_rewards');
const queryPENameLookupMap = makeStaticQuery('pe__name_lookup_map', 'api/public_export/data/en/get_name_lookup_map');
const queryPEWarframeInfoMap = makeStaticQuery('pe__warframe_info_map', 'api/public_export/data/en/get_warframe_info_map');
const queryPEAbilityInfoMap = makeStaticQuery('pe__ability_info_map', 'api/public_export/data/en/get_ability_info_map');

// WarframeWiki()
const queryWikiMissingItemChecklist = makeStaticQuery('missing_item_checklist', 'api/missing_item_checklist');
const queryWikiWeaponUnameFamilyMap = makeStaticQuery('wiki__weapon_uname_family_map', 'api/wiki/data/get_weapon_uname_family_map');
const queryWikiWeaponFamilyUnamesMap = makeStaticQuery('wiki__weapon_family_unames_map', 'api/wiki/data/get_weapon_family_unames_map');
const queryWikiBaroItems = makeStaticQuery('wiki__baro_items', 'api/wiki/data/get_baro_items');

// Overframe()
const queryOverframeItemIdMap = makeStaticQuery('overframe__get_item_id', 'api/overframe/data/get_item_id');
const queryOverframeModIdMap = makeStaticQuery('overframe__get_mod_id', 'api/overframe/data/get_mod_id');
const queryOverframeAbilityIdMap = makeStaticQuery('overframe__get_ability_id', 'api/overframe/data/get_ability_id');
const queryOverframeRiven_tagIdMap = makeStaticQuery('overframe__get_riven_tag_id', 'api/overframe/data/get_riven_tag_id');

// other
const queryArchonShardMap = makeStaticQuery('other__get_archon_shard_info', 'api/other/data/get_archon_shard_info');

export const queriesRivenData = makeStaticQueries({
  weapon_name_map: queryPEWeaponNameMap,
  weapon_type_map: queryPEWeaponTypeMap,
  weapon_riven_disposition: queryPEWeaponRivenDisposition,
  riven_loctag_map: queryPERivenLoctagMap,
  incarnon_weapon_uname: queryPEIncarnonWeaponUname,
  icon_map: queryPEIconMap,
  weapon_uname_family_map: queryWikiWeaponUnameFamilyMap,
  weapon_family_unames_map: queryWikiWeaponFamilyUnamesMap,
});
export const queriesBaroData = makeStaticQueries({
  baro_items: queryWikiBaroItems,
  mod_name_map: queryPEModNameMap,
  weapon_name_map: queryPEWeaponNameMap
});
export const queriesInventoryRelicData = makeStaticQueries({
  relic_sets: queryPERelicSets,
  relic_rewards: queryPERelicRewards,
  icon_map: queryPEIconMap,
  name_lookup_map: queryPENameLookupMap,
});
export const queriesMissingItemChecklistData = makeStaticQueries({
  missing_item_checklist: queryWikiMissingItemChecklist,
  mod_name_map: queryPEModNameMap,
  weapon_name_map: queryPEWeaponNameMap,
  icon_map: queryPEIconMap,
});
export const queriesLoadoutData = makeStaticQueries({
  archon_shard_map: queryArchonShardMap,
  mod_name_map: queryPEModNameMap,
  warframe_info_map: queryPEWarframeInfoMap,
  ability_info_map: queryPEAbilityInfoMap,
  icon_map: queryPEIconMap,
  name_lookup_map: queryPENameLookupMap,
  overframe_item_id_map: queryOverframeItemIdMap,
  overframe_mod_id_map: queryOverframeModIdMap,
  overframe_ability_id_map: queryOverframeAbilityIdMap,
  overframe_riven_tag_id_map: queryOverframeRiven_tagIdMap,
});