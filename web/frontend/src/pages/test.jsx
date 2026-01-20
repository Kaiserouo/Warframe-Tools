import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';
import { Loading, Error } from '../components/loading_status.jsx';
import { fetchMarketData, fetchFunctionItemSearchText } from '../api/fetch.jsx';


async function makehandleSubmit(setPollStatus, fetchTaskIdCallback, fetchStatusCallback) {
  /*
  setPollStatus: function to update polling status state, should be useState setter.
    pollStatus = {
      'status': "submitting" | "in_progress" | "done" | "error", // current status
        // "submitting": task is being submitted
        // "in_progress": task is being processed
        // "done": task is completed
        // "error": error occurred
      'taskId': str | null,   // task ID returned from server
        // only meaningful when status is "submitting" or "in_progress"
      'result': any | null,
        // if status is "done", contains the result data
      'error': any | null,
        // if status is "error", contains the error information
      'progress': { current: int, total: int }
        // only meaningful when status is "in_progress"
  }
  fetchTaskIdCallback: async Callback[] => str
    initiate the task and get task ID
  fetchStatusCallback: async Callback[str] => { status: str, data: any }
    fetch the status of the task using task ID, should be {status, current, total, data, error}
    

  note that during "submitting" and "in_progress", if there are previous submits,
  they would be in 'result' or 'error'.
  */
  return async () => {
    setPollStatus(prev => ({ ...prev, status: "submitting" }));
    
    try {
      // Fetch initial task

      setPollStatus(prev => ({ ...prev, taskId: task_id }));
  
      // Poll for progress
      let isDone = false;
      while (!isDone) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const progressResponse = await fetch(`/api/progress/${task_id}`);
        const progressData = await progressResponse.json();
        
        if (progressData.status === 'done') {
          setPollStatus(prev => ({ ...prev, result: progressData.data }));
          isDone = true;
        } else {
          setPollStatus(prev => ({ ...prev, progress: { current: progressData.current, total: progressData.total } }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setPollStatus(prev => ({ ...prev, isSubmitting: false, taskId: null }));
    }
  };
}

export default function Test({setting}) {

  const [input, setInput] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [pollStatus, setPollStatus] = useState({
    'taskId': null,
    'isSubmitting': false,
    'result': null,
    'progress': { current: 0, total: 0 }
  });

  const fetchTaskIdCallback =  async () => fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "data": input })
      }).then(res => res.json()).then(data => data.task_id);

  const fetchStatusCallback = async (taskId) => fetch(`/api/progress/${taskId}`)
      .then(res => res.json());


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
          disabled={isSubmitting}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
        >
          Submit
        </button>
      </div>
      
      {isSubmitting && taskId && (
        <Loading message={`Progress: ${progress.current}/${progress.total}`} />
      )}
      
      {result && (
        <div className="p-4 bg-gray-800 text-white rounded">
          {JSON.stringify(result)}
        </div>
      )}
    </div>
    </div>
  </>);
}

