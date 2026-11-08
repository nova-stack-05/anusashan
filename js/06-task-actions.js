function pauseActiveTask(){
  const a=activeTask();if(!a||a.isPaused)return;
  a.workedBeforePauseMs=taskWorkedMs(a);
  a.runningSinceMs=null;
  a.isPaused=true;
  a.macroStateSentForTaskId=null;
  a.macroReminderEpochSent=null;
  save();render();clearMacroDroidState()
}
function resumeActiveTask(){
  const a=activeTask();if(!a||!a.isPaused)return;
  const now=Date.now();
  a.runningSinceMs=now;
  a.isPaused=false;
  a.macroStateSentForTaskId=null;
  a.macroReminderEpochSent=null;
  state.lastStarTickAt=now;
  save();render();autoSendMacroDroidForActiveTask()
}
function togglePauseResume(){const a=activeTask();if(!a)return;if(a.isPaused)resumeActiveTask();else pauseActiveTask()}
function alarm(type='normal'){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=type==='danger'?220:660;gain.gain.value=.04;osc.start();osc.stop(ctx.currentTime+.22)
  }catch(e){}
  if(navigator.vibrate)navigator.vibrate(type==='danger'?[250,120,250]:[120,60,120])
}
function buildTask(taskName,durationMinutes,sourceType='',sourceId=null,createdAt=null){
  return{
    id:Date.now()+Math.floor(Math.random()*1000),taskName:taskName.trim(),
    reward:sanitizeNumber(state.reward,DEFAULT_REWARD),penalty:sanitizeNumber(state.penalty,DEFAULT_PENALTY),
    durationMinutes,durationText:formatDuration(durationMinutes),createdAt:createdAt||new Date().toISOString(),
    sourceType,sourceId,workedBeforePauseMs:0,runningSinceMs:null,isPaused:false,
    macroStateSentForTaskId:null,macroReminderEpochSent:null,
    wasCompulsoryWhenQueued:false
  }
}
function addTaskForFuture(){
  const input=document.getElementById('storeTaskInput'),value=input?input.value.trim():'';
  if(!value)return alert('Enter a task.');
  const normalized=normalizeDurationInput(state.storeDurationText||'30 min');
  if(!normalized)return alert('Enter duration like 30 min, 45 min, or 1 hr.');
  const nowIso=new Date().toISOString();
  state.storeDurationText=normalized.text;
  insertIntoPriorityList('taskStore',{
    id:Date.now()+Math.floor(Math.random()*1000),
    taskName:value,
    durationMinutes:normalized.minutes,
    completed:false,
    autoServed:false,
    createdAt:nowIso,
    lastAttendedAt:null,
    cycleWorkedMs:0,
    totalWorkedMs:0
  });
  state.storeDurationText='30 min';if(input)input.value='';
  save();render()
}
function sendStoreTaskToQueue(id){
  const oldest=oldestCompulsoryStoreItem();

  if(oldest){
    const alreadyQueued=queuedTaskForStoreItem(oldest.id);

    if(oldest.id!==id){
      if(alreadyQueued){
        alert('The oldest compulsory task is already in Queued Task. Please complete it first for at least ten minutes.');
      }else{
        alert('Please attempt the oldest task first for at least ten minutes.');
      }
      return;
    }

    if(alreadyQueued){
      alert('This oldest compulsory task is already in Queued Task. Please complete it first for at least ten minutes.');
      return;
    }
  }

  const item=state.taskStore.find(x=>x.id===id);
  if(!item)return;

  const task=buildTask(item.taskName,item.durationMinutes,'store',item.id,item.createdAt);
  task.wasCompulsoryWhenQueued=isCompulsoryStoreItem(item);

  insertIntoPriorityList('tasks',task);
  normalizeQueueOrdering();

  if(!state.activeTaskId)state.activeTaskId=task.id;

  syncActive();
  save();
  render();
  autoSendMacroDroidForActiveTask();
}
function deleteStoreTask(id){
  if(!confirm('Delete this task from Task Store?'))return;
  state.taskStore=state.taskStore.filter(x=>x.id!==id);
  if(state.editStoreTaskId===id){state.editStoreTaskId=null;state.editStoreTaskName='';state.editStoreTaskDurationText='30 min'}
  save();render()
}
function startEditStoreTask(id){
  const item=state.taskStore.find(x=>x.id===id);if(!item)return;
  if(!confirm('Edit this task?'))return;
  state.editStoreTaskId=id;state.editStoreTaskName=item.taskName;
  state.editStoreTaskDurationText=formatDuration(item.durationMinutes||DEFAULT_DURATION);
  state.showStoreList=true;save();render()
}
function cancelEditStoreTask(){state.editStoreTaskId=null;state.editStoreTaskName='';state.editStoreTaskDurationText='30 min';save();render()}
function saveEditStoreTask(id){
  const item=state.taskStore.find(x=>x.id===id);if(!item)return;
  const nameInput=document.getElementById('editStoreTaskName_'+id),durInput=document.getElementById('editStoreTaskDuration_'+id);
  const newName=nameInput?nameInput.value.trim():'',durRaw=durInput?durInput.value.trim():'';
  if(!newName)return alert('Enter task name.');
  const normalized=normalizeDurationInput(durRaw||formatDuration(item.durationMinutes||DEFAULT_DURATION));
  if(!normalized)return alert('Enter duration like 30 min, 45 min, or 1 hr.');
  state.taskStore=state.taskStore.map(x=>x.id===id?{...x,taskName:newName,durationMinutes:normalized.minutes}:x);
  state.tasks=state.tasks.map(t=>t.sourceType==='store'&&t.sourceId===id?{...t,taskName:newName,durationMinutes:normalized.minutes,durationText:normalized.text}:t);
  state.editStoreTaskId=null;state.editStoreTaskName='';state.editStoreTaskDurationText='30 min';
  normalizeTaskStoreOrdering();normalizeQueueOrdering();save();render()
}
function copyQueuedTask(id){
  const src=state.tasks.find(x=>x.id===id);if(!src)return;
  const copy=buildTask(src.taskName,src.durationMinutes,src.sourceType,src.sourceId,src.createdAt);
  copy.wasCompulsoryWhenQueued=!!src.wasCompulsoryWhenQueued;
  insertIntoPriorityList('tasks',copy);save();render()
}
function removeTask(id){
  const wasActive=state.activeTaskId===id;
  state.tasks=state.tasks.filter(x=>x.id!==id);
  if(wasActive)state.activeTaskId=null;
  syncActive();save();render();
  if(activeTask())autoSendMacroDroidForActiveTask();else clearMacroDroidState()
}
function addWorkedTimeToStore(task,workedMs){
  if(!task||task.sourceType!=='store'||!task.sourceId)return;
  const nowIso=new Date().toISOString();

  state.taskStore=state.taskStore.map(item=>{
    if(item.id!==task.sourceId)return item;

    const total=Math.max(0,Number(item.totalWorkedMs)||0)+workedMs;
    const oldCycle=Math.max(0,Number(item.cycleWorkedMs)||0);
    const cycle=task.wasCompulsoryWhenQueued?oldCycle+workedMs:0;

    if(task.wasCompulsoryWhenQueued){
      if(cycle>=COMPULSORY_START_MS){
        return {...item,totalWorkedMs:total,cycleWorkedMs:0,lastAttendedAt:nowIso,completed:true,autoServed:false}
      }
      return {...item,totalWorkedMs:total,cycleWorkedMs:cycle,completed:false,autoServed:false}
    }

    if(workedMs>0){
      return {...item,totalWorkedMs:total,cycleWorkedMs:0,lastAttendedAt:nowIso,completed:true,autoServed:false}
    }

    return {...item,totalWorkedMs:total,autoServed:false}
  })
}
function markSourceTaskCompleted(task){
  if(!task||task.sourceType!=='store'||!task.sourceId)return;
  state.taskStore=state.taskStore.map(item=>{
    if(item.id!==task.sourceId)return item;
    const stillCompulsory=isCompulsoryStoreItem(item);
    return{...item,completed:!stillCompulsory,autoServed:false}
  });
  normalizeTaskStoreOrdering()
}
function finishTask(result){
  const a=activeTask();if(!a)return;
  const workedMs=taskWorkedMs(a);
  addWorkedTimeToStore(a,workedMs);
  if(result==='success'){state.wallet+=sanitizeNumber(a.reward,DEFAULT_REWARD);markSourceTaskCompleted(a);alarm('normal')}
  else{state.wallet=Math.max(0,state.wallet-sanitizeNumber(a.penalty,DEFAULT_PENALTY));alarm('danger')}
  state.history.unshift({...a,result,completedAt:new Date().toISOString(),workedMs});
  state.tasks=state.tasks.filter(x=>x.id!==a.id);
  state.activeTaskId=null;syncActive();save();render();
  if(activeTask())autoSendMacroDroidForActiveTask();else clearMacroDroidState()
}
function addTopup(){state.wallet+=TOPUP;save();render()}
function addDistractionPenalty(){
  state.wallet=Math.max(0,state.wallet-DISTRACTION_PENALTY);
  state.history.unshift({
    id:Date.now()+Math.floor(Math.random()*1000),
    taskName:'Distraction',
    reward:0,
    penalty:DISTRACTION_PENALTY,
    result:'fail',
    completedAt:new Date().toISOString(),
    isDistractionPenalty:true
  });
  alarm('danger');
  save();
  render()
}
function resetScore(){
  if(!confirm('Reset reward, penalty and success record? Work minutes will remain.'))return;
  state.history=[];
  if(typeof state.starHourWorkMs!=='object'||!state.starHourWorkMs)state.starHourWorkMs={};
  if(typeof state.starHourPenaltyApplied!=='object'||!state.starHourPenaltyApplied)state.starHourPenaltyApplied={};
  if(typeof state.starDailyWorkMs!=='object'||!state.starDailyWorkMs)state.starDailyWorkMs={};
  if(typeof state.starDailyPenaltyApplied!=='object'||!state.starDailyPenaltyApplied)state.starDailyPenaltyApplied={};
  if(typeof state.starDailyReminderShown!=='object'||!state.starDailyReminderShown)state.starDailyReminderShown={};
  markPastStarHoursAsHandled();
  state.lastStarTickAt=Date.now();
  save();
  render()
}
function clearAllData(){
  if(!confirm('Clear all Kartavya data? This permanently deletes tasks, history, wallet balance, and focus records. This cannot be undone.'))return;
  isClearingAllData=true;
  sessionStorage.setItem('kartavya-clear-pending','1');
  localStorage.removeItem(STORAGE_KEY);
  location.reload()
}
function toggleInstructions(){state.showInstructions=!state.showInstructions;save();render()}
function toggleDisclaimer(){state.showDisclaimer=!state.showDisclaimer;save();render()}
