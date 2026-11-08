function sanitizeNumber(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>=0?n:fallback}
function escapeHtml(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function save(){
  if(!persistenceEnabled)return;
  if(hasPersistedData&&localStorage.getItem(STORAGE_KEY)===null){
    persistenceEnabled=false;
    hasPersistedData=false;
    location.reload();
    return;
  }
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  hasPersistedData=true
}
function rupee(n){return '₹'+Number(n||0).toLocaleString('en-IN')}
function todayKey(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function hourKey(d){return todayKey(d)+'-'+String(d.getHours()).padStart(2,'0')}
function suffixDay(d){if(d>3&&d<21)return d+'th';switch(d%10){case 1:return d+'st';case 2:return d+'nd';case 3:return d+'rd';default:return d+'th'}}
function createdDateShort(iso){if(!iso)return '';const d=new Date(iso);if(isNaN(d))return '';return suffixDay(d.getDate())+' '+d.toLocaleString('en-IN',{month:'long'})}
function formatDuration(mins){mins=Math.max(0,Math.round(Number(mins)||0));if(mins<60)return mins+' min';const h=Math.floor(mins/60),m=mins%60;return m===0?h+' hr':h+' hr '+m+' min'}
function formatMs(ms){let mins=Math.floor(Math.max(0,Number(ms)||0)/60000);if(mins<60)return mins+' min';const h=Math.floor(mins/60),m=mins%60;return m===0?h+' hr':h+' hr '+m+' min'}
function formatTimeLeftDisplay(seconds){seconds=Math.max(0,Math.floor(Number(seconds)||0));const mins=Math.floor(seconds/60);if(mins<60)return 'Time left '+mins+' min';const h=Math.floor(mins/60),m=mins%60;return 'Time left '+h+' hr '+m+' min'}
function parseDurationToMinutes(text){
  if(typeof text!=='string')return null;
  const raw=text.trim().toLowerCase();if(!raw)return null;
  let total=0,matched=false;
  const hr=raw.match(/(\d+(?:\.\d+)?)\s*(hr|hrs|hour|hours|h)\b/);
  const mn=raw.match(/(\d+)\s*(min|mins|minute|minutes|m)\b/);
  if(hr){total+=Math.round(parseFloat(hr[1])*60);matched=true}
  if(mn){total+=parseInt(mn[1],10);matched=true}
  if(matched&&total>0)return total;
  if(/^\d+$/.test(raw))return parseInt(raw,10);
  return null
}
function normalizeDurationInput(text){const mins=parseDurationToMinutes(text);if(mins===null||mins<=0)return null;return{minutes:mins,text:formatDuration(mins)}}
function isStarredTaskName(name){return /^\s*\*/.test(String(name||''))}
function activeTask(){return state.activeTaskId?state.tasks.find(x=>x.id===state.activeTaskId)||null:null}
function getStoreItem(id){return state.taskStore.find(x=>x.id===id)||null}
function cleanTaskName(name){let s=String(name||'').trim().toLowerCase();while(s.includes('  '))s=s.replaceAll('  ',' ');return s}
