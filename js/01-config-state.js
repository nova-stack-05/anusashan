const STORAGE_KEY='kartavya-main-data';
const DEFAULT_DURATION=30;
let hasPersistedData=localStorage.getItem(STORAGE_KEY)!==null;
let persistenceEnabled=hasPersistedData;
const state={tasks:[],history:[],activeTaskId:null,historyOpen:false};
function save(){
  if(!persistenceEnabled)return;
  if(hasPersistedData&&localStorage.getItem(STORAGE_KEY)===null){persistenceEnabled=false;hasPersistedData=false;location.reload();return}
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));hasPersistedData=true;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function formatDuration(minutes){const n=Math.max(1,Math.round(Number(minutes)||DEFAULT_DURATION));return n<60?n+' min':Math.floor(n/60)+' hr'+(n%60?' '+n%60+' min':'')}
function formatWorked(ms){const n=Math.max(0,Math.floor((Number(ms)||0)/60000));return n<60?n+' min':Math.floor(n/60)+' hr'+(n%60?' '+n%60+' min':'')}
function activeTask(){return state.tasks.find(task=>task.id===state.activeTaskId)||null}
