function load(){
  const raw=localStorage.getItem(STORAGE_KEY);
  let parsed={};if(raw){try{parsed=JSON.parse(raw)}catch{}}
  Object.assign(state,normalizeState(parsed));
  save();
}
function render(){
  const active=activeTask();
  const stored=state.tasks.filter(task=>task.id!==state.activeTaskId);
  document.documentElement.dataset.theme=state.theme;
  document.getElementById('app').innerHTML=`
    <header class="card app-header"><div class="header-row"><div><h1>Anushasan</h1><p>Keep track of what you work on.</p></div><button class="btn-outline theme-toggle" data-action="theme" aria-label="Switch to ${state.theme==='dark'?'light':'dark'} mode">${state.theme==='dark'?'☀ Light':'☾ Dark'}</button></div></header>
    <section class="card active-panel"><h2>Active Task</h2>${active?`<article class="task-card"><strong>${escapeHtml(active.taskName)}</strong><span>${formatWorked(TaskCore.workedMs(active))} worked · ${formatDuration(active.durationMinutes)} · Attempt ${(active.attempts||[]).length+1} of 3</span><span>Distractions: ${active.distractions} / ${active.allowedDistractions} allowed</span><div class="row"><button class="btn-outline" data-action="pause">Pause task</button><button class="btn-distraction" data-action="distraction">Record distraction</button><button class="btn-success" data-action="success">Mark success</button><button class="btn-danger" data-action="fail">Mark failed</button></div></article>`:'<p>No active task. Start one from your stored tasks.</p>'}</section>
    <section class="card"><h2>Add a task</h2><div class="form-row"><label>Task<input id="taskName" placeholder="What are you working on?"></label><label>Duration (min)<input id="duration" type="number" min="1" value="30"></label><label>Allowed distractions<input id="allowedDistractions" type="number" min="0" value="0"></label><button class="btn-gold" data-action="add">Add task</button></div></section>
    <section class="card"><h2>Stored Tasks</h2>${stored.length?stored.map(task=>`<article class="task-card"><strong>${escapeHtml(task.taskName)}</strong><span>${formatWorked(TaskCore.workedMs(task))} worked this attempt · ${formatDuration(task.durationMinutes)} · Distractions ${task.distractions}/${task.allowedDistractions}</span><div class="row"><button class="btn-queue" data-action="start" data-id="${task.id}">${TaskCore.workedMs(task)>0?'Unpause':'Start task'}</button><button class="btn-delete" data-action="delete" data-id="${task.id}">Delete</button></div></article>`).join(''):'<p>No stored tasks yet.</p>'}</section>
    <section class="card"><button class="btn-outline" data-action="history">${state.historyOpen?'Hide history':'Show history'} (${state.history.length})</button>${state.historyOpen?`<div class="history-list">${state.history.length?state.history.map(row=>`<article class="task-card"><strong>${escapeHtml(row.taskName)}</strong><span>${row.result==='success'?'Success overall':row.reattemptsLeft?'No successful attempt yet':'Failed overall'} · ${formatWorked(row.workedMs)} total · ${row.distractions||0} distractions · ${row.completedAt?new Date(row.completedAt).toLocaleString():'Date unavailable'} · ${row.reattemptsLeft} re-attempts left</span><details class="attempt-details"><summary>View ${row.attempts.length} attempt${row.attempts.length===1?'':'s'}</summary>${row.attempts.map(attempt=>`<div class="attempt-row"><strong>Attempt ${attempt.number}: ${attempt.result==='success'?'Success':'Failed'}</strong><span>${formatWorked(attempt.workedMs)} · ${attempt.distractions} distractions · ${escapeHtml(attempt.reason||'Reason unavailable')} · ${attempt.completedAt?new Date(attempt.completedAt).toLocaleString():'Date unavailable'}</span></div>`).join('')}</details>${TaskCore.canRetry(row)?`<div class="row"><button class="btn-queue" data-action="retry" data-id="${row.id}" ${active?'disabled':''}>Retry task (${row.reattemptsLeft} left)</button></div>`:''}</article>`).join(''):'<p>No history yet.</p>'}</div>`:''}</section>
    <section class="card"><button class="btn-danger" data-action="clear">Clear all task data</button></section>
    <section class="card how-to-use">
      <details><summary id="how-to-use-title">How to use Anushasan</summary>
      <p>Track task time and distractions here. Tasks and history stay saved in this browser.</p>
      <ol>
        <li>Add a task, planned minutes, and its distraction limit. The limit can’t be changed later.</li>
        <li>Start a task; only one can run at a time. Pause it to switch tasks. Time and distractions are kept for that attempt.</li>
        <li>Record each distraction. Going over the limit fails that attempt automatically.</li>
        <li>Mark the attempt successful or failed and give a reason. A failed task can be retried until it has 3 attempts total. Each retry starts a fresh timer and distraction count.</li>
        <li>Success on any attempt makes the overall task successful. Otherwise it is failed after attempt 3. History shows retries left and expandable details for every attempt. Successful tasks can’t be retried.</li>
        <li>Use the header button to change theme. Clear all task data removes tasks and history.</li>
      </ol>
      </details>
    </section>`;
}
function bindEvents(){
  const app=document.getElementById('app');
  app.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return;
    persistenceEnabled=true;
    const id=Number(button.dataset.id);
    switch(button.dataset.action){
      case 'add':{const name=document.getElementById('taskName').value.trim();const duration=Number(document.getElementById('duration').value);const allowed=Number(document.getElementById('allowedDistractions').value);if(!name)return alert('Add a task name first.');if(!Number.isInteger(allowed)||allowed<0)return alert('Enter a whole number of allowed distractions.');addTask(name,duration,allowed);break}
      case 'start':try{activateTask(id)}catch(error){alert(error.message)}break;
      case 'pause':pauseTask();break;
      case 'success':{const reason=prompt('Reason for success?','Completed the task');if(reason===null)return;finishTask('success',reason.trim()||'Marked successful');break}
      case 'fail':{const reason=prompt('Reason for failure?','Could not complete the task');if(reason===null)return;finishTask('fail',reason.trim()||'Marked failed');break}
      case 'distraction':{const task=activeTask();if(task&&TaskCore.recordDistraction(task).exceeded)finishTask('fail',`Exceeded distraction allowance (${task.distractions}/${task.allowedDistractions})`);break}
      case 'retry':try{retryTask(id)}catch(error){alert(error.message)}break;
      case 'delete':state.tasks=state.tasks.filter(task=>task.id!==id);break;
      case 'history':state.historyOpen=!state.historyOpen;break;
      case 'theme':state.theme=state.theme==='dark'?'light':'dark';break;
      case 'clear':if(!confirm('Delete all tasks and history? This cannot be undone.'))return;state.tasks=[];state.history=[];state.activeTaskId=null;state.historyOpen=false;localStorage.removeItem(STORAGE_KEY);hasPersistedData=false;persistenceEnabled=false;render();return;
    }
    save();render();
  });
}
load();bindEvents();render();
document.getElementById('splashScreen').style.display='none';
document.getElementById('app').style.display='block';
setInterval(()=>{if(activeTask())render();save()},1000);
