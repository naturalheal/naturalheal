// ---------------------------------------------------------------------------
// Fit ka Premium + AI hissa:
//  - diet:   Weight Loss / Gym ke liye 7 din ka personal Bharatiya diet chart
//  - yoga:   user ki takleef + samay ke hisaab se app ke 24 surakshit aasanon me se session
//  - coach:  pichhle gym workouts dekhkar chhoti salah
// Sab user ki bhasha me; hafte (ya naye workout) tak save — baar-baar AI kharcha nahi.
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError, uid } = require("./util");
const { isPremium } = require("./plans");
const { aiText, aiAvailable, langName, parseJson } = require("./ai");
const fit = require("./fit");

const LANGS = ["en", "hi", "hin", "bn", "mr", "gu", "ta", "te", "kn", "pa", "ml"];
const now = () => new Date().toISOString();
const istToday = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);
function weekKey() { // hafte ka Somvaar
  const d = new Date(Date.now() + 19800000); const wd = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - wd * 86400000).toISOString().slice(0, 10);
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const REGION_FOOD = {
  ta: "South Indian (Tamil) home food", te: "South Indian (Andhra/Telangana) home food", kn: "South Indian (Karnataka) home food",
  ml: "Kerala home food", bn: "Bengali home food", mr: "Maharashtrian home food", gu: "Gujarati home food",
  pa: "Punjabi home food", hin: "North Indian home food", hi: "North Indian home food", en: "common Indian home food",
};
const YOGA_POSES = {
  tadasana: "mountain stand", vriksha: "tree balance", trikona: "triangle side bend", virabhadra: "warrior II",
  bhujanga: "cobra backbend (avoid: pregnancy, back injury)", shalabha: "locust (avoid: pregnancy, back injury)",
  balasana: "child pose (careful: knees)", marjari: "cat-cow", setu: "bridge", pawan: "knees to chest (avoid: pregnancy)",
  vajra: "thunderbolt sitting (careful: knees)", paschim: "seated forward bend", matsy: "seated twist (avoid: pregnancy)",
  butterfly: "butterfly hip opener", nauka: "boat core (avoid: pregnancy, back injury)", makara: "crocodile rest",
  viparita: "legs up the wall", surya: "sun salutation flow (avoid: high BP, pregnancy)", anulom: "alternate nostril breathing",
  kapal: "kapalbhati forceful breathing (avoid: high BP, heart, hernia, pregnancy)", bhramari: "humming bee breath",
  sheetali: "cooling breath", dhyan: "meditation", shava: "deep relaxation",
};

function cacheGet(userId, key) { return db.fit_ai.filter((x) => x.user_id === userId && x.key === key)[0] || null; }
function cacheSet(userId, key, data) {
  db.fit_ai.remove((x) => x.user_id === userId && x.key.split(":")[0] === key.split(":")[0] && x.key !== key && (x.created_at || "") < new Date(Date.now() - 30 * 86400000).toISOString());
  const cur = cacheGet(userId, key);
  if (cur) db.fit_ai.update(cur.id, { data, created_at: now() });
  else db.fit_ai.insert({ id: uid(), user_id: userId, key, data, created_at: now() });
}
function guard(ctx) {
  if (!isPremium(ctx.user)) throw new HttpError(402, "premium", { premium: true });
  if (!aiAvailable()) throw new HttpError(503, "ai_off");
  const lang = (ctx.body && ctx.body.language) || ctx.user.language || "hin";
  return LANGS.includes(lang) ? lang : "hin";
}
function profileOf(userId) {
  const p = db.profiles.findBy("user_id", userId) || {};
  return { conditions: p.conditions || [], allergies: p.allergies || [], weight: p.weight_kg, height: p.height_cm, age: p.age, gender: p.gender };
}

// ---------------- AI diet chart (7 din) ----------------
async function aiDiet(ctx) {
  const lang = guard(ctx);
  const kind = (ctx.body && ctx.body.kind) === "gym" ? "gym" : "wl";
  const prof = profileOf(ctx.user.id);
  let t;
  if (kind === "wl") {
    const v = fit.getWL(ctx);
    if (!v.program) throw new HttpError(400, "no_program");
    t = { goal: "fat loss (weight-loss program)", kcal: v.targets.kcal, protein: v.targets.protein_g, diet: v.program.diet, weight: v.cur_kg };
  } else {
    const g = fit.getGym(ctx);
    if (!g.profile) throw new HttpError(400, "no_gym");
    const w = Number(prof.weight) || 0;
    const k = g.profile.goal === "muscle" ? 1.8 : 1.6;
    let kcal = null;
    if (w && prof.height && prof.age) {
      const bmr = 10 * w + 6.25 * prof.height - 5 * prof.age + (prof.gender === "female" ? -161 : 5);
      const tdee = bmr * 1.5;
      kcal = Math.round((g.profile.goal === "fat" ? tdee - 400 : g.profile.goal === "muscle" ? tdee + 250 : tdee) / 10) * 10;
    }
    t = { goal: { fat: "fat loss with gym training", muscle: "muscle gain with gym training", strength: "strength and fitness training" }[g.profile.goal], kcal, protein: w ? Math.round(w * k) : null, diet: (ctx.body && ctx.body.diet) || "veg", weight: w || null };
  }
  const diet = ["veg", "egg", "nonveg"].includes(t.diet) ? t.diet : "veg";
  const sig = [t.kcal, t.protein, diet, prof.conditions.join("."), prof.allergies.join(".")].join("|");
  const key = `diet-${kind}:${weekKey()}:${lang}:${sig}`;
  const hit = cacheGet(ctx.user.id, key);
  if (hit && !(ctx.body && ctx.body.refresh)) return { ...hit.data, cached: true };

  const prompt = `You are an Indian dietitian. Make a 7-day meal plan.
Goal: ${t.goal}. ${t.kcal ? `Daily calories: about ${t.kcal} kcal.` : ""} ${t.protein ? `Daily protein: about ${t.protein} g.` : ""}
Food type: ${diet === "veg" ? "vegetarian (no egg, no meat)" : diet === "egg" ? "vegetarian + eggs (no meat/fish)" : "non-vegetarian allowed"}.
Style: ${REGION_FOOD[lang] || REGION_FOOD.en}, simple, affordable, easy to cook at home.
Health concerns: ${prof.conditions.join(", ") || "none"}. Allergies / avoid: ${prof.allergies.join(", ") || "none"}.
Rules: 4 meals a day — B (breakfast), L (lunch), S (evening snack), D (dinner). Different meals on different days. Give a home-measure quantity (katori, roti count, glass, pieces). No supplements or medicines${kind === "gym" ? " (whey only as an optional note)" : ""}. Keep sugar and fried food low.
Write every food name, quantity and tip in ${langName(lang)} (that language's script). Numbers stay as digits.
Reply ONLY with JSON: {"days":[{"meals":[{"s":"B","name":"...","qty":"...","kcal":300,"p":15}, ...4 meals]}, ...7 days], "tips":["...","...","..."]}`;
  const text = await aiText(prompt, 9000);
  const out = parseJson(text);
  const days = out && Array.isArray(out.days) ? out.days.slice(0, 7).map((d) => ({
    meals: (Array.isArray(d.meals) ? d.meals : []).slice(0, 5).map((m) => ({
      s: ["B", "L", "S", "D"].includes(m.s) ? m.s : "L",
      name: String(m.name || "").slice(0, 140), qty: String(m.qty || "").slice(0, 80),
      kcal: clamp(Math.round(Number(m.kcal) || 0), 0, 2000), p: clamp(Math.round(Number(m.p) || 0), 0, 150),
    })).filter((m) => m.name),
  })).filter((d) => d.meals.length >= 3) : [];
  if (days.length < 7) throw new HttpError(502, "ai_fail");
  const data = { kind, days, tips: (out.tips || []).slice(0, 4).map((x) => String(x).slice(0, 200)), kcal: t.kcal, protein: t.protein, week: weekKey() };
  cacheSet(ctx.user.id, key, data);
  return data;
}

// ---------------- AI yoga session ----------------
async function aiYoga(ctx) {
  const lang = guard(ctx);
  const minutes = [10, 20, 30].includes(Number(ctx.body && ctx.body.minutes)) ? Number(ctx.body.minutes) : 20;
  const prof = profileOf(ctx.user.id);
  const conds = prof.conditions;
  const key = `yoga:${weekKey()}:${lang}:${minutes}:${conds.join(".")}`;
  const hit = cacheGet(ctx.user.id, key);
  if (hit && !(ctx.body && ctx.body.refresh)) return { ...hit.data, cached: true };
  const banned = new Set();
  if (conds.includes("bp")) { banned.add("kapal"); banned.add("surya"); }
  if (conds.includes("backpain")) { banned.add("nauka"); banned.add("shalabha"); }
  if (conds.includes("joint")) { banned.add("vajra"); }
  const allowed = Object.keys(YOGA_POSES).filter((k) => !banned.has(k));
  const prompt = `You are a careful yoga therapist. Build ONE home yoga session of about ${minutes} minutes.
Person: age ${prof.age || "unknown"}, ${prof.gender || "gender unknown"}; health concerns: ${conds.join(", ") || "general wellness"}.
Choose ONLY from these pose ids (id: description): ${allowed.map((k) => `${k}: ${YOGA_POSES[k]}`).join("; ")}.
Order: gentle warm-up first, breathing near the end, finish with shava. Respect every "avoid" note for this person. Each pose 30-300 seconds.
Write "title" (max 6 words) and "why" (2 short sentences on why this suits them) in ${langName(lang)} (that language's script).
Reply ONLY with JSON: {"title":"...","why":"...","poses":[["id",seconds], ...]}`;
  const out = parseJson(await aiText(prompt, 1500));
  let poses = out && Array.isArray(out.poses) ? out.poses.filter((p) => Array.isArray(p) && allowed.includes(p[0])).map((p) => [p[0], clamp(Math.round(Number(p[1]) || 60), 30, 300)]) : [];
  if (poses.length < 4) throw new HttpError(502, "ai_fail");
  poses = poses.slice(0, 14);
  if (poses[poses.length - 1][0] !== "shava") poses.push(["shava", 120]);
  const data = { title: String(out.title || "").slice(0, 60), why: String(out.why || "").slice(0, 300), poses, minutes };
  cacheSet(ctx.user.id, key, data);
  return data;
}

// ---------------- AI gym coach ----------------
async function aiCoach(ctx) {
  const lang = guard(ctx);
  const logs = db.gym_logs.filter((l) => l.user_id === ctx.user.id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6);
  if (!logs.length) throw new HttpError(400, "no_logs");
  const g = fit.getGym(ctx);
  const key = `coach:${logs[0].id}:${lang}`;
  const hit = cacheGet(ctx.user.id, key);
  if (hit) return { ...hit.data, cached: true };
  const hist = logs.reverse().map((l) => `${l.date} ${l.day}: ` + (l.entries || []).map((e) => `${e.ex} ${e.sets.map((s) => (s.kg ? s.kg + "kg×" : "") + s.reps).join(",")}`).join("; ")).join("\n");
  const prompt = `You are a friendly, safety-first gym coach. Goal: ${g.profile ? g.profile.goal : "fitness"}, level: ${g.profile ? g.profile.level : "beginner"}, ${g.profile ? g.profile.days : 3} days/week.
Recent workouts (exercise kg×reps per set):
${hist}
Give 3-4 short, specific tips: what improved, what to change next week (weight/reps/rest/recovery), and one safety or nutrition point. No medicines or supplements except optional whey.
Write in ${langName(lang)} (that language's script). Reply ONLY with JSON: {"tips":["...","..."]}`;
  const out = parseJson(await aiText(prompt, 1500));
  const tips = out && Array.isArray(out.tips) ? out.tips.slice(0, 5).map((x) => String(x).slice(0, 240)).filter(Boolean) : [];
  if (!tips.length) throw new HttpError(502, "ai_fail");
  const data = { tips, at: istToday() };
  cacheSet(ctx.user.id, key, data);
  return data;
}

module.exports = { aiDiet, aiYoga, aiCoach };
