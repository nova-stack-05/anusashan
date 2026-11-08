function disclaimerHtml(){
  if(!state.showDisclaimer)return '';
  return '<div class="card instructions-card"><div class="section-head"><span class="section-dot"></span><div class="sub">Disclaimer</div></div><div class="instructions-body"><p><b>No real money is involved.</b><br>The reward, penalty and wallet balance shown in Kartavya are not actual financial transactions.</p><p>These values are only motivational tools. They create gentle psychological pressure on the mind so that tasks are started, continued and completed with discipline.</p><p>Kartavya does not pay money, deduct money, transfer money, or connect to any bank account.</p><p><b>Simple meaning:</b><br>Reward = mental encouragement.<br>Penalty = self-discipline reminder.<br>Wallet = motivational score balance.</p></div></div>'
}
function instructionsHtml(){
  if(!state.showInstructions)return '';
  return '<div class="card instructions-card"><div class="section-head"><span class="section-dot"></span><div class="sub">How to Use Kartavya</div></div><div class="instructions-body"><p><b>1. Add tasks in Task Store</b><br>Write the task name, enter duration like <b>30 min</b>, <b>1 hr</b>, or <b>1 hr 30 min</b>, and press <b>Add Task</b>.</p><p><b>2. Use * for Main Tasks</b><br>If a task is very important, start its name with <b>*</b>. Starred tasks help complete the rule of 30 minutes main work per hour.</p><p><b>3. Starred Daily Rule</b><br>Every <b>*starred task</b> must be completed daily for its full prescribed duration. Its total time keeps accumulating and showing. If the full duration is not completed by midnight, ₹200 penalty will be applied automatically for that starred task.</p><p><b>4. Queue a task to start</b><br>Press <b>Queue</b>. The timer starts only when the task becomes active/current.</p><p><b>5. Progress bar meaning</b><br><b>Green</b> means time already worked. <b>Red</b> means time still pending. Tap the bar to <b>Pause</b> or <b>Resume</b>.</p><p><b>6. Total Hrs</b><br><b>Total Hrs</b> shows actual active working time spent on that task across sessions. It does not count leftover time or merely the date of creation.</p><p><b>7. Oldest task cycling rule</b><br>Every ordinary stored task keeps cycling until deleted. Starred tasks are controlled separately by the starred daily rule. If an ordinary stored task is not attended for 72 hours, it comes to the top with underline and red check mark. Work on it for at least <b>10 minutes</b>; then it becomes ordinary again.</p><p><b>8. Main Task Today dots</b><br>The dots cover <b>8 AM to 10 PM</b>. Green means 30 minutes or more main-task work. Red means the hour ended without 30 minutes. The current dot shows live minutes. Tap any dot to see counted minutes.</p><p><b>9. Hourly penalty safety</b><br>The app checks today’s hours only. Reset Score keeps work minutes safe and prevents old hours from being charged again.</p><p><b>10. Distraction button</b><br>If you get distracted, press <b>Distraction = -₹10</b>. It deducts ₹10 from Wallet and adds ₹10 to Total Penalty for self-discipline.</p><p><b>11. Shifting tasks</b><br>Drag the <b>⋮⋮</b> handle to shift tasks. The oldest compulsory task, if already queued, remains above starred tasks until it has been attended for 10 minutes.</p><p><b>12. Money note</b><br>Reward, penalty and wallet are only motivational values. No real money is paid or deducted.</p></div></div>'
}
function stats(){
  return{
    reward:state.history.filter(x=>x.result==='success').reduce((a,b)=>a+sanitizeNumber(b.reward,0),0),
    penalty:state.history.filter(x=>x.result==='fail').reduce((a,b)=>a+sanitizeNumber(b.penalty,0),0),
    successCount:state.history.filter(x=>x.result==='success').length,
    total:state.history.length
  }
}
function successPercent(){const s=stats();return s.total===0?100:Math.round((s.successCount/s.total)*100)}
function urgencyClass(){
  const a=activeTask();if(!a)return'safe';
  if(a.isPaused)return'paused';
  const mins=Math.floor(taskRemainingMs(a)/60000);
  if(mins<=5)return'danger';if(mins<=10)return'warning';return'safe'
}
function currentRemainingText(a){
  if(!a)return'Time left 0 min';
  if(a.isPaused)return'Paused • Tap to Resume';
  return formatTimeLeftDisplay(taskRemainingMs(a)/1000)+' • Tap to Pause'
}
function bindDragAndDrop(){
  const dragState={list:null,id:null,overId:null};
  function clearDragClasses(){
    document.querySelectorAll('.draggable-item').forEach(el=>{
      el.classList.remove('over','drag-source')
    })
  }
  function reorderByIds(arr,draggedId,targetId){
    const from=arr.findIndex(x=>x.id===draggedId);
    const to=arr.findIndex(x=>x.id===targetId);
    if(from===-1||to===-1||from===to)return arr;
    const copy=[...arr];
    const moved=copy.splice(from,1)[0];
    copy.splice(to,0,moved);
    return copy
  }
  function reorderList(listKey,draggedId,targetId){
    if(!draggedId||!targetId||draggedId===targetId)return;
    state[listKey]=reorderByIds(state[listKey],draggedId,targetId);
    if(listKey==='tasks')normalizeQueueOrdering();
    if(listKey==='taskStore')normalizeTaskStoreOrdering();
    save();render()
  }
  document.querySelectorAll('.draggable-item').forEach(row=>{
    row.addEventListener('dragover',e=>{
      if(!dragState.list)return;
      const list=row.getAttribute('data-list');
      if(list!==dragState.list)return;
      e.preventDefault();
      clearDragClasses();
      row.classList.add('over');
      dragState.overId=Number(row.getAttribute('data-id'));
      const source=document.querySelector('.draggable-item[data-list="'+dragState.list+'"][data-id="'+dragState.id+'"]');
      if(source)source.classList.add('drag-source')
    });
    row.addEventListener('drop',e=>{
      e.preventDefault();
      const list=row.getAttribute('data-list');
      const targetId=Number(row.getAttribute('data-id'));
      if(list===dragState.list){
        const map={queue:'tasks',store:'taskStore'};
        reorderList(map[list],dragState.id,targetId)
      }
      dragState.list=null;dragState.id=null;dragState.overId=null;
      clearDragClasses()
    });
    row.addEventListener('dragend',()=>{
      dragState.list=null;dragState.id=null;dragState.overId=null;
      clearDragClasses()
    })
  });
  document.querySelectorAll('[data-drag-handle]').forEach(handle=>{
    handle.addEventListener('dragstart',e=>{
      dragState.list=handle.getAttribute('data-list');
      dragState.id=Number(handle.getAttribute('data-id'));
      dragState.overId=null;
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',String(dragState.id))
      }
      const source=document.querySelector('.draggable-item[data-list="'+dragState.list+'"][data-id="'+dragState.id+'"]');
      if(source)source.classList.add('drag-source')
    });
    handle.addEventListener('touchstart',e=>{
      dragState.list=handle.getAttribute('data-list');
      dragState.id=Number(handle.getAttribute('data-id'));
      dragState.overId=null;
      clearDragClasses();
      const source=document.querySelector('.draggable-item[data-list="'+dragState.list+'"][data-id="'+dragState.id+'"]');
      if(source)source.classList.add('drag-source')
    },{passive:false});
    handle.addEventListener('touchmove',e=>{
      if(!dragState.list)return;
      e.preventDefault();
      const touch=e.touches[0];
      if(!touch)return;
      const el=document.elementFromPoint(touch.clientX,touch.clientY);
      const row=el&&el.closest('.draggable-item');
      clearDragClasses();
      const source=document.querySelector('.draggable-item[data-list="'+dragState.list+'"][data-id="'+dragState.id+'"]');
      if(source)source.classList.add('drag-source');
      if(row&&row.getAttribute('data-list')===dragState.list){
        row.classList.add('over');
        dragState.overId=Number(row.getAttribute('data-id'))
      }
    },{passive:false});
    handle.addEventListener('touchend',()=>{
      if(dragState.list&&dragState.overId&&dragState.overId!==dragState.id){
        const map={queue:'tasks',store:'taskStore'};
        reorderList(map[dragState.list],dragState.id,dragState.overId)
      }
      dragState.list=null;dragState.id=null;dragState.overId=null;
      clearDragClasses()
    });
    handle.addEventListener('touchcancel',()=>{
      dragState.list=null;dragState.id=null;dragState.overId=null;
      clearDragClasses()
    })
  })
}
function refreshLive(){
  const a=activeTask(),current=document.getElementById('currentTaskText'),clockInline=document.getElementById('timeLeftInline'),doneBar=document.getElementById('doneBar'),leftBar=document.getElementById('leftBar'),percent=document.getElementById('successPercent'),topCard=document.getElementById('topCard'),activeDuration=document.getElementById('activeDurationText'),activeTotal=document.getElementById('activeTotalHrsText'),deadlineStatus=document.getElementById('deadlineStatusText'),taskBar=document.getElementById('taskBarTap'),focus=document.getElementById('focusDotsWrap');
  if(percent)percent.textContent=successPercent()+'% Success';
  if(focus)focus.innerHTML=focusDotsHtml().html;
  if(a){
    const overdue=taskRemainingMs(a)<=0;
    if(topCard)topCard.className='card top-card '+(a.isPaused?'paused':(overdue?'danger':urgencyClass()));
    if(current)current.innerHTML=currentTaskHtml(a);
    if(clockInline)clockInline.textContent=a.isPaused?'Paused • Tap to Resume':(overdue?'Completed duration • Tap to Pause':currentRemainingText(a));
    if(activeDuration)activeDuration.textContent=formatDuration(a.durationMinutes||0);
    if(activeTotal)activeTotal.textContent=formatMs(taskCumulativeWorkedMs(a));
    if(deadlineStatus)deadlineStatus.textContent=a.isPaused?'Paused':(overdue?'Duration completed':'Remaining: '+formatMs(taskRemainingMs(a)));
    const pct=taskProgressPercent(a);
    if(doneBar)doneBar.style.width=pct+'%';
    if(leftBar)leftBar.style.width=(100-pct)+'%';
    if(taskBar)taskBar.className='bar-wrap tappable'+(a.isPaused?' paused':'')
  }else{
    if(topCard)topCard.className='card top-card safe';
    if(current)current.textContent='No active task';
    if(clockInline)clockInline.textContent='Time left 0 min';
    if(activeDuration)activeDuration.textContent='--';
    if(activeTotal)activeTotal.textContent='--';
    if(deadlineStatus)deadlineStatus.textContent='';
    if(doneBar)doneBar.style.width='0%';
    if(leftBar)leftBar.style.width='100%';
    if(taskBar)taskBar.className='bar-wrap'
  }
}
function render(){
  normalizeTaskStoreOrdering();
  normalizeQueueOrdering();

  const app=document.getElementById('app'),a=activeTask(),s=stats(),urgency=urgencyClass();
  const overdue=!!(a&&taskRemainingMs(a)<=0);
  const endText=a?(a.isPaused?'Paused':(overdue?'Duration completed':'Remaining: '+formatMs(taskRemainingMs(a)))):'';
  const successButtonText='✔️ Success (Get '+rupee(Number(state.reward||DEFAULT_REWARD))+')';
  const failButtonText='❌ Failed (Pay '+rupee(Number(state.penalty||DEFAULT_PENALTY))+')';
  const timeLeftText=a?(a.isPaused?'Paused • Tap to Resume':(overdue?'Completed duration • Tap to Pause':currentRemainingText(a))):'Time left 0 min';
  const focus=focusDotsHtml();

  const queueHtml=state.tasks.length?state.tasks.map((item,idx)=>{
    const isActive=item.id===state.activeTaskId;
    const isStar=isStarredTaskName(item.taskName);
    const isOldQueued=isQueuedOldCompulsoryTask(item);
    const label=isActive?'▶ ':(isStar?'':(idx+1)+'. ');
    const date=createdDateShort(item.createdAt);
    return '<div class="draggable-item'+(isActive?' active':'')+'" data-list="queue" data-id="'+item.id+'"><div class="queue-row"><div><div class="item-name '+(isStar?'star-item-name':'')+'">'+label+'<span class="'+(isOldQueued?'oldest-required':'')+'">'+escapeHtml(item.taskName)+'</span>'+(date?' <span class="item-date">('+escapeHtml(date)+')</span>':'')+(isOldQueued?' <span class="required-check">✓</span>':'')+'</div><div class="item-meta">'+formatDuration(item.durationMinutes||0)+' • Total Hrs '+formatMs(taskCumulativeWorkedMs(item))+'</div></div><button class="mini mini-copy" data-copy-queue="'+item.id+'">Copy</button><button class="drag-handle" draggable="true" data-drag-handle="1" data-list="queue" data-id="'+item.id+'">⋮⋮</button><button class="btn-delete mini" data-remove="'+item.id+'">Delete</button></div></div>'
  }).join(''):'<div class="empty-state">No queued task yet.</div>';

  const storeHtml=state.taskStore.length?state.taskStore.map((item,idx)=>{
    const isRequired=isCompulsoryStoreItem(item),dotClass=isRequired?'red':(item.completed?'green':'red'),isStar=isStarredTaskName(item.taskName),label=isStar?'':(idx+1)+'. ',date=createdDateShort(item.createdAt);
    if(state.editStoreTaskId===item.id){
      return '<div class="draggable-item" data-list="store" data-id="'+item.id+'"><div class="paired-grid" style="margin-top:0"><div class="paired-box"><label>Task Name</label><input id="editStoreTaskName_'+item.id+'" value="'+escapeHtml(state.editStoreTaskName||item.taskName)+'"></div><div class="paired-box"><label>Duration</label><input id="editStoreTaskDuration_'+item.id+'" class="duration-input" value="'+escapeHtml(state.editStoreTaskDurationText||formatDuration(item.durationMinutes))+'"></div></div><div class="row" style="margin-top:8px"><button class="btn-success mini" style="flex:1" data-save-store-edit="'+item.id+'">Save</button><button class="btn-outline mini" data-cancel-store-edit="1">Cancel</button></div></div>'
    }
    return '<div class="draggable-item" data-list="store" data-id="'+item.id+'"><div class="store-row"><div><div class="item-name '+(isStar?'star-item-name ':'')+'" data-edit-store="'+item.id+'" style="cursor:pointer"><span class="status-dot '+dotClass+'"></span>'+label+'<span class="'+(isRequired?'oldest-required':'')+'">'+escapeHtml(item.taskName)+'</span>'+(date?' <span class="item-date">('+escapeHtml(date)+')</span>':'')+(isRequired?' <span class="required-check">✓</span>':'')+'</div><div class="item-meta">'+formatDuration(item.durationMinutes)+' • Total Hrs '+formatMs(storeItemCumulativeWorkedMs(item))+starDailyMetaText(item)+'</div></div><button class="drag-handle" draggable="true" data-drag-handle="1" data-list="store" data-id="'+item.id+'">⋮⋮</button><button class="btn-queue mini" data-send-queue="'+item.id+'">Queue</button><button class="btn-delete mini" data-store-delete="'+item.id+'">Delete</button></div></div>'
  }).join(''):'<div class="empty-state">No task stored yet.</div>';

  app.innerHTML=`
<div class="card top-card ${a&&a.isPaused?'paused':(overdue?'danger':urgency)}" id="topCard">
  <div class="space">
    <div class="row" style="min-width:0;flex:1">
      <div class="title">Kartavya</div><div class="logo-wrap"><div class="logo">🎯</div></div>
      <div id="successPercent" class="small pill green-pill">${successPercent()}% Success</div>
    </div>
    <div style="min-width:0;flex:1;text-align:right">
      <div class="small">Current Task</div>
      <div class="sub" id="currentTaskText" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${currentTaskHtml(a)}</div>
      <div class="star-rule">★Task: 30 min/hr or lose ₹30</div>
    </div>
  </div>
  <div class="bar-wrap ${a?'tappable':''} ${a&&a.isPaused?'paused':''}" id="taskBarTap">
    <div class="bar-done" id="doneBar" style="width:${a?taskProgressPercent(a):0}%"></div>
    <div class="bar-left" id="leftBar" style="width:${a?100-taskProgressPercent(a):100}%"></div>
    <div class="bar-label" id="timeLeftInline">${timeLeftText}</div>
  </div>
  <div class="task-meta">
    <div>Duration: <span id="activeDurationText">${a?formatDuration(a.durationMinutes||0):'--'}</span></div>
    <div>Total Hrs: <span id="activeTotalHrsText">${a?formatMs(taskCumulativeWorkedMs(a)):'--'}</span></div>
    <div id="deadlineStatusText">${endText}</div>
  </div>
  <div class="action-buttons">
    <button class="btn-success" id="successBtn" ${a?'':'disabled style="opacity:.45;pointer-events:none"'}>${successButtonText}</button>
    <button class="btn-danger" id="failBtn" ${a?'':'disabled style="opacity:.45;pointer-events:none"'}>${failButtonText}</button>
  </div>
</div>

<div class="card">
  <div class="section-head"><span class="section-dot"></span><div class="sub">Your Performance</div></div>
  <div class="performance-wrap">
    <div class="performance-grid">
      <div class="perf-box perf-reward">
        <h4>Total Reward</h4>
        <div class="val" style="color:#d8ffe6">${rupee(s.reward)}</div>
      </div>
      <div class="perf-box perf-penalty">
        <h4>Total Penalty</h4>
        <div class="val" style="color:#ffd0d0">${rupee(s.penalty)}</div>
        <button class="btn-danger distraction-btn" id="distractionBtn">Distraction = -₹10</button>
      </div>
      <div class="perf-box perf-wallet">
        <h4>Wallet Balance</h4>
        <div class="val">${rupee(state.wallet)}</div>
        <button class="btn-primary tiny-btn" id="topupBtn">+${rupee(TOPUP)}</button>
      </div>
    </div>
    <div id="focusDotsWrap">${focus.html}</div>
  </div>
</div>

<div class="card queued-panel">
  <div class="section-head"><span class="section-dot"></span><div class="list-title">Queued Task</div></div>
  ${queueHtml}
</div>

<div class="card store-panel">
  <div class="section-head"><span class="section-dot"></span><div class="list-title">Task Store</div></div>
  <div class="paired-grid">
    <div class="paired-box"><label>Task</label><input id="storeTaskInput" value="" placeholder="Enter Task"></div>
    <div class="paired-box"><label>Duration</label><input id="storeDurationInput" class="duration-input" value="${escapeHtml(state.storeDurationText)}" placeholder="e.g. 30 min"></div>
  </div>
  <div class="row" style="margin-top:8px">
    <button class="btn-gold" id="storeAddBtn" style="flex:1">Add Task</button>
    <button class="btn-outline mini" id="toggleStoreBtn">${state.showStoreList?'Hide Stored Tasks':'Show Stored Tasks'}</button>
  </div>
  <div id="storeListWrap" style="margin-top:8px;display:${state.showStoreList?'block':'none'}">${storeHtml}</div>
</div>

<div class="card">
  <div class="section-head"><span class="section-dot"></span><div class="sub">Controls</div></div>
  <div class="row" style="margin-top:10px">
    <button class="btn-outline mini" id="resetScoreBtn">Reset Score</button>
    <button class="btn-danger mini" id="clearAllDataBtn">Clear All Data</button>
    <button class="btn-outline mini" id="instructionsBtn">${state.showInstructions?'Hide Instructions':'How to Use This App'}</button>
    <button class="btn-outline mini" id="disclaimerBtn">${state.showDisclaimer?'Hide Disclaimer':'Disclaimer'}</button>
  </div>
</div>
${instructionsHtml()}${disclaimerHtml()}`;

  bindDragAndDrop();
}
