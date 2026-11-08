const STORAGE_KEY='kartavya-main-data';
const LEGACY_CLEAR_MARKER='kartavya-clear-pending';
const clearWasRequested=sessionStorage.getItem(LEGACY_CLEAR_MARKER)==='1';
if(clearWasRequested){
  sessionStorage.removeItem(LEGACY_CLEAR_MARKER);
  localStorage.removeItem(STORAGE_KEY);
}
const TOPUP=5000,DEFAULT_WALLET=5000,DEFAULT_REWARD=50,DEFAULT_PENALTY=200,DEFAULT_DURATION=30;
const DISTRACTION_PENALTY=10;
const STAR_DAILY_PENALTY=200;
const STAR_HOUR_PENALTY=30,STAR_MINUTES_PER_HOUR_MS=30*60*1000,STAR_START_HOUR=8,STAR_END_HOUR=22;
const COMPULSORY_START_MS=10*60*1000,COMPULSORY_AFTER_DAYS=3;
const MACRODROID_WEBHOOK_URL='';
let hasPersistedData=!clearWasRequested&&localStorage.getItem(STORAGE_KEY)!==null;
let persistenceEnabled=hasPersistedData;

const state={
  wallet:DEFAULT_WALLET,
  reward:String(DEFAULT_REWARD),
  penalty:String(DEFAULT_PENALTY),
  storeDurationText:'30 min',
  tasks:[],
  taskStore:[],
  history:[],
  activeTaskId:null,
  showStoreList:false,
  showInstructions:false,
  showDisclaimer:false,
  editStoreTaskId:null,
  editStoreTaskName:'',
  editStoreTaskDurationText:'30 min',
  starHourWorkMs:{},
  starHourPenaltyApplied:{},
  starDailyWorkMs:{},
  starDailyPenaltyApplied:{},
  starDailyReminderShown:{},
  lastStarTickAt:null,
  soundEnabled:true,
  vibrationEnabled:true
};
