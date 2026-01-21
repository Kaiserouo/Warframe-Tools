import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchFunctionItemSearchText } from '../api/fetch.jsx';


function makeHandleSubmit(setPollStatus, fetchTaskIdCallback, fetchStatusCallback) {
  /*
  setPollStatus: function to update polling status state, should be useState setter.
    pollStatus = {
      'status': "submitting" | "in_progress" | "done" | "error", // current status
        // "submitting": task is being submitted
        // "in_progress": task is being processed
        // "done": task is completed
        // "error": error occurred
      'taskId': str | null,   // task ID returned from server
        // only meaningful when status is "in_progress"
      'result': any | null,
        // if status is "done", contains the result data
      'error': any | null,
        // if status is "error", contains the error information
      'progress': { current: int, total: int } | null
        // only meaningful when status is "in_progress"
        // if no progress info, it becomes null
    }
    e.g., const [pollStatus, setPollStatus] = useState({
      'taskId': null,
      'status': "done",
      'result': null,
      'progress': null
    });
  fetchTaskIdCallback: async Callback[] => str
    initiate the task and get task ID
  fetchStatusCallback: async Callback[str] => progressData
    fetch the status of the task using task ID, progressData should be {
      'status': "in_progress" | "done" | "error",
      'current': int
      'total': int
      'data': any | null
      'error': any | null
    }
    
  note that during "submitting" and "in_progress", if there are previous submits,
  they would be in 'result' or 'error'.


  */
  return async () => {
    setPollStatus(prev => ({ ...prev, status: "submitting" }));
    
    try {
      // Fetch initial task
      let task_id = await fetchTaskIdCallback()
      setPollStatus(prev => ({ ...prev, status: "in_progress", taskId: task_id, progress: null }));
  
      // Poll for progress
      let isDone = false;
      while (!isDone) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const progressData = await fetchStatusCallback(task_id);
        
        if (progressData.status === 'done') {
          setPollStatus(prev => ({ ...prev, status: "done", result: progressData.data, error: null }));
          isDone = true;
        } else if (progressData.status === 'error') {
          setPollStatus(prev => ({ ...prev, status: "error", result: null, error: progressData.error }));
          isDone = true;
        } else {
          setPollStatus(prev => ({ ...prev, progress: { current: progressData.current, total: progressData.total } }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setPollStatus(prev => ({ ...prev, status: "error", result: null, error: error }));
    } finally {
      setPollStatus(prev => ({ ...prev, taskId: null }) );
    }
  };
}

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

