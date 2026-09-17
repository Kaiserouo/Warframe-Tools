
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
    weapon_name_map: await tryFetchJson('api/public_export/data/en/get_weapon_name_map')
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