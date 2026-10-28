/* =========================================================================
   Fit → Yoga Classes: 10 guided sessions + player (timer, awaaz, auto-next).
   Text: yoga-i18n.js (ft()). Server: /api/fit/yoga (get), /done (session poora).
   ========================================================================= */
(function(){const st=document.createElement("style");st.textContent=`
.fit-segbar{display:flex;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:5px;margin-top:12px}
.fit-segbar button{flex:1;border:none;background:none;border-radius:10px;padding:10px 6px;font:inherit;font-weight:800;font-size:14px;color:var(--muted);cursor:pointer}
.fit-segbar button.on{background:var(--accent);color:#fff}
.y-hero{background:linear-gradient(150deg,#6B4A92,#3E2A63);color:#fff;border-radius:20px;padding:20px;margin-top:12px;box-shadow:var(--shadow)}
.y-hero h2{font-family:var(--f-head);font-size:22px;margin:0 0 4px}
.y-hero p{opacity:.88;font-size:14px;margin:0}
.y-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.y-stats div{background:rgba(255,255,255,.14);border-radius:12px;padding:9px 6px;text-align:center}
.y-stats b{display:block;font-family:var(--f-head);font-size:22px}
.y-stats span{font-size:11.5px;font-weight:700;opacity:.9}
.y-week{display:flex;align-items:flex-end;gap:6px;height:70px;margin-top:6px}
.y-week div{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}
.y-week i{display:block;width:100%;max-width:26px;border-radius:6px 6px 3px 3px;background:var(--accent);min-height:3px}
.y-week i.z{background:var(--line)}
.y-week span{font-size:11px;color:var(--muted);font-weight:700}
.y-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:560px){.y-list{grid-template-columns:1fr}}
.y-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:6px}
.y-card .yt{display:flex;align-items:center;gap:10px}
.y-card .ye{font-size:26px;width:44px;height:44px;border-radius:12px;background:#EBE3F4;display:grid;place-items:center;flex:none}
.y-card b{font-size:15px;line-height:1.3}
.y-card p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
.y-card .ym{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;font-size:12.5px;font-weight:800;color:var(--muted)}
.y-card .btn{width:auto;padding:9px 16px;font-size:14px}
.y-card .yd{color:var(--accent);font-weight:800}
.y-rec .y-card{border-color:#C4A8E8}
.y-play{position:fixed;inset:0;z-index:80;background:var(--bg);display:flex;flex-direction:column;overflow-y:auto}
.y-top{display:flex;align-items:center;gap:10px;padding:14px 16px 6px}
.y-top b{flex:1;font-size:15px}
.y-top button{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:7px 11px;font:inherit;font-weight:800;font-size:13px;cursor:pointer;color:var(--fg)}
.y-prog{height:5px;background:var(--surface-2);margin:0 16px;border-radius:5px;overflow:hidden}
.y-prog i{display:block;height:100%;background:#6B4A92;transition:width .4s}
.y-body{flex:1;max-width:560px;width:100%;margin:0 auto;padding:16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
.y-cnt{font-size:12.5px;font-weight:800;color:var(--muted)}
.y-emo{font-size:64px;line-height:1}
.y-fig{color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:6px 10px;line-height:0}
.y-vid,.g-vid{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13.5px;color:#C4302B;background:#FDECEC;border-radius:99px;padding:7px 14px;text-decoration:none}
.y-name{font-family:var(--f-head);font-size:24px;margin:0}
.y-ring{position:relative;width:150px;height:150px}
.y-ring svg{transform:rotate(-90deg)}
.y-ring b{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--f-head);font-size:38px}
.y-how{font-size:15.5px;line-height:1.6;font-weight:600;max-width:480px}
.y-tag{font-size:13.5px;border-radius:12px;padding:8px 12px;max-width:480px}
.y-tag.b{background:var(--accent-soft);color:var(--accent-ink)}
.y-tag.c{background:var(--gold-soft)}
.y-up{font-size:13px;color:var(--muted);font-weight:700}
.y-ctl{display:flex;gap:10px;justify-content:center;padding:12px 16px calc(18px + env(safe-area-inset-bottom));position:sticky;bottom:0;background:var(--bg)}
.y-ctl .btn{width:auto;min-width:96px}
.y-fin{font-size:70px}
`;document.head.appendChild(st);})();

/* aasan: emoji + saavdhani */
const Y_POSE={
 tadasana:{e:"🧍"},vriksha:{e:"🌳"},trikona:{e:"🔺"},virabhadra:{e:"⚔️",c:["cauKnee"]},
 bhujanga:{e:"🐍",c:["cauBack","cauPreg"]},shalabha:{e:"🦗",c:["cauBack","cauPreg"]},balasana:{e:"🧎",c:["cauKnee"]},
 marjari:{e:"🐈",c:["cauKnee"]},setu:{e:"🌉",c:["cauBack"]},pawan:{e:"🍃",c:["cauPreg"]},vajra:{e:"🧘",c:["cauKnee"]},
 paschim:{e:"🙇",c:["cauBack"]},matsy:{e:"🔄",c:["cauBack","cauPreg"]},butterfly:{e:"🦋"},nauka:{e:"⛵",c:["cauBack","cauPreg"]},
 makara:{e:"🐊"},viparita:{e:"🦵"},surya:{e:"☀️",c:["cauBP","cauPreg"]},anulom:{e:"👃"},kapal:{e:"🌬️",c:["cauBP","cauPreg"]},
 bhramari:{e:"🐝"},sheetali:{e:"❄️"},dhyan:{e:"🕉️"},shava:{e:"😌"},
};
/* session: [aasan, second] */
const Y_SESS={
 morning:{e:"🌅",p:[["tadasana",60],["surya",240],["vriksha",60],["trikona",60],["bhujanga",45],["balasana",60],["anulom",180],["shava",120]]},
 back:{e:"🪑",p:[["marjari",90],["makara",90],["bhujanga",45],["shalabha",30],["setu",45],["pawan",60],["balasana",60],["shava",120]]},
 stress:{e:"🌙",p:[["balasana",90],["viparita",180],["paschim",60],["bhramari",120],["anulom",180],["dhyan",120],["shava",180]]},
 weight:{e:"🔥",p:[["surya",360],["nauka",30],["trikona",60],["virabhadra",60],["setu",45],["kapal",120],["shava",90]]},
 digest:{e:"🍃",p:[["vajra",180],["pawan",60],["matsy",60],["marjari",60],["sheetali",90],["anulom",120],["shava",90]]},
 diabetes:{e:"🩸",p:[["surya",240],["matsy",60],["paschim",60],["bhujanga",45],["nauka",30],["kapal",120],["anulom",180],["shava",90]]},
 thyroid:{e:"🦋",p:[["setu",45],["viparita",120],["bhujanga",45],["marjari",60],["bhramari",90],["anulom",120],["shava",90]]},
 knee:{e:"🦵",p:[["tadasana",60],["setu",45],["butterfly",90],["pawan",60],["viparita",120],["anulom",120],["shava",90]]},
 women:{e:"🌸",p:[["butterfly",90],["balasana",90],["marjari",90],["setu",45],["bhramari",90],["anulom",120],["shava",120]]},
 bp:{e:"💙",p:[["balasana",90],["paschim",60],["vajra",120],["sheetali",90],["anulom",180],["bhramari",120],["shava",180]]},
};
const Y_ORDER=["morning","back","stress","weight","digest","diabetes","thyroid","knee","women","bp"];
const Y_REC={acidity:"digest",constipation:"digest",stress:"stress",sleep:"stress",headache:"stress",weight:"weight",diabetes:"diabetes",thyroid:"thyroid",backpain:"back",joint:"knee",periods:"women",bp:"bp",fatigue:"morning",cholesterol:"weight"};
function ySecs(id){return Y_SESS[id].p.reduce((s,x)=>s+x[1],0);}
function yMins(id){return Math.round(ySecs(id)/60);}

let yogaData=null;
function fitSeg(){try{return localStorage.getItem("nh_fitseg")||"wl";}catch(_){return "wl";}}
function fitBody(){
 const v=$("viewFit");
 if(!$("fitBody")){v.innerHTML=`<div class="fit-segbar" id="fitSegBar"></div><div id="fitBody"></div>`;}
 const seg=fitSeg();
 $("fitSegBar").innerHTML=[["wl","⚖️ "+ft("segWL")],["yoga","🧘 "+ft("segYoga")],["gym","🏋️ "+ft("segGym")]].map(([k,l])=>`<button type="button" data-fseg="${k}" class="${seg===k?"on":""}">${esc(l)}</button>`).join("");
 $("fitSegBar").querySelectorAll("[data-fseg]").forEach(b=>b.onclick=()=>{try{localStorage.setItem("nh_fitseg",b.dataset.fseg);}catch(_){}loadFit();});
 return $("fitBody");
}
async function loadYoga(){
 const box=fitBody();
 if(!yogaData)box.innerHTML=`<div class="fit-card" style="text-align:center"><span class="spin" style="border-color:var(--accent-soft);border-top-color:var(--accent)"></span></div>`;
 try{yogaData=await api("/fit/yoga");}catch(e){yogaData=yogaData||{today_min:0,streak:0,week:[],total_sessions:0,done_today:[]};}
 renderYoga();
}
function renderYoga(){
 const box=fitBody(),d=yogaData||{today_min:0,streak:0,week:[],total_sessions:0,done_today:[]};
 const conds=(typeof gather==="function"?gather().conditions:[])||[];
 const rec=[...new Set(conds.map(c=>Y_REC[c]).filter(Boolean))];if(!rec.includes("morning"))rec.push("morning");
 const max=Math.max(10,...(d.week||[]).map(w=>w.min));
 const card=(id)=>`<div class="y-card"><div class="yt"><div class="ye">${Y_SESS[id].e}</div><b>${esc(ft("s_"+id+"_n"))}</b></div>
   <p>${esc(ft("s_"+id+"_d"))}</p>
   <div class="ym"><span>⏱ ${yMins(id)} ${esc(ft("min"))} · ${esc(ft("yPoses",{n:Y_SESS[id].p.length}))}</span>
   ${(d.done_today||[]).includes(id)?`<span class="yd">${esc(ft("yDone"))}</span>`:`<button class="btn btn-primary" data-ys="${id}">▶ ${esc(ft("yStart"))}</button>`}</div></div>`;
 box.innerHTML=`
 <div class="y-hero"><h2>🧘 ${esc(ft("yTitle"))}</h2><p>${esc(ft("ySub"))}</p>
  <div class="y-stats"><div><b>${d.today_min||0}</b><span>${esc(ft("yToday"))}</span></div><div><b>🔥 ${d.streak||0}</b><span>${esc(ft("streakLbl"))}</span></div><div><b>${d.total_sessions||0}</b><span>${esc(ft("yTotal"))}</span></div></div></div>
 <div class="fit-card"><h3>📊 ${esc(ft("yWeek"))}</h3><div class="y-week">${(d.week||[]).map(w=>`<div><i class="${w.min?"":"z"}" style="height:${Math.max(4,Math.round(w.min/max*52))}px" title="${w.min}"></i><span>${esc(typeof dayLetter==="function"?dayLetter(new Date(w.date+"T12:00:00")):w.date.slice(8))}</span></div>`).join("")}</div></div>
 <div class="fit-card y-rec"><h3>⭐ ${esc(ft("yRec"))}</h3><div class="y-list">${rec.slice(0,4).map(card).join("")}</div></div>
 <div class="fit-card"><h3>📚 ${esc(ft("yAll"))}</h3><div class="y-list">${Y_ORDER.filter(id=>!rec.slice(0,4).includes(id)).map(card).join("")}</div></div>
 <p class="fit-disc">⚕ ${esc(ft("ySafe"))}</p>`;
 box.querySelectorAll("[data-ys]").forEach(b=>b.onclick=()=>yStart(b.dataset.ys));
}

/* ---------- guided player ---------- */
let yP=null;
function yVoice(){try{return localStorage.getItem("nh_yvoice")!=="0";}catch(_){return true;}}
function yStart(id){
 yP={id,i:0,left:Y_SESS[id].p[0][1],paused:false,done:0,iv:null,wake:null};
 const el=document.createElement("div");el.className="y-play";el.id="yPlay";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
 document.body.appendChild(el);document.body.style.overflow="hidden";
 try{if(navigator.wakeLock)navigator.wakeLock.request("screen").then(w=>{if(yP)yP.wake=w;}).catch(()=>{});}catch(_){}
 yPose(true);
 yP.iv=setInterval(yTick,1000);
}
function yPose(say){
 if(!yP)return;const S=Y_SESS[yP.id],[pid,secs]=S.p[yP.i],P=Y_POSE[pid]||{};
 const nxt=S.p[yP.i+1];
 const r=62,C=2*Math.PI*r,frac=yP.left/secs;
 $("yPlay").innerHTML=`
  <div class="y-top"><b>${S.e} ${esc(ft("s_"+yP.id+"_n"))}</b>
   <button type="button" id="yVoice">${yVoice()?"🔊 "+esc(ft("yVoiceOn")):"🔇 "+esc(ft("yVoiceOff"))}</button>
   <button type="button" id="yX" aria-label="${esc(ft("yClose"))}">✕</button></div>
  <div class="y-prog"><i style="width:${Math.round(yP.i/S.p.length*100)}%"></i></div>
  <div class="y-body">
   <div class="y-cnt">${yP.i+1} / ${S.p.length}</div>
   <div class="y-fig">${typeof figSVG==="function"&&figSVG(pid,220)||`<div class="y-emo">${P.e||"🧘"}</div>`}</div>
   <h2 class="y-name">${esc(ft("p_"+pid+"_n"))}</h2>
   <div class="y-ring"><svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="10"/><circle id="yArc" cx="75" cy="75" r="${r}" fill="none" stroke="#6B4A92" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-frac)}" style="transition:stroke-dashoffset 1s linear"/></svg><b id="yLeft">${yFmt(yP.left)}</b></div>
   <div class="y-how">${esc(ft("p_"+pid+"_h"))}</div>
   ${typeof figVideoUrl==="function"?`<a class="y-vid" href="${figVideoUrl("p_"+pid+"_n")}" target="_blank" rel="noopener">▶ ${esc(ft("vWatch"))}</a>`:""}
   <div class="y-tag b">✨ <b>${esc(ft("yBen"))}:</b> ${esc(ft("p_"+pid+"_b"))}</div>
   ${(P.c||[]).length?`<div class="y-tag c">⚠️ <b>${esc(ft("yCare"))}:</b> ${(P.c||[]).map(c=>esc(ft(c))).join(" ")}</div>`:""}
   ${nxt?`<div class="y-up">${esc(ft("yUp",{p:ft("p_"+nxt[0]+"_n")}))}</div>`:""}
  </div>
  <div class="y-ctl">
   <button class="btn btn-ghost" id="yPrev" ${yP.i===0?"disabled":""}>⏮ ${esc(ft("yPrev"))}</button>
   <button class="btn btn-primary" id="yPause" style="background:#6B4A92">${yP.paused?"▶ "+esc(ft("yPlay")):"⏸ "+esc(ft("yPause"))}</button>
   <button class="btn btn-ghost" id="yNext">${esc(ft("yNext"))} ⏭</button>
  </div>`;
 $("yX").onclick=yClose;
 $("yVoice").onclick=()=>{try{localStorage.setItem("nh_yvoice",yVoice()?"0":"1");}catch(_){}if(!yVoice()&&typeof stopSpeak==="function")stopSpeak();yPose(false);};
 $("yPause").onclick=()=>{yP.paused=!yP.paused;if(yP.paused&&typeof stopSpeak==="function")stopSpeak();yPose(false);};
 $("yNext").onclick=()=>yGo(1);
 $("yPrev").onclick=()=>yGo(-1);
 if(say&&yVoice()&&typeof speak==="function")speak(ft("p_"+pid+"_n")+". "+ft("p_"+pid+"_h"));
}
function yFmt(s){return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
function yTick(){
 if(!yP||yP.paused||!$("yPlay"))return;
 yP.left--;yP.done++;
 if(yP.left<=0){yGo(1);return;}
 const secs=Y_SESS[yP.id].p[yP.i][1],r=62,C=2*Math.PI*r;
 const a=$("yArc"),l=$("yLeft");if(a)a.setAttribute("stroke-dashoffset",C*(1-yP.left/secs));if(l)l.textContent=yFmt(yP.left);
}
function yGo(step){
 if(!yP)return;const S=Y_SESS[yP.id];
 yP.i+=step;
 if(yP.i<0)yP.i=0;
 if(yP.i>=S.p.length){yFinish();return;}
 yP.left=S.p[yP.i][1];yPose(true);
}
async function yFinish(){
 const id=yP.id,min=Math.max(1,Math.round(yP.done/60));
 clearInterval(yP.iv);
 if(typeof stopSpeak==="function")stopSpeak();
 $("yPlay").innerHTML=`<div class="y-body" style="justify-content:center;min-height:100%">
  <div class="y-fin">🎉</div><h2 class="y-name">${esc(ft("yFin"))}</h2>
  <p class="y-how">${esc(ft("yFinSub",{m:min}))}</p>
  <button class="btn btn-primary" id="yDoneBtn" style="max-width:320px;background:#6B4A92">${esc(ft("yClose"))}</button></div>`;
 $("yDoneBtn").onclick=yClose;
 if(yVoice()&&typeof speak==="function")speak(ft("yFin"));
 try{const r=await api("/fit/yoga/done",{method:"POST",body:JSON.stringify({session:id,minutes:min})});yogaData=r;if(typeof pointToast==="function")pointToast(r);}catch(_){}
}
function yClose(){
 if(yP){clearInterval(yP.iv);try{yP.wake&&yP.wake.release();}catch(_){}}
 yP=null;if(typeof stopSpeak==="function")stopSpeak();
 const el=$("yPlay");if(el)el.remove();document.body.style.overflow="";
 if(curTab==="fit"&&fitSeg()==="yoga")renderYoga();
}
