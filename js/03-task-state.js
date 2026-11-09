function normalizeState(raw={}){
  const store=Array.isArray(raw.taskStore)?raw.taskStore:[];
  const oldActive=(Array.isArray(raw.tasks)?raw.tasks:[]).find(task=>task.id===raw.activeTaskId);
  const converted=store.filter(item=>!item.completed).map((item,index)=>({
    id:item.id??Date.now()+index,taskName:String(item.taskName||'Task').trim()||'Task',
    durationMinutes:Math.max(1,Number(item.durationMinutes)||DEFAULT_DURATION),
    workedMs:Math.max(0,Number(item.totalWorkedMs)||Number(item.workedMs)||Number(item.cycleWorkedMs)||0),
    isActive:false,runningSinceMs:null,createdAt:item.createdAt||new Date().toISOString()
  }));
  if(oldActive&&!converted.some(t=>t.id===oldActive.sourceId||t.id===oldActive.id)){
    converted.unshift({id:oldActive.sourceId||oldActive.id,taskName:oldActive.taskName||'Task',durationMinutes:oldActive.durationMinutes||DEFAULT_DURATION,workedMs:TaskCore.workedMs({workedMs:Number(oldActive.workedBeforePauseMs)||0,isActive:!oldActive.isPaused,runningSinceMs:oldActive.runningSinceMs}),isActive:false,runningSinceMs:null,createdAt:oldActive.createdAt||new Date().toISOString()});
  }
  let tasks=converted;
  for(const old of (Array.isArray(raw.tasks)?raw.tasks:[])){
    if(old.id===raw.activeTaskId)continue;
    if(tasks.some(t=>t.id===(old.sourceId||old.id)))continue;
    tasks.push({id:old.sourceId||old.id,taskName:old.taskName||'Task',durationMinutes:old.durationMinutes||DEFAULT_DURATION,workedMs:Number(old.workedBeforePauseMs)||0,isActive:false,runningSinceMs:null,createdAt:old.createdAt||new Date().toISOString()});
  }
  const active=tasks.find(t=>t.id===raw.activeTaskId);
  if(active){Object.assign(active,{isActive:true,runningSinceMs:Date.now()})}
  const history=(Array.isArray(raw.history)?raw.history:[]).filter(row=>row&&!row.isDistractionPenalty&&!row.isStarHourPenalty&&!row.isStarDailyPenalty&&['success','fail'].includes(row.result)).map(row=>({id:row.id||Date.now()+Math.random(),taskName:row.taskName||'Task',result:row.result,workedMs:Math.max(0,Number(row.workedMs)||0),completedAt:row.completedAt||new Date().toISOString()}));
  return {tasks,history,activeTaskId:active?.id??null,historyOpen:false};
}
function addTask(name,durationMinutes=DEFAULT_DURATION,now=Date.now()){
  const task={id:now+Math.floor(Math.random()*1000),taskName:name.trim(),durationMinutes:Math.max(1,Number(durationMinutes)||DEFAULT_DURATION),workedMs:0,isActive:false,runningSinceMs:null,createdAt:new Date(now).toISOString()};
  state.tasks.push(task);return task;
}
function activateTask(id,now=Date.now()){
  if(state.activeTaskId)throw new Error('Pause the active task before starting another');
  const task=state.tasks.find(item=>item.id===id);if(!task)throw new Error('Task not found');
  Object.assign(task,TaskCore.start(task,now));state.activeTaskId=task.id;return task;
}
function pauseTask(now=Date.now()){
  const task=activeTask();if(!task)return null;
  Object.assign(task,TaskCore.pause(task,now));state.activeTaskId=null;return task;
}
function finishTask(result,now=Date.now()){
  const task=activeTask();if(!task)return null;
  const finished=TaskCore.finish(state.tasks,task.id,result,now);
  state.history.unshift(finished.record);state.tasks=finished.tasks;state.activeTaskId=null;return finished.record;
}
