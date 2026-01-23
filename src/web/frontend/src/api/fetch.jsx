
async function tryFetchJson(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`Error fetching ${url}: ${res.statusText}`);
    }
    return res.json();
}

export async function fetchMarketData() {
    return tryFetchJson('/api/get_market_data');
}

export async function fetchRefreshData() {
    return tryFetchJson('/api/refresh_all_data');
}

export async function fetchRelicData() {
    return tryFetchJson('/api/relic_data');
}

export async function fetchFunctionItemSearchText(oracleType, ducantorPriceOverride, searchText) {
    return tryFetchJson(
        '/api/function_item', {
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
        '/api/function_item', {
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
        '/api/price_oracle', {
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
    return tryFetchJson('/api/syndicate_data');
}

export async function fetchItemInfoboxData(itemName, oracleType, ducantorPriceOverride) {
    return tryFetchJson(
        '/api/item_infobox', {
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
    return tryFetchJson('/api/transient_data');
}