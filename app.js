import { firebaseConfig } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const KEY = "edigit32-mobile-v1";
let state = loadState();
let deferredInstall = null;
let cloud = null;

function loadState(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {customers:["Walk-in"],slips:[],current:[]}; }
  catch { return {customers:["Walk-in"],slips:[],current:[]}; }
}
function persist(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function fmt(v){ return Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2}); }
function currentCustomer(){ return $("customerSelect").value || "Walk-in"; }
function renderCustomers(){
  const sel=$("customerSelect"), old=sel.value;
  sel.innerHTML="";
  state.customers.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;sel.append(o);});
  sel.value=state.customers.includes(old)?old:(state.customers[0]||"Walk-in");
  $("slipCustomer").textContent="Customer: "+currentCustomer();
}
function totals(entries=state.current){
  return entries.reduce((a,e)=>({unit:a.unit+num(e.unit),extra:a.extra+num(e.extra)}),{unit:0,extra:0});
}
function renderCurrent(){
  const body=$("entriesBody"); body.innerHTML="";
  if(!state.current.length){body.innerHTML='<tr><td colspan="5" class="empty">No entries yet</td></tr>';}
  state.current.forEach((e,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${e.type}</td><td><b>${e.number}</b></td><td>${fmt(e.unit)}</td><td>${fmt(e.extra)}</td><td><button class="delete-entry" aria-label="Delete entry">×</button></td>`;
    tr.querySelector("button").addEventListener("click",()=>{state.current.splice(i,1);persist();renderAll();});
    body.append(tr);
  });
  const t=totals();$("entryCount").textContent=state.current.length;$("unitTotal").textContent=fmt(t.unit);$("extraTotal").textContent=fmt(t.extra);$("grandTotal").textContent=fmt(t.unit+t.extra);
  $("slipCustomer").textContent="Customer: "+currentCustomer();$("slipType").textContent=$("lotteryType").value;
}
function renderSummary(){
  const type=$("summaryType").value, grid=$("summaryGrid");grid.innerHTML="";
  const max=type==="2D"?100:1000, sums=new Map();
  state.current.filter(e=>e.type===type).forEach(e=>{sums.set(e.number,(sums.get(e.number)||0)+num(e.unit)+num(e.extra));});
  for(let i=0;i<max;i++){
    const key=String(i).padStart(type==="2D"?2:3,"0"), value=sums.get(key)||0;
    const cell=document.createElement("div");cell.className="summary-cell"+(value?" active":"");
    cell.innerHTML=`<b>${key}</b><span>${value?fmt(value):"—"}</span>`;grid.append(cell);
  }
  $("summaryCount").textContent=sums.size;
  $("summaryTotal").textContent=fmt([...sums.values()].reduce((a,b)=>a+b,0));
}
function renderHistory(){
  const root=$("historyList");root.innerHTML="";
  if(!state.slips.length){root.innerHTML='<div class="empty">No saved slips</div>';return;}
  [...state.slips].reverse().forEach(s=>{
    const item=document.createElement("div");item.className="history-item";
    const left=document.createElement("div"), right=document.createElement("div");right.className="history-actions";
    left.innerHTML=`<strong>${escapeHtml(s.customer)} · ${s.entries.length} entries</strong><small>${new Date(s.date).toLocaleString()} · ${fmt(s.total)} total</small>`;
    const load=document.createElement("button");load.className="small-btn";load.textContent="Open";load.onclick=()=>{state.current=structuredClone(s.entries);$("customerSelect").value=s.customer;$("lotteryType").value=s.entries[0]?.type||"2D";persist();renderAll();window.scrollTo({top:0,behavior:"smooth"});};
    const del=document.createElement("button");del.className="small-btn";del.textContent="Delete";del.onclick=()=>{if(confirm("Delete this saved slip?")){state.slips=state.slips.filter(x=>x.id!==s.id);persist();renderHistory();}};
    right.append(load,del);item.append(left,right);root.append(item);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderAll(){renderCustomers();renderCurrent();renderSummary();renderHistory();}
function validNumber(type,value){return new RegExp(type==="2D"?"^\\d{2}$":"^\\d{3}$").test(value);}
function addEntry(){
  const type=$("lotteryType").value, number=$("numberInput").value.trim(), unit=$("unitInput").value, extra=$("extraInput").value;
  if(!validNumber(type,number)){alert(`Enter exactly ${type==="2D"?2:3} digits for ${type}.`);return;}
  if(num(unit)<=0 && num(extra)<=0){alert("Enter a unit or extra amount greater than zero.");return;}
  state.current.push({type,number,unit:num(unit),extra:num(extra),customer:currentCustomer()});
  $("numberInput").value="";$("unitInput").value="";$("extraInput").value="";persist();renderAll();$("numberInput").focus();
}
function reverseNumber(){
  const type=$("lotteryType").value, value=$("numberInput").value.trim();
  if(!validNumber(type,value)){alert(`Enter exactly ${type==="2D"?2:3} digits first.`);return;}
  $("numberInput").value=value.split("").reverse().join("");
}
function saveSlip(){
  if(!state.current.length){alert("Add at least one entry before saving.");return;}
  const t=totals();state.slips.push({id:crypto.randomUUID(),date:new Date().toISOString(),customer:currentCustomer(),entries:structuredClone(state.current),total:t.unit+t.extra});
  state.current=[];persist();renderAll();alert("Slip saved on this phone.");
}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="edigit32-backup.json";a.click();URL.revokeObjectURL(url);
}
function importData(file){
  const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.customers)||!Array.isArray(d.slips)||!Array.isArray(d.current))throw Error();state=d;persist();renderAll();alert("Backup imported.");}catch{alert("That backup file is not valid.");}};reader.readAsText(file);
}
$("addEntryBtn").onclick=addEntry;$("reverseBtn").onclick=reverseNumber;$("saveSlipBtn").onclick=saveSlip;
$("clearBtn").onclick=()=>{if(confirm("Clear the current slip?")){state.current=[];persist();renderAll();}};
$("customerSelect").onchange=()=>{persist();renderCurrent();};
$("lotteryType").onchange=()=>{$("numberInput").maxLength=$("lotteryType").value==="2D"?2:3;renderCurrent();};
$("summaryType").onchange=renderSummary;
$("addCustomerBtn").onclick=()=>$("customerDialog").showModal();
$("saveCustomerBtn").onclick=e=>{e.preventDefault();const name=$("newCustomerName").value.trim();if(!name)return;if(!state.customers.includes(name))state.customers.push(name);persist();renderCustomers();$("customerSelect").value=name;$("newCustomerName").value="";$("customerDialog").close();};
$("exportBtn").onclick=exportData;$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value="";};
$("refreshHistoryBtn").onclick=renderHistory;
$("cloudBtn").onclick=()=>$("cloudDialog").showModal();
$("signInBtn").onclick=async e=>{e.preventDefault();await cloudSync();};
async function cloudSync(){
  const msg=$("cloudMessage");msg.textContent="Connecting…";
  try{
    if(firebaseConfig.apiKey.includes("PASTE_")||firebaseConfig.projectId.includes("YOUR_"))throw Error("Firebase setup is incomplete. Follow SETUP.md in the project folder.");
    const [{initializeApp,getApps},{getAuth,signInWithEmailAndPassword},{getFirestore,doc,setDoc,getDoc}] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
    const cred=await signInWithEmailAndPassword(auth,$("cloudEmail").value,$("cloudPassword").value);
    const ref=doc(db,"users",cred.user.uid,"backups","main");
    await setDoc(ref,{data:state,updatedAt:new Date().toISOString()});
    const snap=await getDoc(ref);
    if(snap.exists()){state=snap.data().data;persist();renderAll();}
    $("cloudStatus").textContent="● Cloud synced";$("cloudStatus").style.background="#1e8b582e";
    msg.textContent="Cloud backup completed. Your data is synced to your Firebase account.";
    setTimeout(()=>$("cloudDialog").close(),1200);
  }catch(err){msg.textContent=err.message||"Cloud backup failed. Check internet and Firebase setup."; }
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false;});
$("installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true;};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
renderAll();
