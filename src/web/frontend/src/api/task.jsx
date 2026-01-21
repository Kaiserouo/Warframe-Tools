export function makeHandleSubmit(setPollStatus, fetchTaskIdCallback, fetchStatusCallback = null, fetchStopCallback = null) {
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
      'data': any | null,
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
      'data': null,
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
    if null, we use `async (taskId) => fetch(`/api/progress/${taskId}`).then(res => res.json());`
  fetchStopCallback: async Callback[str] => null
    stop the task using task ID
    if null, we use `async (taskId) => fetch(`/api/progress_stop/${taskId}`).then(res => res.json());`
    
  note that during "submitting" and "in_progress", if there are previous submits,
  they would be in 'result' or 'error'.

  the return would be a callback: async (ignore_obj) => {}
  ignore_obj should be an object of {'ignore': true | false}, if true,
  the polling would be stopped immediately after the next fetchStatusCallback and thus ignoring the result
  when ignore is true
  e.g.: ref. https://react.dev/learn/you-might-not-need-an-effect#fetching-data
    useEffect(() => {
      ignore_obj = { 'ignore': false };
      if (searchText !== null) {
        handleSubmit(ignore_obj);
      }
      return () => { ignore_obj['ignore'] = true; };
    }, [searchText, handleSubmit, setting.oracle_type]);
  */

  const defaultFetchStatusCallback = async (taskId) => fetch(`/api/progress/${taskId}`).then(res => res.json());
  const defaultFetchStopCallback = async (taskId) => fetch(`/api/progress_stop/${taskId}`).then(res => res.json());

  return async (ignore_obj) => {
    setPollStatus(prev => ({ ...prev, status: "submitting" }));
    
    try {
      // Fetch initial task
      let task_id = await fetchTaskIdCallback()
      setPollStatus(prev => ({ ...prev, status: "in_progress", taskId: task_id, progress: null }));
  
      // Poll for progress
      let isDone = false;
      while (!isDone) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (ignore_obj && ignore_obj['ignore']) {
          (fetchStopCallback || defaultFetchStopCallback)(task_id);
          return;
        }
        
        const progressData = await (fetchStatusCallback || defaultFetchStatusCallback)(task_id);
        
        if (progressData.status === 'done') {
          setPollStatus(prev => ({ ...prev, status: "done", data: progressData.data, error: null, taskId: null }));
          isDone = true;
        } else if (progressData.status === 'error') {
          setPollStatus(prev => ({ ...prev, status: "error", data: null, error: progressData.error, taskId: null }));
          isDone = true;
        } else {
          setPollStatus(prev => ({ ...prev, progress: { current: progressData.current, total: progressData.total } }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setPollStatus(prev => ({ ...prev, status: "error", data: null, error: error, taskId: null }));
    }
  };
}