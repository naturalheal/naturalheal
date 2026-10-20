// ---------------------------------------------------------------------------
// AI module — Claude API se personalized plan banata hai.
// Step 2 ka system prompt + JSON structure yahin hai.
// Agar ANTHROPIC_API_KEY na ho, to rule-based "fallback" plan deta hai,
// taaki app AI ke bina bhi chale.
// ---------------------------------------------------------------------------
// Note: Anthropic API ko seedha fetch se call karte hain (koi SDK package nahi chahiye).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const KEY = process.env.ANTHROPIC_API_KEY || "";
const API_URL = "https://api.anthropic.com/v1/messages";

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

=== SAFETY RULES (non-negotiable) ===
- NEVER prescribe prescription medicines or give pharmaceutical drug dosages.
- For supplements, give only GENERAL usage guidance (e.g. "with warm milk at night") — never exact mg doses; tell them to confirm dose with a doctor/pharmacist.
- Respect stated allergies: never recommend anything they are allergic to.
- Detect RED FLAGS (chest pain, severe/sudden symptoms, very abnormal report values, pregnancy with medication, suicidal thoughts). If present: set "see_doctor": true, list them in "red_flags", keep the plan minimal and conservative.
- Always fill "disclaimer". Be extra cautious for pregnancy, children, and people on regular medication.

=== OUTPUT RULES ===
- Write ALL human-readable text in the requested language: "hi" = Hinglish (Roman Hindi), "en" = English.
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
Language: ${p.language || "hi"}
User profile:
- Name: ${p.name}
- Age: ${p.age}, Gender: ${p.gender || "not said"}
- Height: ${p.height_cm} cm, Weight: ${p.weight_kg} kg, BMI: ${bmi}
- Lifestyle: ${p.lifestyle || "not said"}
- Concerns: ${(p.conditions || []).join(", ") || "general wellness"}
- Allergies: ${(p.allergies || []).join(", ") || "none"}
- Extra notes: ${p.notes || "none"}
- Wake-up time: ${p.wake || "06:30"}
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
          max_tokens: 2500,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content }],
        }),
      });
      if (!resp.ok) throw new Error("API " + resp.status + ": " + (await resp.text()).slice(0, 200));
      const data = await resp.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      const plan = parseJson(text);
      if (plan) return { plan, source: "ai" };
    } catch (e) {
      console.error("AI error, using fallback:", e.message);
    }
  }
  return { plan: fallbackPlan(profile), source: "fallback" };
}

// ---- Live AI test (admin): asli API call karke batao sab theek hai ya exact galti ----
async function testAI() {
  if (!KEY) return { ok: false, model: MODEL, error: "ANTHROPIC_API_KEY set nahi hai (Render Environment me daalein)" };
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 16, messages: [{ role: "user", content: "Reply with just: OK" }] }),
    });
    const txt = await resp.text();
    if (!resp.ok) {
      let msg = txt.slice(0, 300);
      try { const j = JSON.parse(txt); if (j.error && j.error.message) msg = j.error.message; } catch (_) {}
      return { ok: false, model: MODEL, status: resp.status, error: msg };
    }
    return { ok: true, model: MODEL };
  } catch (e) {
    return { ok: false, model: MODEL, error: e.message };
  }
}

// JSON ko tolerant tarike se nikaalo
function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
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

function fallbackPlan(p) {
  const lang = p.language || "hi";
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
      explanation: lang === "hi" ? "Umar, body type aur lifestyle ke aadhaar par anumaan (offline)." : "Estimated from age, body type and lifestyle (offline).",
      imbalance_signs: [],
    },
    summary: lang === "hi"
      ? `${p.name} ji, aapke liye ek simple natural plan taiyaar hai. BMI ${bmi ?? "n/a"} (${cat}). (Offline plan — poore AI plan ke liye API key jodein.)`
      : `${p.name}, here is a simple natural plan. BMI ${bmi ?? "n/a"} (${cat}). (Offline plan — add an API key for the full AI plan.)`,
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

// Key available hai? (frontend ko batane ke liye route use karta hai)
function aiAvailable() { return !!KEY; }

module.exports = { generatePlan, aiText, aiVision, aiAvailable, buildSystemPrompt, JSON_SHAPE, testAI, MODEL };
