function sendMacroDroidState(taskName,reminderEpoch,taskState,successMessage='',silent=false){
  if(!MACRODROID_WEBHOOK_URL)return Promise.resolve(false);
  const sep=MACRODROID_WEBHOOK_URL.includes('?')?'&':'?';
  const url=MACRODROID_WEBHOOK_URL+sep+'task_name='+encodeURIComponent(taskName||'')+'&reminder_epoch='+encodeURIComponent(Math.max(0,Math.round(Number(reminderEpoch)||0)))+'&task_state='+encodeURIComponent(taskState||'none');
  return fetch(url,{method:'GET',mode:'no-cors'}).then(()=>true).catch(()=>false)
}
function clearMacroDroidState(){return sendMacroDroidState('',0,'none','',true)}
function autoSendMacroDroidForActiveTask(){
  const a=activeTask();
  if(!a||a.isPaused)return clearMacroDroidState();
  const remaining=taskRemainingMs(a);
  if(remaining<=1*60*1000)return clearMacroDroidState();
  const reminderEpoch=Date.now()+remaining-1*60*1000;
  if(a.macroReminderEpochSent&&Math.abs(a.macroReminderEpochSent-reminderEpoch)<2000)return;
  sendMacroDroidState(a.taskName,reminderEpoch,'active','',true).then(ok=>{
    if(ok){a.macroStateSentForTaskId=a.id;a.macroReminderEpochSent=reminderEpoch;save()}
  })
}
function markPastStarHoursAsHandled(){
  const now=new Date();
  for(let h=STAR_START_HOUR;h<STAR_END_HOUR;h++){
    const slotEnd=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h+1,0,0,0);
    const key=todayKey(new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,0,0,0))+'-'+String(h).padStart(2,'0');
    if(Date.now()>=slotEnd.getTime()){
      state.starHourPenaltyApplied[key]=true
    }
  }
}
