import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchFunctionItemSearchText } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';

export default function Test({setting}) {

  const [input, setInput] = useState('');
  const [pollStatus, setPollStatus] = useState({
    'taskId': null,
    'status': "done",
    'result': null,
    'progress': null
  });

  const fetchTaskIdCallback = async () => fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "data": input })
      }).then(res => res.json()).then(data => data.task_id);

  const fetchStatusCallback = async (taskId) => fetch(`/api/progress/${taskId}`).then(res => res.json());

  const handleSubmit = makeHandleSubmit(setPollStatus, fetchTaskIdCallback, fetchStatusCallback);
  console.log("Poll Status:", pollStatus);
  console.log("handleSubmit:", handleSubmit);

  return (<>
    <div className="mx-4 my-4">
        <div className="text-2xl font-bold text-white my-2">
            <p>Test</p>
        </div>
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
          placeholder="Enter input..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pollStatus.status === "submitting" || pollStatus.status === "in_progress"}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={pollStatus.status === "submitting" || pollStatus.status === "in_progress"}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
        >
          Submit
        </button>
      </div>
      
      {pollStatus.status === "submitting" || pollStatus.status === "in_progress" ? (
        <Loading message={`Progress: ${pollStatus.progress ? pollStatus.progress.current : "-"}/${pollStatus.progress ? pollStatus.progress.total : "-"}`} />
      ) : null}
      {pollStatus.status === "error" ? (
        <Error message={`ERROR: ${pollStatus.error}`} />
      ) : null}
      
      {pollStatus.result && (
        <div className="p-4 bg-gray-800 text-white rounded">
          {JSON.stringify(pollStatus.result)}
        </div>
      )}
    </div>
    </div>
  </>);
}

