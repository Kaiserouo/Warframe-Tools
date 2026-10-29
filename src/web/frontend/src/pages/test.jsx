import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

async function tryFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Error fetching ${url}: ${res.statusText}`);
  }
  return res.json();
}

async function fetchAlecaframeData() {
  return tryFetchJson('https://api.alecaframe.com/prices/priceData', {
    method: 'POST',
    headers: {
      // 'Content-Type': 'text/plain',
    },
    body: JSON.stringify(['revenant_prime_chassis', 'revenant_prime_set']),
  });
}

export default function Test({setting}) {

  const { data, error, isLoading } = useQuery({
    queryKey: ['alecaframeData'],
    queryFn: fetchAlecaframeData,
  });

  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white my-2">
        <p>Test</p>
      </div>
      {isLoading ? (
        <p className="text-white">Loading...</p>
      ) : error ? (
        <p className="text-white">Error: {error.message}</p>
      ) : data ? (
        <p className="text-white">Data: {JSON.stringify(data)}</p>
      ) : (
        <p className="text-white">No data</p>
      )}
    </div>
  </>);
}

