/* =========================================================================
   Fit → Gym Coach: lakshya/level/din ke hisaab se hafte ka split, har set ka logger,
   aaram ka timer, pichhla set + agla vazan sujhav (progressive overload), best lifts, protein.
   Text: gym-i18n.js (ft()). Server: /api/fit/gym (get), /setup, /log.
   ========================================================================= */
(function(){const st=document.createElement("style");st.textContent=`
.g-hero{background:linear-gradient(150deg,#2F3B4C,#16202C);color:#fff;border-radius:20px;padding:20px;margin-top:12px;box-shadow:var(--shadow)}
.g-hero h2{font-family:var(--f-head);font-size:22px;margin:0 0 4px}
.g-hero p{opacity:.85;font-size:14px;margin:0}
.g-day{font-family:var(--f-head);font-size:18px;margin:0 0 4px}
.g-chips{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px}
.g-chips button{border:1px solid var(--line);background:var(--surface);border-radius:99px;padding:6px 11px;font:inherit;font-size:12.5px;font-weight:800;color:var(--muted);cursor:pointer}
.g-chips button.on{background:#2F3B4C;border-color:#2F3B4C;color:#fff}
.g-ex{border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:10px;background:var(--surface)}
.g-ex .gh{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.g-ex .gh b{font-size:15px}
.g-ex .gi{border:none;background:var(--surface-2);border-radius:8px;width:28px;height:28px;font-weight:900;cursor:pointer;color:var(--fg);flex:none}
.g-ex .gs{font-size:12.5px;color:var(--muted);font-weight:700;margin-top:2px}
.g-ex .gl{font-size:12.5px;margin-top:6px;color:var(--muted)}
.g-ex .gu{font-size:12.5px;margin-top:4px;color:var(--accent-ink);font-weight:800}
.g-ex .ghow{font-size:13px;background:var(--surface-2);border-radius:10px;padding:8px 10px;margin-top:8px;line-height:1.5}
.g-set{display:grid;grid-template-columns:56px 1fr 1fr 44px;gap:8px;align-items:center;margin-top:8px}
.g-set span{font-size:12.5px;font-weight:800;color:var(--muted)}
.g-set input{padding:9px 8px;text-align:center}
.g-set .ok{height:40px;border-radius:10px;border:2px solid var(--line);background:var(--surface);font-weight:900;font-size:16px;cursor:pointer;color:#fff}
.g-set.done .ok{background:var(--accent);border-color:var(--accent)}
.g-set.done input{background:var(--accent-soft)}
.g-pr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line);font-size:14px}
.g-pr:last-child{border:none}
.g-pr b{color:var(--accent-ink)}
.g-rest{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(320px,calc(100vw - 32px));background:#2F3B4C;color:#fff;border-radius:16px;padding:12px 16px;z-index:60;box-shadow:0 10px 30px rgba(0,0,0,.25);display:flex;align-items:center;gap:12px}
.g-rest b{font-family:var(--f-head);font-size:28px;min-width:64px}
.g-rest span{flex:1;font-weight:700;font-size:13.5px}
.g-rest button{background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:10px;padding:7px 10px;font:inherit;font-weight:800;cursor:pointer}
`;document.head.appendChild(st);})();

const G_SPLIT={3:["fullA","fullB","fullC"],4:["upA","lowA","upB","lowB"],5:["push","pull","legs","upA","lowB"]};
const G_DAYKEY={fullA:"dayFullA",fullB:"dayFullB",fullC:"dayFullC",upA:"dayUpA",upB:"dayUpB",lowA:"dayLowA",lowB:"dayLowB",push:"dayPush",pull:"dayPull",legs:"dayLegs"};
const G_DAY={
 fullA:["squat","bench","cablerow","ohp","plank"],fullB:["rdl","incline","latpull","lunge","curl","pushdown"],fullC:["legpress","dbbench","dbrow","lateral","legraise"],
 upA:["bench","latpull","ohp","cablerow","curl","pushdown"],lowA:["squat","rdl","legcurl","calf","plank"],
 upB:["incline","dbrow","lateral","pullup","hammer","ohtri"],lowB:["legpress","lunge","legext","hipthrust","legraise"],
 push:["bench","ohp","incline","lateral","pushdown"],pull:["latpull","cablerow","dbrow","reardelt","curl","hammer"],legs:["squat","rdl","legpress","legcurl","calf"],
};
const G_HOME={bench:"dbfloor",dbbench:"dbfloor",incline:"pushup",latpull:"dbrow",cablerow:"bentrow",pullup:"bentrow",squat:"goblet",legpress:"goblet",legcurl:"hipthrust",legext:"lunge",pushdown:"ohtri"};
const G_COMPOUND=["squat","bench","rdl","legpress","latpull","cablerow","ohp","dbbench","incline","goblet","dbfloor","bentrow","dbrow","pullup","hipthrust"];
const G_BODY=["pushup","plank","legraise","cardio","pullup"];          // vazan ki zaroorat nahi
const G_DB=["dbbench","incline","dbfloor","dbfly","dbrow","bentrow","goblet","lunge","ohp","lateral","reardelt","curl","hammer","ohtri"]; // dumbbell: chhota kadam
let gymData=null,gymPick=null,gymEdit=false,gymRestIv=null;

function gDose(ex,P){
 if(ex==="plank")return{s:3,lo:P.level==="beg"?30:45,hi:P.level==="beg"?45:60,rest:45};
 if(ex==="cardio")return{s:1,lo:15,hi:20,rest:0};
 const comp=G_COMPOUND.includes(ex);let d;
 if(P.goal==="fat")d={s:3,lo:12,hi:15,rest:comp?60:45};
 else if(P.goal==="muscle")d=comp?{s:P.level==="beg"?3:4,lo:8,hi:12,rest:90}:{s:3,lo:10,hi:15,rest:60};
 else d=comp?{s:P.level==="beg"?3:4,lo:P.level==="beg"?6:5,hi:8,rest:P.level==="beg"?120:150}:{s:3,lo:8,hi:12,rest:75};
 if(P.level==="adv"&&comp)d.s++;
 return d;
}
function gDayList(day,P){
 let l=G_DAY[day].map(e=>P.place==="home"&&G_HOME[e]?G_HOME[e]:e);l=[...new Set(l)];
 if(P.level==="beg")l=l.slice(0,4);
 if(P.goal==="fat")l.push("cardio");
 return l;
}
function gDraftKey(){return "nh_gymdraft";}
function gDraft(){try{const d=JSON.parse(localStorage.getItem(gDraftKey())||"null");return d&&d.date===new Date().toDateString()?d:null;}catch(_){return null;}}
function gSaveDraft(d){try{localStorage.setItem(gDraftKey(),JSON.stringify(d));}catch(_){}}

async function loadGym(){
 const box=fitBody();
 if(!gymData)box.innerHTML=`<div class="fit-card" style="text-align:center"><span class="spin" style="border-color:var(--accent-soft);border-top-color:var(--accent)"></span></div>`;
 try{gymData=await api("/fit/gym");}catch(e){box.innerHTML=`<div class="fit-card"><p class="sub" style="margin:0">${esc(e.message)}</p></div>`;return;}
 renderGym();
}
function renderGym(){
 if(!gymData)return;
 if(!gymData.profile||gymEdit)return renderGymSetup();
 const box=fitBody(),d=gymData,P=d.profile;
 const split=G_SPLIT[P.days];
 const day=gymPick&&split.includes(gymPick)?gymPick:split[d.next%split.length];
 const list=gDayList(day,P);
 let dr=gDraft();if(!dr||dr.day!==day){dr={date:new Date().toDateString(),day,sets:{}};}
 const w=(typeof gather==="function"?gather().weight_kg:0)||0,k=P.goal==="muscle"?1.8:1.6;
 const exHtml=list.map(ex=>{
  const D=gDose(ex,P),last=d.last[ex],body=G_BODY.includes(ex);
  let lastTxt="",upTxt="",preKg="";
  if(last&&last.sets&&last.sets.length){
   lastTxt=ft("gLast",{v:last.sets.map(s=>(body?"":s.kg+"×")+s.reps).join(", ")});
   const top=Math.max(...last.sets.map(s=>s.kg||0));
   const allHit=last.sets.length>=D.s&&last.sets.every(s=>s.reps>=D.hi);
   preKg=top||"";
   if(allHit){if(body||!top)upTxt=ft("gUpRep");else{const inc=G_DB.includes(ex)?1:2.5;upTxt=ft("gUp",{kg:inc});preKg=Math.round((top+inc)*10)/10;}}
  }
  const rows=Array.from({length:D.s},(_,i)=>{const s=(dr.sets[ex]||[])[i]||{};const kgv=s.kg!=null?s.kg:(body?"":preKg);const rpv=s.reps!=null?s.reps:(last&&last.sets[i]?last.sets[i].reps:"");
   return `<div class="g-set ${s.done?"done":""}" data-ex="${ex}" data-i="${i}"><span>${esc(ft("gSetN",{n:i+1}))}</span>
    <input type="number" inputmode="decimal" step="0.5" placeholder="${body?"—":esc(ft("gKg"))}" value="${kgv}" ${body?"disabled":""} aria-label="${esc(ft("gKg"))}" data-f="kg">
    <input type="number" inputmode="numeric" placeholder="${D.lo}-${D.hi}" value="${rpv}" aria-label="${esc(ft("gReps"))}" data-f="reps">
    <button type="button" class="ok" aria-label="✓">${s.done?"✓":""}</button></div>`;}).join("");
  return `<div class="g-ex"><div class="gh"><div><b>${esc(ft("g_"+ex+"_n"))}</b><div class="gs">${esc(ex==="cardio"?D.lo+"-"+D.hi+" "+ft("min"):ft("gSets",{s:D.s,r:D.lo+"-"+D.hi,t:D.rest}))}</div></div><button type="button" class="gi" data-how="${ex}" aria-label="?">?</button></div>
   <div class="ghow hidden" id="how_${ex}">${esc(ft("g_"+ex+"_h"))}</div>
   ${lastTxt?`<div class="gl">${esc(lastTxt)}</div>`:""}${upTxt?`<div class="gu">${esc(upTxt)}</div>`:""}${rows}</div>`;
 }).join("");
 const prs=Object.entries(d.best||{}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
 box.innerHTML=`
 <div class="g-hero"><h2>🏋️ ${esc(ft("gTitle"))}</h2><p>${esc(ft("gSub"))}</p>
  <div class="y-stats"><div><b>${d.week}</b><span>${esc(ft("gWeek"))}</span></div><div><b>${d.month}</b><span>${esc(ft("gMonth"))}</span></div><div><b>${d.total}</b><span>${esc(ft("gTotal"))}</span></div></div></div>
 ${d.done_today?`<div class="fit-adj">✅ ${esc(ft("gDone"))}</div>`:""}
 <div class="fit-card"><h3>💪 ${esc(ft("gToday"))}</h3>
  <p class="g-day">${esc(ft(G_DAYKEY[day]))}</p>
  <div class="sub" style="margin:0;font-size:12.5px">${esc(ft("gOtherDay"))}</div>
  <div class="g-chips">${split.map(s=>`<button type="button" data-gday="${s}" class="${s===day?"on":""}">${esc(ft(G_DAYKEY[s]))}</button>`).join("")}</div>
  <p class="sub" style="margin:8px 0 0;font-size:12.5px">${esc(ft("woWarm"))}</p>
  ${exHtml}
  <p id="gErr" style="color:var(--danger);font-weight:700;margin:10px 0 0"></p>
  <button class="btn btn-primary" id="gFinish" style="margin-top:10px;background:#2F3B4C">✅ ${esc(ft("gFinish"))}</button>
  ${d.last_session?`<p class="sub" style="margin:10px 0 0;font-size:12.5px">${esc(ft("gVol",{v:d.last_session.volume.toLocaleString()}))}</p>`:""}
 </div>
 <div class="fit-card"><h3>🥚 ${esc(ft("gProtein"))}</h3>
  ${w?`<p style="margin:0;font-weight:800;font-size:18px">${Math.round(w*k)} g</p><p class="sub" style="margin:4px 0 8px">${esc(ft("gProtSub",{g:Math.round(w*k),k}))}</p>`:`<p class="sub" style="margin:0 0 8px">${esc(ft("gProtNoW"))}</p>`}
  <p style="margin:0;font-size:14px">${esc(ft("gProtSrc"))}</p></div>
 ${prs.length?`<div class="fit-card"><h3>🏆 ${esc(ft("gPR"))}</h3>${prs.map(([e,v])=>`<div class="g-pr"><span>${esc(ft("g_"+e+"_n"))}</span><b>${v} kg</b></div>`).join("")}</div>`:""}
 <div class="fit-card"><h3>📋 ${esc(ft("gTips"))}</h3>${[1,2,3,4,5,6].map(i=>`<p style="margin:0 0 8px;font-size:14px">• ${esc(ft("gt"+i))}</p>`).join("")}</div>
 <p class="fit-disc">⚕ ${esc(ft("gSafe"))}</p>
 <button class="btn btn-ghost" id="gChange" style="width:auto;margin:6px 0">⚙️ ${esc(ft("gChange"))}</button>`;
 // events
 box.querySelectorAll("[data-gday]").forEach(b=>b.onclick=()=>{gymPick=b.dataset.gday;renderGym();});
 box.querySelectorAll("[data-how]").forEach(b=>b.onclick=()=>{const h=$("how_"+b.dataset.how);if(h)h.classList.toggle("hidden");});
 const save=()=>gSaveDraft(dr);
 box.querySelectorAll(".g-set").forEach(row=>{
  const ex=row.dataset.ex,i=+row.dataset.i;
  const cur=()=>{dr.sets[ex]=dr.sets[ex]||[];dr.sets[ex][i]=dr.sets[ex][i]||{};return dr.sets[ex][i];};
  row.querySelectorAll("input").forEach(inp=>inp.oninput=()=>{const s=cur();s[inp.dataset.f]=inp.value===""?null:Number(inp.value);save();});
  row.querySelector(".ok").onclick=()=>{
   const s=cur();s.kg=Number(row.querySelector('[data-f="kg"]').value)||0;s.reps=Number(row.querySelector('[data-f="reps"]').value)||0;
   if(!s.done&&!s.reps){row.querySelector('[data-f="reps"]').focus();return;}
   s.done=!s.done;save();row.classList.toggle("done",s.done);row.querySelector(".ok").textContent=s.done?"✓":"";
   if(s.done){const D=gDose(ex,P);if(D.rest)gRest(D.rest);}
  };
 });
 $("gFinish").onclick=async()=>{
  const entries=list.map(ex=>({ex,sets:(dr.sets[ex]||[]).filter(s=>s&&s.done&&s.reps>0).map(s=>({kg:s.kg||0,reps:s.reps}))})).filter(e=>e.sets.length);
  if(!entries.length){$("gErr").textContent=ft("gNeedSet");return;}
  const b=$("gFinish");b.disabled=true;
  try{const r=await api("/fit/gym/log",{method:"POST",body:JSON.stringify({day,entries})});gymData=r;gymPick=null;try{localStorage.removeItem(gDraftKey());}catch(_){}gRestStop();toast(ft("gSaved"));if(typeof pointToast==="function")pointToast(r);renderGym();window.scrollTo({top:0,behavior:"smooth"});}
  catch(e){$("gErr").textContent=e.message;b.disabled=false;}
 };
 $("gChange").onclick=()=>{gymEdit=true;renderGym();};
}
function gRest(sec){
 gRestStop();let left=sec;
 const el=document.createElement("div");el.className="g-rest";el.id="gRest";el.setAttribute("role","timer");
 el.innerHTML=`<b id="gRestN">${left}</b><span id="gRestT">${esc(ft("gRestOn"))}</span><button type="button" id="gRestX">✕</button>`;
 document.body.appendChild(el);$("gRestX").onclick=gRestStop;
 gymRestIv=setInterval(()=>{left--;if(!$("gRest")){clearInterval(gymRestIv);return;}
  if(left<=0){clearInterval(gymRestIv);$("gRestN").textContent="0";$("gRestT").textContent=ft("gRestDone");try{navigator.vibrate&&navigator.vibrate([200,100,200]);}catch(_){}setTimeout(gRestStop,2500);return;}
  $("gRestN").textContent=left;},1000);
}
function gRestStop(){clearInterval(gymRestIv);const el=$("gRest");if(el)el.remove();}

function renderGymSetup(){
 const box=fitBody(),P=(gymData&&gymData.profile)||{goal:"fat",level:"beg",days:3,place:"gym"};
 const f=window._gForm=window._gForm||{...P};
 const seg=(name,opts)=>`<div class="fit-seg" data-gseg="${name}">${opts.map(([v,l])=>`<button type="button" data-v="${v}" class="${String(f[name])===String(v)?"on":""}">${esc(l)}</button>`).join("")}</div>`;
 box.innerHTML=`
 <div class="g-hero"><h2>🏋️ ${esc(ft("gTitle"))}</h2><p>${esc(ft("gSub"))}</p></div>
 <div class="fit-card fit-form"><h3>🎯 ${esc(ft("gSetupH"))}</h3>
  <label>${esc(ft("gGoal"))}</label>${seg("goal",[["fat",ft("goalFat")],["muscle",ft("goalMuscle")],["strength",ft("goalStr")]])}
  <label>${esc(ft("gLevel"))}</label>${seg("level",[["beg",ft("lvBeg")],["int",ft("lvInt")],["adv",ft("lvAdv")]])}
  <label>${esc(ft("gDays"))}</label>${seg("days",[[3,ft("nDays",{n:3})],[4,ft("nDays",{n:4})],[5,ft("nDays",{n:5})]])}
  <label>${esc(ft("gPlace"))}</label>${seg("place",[["gym",ft("gPlaceGym")],["home",ft("gPlaceHome")]])}
  <button class="btn btn-primary" id="gMake" style="margin-top:16px;background:#2F3B4C">🚀 ${esc(ft("gMake"))}</button>
  <p class="fit-disc">⚕ ${esc(ft("gSafe"))}</p></div>`;
 box.querySelectorAll("[data-gseg] button").forEach(b=>b.onclick=()=>{const k=b.parentElement.dataset.gseg;f[k]=k==="days"?Number(b.dataset.v):b.dataset.v;renderGymSetup();});
 $("gMake").onclick=async()=>{const b=$("gMake");b.disabled=true;try{gymData=await api("/fit/gym/setup",{method:"POST",body:JSON.stringify(f)});gymEdit=false;gymPick=null;window._gForm=null;renderGym();window.scrollTo({top:0,behavior:"smooth"});}catch(e){toast(e.message);b.disabled=false;}};
}
