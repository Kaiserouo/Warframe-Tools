
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

export async function fetchFunctionItemSearchText(oracleType, searchText) {
    return tryFetchJson(
        '/api/function_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'oracle_type': oracleType,
                'search_text': searchText,
            }),
        }
    );
}

export async function fetchFunctionItemItemList(oracleType, itemList) {
    return tryFetchJson(
        '/api/function_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'oracle_type': oracleType,
                'item_list': itemList,
            }),
        }
    );
}

export async function fetchPriceOracle(oracleType, itemList) {
    return tryFetchJson(
        '/api/price_oracle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'oracle_type': oracleType,
                'item_names': itemList,
            }),
        }
    );
}

export async function fetchSyndicateData() {
    return tryFetchJson('/api/syndicate_data');
}

export async function fetchItemInfoboxData(itemName, oracleType) {
    return tryFetchJson(
        '/api/item_infobox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'oracle_type': oracleType,
                'item_name': itemName,
            }),
        }
    );
}

export async function fetchTransientData() {
    return tryFetchJson('/api/transient_data');
}