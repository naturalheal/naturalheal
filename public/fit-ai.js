/* =========================================================================
   Fit — Premium + AI: Weight Loss / Gym ka AI diet chart (7 din), AI yoga session,
   AI gym coach. Free user ko ek chhota "Premium" sandesh. Server: /api/fit/ai/*.
   Text 11 bhashaon me (kram FT_ORDER).
   ========================================================================= */
Object.assign(FT,{
 aiTag:["✨ Premium AI","✨ Premium AI","✨ प्रीमियम AI","✨ প্রিমিয়াম AI","✨ प्रीमियम AI","✨ પ્રીમિયમ AI","✨ பிரீமியம் AI","✨ ప్రీమియం AI","✨ ಪ್ರೀಮಿಯಂ AI","✨ ਪ੍ਰੀਮੀਅਮ AI","✨ പ്രീമിയം AI"],
 aiDietH:["AI diet chart — 7 days","AI diet chart — 7 din","AI डाइट चार्ट — 7 दिन","AI ডায়েট চার্ট — 7 দিন","AI आहार तक्ता — 7 दिवस","AI ડાયેટ ચાર્ટ — 7 દિવસ","AI உணவு அட்டவணை — 7 நாட்கள்","AI డైట్ చార్ట్ — 7 రోజులు","AI ಆಹಾರ ಪಟ್ಟಿ — 7 ದಿನ","AI ਡਾਈਟ ਚਾਰਟ — 7 ਦਿਨ","AI ഡയറ്റ് ചാർട്ട് — 7 ദിവസം"],
 aiDietSub:["Made for your calories, protein, food type, health and regional taste.","Aapki calorie, protein, khaane ki pasand, sehat aur ilaake ke swaad ke hisaab se.","आपकी कैलोरी, प्रोटीन, खाने की पसंद, सेहत और इलाके के स्वाद के हिसाब से।","আপনার ক্যালোরি, প্রোটিন, খাবারের ধরন, স্বাস্থ্য ও আঞ্চলিক স্বাদ অনুযায়ী।","तुमच्या कॅलरी, प्रथिने, आहाराची आवड, आरोग्य आणि प्रादेशिक चवीनुसार.","તમારી કેલરી, પ્રોટીન, ભોજનની પસંદ, સ્વાસ્થ્ય અને પ્રદેશના સ્વાદ મુજબ.","உங்கள் கலோரி, புரதம், உணவு வகை, ஆரோக்கியம், பகுதி சுவைக்கு ஏற்ப.","మీ క్యాలరీలు, ప్రోటీన్, ఆహార రకం, ఆరోగ్యం, ప్రాంతీయ రుచికి తగ్గట్టు.","ನಿಮ್ಮ ಕ್ಯಾಲೊರಿ, ಪ್ರೋಟೀನ್, ಆಹಾರ ಪ್ರಕಾರ, ಆರೋಗ್ಯ ಮತ್ತು ಪ್ರಾದೇಶಿಕ ರುಚಿಗೆ ತಕ್ಕಂತೆ.","ਤੁਹਾਡੀ ਕੈਲੋਰੀ, ਪ੍ਰੋਟੀਨ, ਖਾਣੇ ਦੀ ਪਸੰਦ, ਸਿਹਤ ਅਤੇ ਇਲਾਕੇ ਦੇ ਸੁਆਦ ਮੁਤਾਬਕ।","നിങ്ങളുടെ കലോറി, പ്രോട്ടീൻ, ഭക്ഷണരീതി, ആരോഗ്യം, പ്രാദേശിക രുചി എന്നിവ അനുസരിച്ച്."],
 aiDietBtn:["Make my AI diet chart","Mera AI diet chart banao","मेरा AI डाइट चार्ट बनाओ","আমার AI ডায়েট চার্ট বানাও","माझा AI आहार तक्ता बनवा","મારો AI ડાયેટ ચાર્ટ બનાવો","என் AI உணவு அட்டவணையை உருவாக்கு","నా AI డైట్ చార్ట్ తయారు చేయండి","ನನ್ನ AI ಆಹಾರ ಪಟ್ಟಿ ಮಾಡಿ","ਮੇਰਾ AI ਡਾਈਟ ਚਾਰਟ ਬਣਾਓ","എന്റെ AI ഡയറ്റ് ചാർട്ട് ഉണ്ടാക്കൂ"],
 aiMaking:["AI is preparing it… (can take up to a minute)","AI bana raha hai… (ek minute tak lag sakta hai)","AI बना रहा है… (एक मिनट तक लग सकता है)","AI তৈরি করছে… (এক মিনিট পর্যন্ত লাগতে পারে)","AI तयार करत आहे… (एक मिनिटापर्यंत लागू शकतो)","AI બનાવી રહ્યું છે… (એક મિનિટ સુધી લાગી શકે)","AI தயாரிக்கிறது… (ஒரு நிமிடம் வரை ஆகலாம்)","AI తయారు చేస్తోంది… (ఒక నిమిషం వరకు పట్టవచ్చు)","AI ಸಿದ್ಧಪಡಿಸುತ್ತಿದೆ… (ಒಂದು ನಿಮಿಷದವರೆಗೆ ಆಗಬಹುದು)","AI ਬਣਾ ਰਿਹਾ ਹੈ… (ਇੱਕ ਮਿੰਟ ਤੱਕ ਲੱਗ ਸਕਦਾ ਹੈ)","AI തയ്യാറാക്കുന്നു… (ഒരു മിനിറ്റ് വരെ എടുത്തേക്കാം)"],
 aiErr:["AI couldn't make it right now. Please try again.","AI abhi nahi bana paya. Dobara koshish karein.","AI अभी नहीं बना पाया। दोबारा कोशिश करें।","AI এখন তৈরি করতে পারেনি। আবার চেষ্টা করুন।","AI आत्ता तयार करू शकले नाही. पुन्हा प्रयत्न करा.","AI હમણાં બનાવી શક્યું નહીં. ફરી પ્રયત્ન કરો.","AI இப்போது தயாரிக்க முடியவில்லை. மீண்டும் முயலுங்கள்.","AI ఇప్పుడు తయారు చేయలేకపోయింది. మళ్లీ ప్రయత్నించండి.","AI ಈಗ ಮಾಡಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.","AI ਹੁਣੇ ਨਹੀਂ ਬਣਾ ਸਕਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।","AI-ക്ക് ഇപ്പോൾ ഉണ്ടാക്കാനായില്ല. വീണ്ടും ശ്രമിക്കൂ."],
 aiRedo:["Make a new one","Naya banao","नया बनाओ","নতুন বানাও","नवीन बनवा","નવું બનાવો","புதிதாக உருவாக்கு","కొత్తది తయారు చేయండి","ಹೊಸದು ಮಾಡಿ","ਨਵਾਂ ਬਣਾਓ","പുതിയത് ഉണ്ടാക്കൂ"],
 aiDay:["Day {n}","Din {n}","दिन {n}","দিন {n}","दिवस {n}","દિવસ {n}","நாள் {n}","రోజు {n}","ದಿನ {n}","ਦਿਨ {n}","ദിവസം {n}"],
 aiTotal:["Total ~{k} kcal · {p} g protein","Kul ~{k} kcal · {p} g protein","कुल ~{k} kcal · {p} g प्रोटीन","মোট ~{k} kcal · {p} g প্রোটিন","एकूण ~{k} kcal · {p} g प्रथिने","કુલ ~{k} kcal · {p} g પ્રોટીન","மொத்தம் ~{k} kcal · {p} g புரதம்","మొత్తం ~{k} kcal · {p} g ప్రోటీన్","ಒಟ್ಟು ~{k} kcal · {p} g ಪ್ರೋಟೀನ್","ਕੁੱਲ ~{k} kcal · {p} g ਪ੍ਰੋਟੀਨ","ആകെ ~{k} kcal · {p} g പ്രോട്ടീൻ"],
 aiUp:["Premium: AI makes your personal 7-day diet chart, yoga session and gym coach review.","Premium me: AI aapka personal 7-din diet chart, yoga session aur gym coach review banata hai.","प्रीमियम में: AI आपका पर्सनल 7-दिन डाइट चार्ट, योग सेशन और जिम कोच रिव्यू बनाता है।","প্রিমিয়ামে: AI আপনার ব্যক্তিগত 7-দিনের ডায়েট চার্ট, যোগ সেশন আর জিম কোচ রিভিউ বানায়।","प्रीमियममध्ये: AI तुमचा वैयक्तिक 7-दिवसीय आहार तक्ता, योग सत्र आणि जिम कोच पुनरावलोकन बनवते.","પ્રીમિયમમાં: AI તમારો પર્સનલ 7-દિવસ ડાયેટ ચાર્ટ, યોગ સેશન અને જિમ કોચ રિવ્યૂ બનાવે છે.","பிரீமியத்தில்: AI உங்களுக்கான 7 நாள் உணவு அட்டவணை, யோகா அமர்வு, ஜிம் கோச் மதிப்பாய்வை உருவாக்கும்.","ప్రీమియంలో: AI మీ వ్యక్తిగత 7-రోజుల డైట్ చార్ట్, యోగా సెషన్, జిమ్ కోచ్ సమీక్ష తయారు చేస్తుంది.","ಪ್ರೀಮಿಯಂನಲ್ಲಿ: AI ನಿಮ್ಮ ವೈಯಕ್ತಿಕ 7-ದಿನ ಆಹಾರ ಪಟ್ಟಿ, ಯೋಗ ಅವಧಿ ಮತ್ತು ಜಿಮ್ ಕೋಚ್ ವಿಮರ್ಶೆ ಮಾಡುತ್ತದೆ.","ਪ੍ਰੀਮੀਅਮ ਵਿੱਚ: AI ਤੁਹਾਡਾ ਨਿੱਜੀ 7-ਦਿਨ ਡਾਈਟ ਚਾਰਟ, ਯੋਗ ਸੈਸ਼ਨ ਅਤੇ ਜਿਮ ਕੋਚ ਰਿਵਿਊ ਬਣਾਉਂਦਾ ਹੈ।","പ്രീമിയത്തിൽ: AI നിങ്ങളുടെ സ്വന്തം 7 ദിവസ ഡയറ്റ് ചാർട്ട്, യോഗ സെഷൻ, ജിം കോച്ച് റിവ്യൂ എന്നിവ ഉണ്ടാക്കും."],
 aiSee:["See Premium","Premium dekhein","प्रीमियम देखें","প্রিমিয়াম দেখুন","प्रीमियम पाहा","પ્રીમિયમ જુઓ","பிரீமியத்தைப் பாருங்கள்","ప్రీమియం చూడండి","ಪ್ರೀಮಿಯಂ ನೋಡಿ","ਪ੍ਰੀਮੀਅਮ ਦੇਖੋ","പ്രീമിയം കാണൂ"],
 aiYogaH:["My AI yoga session","Mera AI yoga session","मेरा AI योग सेशन","আমার AI যোগ সেশন","माझे AI योग सत्र","મારું AI યોગ સેશન","என் AI யோகா அமர்வு","నా AI యోగా సెషన్","ನನ್ನ AI ಯೋಗ ಅವಧಿ","ਮੇਰਾ AI ਯੋਗ ਸੈਸ਼ਨ","എന്റെ AI യോഗ സെഷൻ"],
 aiYogaSub:["AI picks safe poses for your health concerns and the time you have.","AI aapki takleef aur samay ke hisaab se surakshit aasan chunta hai.","AI आपकी तकलीफ़ और समय के हिसाब से सुरक्षित आसन चुनता है।","AI আপনার সমস্যা আর সময় অনুযায়ী নিরাপদ আসন বাছে।","AI तुमच्या त्रासानुसार आणि वेळेनुसार सुरक्षित आसने निवडते.","AI તમારી તકલીફ અને સમય મુજબ સુરક્ષિત આસન પસંદ કરે છે.","AI உங்கள் உடல்நலப் பிரச்சனை, நேரத்திற்கு ஏற்ப பாதுகாப்பான ஆசனங்களைத் தேர்ந்தெடுக்கும்.","AI మీ సమస్యలు, సమయానికి తగ్గట్టు సురక్షిత ఆసనాలను ఎంచుకుంటుంది.","AI ನಿಮ್ಮ ತೊಂದರೆ ಮತ್ತು ಸಮಯಕ್ಕೆ ತಕ್ಕ ಸುರಕ್ಷಿತ ಆಸನಗಳನ್ನು ಆರಿಸುತ್ತದೆ.","AI ਤੁਹਾਡੀ ਤਕਲੀਫ਼ ਅਤੇ ਸਮੇਂ ਮੁਤਾਬਕ ਸੁਰੱਖਿਅਤ ਆਸਣ ਚੁਣਦਾ ਹੈ।","AI നിങ്ങളുടെ പ്രശ്നങ്ങൾക്കും സമയത്തിനും അനുസരിച്ച് സുരക്ഷിത ആസനങ്ങൾ തിരഞ്ഞെടുക്കും."],
 aiYogaBtn:["Make my session","Mera session banao","मेरा सेशन बनाओ","আমার সেশন বানাও","माझे सत्र बनवा","મારું સેશન બનાવો","என் அமர்வை உருவாக்கு","నా సెషన్ తయారు చేయండి","ನನ್ನ ಅವಧಿ ಮಾಡಿ","ਮੇਰਾ ਸੈਸ਼ਨ ਬਣਾਓ","എന്റെ സെഷൻ ഉണ്ടാക്കൂ"],
 aiCoachH:["AI coach review","AI coach ki review","AI कोच की समीक्षा","AI কোচের পর্যালোচনা","AI कोचचे पुनरावलोकन","AI કોચનો રિવ્યૂ","AI கோச் மதிப்பாய்வு","AI కోచ్ సమీక్ష","AI ಕೋಚ್ ವಿಮರ್ಶೆ","AI ਕੋਚ ਦੀ ਸਮੀਖਿਆ","AI കോച്ച് റിവ്യൂ"],
 aiCoachBtn:["Review my workouts","Mere workout dekho","मेरे वर्कआउट देखो","আমার ওয়ার্কআউট দেখো","माझे व्यायाम तपासा","મારાં વર્કઆઉટ જુઓ","என் பயிற்சிகளை மதிப்பாய்வு செய்","నా వ్యాయామాలు చూడండి","ನನ್ನ ವ್ಯಾಯಾಮ ಪರಿಶೀಲಿಸಿ","ਮੇਰੀਆਂ ਕਸਰਤਾਂ ਦੇਖੋ","എന്റെ വ്യായാമങ്ങൾ പരിശോധിക്കൂ"],
});

function aiPrem(){return !!(typeof me!=="undefined"&&me&&me.premium);}
function aiUpsell(){
 return `<div class="ai-box ai-up"><div class="ai-tag">${esc(ft("aiTag"))}</div><p style="margin:6px 0 10px;font-weight:700">${esc(ft("aiUp"))}</p>
  <button type="button" class="btn btn-gold ai-see" style="width:auto;padding:9px 16px">${esc(ft("aiSee"))}</button></div>`;
}
function aiBindUpsell(root){(root||document).querySelectorAll(".ai-see").forEach(b=>b.onclick=()=>{setTab("plan");const up=$("upgradePanel");if(up){up.classList.remove("hidden");up.scrollIntoView({behavior:"smooth"});}});}
(function(){const st=document.createElement("style");st.textContent=`
.ai-box{border:1.5px solid #C4A8E8;background:linear-gradient(160deg,#F5EFFC,var(--surface));border-radius:16px;padding:14px;margin-top:12px}
@media (prefers-color-scheme:dark){.ai-box{background:linear-gradient(160deg,#271F33,var(--surface))}}
.ai-tag{display:inline-block;font-size:12px;font-weight:800;color:#6B4A92;background:#EBE3F4;border-radius:99px;padding:3px 10px}
.ai-box h4{margin:8px 0 4px;font-size:16px}
.ai-days{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.ai-days button{border:1px solid var(--line);background:var(--surface);border-radius:99px;padding:6px 11px;font:inherit;font-size:12.5px;font-weight:800;color:var(--muted);cursor:pointer}
.ai-days button.on{background:#6B4A92;border-color:#6B4A92;color:#fff}
.ai-meal{padding:9px 0;border-bottom:1px dashed var(--line)}
.ai-meal:last-child{border:none}
.ai-meal .mh{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);font-weight:800;text-transform:uppercase}
.ai-meal .mb{font-weight:700;font-size:14.5px;margin-top:2px}
.ai-meal .mq{font-size:13px;color:var(--muted)}
.ai-list{margin:8px 0 0;padding-left:18px}
.ai-list li{margin-bottom:6px;font-size:14px}
.ai-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
.ai-row .btn{width:auto;padding:9px 16px}
`;document.head.appendChild(st);})();
function aiSpin(){return `<p class="sub" style="margin:10px 0 0;display:flex;gap:8px;align-items:center"><span class="spin" style="border-color:#EBE3F4;border-top-color:#6B4A92;width:18px;height:18px"></span>${esc(ft("aiMaking"))}</p>`;}

/* ---------- AI diet chart (weight loss / gym) ---------- */
const aiDietCache={};
function aiDietHTML(kind){
 const d=aiDietCache[kind];
 if(!aiPrem())return aiUpsell();
 const dietSeg=kind==="gym"?`<div class="fit-seg" data-aidiet style="margin-top:8px">${[["veg",ft("dVeg")],["egg",ft("dEgg")],["nonveg",ft("dNon")]].map(([v,l])=>`<button type="button" data-v="${v}" class="${aiGymDiet()===v?"on":""}">${esc(l)}</button>`).join("")}</div>`:"";
 if(!d||d.err||d.loading)return `<div class="ai-box" id="aiDiet_${kind}"><div class="ai-tag">${esc(ft("aiTag"))}</div><h4>🥗 ${esc(ft("aiDietH"))}</h4><p class="sub" style="margin:0">${esc(ft("aiDietSub"))}</p>${dietSeg}
  ${d&&d.loading?aiSpin():`<div class="ai-row"><button type="button" class="btn btn-primary" style="background:#6B4A92" data-aimk="${kind}">✨ ${esc(ft("aiDietBtn"))}</button></div>`}
  ${d&&d.err?`<p style="color:var(--danger);font-weight:700;margin:8px 0 0">${esc(ft("aiErr"))}</p>`:""}</div>`;
 const di=Math.min(d.days.length-1,d.pick!=null?d.pick:((new Date().getDay()+6)%7));
 const day=d.days[di],tk=day.meals.reduce((s,m)=>s+m.kcal,0),tp=day.meals.reduce((s,m)=>s+m.p,0);
 return `<div class="ai-box" id="aiDiet_${kind}"><div class="ai-tag">${esc(ft("aiTag"))}</div><h4>🥗 ${esc(ft("aiDietH"))}</h4>
  <div class="ai-days">${d.days.map((_,i)=>`<button type="button" data-aid="${i}" class="${i===di?"on":""}">${esc(ft("aiDay",{n:i+1}))}</button>`).join("")}</div>
  ${day.meals.map(m=>`<div class="ai-meal"><div class="mh"><span>${esc(ft("m"+m.s))}</span><span>${m.kcal?`~${m.kcal} kcal`:""}${m.p?` · ${m.p} g`:""}</span></div><div class="mb">${esc(m.name)}</div>${m.qty?`<div class="mq">${esc(m.qty)}</div>`:""}</div>`).join("")}
  <p class="sub" style="margin:8px 0 0;font-weight:800">${esc(ft("aiTotal",{k:tk,p:tp}))}</p>
  ${(d.tips||[]).length?`<ul class="ai-list">${d.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
  ${dietSeg}<div class="ai-row"><button type="button" class="btn btn-ghost" data-aimk="${kind}" data-redo="1">🔄 ${esc(ft("aiRedo"))}</button></div></div>`;
}
function aiGymDiet(){try{return localStorage.getItem("nh_gymdiet")||"veg";}catch(_){return "veg";}}
async function aiMakeDiet(kind,redo){
 aiDietCache[kind]={loading:true};aiDietRefresh(kind);
 try{const d=await api("/fit/ai/diet",{method:"POST",body:JSON.stringify({kind,language:lang,diet:aiGymDiet(),refresh:!!redo})});aiDietCache[kind]=d;}
 catch(e){aiDietCache[kind]={err:true};}
 aiDietRefresh(kind);
}
function aiDietRefresh(kind){const box=$("aiDiet_"+kind);if(!box)return;box.outerHTML=aiDietHTML(kind);aiDietBind();}
function aiDietBind(){
 document.querySelectorAll("[data-aimk]").forEach(b=>b.onclick=()=>aiMakeDiet(b.dataset.aimk,!!b.dataset.redo));
 document.querySelectorAll("[id^=aiDiet_] [data-aid]").forEach(b=>b.onclick=()=>{const kind=b.closest("[id^=aiDiet_]").id.slice(7);aiDietCache[kind].pick=+b.dataset.aid;aiDietRefresh(kind);});
 document.querySelectorAll("[data-aidiet] button").forEach(b=>b.onclick=()=>{try{localStorage.setItem("nh_gymdiet",b.dataset.v);}catch(_){}aiDietCache.gym=null;aiDietRefresh("gym");});
 aiBindUpsell();
}
/* Weight loss ke khaane wale card ke neeche */
if(typeof renderWL==="function"){const _rwl=renderWL;renderWL=function(){_rwl();
 const card=[...document.querySelectorAll("#fitBody .fit-card")].find(c=>(c.querySelector("h3")||{}).textContent?.startsWith("🍽️"));
 if(card){card.insertAdjacentHTML("beforeend",aiDietHTML("wl"));aiDietBind();}
};}
/* Gym: protein card me diet chart, workout card ke baad AI coach */
const aiCoachState={};
if(typeof renderGym==="function"){const _rg=renderGym;renderGym=function(){_rg();
 if(!gymData||!gymData.profile||gymEdit)return;
 const cards=[...document.querySelectorAll("#fitBody .fit-card")];
 const prot=cards.find(c=>(c.querySelector("h3")||{}).textContent?.startsWith("🥚"));
 if(prot){prot.insertAdjacentHTML("beforeend",aiDietHTML("gym"));}
 const work=cards.find(c=>(c.querySelector("h3")||{}).textContent?.startsWith("💪"));
 if(work&&gymData.total>0)work.insertAdjacentHTML("afterend",`<div class="fit-card" id="aiCoachCard"></div>`),aiCoachRender();
 aiDietBind();
};}
function aiCoachRender(){
 const box=$("aiCoachCard");if(!box)return;const s=aiCoachState;
 if(!aiPrem()){box.innerHTML=`<h3>🤖 ${esc(ft("aiCoachH"))}</h3>${aiUpsell()}`;aiBindUpsell(box);return;}
 box.innerHTML=`<h3>🤖 ${esc(ft("aiCoachH"))} <span class="ai-tag" style="margin-left:auto">${esc(ft("aiTag"))}</span></h3>
  ${s.tips?`<ul class="ai-list">${s.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
  ${s.loading?aiSpin():s.tips?"":`<div class="ai-row"><button type="button" class="btn btn-primary" style="background:#6B4A92" id="aiCoachGo">✨ ${esc(ft("aiCoachBtn"))}</button></div>`}
  ${s.err?`<p style="color:var(--danger);font-weight:700;margin:8px 0 0">${esc(ft("aiErr"))}</p>`:""}`;
 const b=$("aiCoachGo");if(b)b.onclick=async()=>{aiCoachState.loading=true;aiCoachState.err=false;aiCoachRender();
  try{const r=await api("/fit/ai/coach",{method:"POST",body:JSON.stringify({language:lang})});aiCoachState.tips=r.tips;}catch(e){aiCoachState.err=true;}
  aiCoachState.loading=false;aiCoachRender();};
}
/* Yoga: hero ke neeche "Mera AI session" */
const aiYogaState={min:20};
if(typeof renderYoga==="function"){const _ry=renderYoga;renderYoga=function(){_ry();
 const hero=document.querySelector("#fitBody .y-hero");if(!hero)return;
 hero.insertAdjacentHTML("afterend",`<div class="fit-card" id="aiYogaCard"></div>`);aiYogaRender();
};}
function aiYogaRender(){
 const box=$("aiYogaCard");if(!box)return;const s=aiYogaState;
 if(!aiPrem()){box.innerHTML=`<h3>✨ ${esc(ft("aiYogaH"))}</h3>${aiUpsell()}`;aiBindUpsell(box);return;}
 const d=s.data;
 box.innerHTML=`<h3>✨ ${esc(ft("aiYogaH"))} <span class="ai-tag" style="margin-left:auto">${esc(ft("aiTag"))}</span></h3>
  <p class="sub" style="margin:0">${esc(ft("aiYogaSub"))}</p>
  <div class="fit-seg" style="margin-top:10px">${[10,20,30].map(m=>`<button type="button" data-aym="${m}" class="${s.min===m?"on":""}">${m} ${esc(ft("min"))}</button>`).join("")}</div>
  ${d?`<div class="ai-box"><b>${esc(d.title||ft("aiYogaH"))}</b><p class="sub" style="margin:4px 0 6px">${esc(d.why||"")}</p>
   <p style="margin:0;font-size:13.5px">${d.poses.map(p=>esc(ft("p_"+p[0]+"_n"))).join(" → ")}</p>
   <div class="ai-row"><button type="button" class="btn btn-primary" style="background:#6B4A92" id="aiYStart">▶ ${esc(ft("yStart"))} · ${Math.round(d.poses.reduce((a,p)=>a+p[1],0)/60)} ${esc(ft("min"))}</button>
   <button type="button" class="btn btn-ghost" id="aiYRedo">🔄 ${esc(ft("aiRedo"))}</button></div></div>`:""}
  ${s.loading?aiSpin():d?"":`<div class="ai-row"><button type="button" class="btn btn-primary" style="background:#6B4A92" id="aiYGo">✨ ${esc(ft("aiYogaBtn"))}</button></div>`}
  ${s.err?`<p style="color:var(--danger);font-weight:700;margin:8px 0 0">${esc(ft("aiErr"))}</p>`:""}`;
 box.querySelectorAll("[data-aym]").forEach(b=>b.onclick=()=>{s.min=+b.dataset.aym;s.data=null;aiYogaRender();});
 const go=async(redo)=>{s.loading=true;s.err=false;aiYogaRender();
  try{s.data=await api("/fit/ai/yoga",{method:"POST",body:JSON.stringify({minutes:s.min,language:lang,refresh:!!redo})});}catch(e){s.err=true;}
  s.loading=false;aiYogaRender();};
 if($("aiYGo"))$("aiYGo").onclick=()=>go(false);
 if($("aiYRedo"))$("aiYRedo").onclick=()=>go(true);
 if($("aiYStart"))$("aiYStart").onclick=()=>{Y_SESS.ai={e:"✨",p:d.poses};FT.s_ai_n=FT_ORDER.map(()=>d.title||ft("aiYogaH"));yStart("ai");};
}
