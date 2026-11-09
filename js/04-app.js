function load(){
  const raw=localStorage.getItem(STORAGE_KEY);
  let parsed={};if(raw){try{parsed=JSON.parse(raw)}catch{}}
  Object.assign(state,normalizeState(parsed));
  save();
}
function render(){
  const active=activeTask();
  const stored=state.tasks.filter(task=>task.id!==state.activeTaskId);
  document.getElementById('app').innerHTML=`
    <header class="card app-header"><h1>Anushasan</h1><p>Keep track of what you work on.</p></header>
    <section class="card active-panel"><h2>Active Task</h2>${active?`<article class="task-card"><strong>${escapeHtml(active.taskName)}</strong><span>${formatWorked(TaskCore.workedMs(active))} worked · ${formatDuration(active.durationMinutes)}</span><div class="row"><button class="btn-outline" data-action="pause">Pause task</button><button class="btn-success" data-action="success">Mark success</button><button class="btn-danger" data-action="fail">Mark failed</button></div></article>`:'<p>No active task. Start one from your stored tasks.</p>'}</section>
    <section class="card"><h2>Add a task</h2><div class="form-row"><label>Task<input id="taskName" placeholder="What are you working on?"></label><label>Duration (min)<input id="duration" type="number" min="1" value="30"></label><button class="btn-gold" data-action="add">Add task</button></div></section>
    <section class="card"><h2>Stored Tasks</h2>${stored.length?stored.map(task=>`<article class="task-card"><strong>${escapeHtml(task.taskName)}</strong><span>${formatWorked(TaskCore.workedMs(task))} worked · ${formatDuration(task.durationMinutes)}</span><div class="row"><button class="btn-queue" data-action="start" data-id="${task.id}">Start task</button><button class="btn-delete" data-action="delete" data-id="${task.id}">Delete</button></div></article>`).join(''):'<p>No stored tasks yet.</p>'}</section>
    <section class="card"><button class="btn-outline" data-action="history">${state.historyOpen?'Hide history':'Show history'} (${state.history.length})</button>${state.historyOpen?`<div class="history-list">${state.history.length?state.history.map(row=>`<article class="task-card"><strong>${escapeHtml(row.taskName)}</strong><span>${row.result==='success'?'Success':'Failed'} · ${formatWorked(row.workedMs)} · ${row.completedAt?new Date(row.completedAt).toLocaleString():'Date unavailable'}</span></article>`).join(''):'<p>No history yet.</p>'}</div>`:''}</section>
    <section class="card"><button class="btn-danger" data-action="clear">Clear all task data</button></section>`;
}
function bindEvents(){
  const app=document.getElementById('app');
  app.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return;
    persistenceEnabled=true;
    const id=Number(button.dataset.id);
    switch(button.dataset.action){
      case 'add':{const name=document.getElementById('taskName').value.trim();const duration=Number(document.getElementById('duration').value);if(!name)return alert('Add a task name first.');addTask(name,duration);break}
      case 'start':try{activateTask(id)}catch(error){alert(error.message)}break;
      case 'pause':pauseTask();break;
      case 'success':finishTask('success');break;
      case 'fail':finishTask('fail');break;
      case 'delete':state.tasks=state.tasks.filter(task=>task.id!==id);break;
      case 'history':state.historyOpen=!state.historyOpen;break;
      case 'clear':if(!confirm('Delete all tasks and history? This cannot be undone.'))return;state.tasks=[];state.history=[];state.activeTaskId=null;state.historyOpen=false;localStorage.removeItem(STORAGE_KEY);hasPersistedData=false;persistenceEnabled=false;render();return;
    }
    save();render();
  });
}
load();bindEvents();render();
document.getElementById('splashScreen').style.display='none';
document.getElementById('app').style.display='block';
setInterval(()=>{if(activeTask())render();save()},1000);
