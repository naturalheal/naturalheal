/* =========================================================================
   Fit — Weight Loss Program (app ka hissa). Text: fit-i18n.js (ft()).
   Server: /api/fit/wl (get), /start, /log, /stop — numbers + keys hi bhejta hai.
   ========================================================================= */
(function(){const st=document.createElement("style");st.textContent=`
.fit-hero{background:linear-gradient(150deg,var(--accent),var(--accent-ink));color:#fff;border-radius:20px;padding:20px;margin-top:12px;box-shadow:var(--shadow)}
.fit-hero h2{font-family:var(--f-head);font-size:22px;margin:0 0 4px}
.fit-hero .fh-s{opacity:.88;font-size:14px;margin:0}
.fit-hero .fh-k{font-size:12px;font-weight:800;letter-spacing:.06em;opacity:.85;text-transform:uppercase}
.fh-big{display:flex;align-items:flex-end;gap:14px;margin:12px 0 8px;flex-wrap:wrap}
.fh-big b{font-family:var(--f-head);font-size:42px;line-height:1}
.fh-big span{font-weight:700;opacity:.9}
.fh-bar{height:9px;border-radius:9px;background:rgba(255,255,255,.22);overflow:hidden}
.fh-bar i{display:block;height:100%;background:#F4E9CE;border-radius:9px;transition:width .6s}
.fh-row{display:flex;justify-content:space-between;gap:10px;margin-top:8px;font-size:13px;font-weight:700;opacity:.92;flex-wrap:wrap}
.fit-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;margin-top:14px;box-shadow:var(--shadow)}
.fit-card h3{font-family:var(--f-head);font-size:17px;margin:0 0 12px;display:flex;align-items:center;gap:8px}
.fit-tg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.fit-tg div{background:var(--surface-2);border-radius:14px;padding:10px 6px;text-align:center}
.fit-tg b{display:block;font-size:18px;font-family:var(--f-head)}
.fit-tg span{font-size:11.5px;color:var(--muted);font-weight:700}
@media (max-width:420px){.fit-tg{grid-template-columns:repeat(2,1fr)}}
.fit-task{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px dashed var(--line);cursor:pointer;user-select:none}
.fit-task:last-child{border:none}
.fit-task .ck{width:26px;height:26px;border-radius:8px;border:2px solid var(--line);display:grid;place-items:center;flex:none;font-weight:900;color:#fff;transition:all .15s}
.fit-task.on .ck{background:var(--accent);border-color:var(--accent)}
.fit-task .tx{flex:1;font-weight:700;font-size:14.5px}
.fit-task.on .tx{color:var(--accent-ink)}
.fit-water{display:flex;align-items:center;gap:8px}
.fit-water button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);font-size:18px;font-weight:900;cursor:pointer;color:var(--fg)}
.fit-water b{min-width:52px;text-align:center}
.fit-msg{margin-top:10px;font-weight:800;font-size:13.5px;color:var(--accent-ink);background:var(--accent-soft);border-radius:12px;padding:9px 12px}
.fit-adj{background:var(--gold-soft);border-radius:14px;padding:12px 14px;font-weight:700;font-size:14px;margin-top:14px}
.fit-w{display:flex;gap:8px}
.fit-w input{flex:1}
.fit-w .btn{width:auto;padding:11px 18px}
.fit-chart{margin-top:12px}
.fit-leg{display:flex;gap:14px;font-size:12px;color:var(--muted);font-weight:700;margin-top:6px}
.fit-leg i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px}
.fit-ex{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px dashed var(--line);font-size:14.5px}
.fit-ex:last-child{border:none}
.fit-ex b{white-space:nowrap;color:var(--accent-ink)}
.fit-meal{padding:10px 0;border-bottom:1px dashed var(--line)}
.fit-meal:last-child{border:none}
.fit-meal .mh{display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.03em}
.fit-meal .mb{font-weight:700;font-size:14.5px;margin-top:2px}
.fit-form .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fit-form label{display:block;font-size:13px;font-weight:800;color:var(--muted);margin:12px 0 5px}
.fit-seg{display:flex;gap:6px;flex-wrap:wrap}
.fit-seg button{flex:1 1 auto;border:1.5px solid var(--line);background:var(--surface);border-radius:12px;padding:10px 8px;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;color:var(--fg)}
.fit-seg button.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink)}
.fit-pts{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:7px}
.fit-pts li{display:flex;gap:8px;font-weight:700;font-size:14px;opacity:.95}
.fit-disc{font-size:12.5px;color:var(--muted);margin:14px 2px 0;line-height:1.55}
`;document.head.appendChild(st);})();

let fitData=null,fitForm={days:60,diet:"veg",place:"home",activity:"low",gender:""};
async function loadFit(){
 const v=$("viewFit");if(!v)return;
 if(!fitData)v.innerHTML=`<div class="fit-card" style="text-align:center"><span class="spin" style="border-color:var(--accent-soft);border-top-color:var(--accent)"></span></div>`;
 try{fitData=await api("/fit/wl");}catch(e){v.innerHTML=`<div class="fit-card"><p class="sub" style="margin:0">${esc(e.message)}</p></div>`;return;}
 renderFit();
}
function renderFit(){if(!fitData||!$("viewFit"))return;fitData.program?renderWL():renderWLStart();}

/* ---------- shuru karne ka form ---------- */
function renderWLStart(){
 const p=(typeof gather==="function")?gather():{};
 if(!fitForm.gender)fitForm.gender=p.gender==="female"?"female":"male";
 const seg=(name,opts)=>`<div class="fit-seg" data-seg="${name}">${opts.map(([v,l])=>`<button type="button" data-v="${v}" class="${String(fitForm[name])===String(v)?"on":""}">${esc(l)}</button>`).join("")}</div>`;
 $("viewFit").innerHTML=`
 <div class="fit-hero"><div class="fh-k">⚖️ ${esc(ft("tabFit"))}</div><h2>${esc(ft("wlTitle"))}</h2><p class="fh-s">${esc(ft("wlSub"))}</p>
  <ul class="fit-pts">${ft("wlPts").split(" · ").map(x=>`<li>✓ ${esc(x)}</li>`).join("")}</ul></div>
 <div class="fit-card fit-form"><h3>🎯 ${esc(ft("startH"))}</h3>
  <div class="g2">
   <div><label for="fwW">${esc(ft("fWeight"))}</label><input id="fwW" type="number" inputmode="decimal" value="${fitForm.w??(p.weight_kg||"")}"></div>
   <div><label for="fwL">${esc(ft("fLose"))}</label><input id="fwL" type="number" inputmode="decimal" value="${fitForm.lose||5}"></div>
   <div><label for="fwH">${esc(ft("fHeight"))}</label><input id="fwH" type="number" inputmode="numeric" value="${fitForm.h??(p.height_cm||"")}"></div>
   <div><label for="fwA">${esc(ft("fAge"))}</label><input id="fwA" type="number" inputmode="numeric" value="${fitForm.a??(p.age||"")}"></div>
  </div>
  <label>${esc(ft("fGender"))}</label>${seg("gender",[["male",ft("male")],["female",ft("female")]])}
  <label>${esc(ft("fDays"))}</label>${seg("days",[[30,ft("nDays",{n:30})],[60,ft("nDays",{n:60})],[90,ft("nDays",{n:90})]])}
  <label>${esc(ft("fAct"))}</label>${seg("activity",[["low",ft("actLow")],["light",ft("actLight")],["active",ft("actActive")]])}
  <label>${esc(ft("fDiet"))}</label>${seg("diet",[["veg",ft("dVeg")],["egg",ft("dEgg")],["nonveg",ft("dNon")]])}
  <label>${esc(ft("fPlace"))}</label>${seg("place",[["home",ft("pHome")],["gym",ft("pGym")]])}
  <p class="sub" id="fwNote" style="margin:12px 0 0"></p>
  <p id="fwErr" style="color:var(--danger);font-weight:700;margin:8px 0 0"></p>
  <button class="btn btn-primary" id="fwGo" style="margin-top:12px">🚀 ${esc(ft("startBtn"))}</button>
  <p class="fit-disc">⚕ ${esc(ft("disc"))}</p>
 </div>`;
 document.querySelectorAll("#viewFit [data-seg] button").forEach(b=>b.onclick=()=>{const k=b.parentElement.dataset.seg;fitForm[k]=k==="days"?Number(b.dataset.v):b.dataset.v;fitForm.lose=$("fwL").value;fitForm.w=$("fwW").value;fitForm.h=$("fwH").value;fitForm.a=$("fwA").value;renderWLStart();});
 const note=()=>{const L=parseFloat($("fwL").value)||0,d=fitForm.days,safe=Math.round(Math.min(L,d/7*0.9)*10)/10;$("fwNote").textContent=L>safe?ft("safeNote",{e:safe,d}):"";};
 $("fwL").oninput=note;note();
 $("fwGo").onclick=async()=>{
  const body={weight_kg:$("fwW").value,height_cm:$("fwH").value,age:$("fwA").value,target_loss:$("fwL").value,days:fitForm.days,gender:fitForm.gender,activity:fitForm.activity,diet:fitForm.diet,place:fitForm.place};
  $("fwErr").textContent="";const b=$("fwGo");b.disabled=true;
  try{fitData=await api("/fit/wl/start",{method:"POST",body:JSON.stringify(body)});renderFit();window.scrollTo({top:0,behavior:"smooth"});}
  catch(e){$("fwErr").textContent=ft("errInput");}
  b.disabled=false;
 };
}

/* ---------- roz ka workout ---------- */
const FIT_WO={
 home:{A:[["squat","r"],["lunge","r"],["bridge","r"],["plank","s"],["walk","m"]],B:[["pushup","r"],["superman","r"],["climber","s"],["sideplank","s"],["walk","m"]],C:[["walk","m2"],["jacks","s"],["stretch","m3"]]},
 gym:{A:[["treadmill","m"],["legpress","r"],["goblet","r"],["plank","s"],["cycle","m3"]],B:[["cross","m"],["latpull","r"],["chest","r"],["row","r"],["shoulder","r"]],C:[["treadmill","m2"],["cycle","m3"],["stretch","m3"]]},
};
const FIT_DAYS=["A","B","C","A","B","C","R"];
function fitDose(kind,lvl){
 if(kind==="r")return ["2 × 10","3 × 12","3 × 15"][lvl];
 if(kind==="s")return "3 × "+[20,30,45][lvl]+" "+ft("sec");
 if(kind==="m")return [10,15,20][lvl]+" "+ft("min");
 if(kind==="m2")return [25,35,45][lvl]+" "+ft("min");
 return "10 "+ft("min");
}
/* ---------- roz ka khaana (diet ke hisaab se, din ke saath badalta) ---------- */
const FIT_MEALS={
 B:{veg:["poha","upma","chilla","dalia","idli"],egg:["eggtoast","omelette"]},
 L:{veg:["thali","rajma","khichdi"],non:["chicken","fish"]},
 S:{veg:["chana","fruit","chaas","sprouts"],egg:["egg1"]},
 D:{veg:["dalroti","soup","daliakh"],egg:["eggbhurji"],non:["grill"]},
};
const FIT_SPLIT={B:.25,L:.35,S:.10,D:.30};
function fitMeal(slot,diet,day){
 const m=FIT_MEALS[slot];let pool=m.veg.slice();
 if(diet!=="veg"&&m.egg)pool=pool.concat(m.egg);
 if(diet==="nonveg"&&m.non)pool=pool.concat(m.non);
 return pool[(day-1+({B:0,L:1,S:2,D:3})[slot])%pool.length];
}

/* ---------- wazan ka graph (SVG) ---------- */
function fitChart(d){
 const P=d.program,W=320,H=150,pad=28;
 const goal=P.start_kg-P.expected_loss;
 const ws=d.weights||[];
 const vals=ws.map(w=>w.kg).concat([P.start_kg,goal]);
 const lo=Math.floor(Math.min(...vals)-1),hi=Math.ceil(Math.max(...vals)+1);
 const x=(day)=>pad+(W-pad-6)*Math.min(1,Math.max(0,day/(P.days-1||1)));
 const y=(kg)=>8+(H-8-22)*(hi-kg)/((hi-lo)||1);
 const dayOfDate=(s)=>Math.round((new Date(s+"T00:00:00Z")-new Date(P.start_date+"T00:00:00Z"))/86400000);
 const pts=ws.map(w=>[x(dayOfDate(w.date)),y(w.kg)]);
 const grid=[lo,Math.round((lo+hi)/2),hi].map(v=>`<line x1="${pad}" x2="${W-6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pad-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join("");
 return `<svg class="fit-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(ft("wTitle"))}">${grid}
  <line x1="${x(0)}" y1="${y(P.start_kg)}" x2="${x(P.days-1)}" y2="${y(goal)}" stroke="var(--gold)" stroke-width="2" stroke-dasharray="5 4"/>
  ${pts.length>1?`<polyline points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`:""}
  ${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--accent)"/>`).join("")}
  <text x="${pad}" y="${H-6}" font-size="10" fill="var(--muted)">${esc(ft("dayOf",{d:1,n:P.days}).split("/")[0].trim())}</text>
  <text x="${W-6}" y="${H-6}" font-size="10" text-anchor="end" fill="var(--muted)">${P.days}</text>
 </svg>
 <div class="fit-leg"><span><i style="background:var(--accent)"></i>${esc(ft("wActual"))}</span><span><i style="background:var(--gold)"></i>${esc(ft("wPlan"))}</span></div>`;
}

/* ---------- program ka main screen ---------- */
function renderWL(){
 const d=fitData,P=d.program,T=d.targets,tk=d.today_log.tasks||{};
 const pct=Math.max(0,Math.min(100,Math.round(d.lost/(P.expected_loss||1)*100)));
 const lvl=d.week<=2?0:d.week<=4?1:2;
 const dt=FIT_DAYS[(d.day-1)%7];
 const wo=dt==="R"?`<p style="margin:0;font-weight:700">🧘 ${esc(ft("woRest"))}</p>`:
   `<p class="sub" style="margin:0 0 6px">${esc(ft("woWarm"))}</p>`+FIT_WO[P.place][dt].map(([e,k])=>`<div class="fit-ex"><span>${esc(ft("ex_"+e))}</span><b>${esc(fitDose(k,lvl))}</b></div>`).join("");
 const meals=["B","L","S","D"].map(s=>`<div class="fit-meal"><div class="mh"><span>${esc(ft("m"+s))}</span><span>~${Math.round(T.kcal*FIT_SPLIT[s]/10)*10} kcal</span></div><div class="mb">${esc(ft("f_"+fitMeal(s,P.diet,d.day)))}</div></div>`).join("");
 const tasks=[["walk",ft("tWalk",{n:T.steps.toLocaleString()})],["workout",ft("tWorkout")],["diet",ft("tDiet")],["sleep",ft("tSleep")],["nosugar",ft("tNosugar")]];
 const done=["water","walk","workout","diet","sleep","nosugar"].filter(k=>k==="water"?(tk.water||0)>=1:!!tk[k]).length;
 const adj=d.adjust;const adjTxt=adj?(adj.action==="slow"?ft("adjSlow"):adj.action==="fast"?ft("adjFast"):adj.action==="ontrack"?ft("adjOn"):ft("adjNo")):"";
 const finished=d.day>=P.days&&d.today>=addDays(P.start_date,P.days-1);
 $("viewFit").innerHTML=`
 <div class="fit-hero">
  <div class="fh-k">⚖️ ${esc(ft("wlTitle"))} · ${esc(ft("dayOf",{d:d.day,n:P.days}))}</div>
  <div class="fh-big"><b>${d.lost>0?d.lost:0}</b><span>${esc(ft("lostLbl"))} · ${esc(ft("goalLbl"))} ${P.expected_loss} kg</span></div>
  <div class="fh-bar"><i style="width:${pct}%"></i></div>
  <div class="fh-row"><span>${P.start_kg} → ${d.cur_kg} kg</span><span>🔥 ${d.streak} ${esc(ft("streakLbl"))}</span></div>
 </div>
 ${finished?`<div class="fit-adj">🎉 ${esc(ft("doneH"))}</div>`:""}
 ${adjTxt?`<div class="fit-adj">${esc(adjTxt)}</div>`:""}
 <div class="fit-card"><h3>🎯 ${esc(ft("tgtTitle"))}</h3><div class="fit-tg">
  <div><b>${T.kcal}</b><span>${esc(ft("kcal"))}</span></div>
  <div><b>${T.protein_g} g</b><span>${esc(ft("protein"))}</span></div>
  <div><b>${T.water_glasses}</b><span>${esc(ft("water"))} · ${esc(ft("glasses"))}</span></div>
  <div><b>${T.steps.toLocaleString()}</b><span>${esc(ft("steps"))}</span></div></div></div>
 <div class="fit-card"><h3>✅ ${esc(ft("taskTitle"))}</h3>
  <div class="fit-task" style="cursor:default"><div class="ck" style="${(tk.water||0)>=T.water_glasses?"background:var(--accent);border-color:var(--accent)":""}">${(tk.water||0)>=T.water_glasses?"✓":""}</div><div class="tx">💧 ${esc(ft("tWater"))}</div>
   <div class="fit-water"><button type="button" data-w="-1" aria-label="-">−</button><b>${tk.water||0}/${T.water_glasses}</b><button type="button" data-w="1" aria-label="+">+</button></div></div>
  ${tasks.map(([k,l])=>`<div class="fit-task ${tk[k]?"on":""}" data-t="${k}" role="checkbox" aria-checked="${!!tk[k]}" tabindex="0"><div class="ck">${tk[k]?"✓":""}</div><div class="tx">${esc(l)}</div></div>`).join("")}
  <div class="fit-msg">${done>=4?esc(ft("dayDone")):esc(ft("dayLeft",{n:4-done}))}</div>
 </div>
 <div class="fit-card"><h3>⚖️ ${esc(ft("wTitle"))}</h3>
  <div class="fit-w"><input id="fwToday" type="number" inputmode="decimal" step="0.1" placeholder="${esc(ft("wPh"))}" value="${d.today_log.weight||""}"><button class="btn btn-primary" id="fwSave">${esc(ft("wSave"))}</button></div>
  <p class="sub" style="margin:8px 0 0;font-size:12.5px">${esc(ft("wHint"))}</p>
  ${fitChart(d)}
 </div>
 <div class="fit-card"><h3>🏋️ ${esc(ft("woTitle"))} <span class="sub" style="margin:0 0 0 auto;font-size:12.5px">${esc(ft("woWeek",{w:d.week}))}</span></h3>${wo}</div>
 <div class="fit-card"><h3>🍽️ ${esc(ft("mealTitle"))} <span class="sub" style="margin:0 0 0 auto;font-size:12.5px">${T.kcal} kcal</span></h3>${meals}</div>
 <div class="fit-card"><h3>💡 ${esc(ft("tipTitle"))}</h3><p style="margin:0;font-weight:700">${esc(ft("tip"+(((d.day-1)%8)+1)))}</p></div>
 <p class="fit-disc">⚕ ${esc(ft("disc"))}</p>
 <div style="display:flex;gap:10px;margin:14px 0 6px;flex-wrap:wrap">
  ${finished?`<button class="btn btn-primary" id="fwNew" style="width:auto">${esc(ft("newProg"))}</button>`:""}
  <button class="btn btn-ghost" id="fwStop" style="width:auto">${esc(ft("stopBtn"))}</button>
 </div>`;
 const send=async(body)=>{try{const r=await api("/fit/wl/log",{method:"POST",body:JSON.stringify(body)});fitData=r;const y=window.scrollY;renderWL();window.scrollTo(0,y);if(typeof pointToast==="function")pointToast(r);}catch(e){toast(e.message);}};
 document.querySelectorAll("#viewFit [data-t]").forEach(el=>{const go=()=>send({tasks:{[el.dataset.t]:!tk[el.dataset.t]}});el.onclick=go;el.onkeydown=(e)=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();go();}};});
 document.querySelectorAll("#viewFit [data-w]").forEach(b=>b.onclick=()=>send({tasks:{water:Math.max(0,(tk.water||0)+Number(b.dataset.w))}}));
 $("fwSave").onclick=async()=>{const v=parseFloat($("fwToday").value);if(!(v>=30&&v<=250)){toast(ft("errInput"));return;}await send({weight:v});toast(tx("saved"));};
 $("fwStop").onclick=async()=>{if(!confirm(ft("stopQ")))return;await api("/fit/wl/stop",{method:"POST",body:"{}"});fitData=null;loadFit();};
 if($("fwNew"))$("fwNew").onclick=async()=>{await api("/fit/wl/stop",{method:"POST",body:"{}"});fitData={program:null};renderFit();};
}
function addDays(s,n){return new Date(new Date(s+"T00:00:00Z").getTime()+n*86400000).toISOString().slice(0,10);}
