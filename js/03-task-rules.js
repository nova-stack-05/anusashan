function taskWorkedMs(task){
  if(!task)return 0;
  const base=Math.max(0,Number(task.workedBeforePauseMs)||0);
  if(task.isPaused||!task.runningSinceMs)return base;
  return base+Math.max(0,Date.now()-Number(task.runningSinceMs));
}
function taskWorkedMsAt(task,timeMs){
  if(!task)return 0;
  const base=Math.max(0,Number(task.workedBeforePauseMs)||0);
  if(task.isPaused||!task.runningSinceMs)return base;
  return base+Math.max(0,Number(timeMs)-Number(task.runningSinceMs));
}
function taskPlannedMs(task){
  return Math.max(1,Number(task&&task.durationMinutes)||DEFAULT_DURATION)*60000;
}
function taskRemainingMs(task){
  return Math.max(0,taskPlannedMs(task)-taskWorkedMs(task));
}
function taskProgressPercent(task){
  if(!task)return 0;
  return Math.max(0,Math.min(100,Math.round((taskWorkedMs(task)/taskPlannedMs(task))*100)))
}
function storedWorkedMs(item){return Math.max(0,Number(item&&item.totalWorkedMs)||0)}
function historyWorkedMsForStoreItem(item){
  if(!item)return 0;
  return state.history.reduce((sum,h)=>{
    if(!h||h.isStarHourPenalty||h.isDistractionPenalty||h.isStarDailyPenalty)return sum;
    const sameSource=h.sourceType==='store'&&h.sourceId===item.id;
    const sameName=cleanTaskName(h.taskName)===cleanTaskName(item.taskName);
    if(!sameSource&&!sameName)return sum;
    return sum+Math.max(0,Number(h.workedMs)||0)
  },0)
}
function storeItemCumulativeWorkedMs(item){
  return Math.max(storedWorkedMs(item),historyWorkedMsForStoreItem(item))
}
function taskCumulativeWorkedMs(task){
  if(!task)return 0;
  const item=(task.sourceType==='store'&&task.sourceId)?getStoreItem(task.sourceId):null;
  const base=item?storeItemCumulativeWorkedMs(item):0;
  return base+taskWorkedMs(task)
}
function taskCreatedMs(item){const t=new Date(item&&item.createdAt).getTime();return Number.isFinite(t)?t:Date.now()}
function taskLastBaseMs(item){
  const base=item&&item.lastAttendedAt?new Date(item.lastAttendedAt).getTime():taskCreatedMs(item);
  return Number.isFinite(base)?base:taskCreatedMs(item)
}
function isOldEnoughForCompulsory(item){
  return Date.now()-taskLastBaseMs(item)>=COMPULSORY_AFTER_DAYS*24*60*60*1000
}
function activeWorkMsForStoreItem(item){
  const a=activeTask();
  return(a&&item&&a.sourceType==='store'&&a.sourceId===item.id)?taskWorkedMs(a):0
}
function effectiveCycleWorkedMs(item){
  const a=activeTask();
  const active=(a&&item&&a.sourceType==='store'&&a.sourceId===item.id&&a.wasCompulsoryWhenQueued)?taskWorkedMs(a):0;
  return Math.max(0,Number(item&&item.cycleWorkedMs)||0)+active
}
function isAttendedEnough(item){return effectiveCycleWorkedMs(item)>=COMPULSORY_START_MS}
function isCompulsoryStoreItem(item){
  if(!item)return false;
  if(isStarredTaskName(item.taskName))return false;
  return !!(!isAttendedEnough(item)&&isOldEnoughForCompulsory(item));
}
function oldestCompulsoryStoreItem(){return state.taskStore.filter(isCompulsoryStoreItem).sort((a,b)=>taskLastBaseMs(a)-taskLastBaseMs(b))[0]||null}
function queuedTaskForStoreItem(storeId){
  return state.tasks.find(t=>t.sourceType==='store'&&t.sourceId===storeId)||null;
}
function isQueuedOldCompulsoryTask(task){
  const old=oldestCompulsoryStoreItem();
  return !!(
    task &&
    old &&
    task.sourceType==='store' &&
    task.sourceId===old.id &&
    taskWorkedMs(task)<COMPULSORY_START_MS
  );
}
function isCompulsoryActiveTask(task){
  return isQueuedOldCompulsoryTask(task);
}
function countsAsMainTaskToday(task){
  if(!task)return false;
  if(isStarredTaskName(task.taskName))return true;
  if(task.wasCompulsoryWhenQueued)return true;
  if(isCompulsoryActiveTask(task))return true;
  return false;
}

/* Starred task daily full-duration rule */
function starDailyKey(dateKeyValue,itemId){
  return dateKeyValue+'__'+String(itemId);
}
function getStarDailyWorkedMsForItem(item,dateKeyValue=todayKey()){
  if(!item)return 0;
  return Math.max(0,Number(state.starDailyWorkMs[starDailyKey(dateKeyValue,item.id)])||0);
}
function getStarDailyRequiredMsForItem(item){
  return Math.max(1,Number(item&&item.durationMinutes)||DEFAULT_DURATION)*60000;
}
function isStarDailyComplete(item,dateKeyValue=todayKey()){
  return getStarDailyWorkedMsForItem(item,dateKeyValue)>=getStarDailyRequiredMsForItem(item);
}
function itemExistedOnDate(item,dateKeyValue){
  if(!item||!item.createdAt)return false;
  const createdMs=new Date(item.createdAt).getTime();
  if(!Number.isFinite(createdMs))return false;
  const parts=dateKeyValue.split('-').map(Number);
  const dayEnd=new Date(parts[0],parts[1]-1,parts[2]+1,0,0,0,0).getTime();
  return createdMs<dayEnd;
}
function addStarDailyWorkSlice(task,startMs,endMs){
  if(!task||!isStarredTaskName(task.taskName))return false;
  if(task.sourceType!=='store'||!task.sourceId)return false;

  let changed=false;
  let cursor=startMs;

  while(cursor<endMs){
    const d=new Date(cursor);
    const nextMidnight=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0,0,0);
    const sliceEnd=Math.min(endMs,nextMidnight.getTime());
    const key=starDailyKey(todayKey(d),task.sourceId);

    state.starDailyWorkMs[key]=(Number(state.starDailyWorkMs[key])||0)+(sliceEnd-cursor);
    changed=true;

    cursor=sliceEnd;
  }

  return changed;
}
function ensureStarDailyPenalties(){
  const now=new Date();
  const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,0,0,0,0);
  const penaltyDate=todayKey(yesterday);
  let changed=false;

  state.taskStore.forEach(item=>{
    if(!isStarredTaskName(item.taskName))return;
    if(!itemExistedOnDate(item,penaltyDate))return;

    const appliedKey=starDailyKey(penaltyDate,item.id);
    if(state.starDailyPenaltyApplied[appliedKey])return;

    const worked=getStarDailyWorkedMsForItem(item,penaltyDate);
    const required=getStarDailyRequiredMsForItem(item);

    if(worked<required){
      state.wallet=Math.max(0,state.wallet-STAR_DAILY_PENALTY);

      state.history.unshift({
        id:Date.now()+Math.floor(Math.random()*1000),
        taskName:'Daily starred task incomplete: '+item.taskName,
        reward:0,
        penalty:STAR_DAILY_PENALTY,
        result:'fail',
        completedAt:new Date().toISOString(),
        isStarDailyPenalty:true,
        penaltyDate:penaltyDate,
        workedMs:worked,
        requiredMs:required
      });
    }

    state.starDailyPenaltyApplied[appliedKey]=true;
    changed=true;
  });

  return changed;
}
function showStarDailyReminders(){
  const now=new Date();

  if(now.getHours()<20)return;

  const today=todayKey(now);
  const reminders=[];

  state.taskStore.forEach(item=>{
    if(!isStarredTaskName(item.taskName))return;

    const reminderKey=starDailyKey(today,item.id);
    if(state.starDailyReminderShown[reminderKey])return;

    const worked=getStarDailyWorkedMsForItem(item,today);
    const required=getStarDailyRequiredMsForItem(item);

    if(worked<required){
      reminders.push(
        item.taskName+
        ' — Done: '+formatMs(worked)+
        ' / Required: '+formatMs(required)+
        ' | Complete it or face ₹'+STAR_DAILY_PENALTY+' penalty at midnight.'
      );

      state.starDailyReminderShown[reminderKey]=true;
    }
  });

  if(reminders.length){
    save();
    alert('Starred Task Reminder:\n\n'+reminders.join('\n\n'));
  }
}
function starDailyMetaText(item){
  if(!item||!isStarredTaskName(item.taskName))return '';
  const worked=getStarDailyWorkedMsForItem(item);
  const required=getStarDailyRequiredMsForItem(item);
  const done=worked>=required;
  return ' • Today '+formatMs(worked)+'/'+formatMs(required)+(done?' ✅':' ⚠️');
}

function normalizeQueueOrdering(){
  const required=[],starred=[],normal=[];
  state.tasks.forEach(i=>{
    if(isQueuedOldCompulsoryTask(i))required.push(i);
    else if(isStarredTaskName(i.taskName))starred.push(i);
    else normal.push(i);
  });
  state.tasks=[...required,...starred,...normal]
}
function normalizeTaskStoreOrdering(){
  const required=[],starred=[],open=[],done=[];
  state.taskStore.forEach(i=>{
    if(isCompulsoryStoreItem(i))required.push(i);
    else if(isStarredTaskName(i.taskName))starred.push(i);
    else if(i.completed)done.push(i);
    else open.push(i)
  });
  required.sort((a,b)=>taskLastBaseMs(a)-taskLastBaseMs(b));
  state.taskStore=[...required,...starred,...open,...done]
}
function insertIntoPriorityList(listKey,item){
  state[listKey].push(item);
  if(listKey==='tasks')normalizeQueueOrdering();
  if(listKey==='taskStore')normalizeTaskStoreOrdering()
}
function addStarWorkSlice(startMs,endMs){
  let changed=false,cursor=startMs;
  while(cursor<endMs){
    const d=new Date(cursor),hr=d.getHours(),next=new Date(d);
    next.setMinutes(0,0,0);next.setHours(hr+1);
    const sliceEnd=Math.min(endMs,next.getTime());
    if(hr>=STAR_START_HOUR&&hr<STAR_END_HOUR){
      const key=hourKey(d);
      state.starHourWorkMs[key]=(state.starHourWorkMs[key]||0)+(sliceEnd-cursor);
      changed=true
    }
    cursor=sliceEnd
  }
  return changed
}
function ensureStarHourPenalties(){
  let changed=false;
  const now=new Date();
  const y=now.getFullYear();
  const m=now.getMonth();
  const dt=now.getDate();

  for(let h=STAR_START_HOUR;h<STAR_END_HOUR;h++){
    const slotStart=new Date(y,m,dt,h,0,0,0);
    const slotEnd=new Date(y,m,dt,h+1,0,0,0);
    const key=todayKey(slotStart)+'-'+String(h).padStart(2,'0');

    if(Date.now()<slotEnd.getTime())continue;
    if(state.starHourPenaltyApplied[key])continue;

    const worked=state.starHourWorkMs[key]||0;

    if(worked<STAR_MINUTES_PER_HOUR_MS){
      state.wallet=Math.max(0,state.wallet-STAR_HOUR_PENALTY);
      state.history.unshift({
        id:Date.now()+Math.floor(Math.random()*1000),
        taskName:'★ Task shortfall '+key,
        reward:0,
        penalty:STAR_HOUR_PENALTY,
        result:'fail',
        completedAt:new Date().toISOString(),
        isStarHourPenalty:true,
        penaltyDate:key
      });
    }

    state.starHourPenaltyApplied[key]=true;
    changed=true;
  }

  return changed;
}
function accountStarredWorkAndPenalties(){
  const now=Date.now();
  if(!state.lastStarTickAt){state.lastStarTickAt=now;save();return}
  let changed=false;
  const a=activeTask();

  if(a&&countsAsMainTaskToday(a)&&!a.isPaused){
    const tickStart=state.lastStarTickAt;
    const tickEnd=now;
    const workedAtTickStart=taskWorkedMsAt(a,tickStart);
    const planned=taskPlannedMs(a);
    const remainingAtTickStart=Math.max(0,planned-workedAtTickStart);
    if(remainingAtTickStart>0){
      const allowedDuration=Math.min(tickEnd-tickStart,remainingAtTickStart);
      const allowedEnd=tickStart+allowedDuration;
      if(allowedEnd>tickStart){
        changed=addStarWorkSlice(tickStart,allowedEnd)||changed;
        changed=addStarDailyWorkSlice(a,tickStart,allowedEnd)||changed;
      }
    }
  }

  state.lastStarTickAt=now;
  changed=ensureStarHourPenalties()||changed;
  changed=ensureStarDailyPenalties()||changed;
  showStarDailyReminders();
  if(changed)save()
}
function currentHourStarSatisfied(){const key=hourKey(new Date());return(state.starHourWorkMs[key]||0)>=STAR_MINUTES_PER_HOUR_MS}
function currentTaskTextClass(a){if(!a||!isStarredTaskName(a.taskName))return'';return currentHourStarSatisfied()?'star-current-green':'star-current-gold'}
function currentTaskHtml(a){
  if(!a)return'No active task';
  const dot=a.isPaused?'paused-cycle-dot':'current-cycle-dot';
  const compulsory=isCompulsoryActiveTask(a)||isQueuedOldCompulsoryTask(a);
  return'<span class="'+dot+'"></span><span class="'+currentTaskTextClass(a)+(compulsory?' oldest-required':'')+'">'+escapeHtml(a.taskName)+'</span>'+(compulsory?'<span class="required-check">✓</span>':'')
}
function focusDotsHtml(){
  const now=new Date(),currentHour=now.getHours();let greenCount=0,dots='',times='',totalMs=0;
  for(let h=STAR_START_HOUR;h<STAR_END_HOUR;h++){
    const d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,0,0,0);
    const key=hourKey(d),worked=state.starHourWorkMs[key]||0,slotEnd=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h+1,0,0,0);
    totalMs+=worked;const mins=Math.min(59,Math.floor(worked/60000));
    let cls='focus-dot';
    if(worked>=STAR_MINUTES_PER_HOUR_MS){cls+=' green';greenCount++}
    else if(Date.now()>=slotEnd.getTime()){cls+=' red'}
    if(currentHour===h)cls+=' current';
    const label=(h<12?h+' AM':(h===12?'12 PM':(h-12)+' PM'))+'-'+((h+1)<12?(h+1)+' AM':((h+1)===12?'12 PM':(h+1-12)+' PM'));
    const display=currentHour===h?String(mins):'';
    dots+='<span class="'+cls+'" data-focus-label="'+label+': '+mins+' min" title="'+label+': '+mins+' min">'+display+'</span>';
    times+='<span>'+h+'</span>'
  }
  return{greenCount,html:'<div class="focus-strip"><div class="focus-head"><span>*Main Task Today '+greenCount+'/14</span><span>8 AM-10 PM ('+formatMs(totalMs)+')</span></div><div class="focus-dots">'+dots+'</div><div class="focus-times">'+times+'</div></div>'}
}
