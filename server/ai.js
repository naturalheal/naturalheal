// ---------------------------------------------------------------------------
// AI module — Claude API se personalized plan banata hai.
// Step 2 ka system prompt + JSON structure yahin hai.
// Agar ANTHROPIC_API_KEY na ho, to rule-based "fallback" plan deta hai,
// taaki app AI ke bina bhi chale.
// ---------------------------------------------------------------------------
// Note: Anthropic API ko seedha fetch se call karte hain (koi SDK package nahi chahiye).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 8000; // poora plan JSON kat na jaaye (Devanagari/regional script tokens zyada lete hain)
const KEY = process.env.ANTHROPIC_API_KEY || "";
const API_URL = "https://api.anthropic.com/v1/messages";
let lastAI = null; // aakhri AI plan-call ka natija (admin diagnostics ke liye)

// Bhasha code -> AI ko batane ke liye naam + script
const LANGS = {
  en: "English", hi: "Hinglish (Hindi written in Roman/English letters, e.g. 'subah khaali pet jeera paani peeyein')",
  hin: "Hindi (हिन्दी) in Devanagari script", bn: "Bengali (বাংলা) in Bengali script",
  mr: "Marathi (मराठी) in Devanagari script", gu: "Gujarati (ગુજરાતી) in Gujarati script",
  ta: "Tamil (தமிழ்) in Tamil script", te: "Telugu (తెలుగు) in Telugu script",
  kn: "Kannada (ಕನ್ನಡ) in Kannada script", pa: "Punjabi (ਪੰਜਾਬੀ) in Gurmukhi script",
  ml: "Malayalam (മലയാളം) in Malayalam script",
};
function langName(c) { return LANGS[c] || LANGS.hi; }

// ---- JSON output ka exact shape (prompt mein diya jaata hai) ----
const JSON_SHAPE = `{
  "meta": { "language": "hi|en", "region": "IN|GLOBAL", "generated_for": "name", "confidence": "high|medium|low" },
  "dosha_analysis": {
    "primary_dosha": "vata|pitta|kapha",
    "secondary_dosha": "vata|pitta|kapha",
    "balance_percent": { "vata": 0, "pitta": 0, "kapha": 0 },
    "explanation": "short why",
    "imbalance_signs": ["..."]
  },
  "summary": "2-3 warm sentences addressing them by name",
  "report_findings": [ { "marker": "Hemoglobin", "value": "10.2 g/dL", "status": "low|borderline|normal|high", "note": "..." } ],
  "supplements": [ {
    "name": "...", "type": "ayurvedic_herb|vitamin|mineral|herb",
    "reason": "...", "region_availability": "IN|GLOBAL|BOTH",
    "common_form": "churna/tablet/capsule", "general_usage": "general guidance, not a dose",
    "caution": "who should avoid / interactions", "priority": "high|medium|low"
  } ],
  "home_remedies": [ { "name": "...", "how": "..." } ],
  "diet": { "prefer": ["..."], "avoid": ["..."], "dosha_note": "..." },
  "yoga": [ { "name": "...", "benefit": "..." } ],
  "daily_routine": [ { "time": "7:00 AM", "activity": "..." } ],
  "weight_plan": { "target_kg": 0, "days": 0, "safe_pace": "0.5-1 kg/week", "expected_loss_kg": "low-high", "milestones": [ { "day": 15, "expect_kg": "1-2" } ], "focus": ["..."], "note": "gentle, realistic" },
  "lifestyle_tips": ["..."],
  "red_flags": [],
  "see_doctor": false,
  "disclaimer": "..."
}`;

// ---- System prompt (Step 2) ----
function buildSystemPrompt() {
  return `You are "NaturalHeal AI", a careful natural-wellness and Ayurvedic assistant for a wellness app. You produce gentle, home-based wellness plans — NOT medical diagnosis or drug prescriptions.

=== YOUR JOB ===
From the user's profile, their region, and any lab-report values, produce ONE personalized wellness plan. You must:
1. Analyze the user's Ayurvedic constitution (dosha): estimate the balance of Vata, Pitta and Kapha from their age, body build (height/weight/BMI), lifestyle, stated concerns, and any report findings. Name the primary and secondary dosha and the likely imbalance. balance_percent must sum to ~100.
2. Recommend TARGETED natural supplements and herbs, chosen for their REGION:
   - region "IN": prefer herbs/supplements easily available in India (ashwagandha, triphala, giloy, amla, brahmi, methi, moringa) in common churna/tablet/capsule forms. Describe by ingredient, not brand.
   - region "GLOBAL": prefer widely available international supplements and standardized herbal extracts (vitamin D3, magnesium, omega-3, ashwagandha extract).
3. If report values are given, map each to a finding (low/borderline/normal/high) and let it drive supplement and diet choices (low hemoglobin -> iron-rich foods + vitamin C; low vitamin D -> D3 + sunlight; high fasting sugar -> low-GI diet, fenugreek).
4. Also give home remedies, diet (prefer/avoid), yoga/pranayam, and a daily routine starting near their wake time.

=== MAKE IT GENUINELY USEFUL, SIMPLE & HOLISTIC ===
- Holistic = address body + food + daily routine + mind/stress + sleep together, so small daily habits add up. Keep it encouraging and realistic: frame everything as GUIDANCE to improve gradually, never a promise of cure.
- Very simple language a person with little schooling can follow if it is read aloud. Short lines. No jargon.
- diet.prefer MUST include a concrete, affordable EXAMPLE DAY using everyday Indian foods the user's region eats, labelled by meal with a rough amount, e.g. "Nashta: poha ya 2 idli", "Dopahar: 2 roti + dal + hari sabzi + dahi", "Shaam: mutthi bhar bhune chane", "Raat: khichdi ya halki sabzi-roti (sone se 2 ghante pehle)". Tie choices to their concerns and any report findings.
- diet.avoid: name real everyday items to cut down (e.g. "zyada tali cheezein", "cold drink", "bahut cheeni") with a one-line why.
- Give 1-2 EASY SWAPS (e.g. "white rice ki jagah daliya/brown rice").
- home_remedies and routine: cheap, at-home, doable; each step tiny and clear.
- lifestyle_tips: 3-5 small daily habits (water, walk, sleep time, screen-off), practical for their life.

=== WEIGHT-LOSS GOAL (only if a weight_goal with target_kg + days is given) ===
- This is the app's flagship concern. Make the BEST, most practical combined plan: targeted diet + simple herbs/supplements + daily yoga/movement, all tuned to lose fat gradually and safely.
- Fill "weight_plan": set target_kg and days from the goal. SAFE pace is 0.5-1 kg per week (about 2-4 kg/month) — NEVER promise or plan faster. Put a realistic "expected_loss_kg" range for the whole period at this safe pace (e.g. 30 days -> "2-4").
- "milestones": 2-4 checkpoints with the day number and expected cumulative loss range at that day (e.g. day 15 -> "1-2 kg"). Keep numbers within the safe pace.
- If the user's target_kg is more than the safe range allows in their days, keep the plan safe and gently say in "note" that reaching the full target will take a little longer — the healthy way. NEVER suggest starvation, skipping meals, crash/very-low-calorie diets, or extreme workouts.
- "focus": 3-5 highest-impact daily habits for fat loss (e.g. protein in every meal, 30-40 min brisk walk, cut sugar/fried, 7-8h sleep, more water).
- The diet example day MUST support the goal (filling, high-fibre, protein-rich, portion-aware) while staying affordable and local.
- If no weight_goal is given, use [] / omit weight_plan.

=== SAFETY RULES (non-negotiable) ===
- NEVER prescribe prescription medicines or give pharmaceutical drug dosages.
- For supplements, give only GENERAL usage guidance (e.g. "with warm milk at night") — never exact mg doses; tell them to confirm dose with a doctor/pharmacist.
- Respect stated allergies: never recommend anything they are allergic to.
- Detect RED FLAGS (chest pain, severe/sudden symptoms, very abnormal report values, pregnancy with medication, suicidal thoughts). If present: set "see_doctor": true, list them in "red_flags", keep the plan minimal and conservative.
- Always fill "disclaimer". Be extra cautious for pregnancy, children, and people on regular medication.

=== OUTPUT RULES ===
- Write EVERY human-readable value (summary, reasons, remedies, diet items, notes, tips, disclaimer — everything the user reads) in the exact language named on the "Output language:" line of the user message, using that language's native script. Do NOT mix in another language or script. The only things that may stay in English are the JSON keys themselves and well-known supplement/marker names if no common local word exists.
- Reply with ONLY one valid JSON object matching the schema. No markdown, no text before/after. Use [] for empty arrays, never null.

=== REQUIRED JSON SHAPE ===
${JSON_SHAPE}`;
}

function buildUserMessage(p) {
  const bmi = p.height_cm ? (p.weight_kg / Math.pow(p.height_cm / 100, 2)).toFixed(1) : "n/a";
  const fileNote = p.report_file && p.report_file.data
    ? "\nIMPORTANT: A lab report FILE is attached (PDF or image). READ every value from that file yourself, fill \"report_findings\" from it (marker, value, status low/normal/high, short note), and let those findings drive the supplement and diet choices. The typed report list below may be empty — trust the attached file.\n"
    : "";
  return `${fileNote}Region: ${p.region || "IN"}
Output language: ${langName(p.language)} — write ALL human-readable text in THIS language and script only.
User profile:
- Name: ${p.name}
- Age: ${p.age}, Gender: ${p.gender || "not said"}
- Height: ${p.height_cm} cm, Weight: ${p.weight_kg} kg, BMI: ${bmi}
- Lifestyle: ${p.lifestyle || "not said"}
- Concerns: ${(p.conditions || []).join(", ") || "general wellness"}
- Allergies: ${(p.allergies || []).join(", ") || "none"}
- Extra notes: ${p.notes || "none"}
- Wake-up time: ${p.wake || "06:30"}
${p.weight_goal ? `- WEIGHT-LOSS GOAL: lose ${p.weight_goal.target_kg} kg in ${p.weight_goal.days} days. Build the best safe diet+herbs+yoga plan for this and FILL weight_plan with a realistic safe schedule and milestones.` : ""}
Lab report: ${JSON.stringify(p.report || [])}
${p.symptom_context ? "- Recent symptom logs (use these to tailor/adjust the plan): " + p.symptom_context : ""}
${p.season ? "- Current season (ritu): " + p.season + " — include season-appropriate (ritucharya) suggestions." : ""}

Generate the wellness plan as JSON only.`;
}

// ---- Main: plan banao ----
async function generatePlan(profile, opts = {}) {
  if (opts.forceFallback) return { plan: fallbackPlan(profile), source: "fallback" };
  if (KEY) {
    try {
      // Message content: text + (optional) attached lab report file (PDF/image) jise AI khud padhega
      const content = [{ type: "text", text: buildUserMessage(profile) }];
      const f = profile.report_file;
      let isPdf = false;
      if (f && f.data) {
        if (f.media_type === "application/pdf") { content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } }); isPdf = true; }
        else if (/^image\//.test(f.media_type || "")) content.push({ type: "image", source: { type: "base64", media_type: f.media_type, data: f.data } });
      }
      // Headers: beta PDF header SIRF tab jab asli PDF bhej rahe ho (hamesha bhejne par API reject kar deta tha -> fallback)
      const headers = { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" };
      if (isPdf) headers["anthropic-beta"] = "pdfs-2024-09-25";
      const resp = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content }],
        }),
      });
      if (!resp.ok) throw new Error("API " + resp.status + ": " + (await resp.text()).slice(0, 200));
      const data = await resp.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      const plan = parseJson(text);
      if (plan) { lastAI = { at: new Date().toISOString(), ok: true, stop_reason: data.stop_reason }; return { plan, source: "ai" }; }
      lastAI = { at: new Date().toISOString(), ok: false, stop_reason: data.stop_reason, error: "JSON parse fail (stop=" + data.stop_reason + ", len=" + text.length + ")" };
      console.error("AI parse fail, using fallback. stop_reason:", data.stop_reason, "len:", text.length);
    } catch (e) {
      lastAI = { at: new Date().toISOString(), ok: false, error: e.message };
      console.error("AI error, using fallback:", e.message);
    }
  }
  return { plan: fallbackPlan(profile), source: "fallback" };
}

// ---- Live AI test (admin): asli plan-call jaisa test — poora system prompt + parse ----
async function testAI() {
  if (!KEY) return { ok: false, model: MODEL, error: "ANTHROPIC_API_KEY set nahi hai (Render Environment me daalein)" };
  // Devanagari (hin) sabse bhaari script hai — isi se test karo taaki truncation pakda jaaye
  const profile = { name: "Test", region: "IN", language: "hin", age: 35, gender: "male", height_cm: 170, weight_kg: 85, conditions: ["weight", "acidity"], allergies: [], report: [], notes: "", wake: "06:30", weight_goal: { target_kg: 5, days: 30 } };
  try {
    const content = [{ type: "text", text: buildUserMessage(profile) }];
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: buildSystemPrompt(), messages: [{ role: "user", content }] }),
    });
    const txt = await resp.text();
    if (!resp.ok) {
      let msg = txt.slice(0, 300);
      try { const j = JSON.parse(txt); if (j.error && j.error.message) msg = j.error.message; } catch (_) {}
      return { ok: false, model: MODEL, status: resp.status, error: msg };
    }
    const data = JSON.parse(txt);
    const text = (data.content || []).map((c) => c.text || "").join("");
    const plan = parseJson(text);
    if (plan) return { ok: true, model: MODEL, stop_reason: data.stop_reason, summary: (plan.summary || "").slice(0, 90) };
    return { ok: false, model: MODEL, stop_reason: data.stop_reason, error: "AI ne jawab to diya par JSON parse nahi hua (stop=" + data.stop_reason + ", length=" + text.length + "). Shayad jawab bada/kat gaya." };
  } catch (e) {
    return { ok: false, model: MODEL, error: e.message };
  }
}
function aiLast() { return lastAI; }

// JSON ko tolerant tarike se nikaalo
function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const start = text.indexOf("{");
  if (start < 0) return null;
  const s = text.slice(start);
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  // Salvage: jawab beech me kat gaya ho to khuli strings/brackets band karke best-effort parse
  const closeAndParse = (body) => {
    const stack = []; let inStr = false, esc = false;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    let cand = body + (inStr ? '"' : "");
    for (let i = stack.length - 1; i >= 0; i--) cand += stack[i];
    try { return JSON.parse(cand); } catch (_) { return null; }
  };
  let body = s;
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = closeAndParse(body);
    if (r) return r;
    const lc = body.lastIndexOf(",");
    if (lc < 0) break;
    body = body.slice(0, lc);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fallback (rule-based) — AI key na ho tab chalta hai. Simple par kaam-chalau.
// ---------------------------------------------------------------------------
const KB = {
  acidity:{rem:[["Jeera paani","Subah khaali pet jeera ubaal kar peeyein"],["Saunf","Khaane ke baad aadha chammach saunf"]],pref:["Kela","Nariyal paani","Chaas"],avoid:["Tala-bhuna","Zyada mirch","Khaali pet chai"],yoga:[["Vajrasana","khaane ke baad 5-10 min baithein, pachan sudhre"],["Pawanmuktasana","gas-acidity nikle"],["Shashankasana","pet ko aaram, jalan kam"],["Anulom-vilom","5 min, pachan-agni santulit"]],supp:[["Amla","ayurvedic_herb","acidity shaant","IN"]]},
  stress:{rem:[["Ashwagandha","raat ko garm doodh ke saath"],["Tulsi chai","din mein 1-2 baar"]],pref:["Badam","Haldi doodh","Hari sabzi"],avoid:["Zyada caffeine","Late-night screen"],yoga:[["Anulom-vilom","10 min, man shaant"],["Bhramari","6-7 baar, tension turant kam"],["Shavasana","gehri relaxation"],["Balasana","dimaag ko sukoon"],["Dhyan/Meditation","roz 10 min"]],supp:[["Ashwagandha","ayurvedic_herb","stress aur neend","BOTH"],["Magnesium","mineral","nerves shaant","GLOBAL"]]},
  sleep:{rem:[["Jaiphal doodh","sone se pehle chutki jaiphal garm doodh mein"],["Pair maalish","talwo par tel"]],pref:["Garm doodh","Kela"],avoid:["Shaam ki coffee","Bhaari dinner"],yoga:[["Shavasana","sone se pehle 10 min"],["Bhramari","man shaant, neend gehri"],["Viparita Karani","deewar par pair, thakaan utare"],["Anulom-vilom","so jaane me madad"]],supp:[["Ashwagandha","ayurvedic_herb","achhi neend","BOTH"]]},
  fatigue:{rem:[["Bheege badam","subah 5 badam"],["Chyawanprash","subah garm doodh ke saath"]],pref:["Mausami phal","Khajoor","Gud-chana"],avoid:["Junk food","Zyada cheeni"],yoga:[["Surya namaskar","subah 5-7 round, din bhar energy"],["Bhujangasana","peeth-reedh mazboot"],["Tadasana","poora sharir khinche, taazgi"],["Kapalbhati","2-3 min, phurti"]],supp:[["Vitamin B12","vitamin","energy","BOTH"],["Moringa","ayurvedic_herb","poshan","IN"]]},
  weight:{rem:[["Nimbu-shahad paani","subah garm paani mein"],["Methi paani","bheegi methi subah"]],pref:["Protein","Hari sabzi","Saboot anaj"],avoid:["Cheeni","Tala hua","Cold drink"],yoga:[["Surya namaskar","10-12 round, poora body workout"],["Kapalbhati","5 min, metabolism tez"],["Trikonasana","kamar-pet ki charbi"],["Naukasana","pet ki charbi kam"],["Tez chaal","roz 30 min"]],supp:[["Triphala","ayurvedic_herb","pachan","IN"]]},
  diabetes:{rem:[["Methi paani","bheegi methi subah khaali pet"],["Daalchini","khaane mein chutki"]],pref:["Jau/saboot anaj","Hari sabzi"],avoid:["Cheeni","White rice","Cold drink"],yoga:[["Mandukasana","pancreas active, sugar control"],["Kapalbhati","5 min, metabolism"],["Ardha Matsyendrasana","pet ke ang maalish"],["Tez chaal","khaane ke baad 20-30 min"]],supp:[["Karela/Jamun","ayurvedic_herb","sugar support","IN"]]},
  immunity:{rem:[["Giloy/tulsi kaadha","hafte mein kuch baar"],["Haldi doodh","raat ko"]],pref:["Nimbu","Amla","Adrak-lahsun"],avoid:["Processed food","Kam neend"],yoga:[["Bhastrika","phephde mazboot"],["Anulom-vilom","rog pratirodhak shakti"],["Surya namaskar","poora sharir active"],["Matsyasana","chhati khule, saans gehri"]],supp:[["Vitamin C","vitamin","immunity","BOTH"],["Giloy","ayurvedic_herb","rog pratirodhak","IN"]]},
};

const FB = require("./fallback-i18n");

// Safe weight-loss estimate (0.5-1 kg/week) — fallback ke liye
function weightPlanFor(p, lang) {
  const g = p.weight_goal;
  if (!g || !g.target_kg || !g.days) return null;
  const D = g.days, T = g.target_kg;
  const r1 = (n) => Math.round(n * 10) / 10;
  const lo = Math.min(T, r1((D / 7) * 0.5)), hi = Math.min(T, r1((D / 7) * 1));
  const milestone = (day) => ({ day, expect_kg: `${Math.min(T, r1((day / 7) * 0.5))}-${Math.min(T, r1((day / 7) * 1))}` });
  const ms = [milestone(15)]; if (D > 20) ms.push(milestone(30)); if (D > 35) ms.push(milestone(D));
  const slow = hi < T;
  const M = lang !== "hi" && FB.msg(lang);
  if (M) return {
    target_kg: T, days: D, safe_pace: "0.5-1 kg/week",
    expected_loss_kg: `${lo}-${hi}`,
    milestones: ms.filter((m) => m.day <= D || m.day === D),
    focus: M.wfocus,
    note: FB.fill(slow ? M.wslow : M.wok, { d: D, lo, hi, t: T }),
  };
  return {
    target_kg: T, days: D, safe_pace: "0.5-1 kg/week",
    expected_loss_kg: `${lo}-${hi}`,
    milestones: ms.filter((m) => m.day <= D || m.day === D),
    focus: lang === "hi"
      ? ["Har khaane me protein (dal/ande/paneer)", "Roz 30-40 min tez chaal", "Cheeni + tali cheezein band", "7-8 ghante neend", "Zyada paani + fibre (salad, sabzi)"]
      : ["Protein in every meal", "30-40 min brisk walk daily", "Cut sugar + fried food", "7-8 hours sleep", "More water + fibre"],
    note: lang === "hi"
      ? (slow ? `Safe tarika: ~${D} din me lagbhag ${lo}-${hi} kg. Poora ${T} kg thoda zyada samay lega — par sehat ke saath, wapas nahi aayega.` : `~${D} din me safe taur par lagbhag ${lo}-${hi} kg — dheere-dheere, bina kamzori.`)
      : (slow ? `Safe pace: about ${lo}-${hi} kg in ~${D} days. The full ${T} kg will take a little longer — but the healthy way, and it stays off.` : `About ${lo}-${hi} kg in ~${D} days, safely and gradually.`),
  };
}

// Basic plan: Hinglish me banao, phir chuni bhasha me badlo (fallback-i18n)
function fallbackPlan(p) {
  const want = FB.LANGS.includes(p.language) ? p.language : "hi";
  const pl = fallbackPlanHi(p);
  return want === "hi" ? pl : localizeFallback(pl, p, want);
}
function localizeFallback(pl, p, lang) {
  const M = FB.msg(lang), t = (s) => FB.tr(lang, s);
  const da = pl.dosha_analysis, dosha = da.primary_dosha;
  const bmi = p.height_cm ? +(p.weight_kg / Math.pow(p.height_cm / 100, 2)).toFixed(1) : null;
  const ci = !bmi ? -1 : bmi < 18.5 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3;
  return {
    ...pl,
    meta: { ...pl.meta, language: lang },
    dosha_analysis: { ...da, explanation: M.expl },
    summary: FB.fill(M.sum, { name: p.name, bmi: bmi ?? "-", cat: ci < 0 ? "-" : M.cat[ci] }),
    supplements: pl.supplements.map((x) => ({ ...x, name: t(x.name), reason: t(x.reason), common_form: t(x.common_form), general_usage: M.usage, caution: M.caution })),
    home_remedies: pl.home_remedies.map((r) => ({ name: t(r.name), how: t(r.how) })),
    diet: { prefer: pl.diet.prefer.map(t), avoid: pl.diet.avoid.map(t), dosha_note: FB.fill(M.dnote, { dosha: M.dosha[dosha] || dosha }) },
    yoga: pl.yoga.map((y) => ({ name: t(y.name), benefit: t(y.benefit) })),
    daily_routine: pl.daily_routine.map((d, i) => ({ time: d.time, activity: M.rt[i] || d.activity })),
    lifestyle_tips: [M.tip],
    weight_plan: weightPlanFor(p, lang),
    disclaimer: M.disc,
  };
}
function fallbackPlanHi(p) {
  const lang = "hi";

  const bmi = p.height_cm ? +(p.weight_kg / Math.pow(p.height_cm / 100, 2)).toFixed(1) : null;
  const cat = !bmi ? "n/a" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
  const region = p.region || "IN";
  let rem = [], pref = [], avoid = [], yoga = [], supp = [];
  (p.conditions || []).forEach((id) => {
    const k = KB[id]; if (!k) return;
    rem = rem.concat(k.rem); pref = pref.concat(k.pref); avoid = avoid.concat(k.avoid);
    yoga = yoga.concat(k.yoga); supp = supp.concat(k.supp);
  });
  if (!rem.length) { // default general wellness
    rem = [["Garm paani", "subah khaali pet 1-2 glass"]]; pref = ["Mausami phal", "Hari sabzi"];
    avoid = ["Junk food", "Zyada cheeni"]; yoga = [["Anulom-vilom", "roz 10 min"]];
    supp = [["Amla", "ayurvedic_herb", "general wellness", "IN"]];
  }
  const uniq = (a) => [...new Set(a)];
  const seen = new Set();
  rem = rem.filter((r) => !seen.has(r[0]) && seen.add(r[0]));
  // region ke hisaab se supplements filter
  supp = supp.filter((s) => s[3] === "BOTH" || s[3] === region);
  if (!supp.length) supp = [["Amla", "ayurvedic_herb", "general wellness", region === "IN" ? "IN" : "GLOBAL"]];

  const wake = p.wake || "06:30";
  const [wh, wm] = wake.split(":").map(Number);
  const start = wh * 60 + wm;
  const fmt = (mins) => { let m = ((mins % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? "AM" : "PM", h12 = h % 12 || 12; return `${h12}:${String(mm).padStart(2, "0")} ${ap}`; };
  const rt = [[0, "Gungaana paani"], [30, "Yoga / pranayam + dhoop"], [120, "Healthy nashta"], [390, "Santulit lunch"], [570, "Herbal chai / phal"], [780, "Halka dinner"], [930, "7-8 ghante neend"]];

  // simple dosha guess
  const dosha = (p.age || 30) > 50 ? "vata" : (cat === "Overweight" || cat === "Obese") ? "kapha" : "pitta";
  const bal = dosha === "vata" ? { vata: 45, pitta: 30, kapha: 25 } : dosha === "kapha" ? { vata: 25, pitta: 30, kapha: 45 } : { vata: 30, pitta: 45, kapha: 25 };

  return {
    meta: { language: lang, region, generated_for: p.name, confidence: "medium" },
    dosha_analysis: {
      primary_dosha: dosha, secondary_dosha: "pitta",
      balance_percent: bal,
      explanation: lang === "hi" ? "Umar, body type aur lifestyle ke aadhaar par anumaan." : "Estimated from age, body type and lifestyle.",
      imbalance_signs: [],
    },
    summary: lang === "hi"
      ? `${p.name} ji, aapke liye ek simple natural plan taiyaar hai. BMI ${bmi ?? "n/a"} (${cat}). (Basic plan — poora AI plan Premium me.)`
      : `${p.name}, here is a simple natural plan. BMI ${bmi ?? "n/a"} (${cat}). (Basic plan — the full AI plan comes with Premium.)`,
    report_findings: (p.report || []).map((r) => ({ marker: r.marker, value: r.value, status: "normal", note: "" })),
    supplements: supp.map((s) => ({
      name: s[0], type: s[1], reason: s[2], region_availability: s[3],
      common_form: s[1] === "ayurvedic_herb" ? "churna / tablet" : "tablet / capsule",
      general_usage: lang === "hi" ? "label ke anusaar, doctor se dose confirm karein" : "as per label, confirm dose with a doctor",
      caution: lang === "hi" ? "pregnancy / dawai chal rahi ho to doctor se poochein" : "ask a doctor if pregnant or on medication",
      priority: "medium",
    })),
    home_remedies: rem.map((r) => ({ name: r[0], how: r[1] })),
    diet: { prefer: uniq(pref), avoid: uniq(avoid), dosha_note: lang === "hi" ? `${dosha} santulan ke liye` : `to balance ${dosha}` },
    yoga: uniq(yoga.map((y) => JSON.stringify(y))).map((s) => { const y = JSON.parse(s); return { name: y[0], benefit: y[1] }; }),
    daily_routine: rt.map(([off, act]) => ({ time: fmt(start + off), activity: act })),
    lifestyle_tips: [lang === "hi" ? "Roz 7-8 glass paani" : "7-8 glasses of water daily"],
    weight_plan: weightPlanFor(p, lang),
    red_flags: [],
    see_doctor: false,
    disclaimer: lang === "hi"
      ? "Ye salah aam wellness ke liye hai, doctor ki jagah nahi. Gambhir ya purani samasya, pregnancy, ya chal rahi dawai mein doctor se poochein."
      : "This is general wellness guidance, not a substitute for a doctor. Consult a doctor for anything serious or long-standing, during pregnancy, or alongside medication.",
  };
}

// Chhota text jawab (insight/nudge ke liye). Key na ho to null.
async function aiText(prompt, maxTokens = 220) {
  if (!KEY) return null;
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.content || []).map((c) => c.text || "").join("").trim() || null;
  } catch (_) { return null; }
}

// Photo + prompt -> text (kitchen scan jaisa). image = {media_type, data(base64)}. Key na ho to null.
async function aiVision(prompt, image, maxTokens = 500) {
  if (!KEY || !image || !image.data) return null;
  try {
    const content = [{ type: "text", text: prompt }];
    if (/^image\//.test(image.media_type || "")) {
      content.push({ type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } });
    } else return null;
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.content || []).map((c) => c.text || "").join("").trim() || null;
  } catch (_) { return null; }
}

// Bana hua plan dusri bhasha me. Plan 3 hisson me (parallel) — lambi script me jawab katta nahi.
// Jo hissa fail/adhoora ho, wahan asli rehta hai; { plan, complete } lautata hai. Key na ho to null.
const TR_PARTS = [
  ["summary", "dosha_analysis", "report_findings", "supplements"],
  ["home_remedies", "diet", "yoga"],
  ["daily_routine", "lifestyle_tips", "weight_plan", "red_flags", "disclaimer"],
];
function sameShape(a, b) {
  if (Array.isArray(a)) return Array.isArray(b) && b.length === a.length;
  if (a && typeof a === "object") return !!b && typeof b === "object" && !Array.isArray(b);
  return typeof b === typeof a;
}
async function translatePart(obj, lang) {
  const prompt = `Translate this JSON (part of a wellness plan) into ${langName(lang)}.
Rules:
- Translate EVERY human-readable string value into that language and script. Herb/food names may keep the common local name, written in that script.
- Keep ALL keys exactly the same. Keep numbers, times (like "06:30 AM"), units and these values unchanged: status, primary_dosha, secondary_dosha, balance_percent, region_availability, marker, value, type, priority.
- Keep the same structure and the same number of items in every array.
- Reply with ONLY the JSON, nothing else.

${JSON.stringify(obj)}`;
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages: [{ role: "user", content: prompt }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.stop_reason === "max_tokens") return null; // kata hua jawab — bharosa nahi
    const out = parseJson((data.content || []).map((c) => c.text || "").join(""));
    return out && typeof out === "object" ? out : null;
  } catch (_) { return null; }
}
// Plan ki kaun si keys anuvaad layak hain (khaali chhod kar)
function trKeys(plan) {
  return TR_PARTS.flat().filter((k) => plan && plan[k] != null && plan[k] !== "" && !(Array.isArray(plan[k]) && !plan[k].length));
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Ek hissa — fail (rate-limit / kata jawab) ho to 2 baar aur koshish
async function translatePartRetry(obj, lang) {
  for (let i = 0; i < 3; i++) {
    const r = await translatePart(obj, lang);
    if (r) return r;
    if (i < 2) await wait(1500 * (i + 1));
  }
  return null;
}
// base = pehle ka (adhoora) anuvaad, done = jo keys ho chuki hain — sirf baaki hisse dobara
async function translatePlan(plan, lang, base, done) {
  if (!KEY || !plan) return null;
  const all = trKeys(plan), have = new Set(done || []);
  const parts = TR_PARTS.map((keys) => keys.filter((k) => all.includes(k) && !have.has(k))).filter((keys) => keys.length);
  const results = await Promise.all(parts.map((keys, i) => wait(i * 400).then(() => translatePartRetry(Object.fromEntries(keys.map((k) => [k, plan[k]])), lang))));
  const out = { ...(base || plan), meta: { ...(plan.meta || {}), language: lang } };
  parts.forEach((keys, i) => {
    const r = results[i];
    keys.forEach((k) => { if (r && sameShape(plan[k], r[k])) { out[k] = r[k]; have.add(k); } });
  });
  const keys = all.filter((k) => have.has(k));
  return { plan: out, keys, complete: keys.length === all.length };
}

// Key available hai? (frontend ko batane ke liye route use karta hai)
function aiAvailable() { return !!KEY; }

module.exports = { generatePlan, fallbackPlan, translatePlan, trKeys, aiText, aiVision, aiAvailable, buildSystemPrompt, JSON_SHAPE, testAI, aiLast, MODEL, langName };
