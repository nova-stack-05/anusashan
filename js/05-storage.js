function load(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(raw){try{Object.assign(state,JSON.parse(raw))}catch(e){}}
  state.wallet=sanitizeNumber(state.wallet,DEFAULT_WALLET);
  state.reward=String(sanitizeNumber(state.reward,DEFAULT_REWARD));
  state.penalty=String(sanitizeNumber(state.penalty,DEFAULT_PENALTY));
  if(!Array.isArray(state.tasks))state.tasks=[];
  if(!Array.isArray(state.taskStore))state.taskStore=[];
  if(!Array.isArray(state.history))state.history=[];
  if(typeof state.showStoreList!=='boolean')state.showStoreList=false;
  if(typeof state.showInstructions!=='boolean')state.showInstructions=false;
  if(typeof state.showDisclaimer!=='boolean')state.showDisclaimer=false;
  if(typeof state.editStoreTaskId==='undefined')state.editStoreTaskId=null;
  if(typeof state.editStoreTaskName!=='string')state.editStoreTaskName='';
  if(typeof state.editStoreTaskDurationText!=='string')state.editStoreTaskDurationText='30 min';
  if(typeof state.starHourWorkMs!=='object'||!state.starHourWorkMs)state.starHourWorkMs={};
  if(typeof state.starHourPenaltyApplied!=='object'||!state.starHourPenaltyApplied)state.starHourPenaltyApplied={};
  if(typeof state.starDailyWorkMs!=='object'||!state.starDailyWorkMs)state.starDailyWorkMs={};
  if(typeof state.starDailyPenaltyApplied!=='object'||!state.starDailyPenaltyApplied)state.starDailyPenaltyApplied={};
  if(typeof state.starDailyReminderShown!=='object'||!state.starDailyReminderShown)state.starDailyReminderShown={};
  if(typeof state.lastStarTickAt!=='number')state.lastStarTickAt=Date.now();
  const storeNormalized=normalizeDurationInput(state.storeDurationText||'30 min');
  state.storeDurationText=storeNormalized?storeNormalized.text:'30 min';
  migrateTasks();migrateTaskStore();normalizeQueueOrdering();normalizeTaskStoreOrdering();syncActive()
}
function activateTask(task){
  if(!task)return;
  if(task.activatedAt&&(task.runningSinceMs||task.isPaused))return;
  const now=Date.now(),durationMinutes=Math.max(1,sanitizeNumber(task.durationMinutes,DEFAULT_DURATION));
  task.durationMinutes=durationMinutes;task.durationText=formatDuration(durationMinutes);
  task.activatedAt=new Date(now).toISOString();
  task.workedBeforePauseMs=0;
  task.runningSinceMs=now;
  task.isPaused=false;
  task.macroStateSentForTaskId=null;
  task.macroReminderEpochSent=null;
  if(typeof task.wasCompulsoryWhenQueued!=='boolean')task.wasCompulsoryWhenQueued=false;
}
function migrateTasks(){
  state.tasks=state.tasks.map((task,index)=>{
    if(typeof task.taskName!=='string')task.taskName='Task';
    task.reward=sanitizeNumber(task.reward,DEFAULT_REWARD);
    task.penalty=sanitizeNumber(task.penalty,DEFAULT_PENALTY);
    task.durationMinutes=Math.max(1,sanitizeNumber(task.durationMinutes,DEFAULT_DURATION));
    task.durationText=formatDuration(task.durationMinutes);
    if(!task.createdAt)task.createdAt=new Date().toISOString();
    if(typeof task.isPaused!=='boolean')task.isPaused=false;
    if(typeof task.wasCompulsoryWhenQueued!=='boolean')task.wasCompulsoryWhenQueued=false;
    if(typeof task.workedBeforePauseMs!=='number'){
      task.workedBeforePauseMs=Number(task.accumulatedMs)||Number(task.sessionWorkedMs)||0
    }
    if(!task.isPaused&&typeof task.runningSinceMs!=='number'&&task.activatedAt){
      task.runningSinceMs=Date.now()
    }
    if(index!==0&&!task.activatedAt){delete task.runningSinceMs;delete task.activatedAt}
    return task
  })
}
function migrateTaskStore(){
  state.taskStore=state.taskStore.map((item,idx)=>{
    const created=item&&item.createdAt?item.createdAt:new Date().toISOString();
    return{
      id:item&&item.id?item.id:Date.now()+idx,
      taskName:item&&typeof item.taskName==='string'&&item.taskName.trim()?item.taskName.trim():'Stored Task',
      durationMinutes:Math.max(1,sanitizeNumber(item&&item.durationMinutes,DEFAULT_DURATION)),
      completed:!!(item&&item.completed),
      autoServed:!!(item&&item.autoServed),
      createdAt:created,
      lastAttendedAt:item&&item.lastAttendedAt?item.lastAttendedAt:null,
      cycleWorkedMs:Math.max(0,Number(item&&item.cycleWorkedMs)||0),
      totalWorkedMs:Math.max(0,Number(item&&item.totalWorkedMs)||0)
    }
  })
}
function syncActive(){
  if(!state.tasks.length){state.activeTaskId=null;save();return}
  const exists=state.tasks.some(x=>x.id===state.activeTaskId);
  if(!exists)state.activeTaskId=state.tasks[0].id;
  activateTask(activeTask());save()
}
