function bindAppEvents(){
  const app=document.getElementById('app');
  app.addEventListener('click',event=>{
    const target=event.target.closest('button,[data-edit-store],[data-focus-label],#taskBarTap');
    if(!target||!app.contains(target))return;
    if(target.matches('[data-focus-label]')){alert(target.dataset.focusLabel);return}
    if(target.id==='taskBarTap'){if(activeTask())togglePauseResume();return}
    if(target.dataset.remove){removeTask(Number(target.dataset.remove));return}
    if(target.dataset.copyQueue){copyQueuedTask(Number(target.dataset.copyQueue));return}
    if(target.dataset.sendQueue){sendStoreTaskToQueue(Number(target.dataset.sendQueue));return}
    if(target.dataset.editStore){startEditStoreTask(Number(target.dataset.editStore));return}
    if(target.dataset.saveStoreEdit){saveEditStoreTask(Number(target.dataset.saveStoreEdit));return}
    if(target.hasAttribute('data-cancel-store-edit')){cancelEditStoreTask();return}
    if(target.dataset.storeDelete){deleteStoreTask(Number(target.dataset.storeDelete));return}
    switch(target.id){
      case 'topupBtn':addTopup();break;
      case 'distractionBtn':addDistractionPenalty();break;
      case 'storeAddBtn':addTaskForFuture();break;
      case 'toggleStoreBtn':state.showStoreList=!state.showStoreList;save();render();break;
      case 'resetScoreBtn':resetScore();break;
      case 'instructionsBtn':toggleInstructions();break;
      case 'disclaimerBtn':toggleDisclaimer();break;
      case 'successBtn':finishTask('success');break;
      case 'failBtn':finishTask('fail');break;
    }
  });
  app.addEventListener('input',event=>{
    if(event.target.id==='storeDurationInput'){
      state.storeDurationText=event.target.value;
      save();
    }
  });
  app.addEventListener('focusout',event=>{
    if(event.target.id!=='storeDurationInput')return;
    const normalized=normalizeDurationInput(event.target.value);
    if(normalized){state.storeDurationText=normalized.text;event.target.value=normalized.text;save()}
  });
  app.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target.id==='storeTaskInput')addTaskForFuture();
  });
}

load();
bindAppEvents();
window.addEventListener('load',()=>{
  const splash=document.getElementById('splashScreen'),app=document.getElementById('app');
  setTimeout(()=>{
    if(splash)splash.style.display='none';
    if(app)app.style.display='block';
    render();
    if(activeTask())autoSendMacroDroidForActiveTask();else clearMacroDroidState()
  },1000)
});
setInterval(()=>{
  accountStarredWorkAndPenalties();
  refreshLive();
  save();
},1000);
