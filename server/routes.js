// ---------------------------------------------------------------------------
// Main handlers — auth, profile, plan generate, history. (ctx) based.
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError, uid } = require("./util");
const { hashPassword, checkPassword, signToken } = require("./auth");
const { generatePlan, aiText } = require("./ai");
const { featuresFor, isPremium } = require("./plans");
const { getSettings } = require("./settings");
const { findReferrer } = require("./share");
const points = require("./points");

const SYMPTOM_LIST = ["Acidity", "Sir dard", "Thakaan", "Neend", "Jodo ka dard", "Stress", "Tension", "Gas", "Kabz", "Sardi-khaansi"];
const iso = (d) => d.toISOString().slice(0, 10);

// ---- Family members ----
function ensureSelf(user) {
  let self = db.members.filter((m) => m.user_id === user.id && m.relation === "self")[0];
  if (!self) {
    self = { id: uid(), user_id: user.id, name: user.name, relation: "self", age: null, gender: null, height_cm: null, weight_kg: null, created_at: now() };
    db.members.insert(self);
  }
  return self;
}
// kaunsa member (query/body se, warna self)
function resolveMemberId(ctx) {
  const self = ensureSelf(ctx.user);
  const asked = (ctx.body && ctx.body.member) || (ctx.query && ctx.query.member);
  if (asked) { const m = db.members.get(asked); if (m && m.user_id === ctx.user.id) return { id: m.id, isSelf: m.relation === "self" }; }
  return { id: self.id, isSelf: true };
}
// item is member ka? (purane bina-tag wale items self ke maane jaate hain)
function belongsTo(item, memberId, isSelf) {
  return item.member_id === memberId || (!item.member_id && isSelf);
}

// ---- Season (Indian ritucharya) — month se ----
function seasonInfo(lang) {
  const m = new Date().getMonth(); // 0=Jan
  const map = [
    { ritu: "Shishir (late winter)", hi: "Sardi — garm, poshtik khaana; til, gud, garm paani.", en: "Winter — warm, nourishing food; sesame, jaggery, warm water." },        // Jan
    { ritu: "Shishir (late winter)", hi: "Sardi — garm, poshtik khaana; til, gud, garm paani.", en: "Winter — warm, nourishing food; sesame, jaggery, warm water." },        // Feb
    { ritu: "Vasant (spring)", hi: "Basant — halka khaana, kapha kam karein; shahad, adrak, kadwa-teekha.", en: "Spring — light food to reduce kapha; honey, ginger, bitter tastes." }, // Mar
    { ritu: "Vasant (spring)", hi: "Basant — halka khaana, kapha kam karein; shahad, adrak, kadwa-teekha.", en: "Spring — light food to reduce kapha; honey, ginger, bitter tastes." }, // Apr
    { ritu: "Grishma (summer)", hi: "Garmi — thandi taseer; nariyal paani, chaas, kam mirch.", en: "Summer — cooling foods; coconut water, buttermilk, less spice." },          // May
    { ritu: "Grishma (summer)", hi: "Garmi — thandi taseer; nariyal paani, chaas, kam mirch.", en: "Summer — cooling foods; coconut water, buttermilk, less spice." },          // Jun
    { ritu: "Varsha (monsoon)", hi: "Barish — pachan halka rakhein; garm-taza khaana, adrak chai, basi na khayein.", en: "Monsoon — keep digestion light; warm fresh food, ginger tea, avoid stale food." }, // Jul
    { ritu: "Varsha (monsoon)", hi: "Barish — pachan halka rakhein; garm-taza khaana, adrak chai, basi na khayein.", en: "Monsoon — keep digestion light; warm fresh food, ginger tea, avoid stale food." }, // Aug
    { ritu: "Sharad (autumn)", hi: "Sharad — pitta kam karein; thandi-meethi cheezein, ghee, amla.", en: "Autumn — reduce pitta; cooling-sweet foods, ghee, amla." },           // Sep
    { ritu: "Sharad (autumn)", hi: "Sharad — pitta kam karein; thandi-meethi cheezein, ghee, amla.", en: "Autumn — reduce pitta; cooling-sweet foods, ghee, amla." },           // Oct
    { ritu: "Hemant (pre-winter)", hi: "Hemant — balvardhak khaana; dry fruits, doodh, garm cheezein.", en: "Pre-winter — strengthening food; dry fruits, milk, warm foods." }, // Nov
    { ritu: "Hemant (pre-winter)", hi: "Hemant — balvardhak khaana; dry fruits, doodh, garm cheezein.", en: "Pre-winter — strengthening food; dry fruits, milk, warm foods." }, // Dec
  ];
  const s = map[m];
  return { ritu: s.ritu, tip: lang === "en" ? s.en : s.hi };
}

// recent symptoms ko ek chhoti summary line banaye (AI ke liye)
function symptomSummary(userId, memberId, isSelf, n = 12) {
  const recent = db.symptoms.filter((s) => s.user_id === userId && belongsTo(s, memberId, isSelf))
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, n);
  const by = {};
  recent.forEach((s) => { (by[s.symptom] = by[s.symptom] || []).push(s.sev); });
  return Object.entries(by).map(([k, v]) => `${k}: avg ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}/5 (${v.length}x)`).join("; ");
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
const now = () => new Date().toISOString();
// India time (IST) ka din — daily cap isi hisaab se reset hota hai
const istDay = (iso) => { try { return new Date(new Date(iso).getTime() + 19800000).toISOString().slice(0, 10); } catch (_) { return ""; } };
const istToday = () => istDay(new Date().toISOString());
// Profile ka signature — isse pata chale ki user ne kuch badla ya same hai (same -> dobara AI call nahi)
function profileSig(p) {
  return JSON.stringify({
    a: p.age, g: p.gender, h: p.height_cm, w: p.weight_kg, l: p.lifestyle,
    c: (p.conditions || []).slice().sort(), al: (p.allergies || []).slice().sort(),
    r: p.report || [], n: p.notes || "", wk: p.wake || "", lang: p.language,
  });
}

// System mein koi admin na ho to sabse purane user ko admin bana do (hamesha ek admin rahe)
function ensureAdminExists() {
  if (db.users.count((u) => u.is_admin)) return;
  const oldest = db.users.all().sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))[0];
  if (oldest) db.users.update(oldest.id, { is_admin: 1 });
}

function health() { return { ok: true, time: now() }; }

// Public social-proof stats (bina login) — login/home par "X+ log use kar rahe"
function publicStats() {
  return {
    users: db.users.count(),
    plans: db.plans.count(),
    stories: db.posts.count((p) => p.status === "approved"),
  };
}

function register(ctx) {
  const { name, email, password, phone, region } = ctx.body || {};
  if (!name || !email || !password) throw new HttpError(400, "Naam, email aur password zaroori hain");
  if (String(password).length < 6) throw new HttpError(400, "Password kam se kam 6 akshar ka ho");
  const emailLc = String(email).toLowerCase();
  if (db.users.findBy("email", emailLc)) throw new HttpError(409, "Ye email pehle se registered hai");
  // Pehla user ya ADMIN_EMAIL wala user -> admin
  const is_admin = (db.users.count() === 0 || (ADMIN_EMAIL && emailLc === ADMIN_EMAIL)) ? 1 : 0;
  // Referral: kisi ke link (?ref=CODE) se aaya ho to referrer set karo (khud ko refer nahi)
  const referrer = findReferrer((ctx.body || {}).ref);
  const user = { id: uid(), name, email: emailLc, password_hash: hashPassword(password), phone: phone || null, region: region === "GLOBAL" ? "GLOBAL" : "IN", is_admin, plan: "free", plan_status: "none", plan_expires: null, provider: null, provider_sub_id: null, provider_customer_id: null, referred_by: referrer ? referrer.id : null, ref_code: null, created_at: now() };
  db.users.insert(user);
  return { token: signToken({ id: user.id, email: user.email }), user: pubUser(user) };
}

function login(ctx) {
  const { email, password } = ctx.body || {};
  if (!email || !password) throw new HttpError(400, "Email aur password daalein");
  let user = db.users.findBy("email", String(email).toLowerCase());
  if (!user || !checkPassword(password, user.password_hash)) throw new HttpError(401, "Email ya password galat hai");
  // Admin pakka karo: koi admin na ho to sabse purana user admin; ADMIN_EMAIL match ho to promote
  ensureAdminExists();
  if (ADMIN_EMAIL && user.email === ADMIN_EMAIL && !user.is_admin) db.users.update(user.id, { is_admin: 1 });
  user = db.users.get(user.id);
  return { token: signToken({ id: user.id, email: user.email }), user: pubUser(user) };
}

function pubUser(u) { return { id: u.id, name: u.name, email: u.email, region: u.region, is_admin: u.is_admin, plan: u.plan, plan_status: u.plan_status, plan_expires: u.plan_expires, premium: isPremium(u) }; }

function me(ctx) {
  const u = ctx.user;
  const prof = db.profiles.findBy("user_id", u.id);
  return { user: pubUser(u), profile: prof ? unpackProfile(prof) : null, features: featuresFor(u) };
}
function unpackProfile(p) {
  return { age: p.age, gender: p.gender, height_cm: p.height_cm, weight_kg: p.weight_kg, lifestyle: p.lifestyle, conditions: p.conditions || [], allergies: p.allergies || [], report: p.report || [], notes: p.notes };
}

function putProfile(ctx) {
  const b = ctx.body || {};
  const existing = db.profiles.findBy("user_id", ctx.user.id);
  const row = {
    user_id: ctx.user.id, age: b.age || null, gender: b.gender || null,
    height_cm: b.height_cm || null, weight_kg: b.weight_kg || null, lifestyle: b.lifestyle || null,
    conditions: b.conditions || [], allergies: b.allergies || [], report: b.report || [], notes: b.notes || null,
    updated_at: now(),
  };
  if (existing) db.profiles.update(existing.id, row);
  else db.profiles.insert({ id: uid(), ...row });
  // Healing Points: profile poori bhari (age+gender) to ek baar
  let pts = 0;
  if (row.age && row.gender) pts = points.award(ctx.user.id, "profile").awarded;
  return { ok: true, points_awarded: pts };
}

async function generate(ctx) {
  const b = ctx.body || {};
  const user = ctx.user;
  const feat = featuresFor(user);
  if (feat.saved_plans !== Infinity) {
    const count = db.plans.count((p) => p.user_id === user.id);
    if (count >= feat.saved_plans) throw new HttpError(402, "Free plan ki limit poori ho gayi. Premium lein ya purana plan delete karein.", { upgrade: true });
  }
  // Report file (PDF/image) — sirf premium + AI; ~10MB tak
  let report_file = null;
  if (feat.ai_plan && b.report_file && b.report_file.data && typeof b.report_file.data === "string" && b.report_file.data.length < 14000000) {
    report_file = { media_type: b.report_file.media_type || "application/pdf", data: b.report_file.data };
  }
  const profile = {
    name: user.name, region: b.region || user.region || "IN", language: b.language === "en" ? "en" : "hi",
    age: b.age, gender: b.gender, height_cm: b.height_cm, weight_kg: b.weight_kg,
    lifestyle: b.lifestyle, conditions: b.conditions || [], allergies: b.allergies || [],
    report: feat.report_analysis ? (b.report || []) : [],
    report_file,
    notes: b.notes || "", wake: b.wake || "06:30",
  };
  // UNIQUE: recent symptoms + season context (AI plan ko behtar/adjust karta hai)
  const mem = resolveMemberId(ctx);
  const lang = profile.language;
  const sig = profileSig(profile);
  if (feat.ai_plan) {
    // 1) Cache: profile me kuch nahi badla -> purana AI plan hi lautao (koi naya AI call/kharcha nahi, cap bhi nahi katta)
    const last = db.plans.filter((p) => p.user_id === user.id && p.member_id === mem.id)
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
    if (last && last.sig === sig && last.source === "ai" && last.plan) {
      return { id: last.id, source: "ai", plan: last.plan, cached: true, points_awarded: 0 };
    }
    // 2) Daily cap (normal + emergency) — roz itne hi AI plan-update
    const s = getSettings();
    const cap = (Number(s.premium_plans_per_day) || 0) + (Number(s.premium_emergency_per_day) || 0);
    const usedToday = db.plans.count((p) => p.user_id === user.id && p.source === "ai" && istDay(p.created_at) === istToday());
    if (cap > 0 && usedToday >= cap) {
      throw new HttpError(429, lang === "en"
        ? `Today's plan updates are used up (${cap}/day). Please try again tomorrow.`
        : `Aaj ke plan updates poore ho gaye (${cap}/din). Kal phir update kar sakte hain.`, { capped: true });
    }
    const ss = symptomSummary(user.id, mem.id, mem.isSelf);
    if (ss) profile.symptom_context = ss;
    profile.season = seasonInfo(lang).ritu;
  }
  const priorPlans = db.plans.count((p) => p.user_id === user.id);
  const { plan, source } = await generatePlan(profile, { forceFallback: !feat.ai_plan });
  const id = uid();
  db.plans.insert({ id, user_id: user.id, member_id: mem.id, sig, title: plan && plan.summary ? plan.summary.slice(0, 60) : "Wellness plan", plan, source, created_at: now() });
  // Healing Points: pehla plan banane par, aur referral wale ko bhi (jab referred-user active ho)
  const awarded = points.award(user.id, "plan").awarded;
  if (priorPlans === 0 && user.referred_by) points.award(user.referred_by, "referral", { ref: user.id, note: "referral active" });
  return { id, source, plan, points_awarded: awarded };
}

function listPlans(ctx) {
  const rows = db.plans.filter((p) => p.user_id === ctx.user.id)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 50)
    .map((p) => ({ id: p.id, title: p.title, source: p.source, created_at: p.created_at }));
  return { plans: rows };
}
function getPlan(ctx) {
  const p = db.plans.get(ctx.params.id);
  if (!p || p.user_id !== ctx.user.id) throw new HttpError(404, "Plan nahi mila");
  return { id: p.id, source: p.source, created_at: p.created_at, plan: p.plan };
}
function deletePlan(ctx) {
  db.plans.remove((p) => p.id === ctx.params.id && p.user_id === ctx.user.id);
  return { ok: true };
}

// ================= Family members (F3) =================
function listMembers(ctx) {
  ensureSelf(ctx.user);
  const rows = db.members.filter((m) => m.user_id === ctx.user.id)
    .sort((a, b) => (a.relation === "self" ? -1 : 1) - (b.relation === "self" ? -1 : 1));
  return { members: rows };
}
function addMember(ctx) {
  const b = ctx.body || {};
  const name = String(b.name || "").trim();
  if (!name) throw new HttpError(400, "Naam daalein");
  const m = { id: uid(), user_id: ctx.user.id, name, relation: String(b.relation || "family").trim(), age: b.age || null, gender: b.gender || null, height_cm: b.height_cm || null, weight_kg: b.weight_kg || null, created_at: now() };
  db.members.insert(m);
  const pts = points.award(ctx.user.id, "member", { ref: m.id }).awarded; // cap tak
  return { member: m, points_awarded: pts };
}
function updateMember(ctx) {
  const m = db.members.get(ctx.params.id);
  if (!m || m.user_id !== ctx.user.id) throw new HttpError(404, "Member nahi mila");
  const b = ctx.body || {};
  db.members.update(m.id, { name: b.name || m.name, relation: b.relation || m.relation, age: b.age ?? m.age, gender: b.gender ?? m.gender, height_cm: b.height_cm ?? m.height_cm, weight_kg: b.weight_kg ?? m.weight_kg });
  return { ok: true };
}
function deleteMember(ctx) {
  const m = db.members.get(ctx.params.id);
  if (!m || m.user_id !== ctx.user.id) throw new HttpError(404, "Member nahi mila");
  if (m.relation === "self") throw new HttpError(400, "Self member delete nahi hota");
  db.members.remove((x) => x.id === m.id);
  return { ok: true };
}

// ---- Symptom tracker (member-aware) ----
function logSymptom(ctx) {
  const b = ctx.body || {};
  const symptom = String(b.symptom || "").trim();
  const sev = Math.max(1, Math.min(5, parseInt(b.sev, 10) || 0));
  if (!symptom) throw new HttpError(400, "Symptom chunein");
  if (!sev) throw new HttpError(400, "Severity (1-5) chunein");
  const mem = resolveMemberId(ctx);
  const entry = { id: uid(), user_id: ctx.user.id, member_id: mem.id, symptom, sev, note: String(b.note || "").trim(), created_at: now() };
  db.symptoms.insert(entry);
  const pts = points.award(ctx.user.id, "log").awarded; // roz ek baar
  return { id: entry.id, points_awarded: pts };
}
function listSymptoms(ctx) {
  const mem = resolveMemberId(ctx);
  const rows = db.symptoms.filter((s) => s.user_id === ctx.user.id && belongsTo(s, mem.id, mem.isSelf))
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 60);
  return { symptoms: rows };
}
function deleteSymptom(ctx) {
  db.symptoms.remove((s) => s.id === ctx.params.id && s.user_id === ctx.user.id);
  return { ok: true };
}

// streak, score, weekly trend (member filtered)
function computeStats(userId, memberId, isSelf) {
  const syms = db.symptoms.filter((s) => s.user_id === userId && belongsTo(s, memberId, isSelf));
  const dayset = new Set(syms.map((s) => (s.created_at || "").slice(0, 10)));
  let streak = 0; const d = new Date();
  if (!dayset.has(iso(d))) d.setDate(d.getDate() - 1);
  while (dayset.has(iso(d))) { streak++; d.setDate(d.getDate() - 1); }
  const W = ["S", "M", "T", "W", "T", "F", "S"];
  const trend = []; let sevSum = 0, sevN = 0;
  for (let i = 6; i >= 0; i--) {
    const day = new Date(); day.setDate(day.getDate() - i);
    const key = iso(day);
    const todays = syms.filter((s) => (s.created_at || "").slice(0, 10) === key);
    const avg = todays.length ? todays.reduce((a, s) => a + s.sev, 0) / todays.length : 0;
    if (todays.length) { sevSum += avg; sevN++; }
    trend.push({ d: W[day.getDay()], v: Math.round(avg * 10) / 10 });
  }
  const avgSev = sevN ? sevSum / sevN : 0;
  const score = sevN ? Math.round(100 - ((avgSev - 1) / 4) * 55) : 72;
  return { streak, score, trend, logsCount: syms.length, avgSev, sevN };
}

// avg severity in a window [fromDaysAgo, toDaysAgo)
function windowAvg(userId, memberId, isSelf, from, to) {
  const now2 = new Date();
  const lo = new Date(now2); lo.setDate(lo.getDate() - from);
  const hi = new Date(now2); hi.setDate(hi.getDate() - to);
  const syms = db.symptoms.filter((s) => s.user_id === userId && belongsTo(s, memberId, isSelf) && new Date(s.created_at) > lo && new Date(s.created_at) <= hi);
  if (!syms.length) return { avg: 0, n: 0 };
  return { avg: syms.reduce((a, s) => a + s.sev, 0) / syms.length, n: syms.length };
}

// ---- Progress / before-after (F6) ----
function progress(ctx) {
  const lang = (ctx.query && ctx.query.language) === "en" ? "en" : "hi";
  const mem = resolveMemberId(ctx);
  const cur = windowAvg(ctx.user.id, mem.id, mem.isSelf, 7, 0);   // last 7 days
  const prev = windowAvg(ctx.user.id, mem.id, mem.isSelf, 14, 7); // 8-14 days ago
  const enough = cur.n > 0 && prev.n > 0;
  let improvement = 0, msg;
  if (enough && prev.avg > 0) improvement = Math.round(((prev.avg - cur.avg) / prev.avg) * 100);
  if (!enough) msg = lang === "hi" ? "Thoda aur track karein — do hafton ka data aane par progress dikhega." : "Keep tracking — progress shows once there's two weeks of data.";
  else if (improvement > 0) msg = lang === "hi" ? `Shaabaash! Aap pichhle hafte se ${improvement}% behtar hain. 🌿` : `Great! You're ${improvement}% better than last week. 🌿`;
  else if (improvement < 0) msg = lang === "hi" ? `Is hafte symptoms thode badhe hain (${Math.abs(improvement)}%). Plan aur routine par dhyaan dein.` : `Symptoms rose a bit this week (${Math.abs(improvement)}%). Stick to your plan and routine.`;
  else msg = lang === "hi" ? "Sthir hai — aise hi dhyaan banaye rakhein." : "Steady — keep it up.";
  return { improvement, enough, cur: Math.round(cur.avg * 10) / 10, prev: Math.round(prev.avg * 10) / 10, msg };
}

// ---- Season / ritucharya (F2) ----
function season(ctx) {
  const lang = (ctx.query && ctx.query.language) === "en" ? "en" : "hi";
  return seasonInfo(lang);
}

// ---- Dashboard (home) — member-aware + season + progress + auto-adjust hint ----
function dashboard(ctx) {
  const user = ctx.user;
  const lang = (ctx.query && ctx.query.language) === "en" ? "en" : "hi";
  const mem = resolveMemberId(ctx);
  const stats = computeStats(user.id, mem.id, mem.isSelf);
  const latest = db.plans.filter((p) => p.user_id === user.id && belongsTo(p, mem.id, mem.isSelf)).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
  const plansCount = db.plans.count((p) => p.user_id === user.id && belongsTo(p, mem.id, mem.isSelf));
  let activePlan = null;
  if (latest && latest.plan) {
    const pl = latest.plan;
    activePlan = { title: latest.title || (pl.summary || "").slice(0, 50), dosha: pl.dosha_analysis ? pl.dosha_analysis.primary_dosha : null, balance: pl.dosha_analysis ? pl.dosha_analysis.balance_percent : null, routine: pl.daily_routine || [] };
  }
  // F1: auto-adjust hint — recent severity high => suggest plan update
  const autoAdjust = (stats.sevN >= 2 && stats.avgSev >= 3.3)
    ? { needed: true, msg: lang === "hi" ? "Aapke symptoms thode badh rahe hain — AI se plan update karein." : "Your symptoms are rising — update your plan with AI." }
    : { needed: false };
  return {
    user: { name: user.name, premium: isPremium(user) },
    member: { id: mem.id, isSelf: mem.isSelf },
    stats: { streak: stats.streak, score: stats.score, plans: plansCount, logs: stats.logsCount },
    trend: stats.trend,
    activePlan,
    season: seasonInfo(lang),
    autoAdjust,
  };
}

// ---- AI insight (F1 core: symptom trend -> nudge) ----
async function insight(ctx) {
  const user = ctx.user;
  const lang = (ctx.body && ctx.body.language) === "en" ? "en" : "hi";
  const mem = resolveMemberId(ctx);
  const summary = symptomSummary(user.id, mem.id, mem.isSelf, 15);
  if (isPremium(user)) {
    const langName = lang === "hi" ? "Hinglish (Roman Hindi)" : "English";
    const prompt = `You are a caring natural-wellness coach. Based ONLY on these recent symptom logs, write ONE short, warm, practical insight (max 2 sentences) in ${langName}. Mention the trend and ONE gentle home/ayurvedic suggestion. No medicines, no diagnosis.\n\nRecent symptoms: ${summary || "no logs yet"}.\nName: ${user.name}.`;
    const txt = await aiText(prompt, 160);
    if (txt) return { insight: txt, source: "ai" };
  }
  let msg;
  if (!summary) msg = lang === "hi" ? "Aaj apna pehla symptom log karein — jitna track karenge, plan utna behtar hoga." : "Log your first symptom today — the more you track, the better your plan gets.";
  else {
    const first = summary.split(";")[0].split(":")[0].trim();
    msg = lang === "hi" ? `Aapke "${first}" par thoda dhyaan dein — garm paani aur halka khaana madad karega.` : `Keep an eye on your "${first}" — warm water and light meals help.`;
  }
  return { insight: msg, source: "basic" };
}

// ---- "Why this?" explainer (F4) ----
async function explain(ctx) {
  const user = ctx.user;
  const b = ctx.body || {};
  const text = String(b.text || "").trim().slice(0, 120);
  const lang = b.language === "en" ? "en" : "hi";
  if (!text) throw new HttpError(400, "Kya samjhana hai?");
  const mem = resolveMemberId(ctx);
  const latest = db.plans.filter((p) => p.user_id === user.id && belongsTo(p, mem.id, mem.isSelf)).sort((a, b2) => (b2.created_at || "").localeCompare(a.created_at || ""))[0];
  const dosha = latest && latest.plan && latest.plan.dosha_analysis ? latest.plan.dosha_analysis.primary_dosha : "";
  if (isPremium(user)) {
    const langName = lang === "hi" ? "Hinglish (Roman Hindi)" : "English";
    const prompt = `In ${langName}, explain in 2 short sentences WHY this wellness item helps THIS user. Be warm and simple. No medicines, no diagnosis.\nItem: "${text}"\nUser's primary dosha: ${dosha || "not known"}.`;
    const txt = await aiText(prompt, 140);
    if (txt) return { text, explanation: txt, source: "ai" };
  }
  // Offline: aam items ka specific fayda (free users ko bhi accha jawab)
  const key = text.toLowerCase();
  const WHY = {
    ashwagandha: { hi: "Ashwagandha ek rasayan jadi-booti hai jo stress-hormone (cortisol) ko kam karti hai, neend gehri karti hai aur sharir ko taakat deti hai.", en: "Ashwagandha is a rejuvenating herb that lowers the stress hormone cortisol, deepens sleep and builds strength." },
    triphala: { hi: "Triphala teen phalon (amla, harad, baheda) ka mel hai — pachan saaf rakhta hai, kabz door karta hai aur detox karta hai.", en: "Triphala blends three fruits — it cleanses digestion, relieves constipation and gently detoxes." },
    amla: { hi: "Amla me bahut Vitamin C hota hai — immunity badhata hai, baal-tvacha ke liye achha, aur acidity shaant karta hai.", en: "Amla is rich in Vitamin C — it boosts immunity, is great for hair and skin, and soothes acidity." },
    giloy: { hi: "Giloy rog-pratirodhak shakti badhati hai aur bukhar/infection me sharir ki raksha karti hai.", en: "Giloy strengthens immunity and helps the body fight fever and infection." },
    methi: { hi: "Methi (fenugreek) blood sugar aur cholesterol santulit rakhne me madad karti hai aur pachan sudhaarti hai.", en: "Fenugreek helps balance blood sugar and cholesterol and improves digestion." },
    jeera: { hi: "Jeera pachan-agni tez karta hai, gas-acidity kam karta hai aur pet halka rakhta hai.", en: "Cumin fires up digestion, eases gas and acidity, and keeps the stomach light." },
    haldi: { hi: "Haldi me curcumin hota hai jo sujan (inflammation) kam karta hai aur immunity badhata hai.", en: "Turmeric's curcumin reduces inflammation and boosts immunity." },
    tulsi: { hi: "Tulsi stress kam karti hai, saans-naali saaf rakhti hai aur immunity badhati hai.", en: "Holy basil lowers stress, clears the airways and supports immunity." },
    "vitamin d": { hi: "Vitamin D haddiyon ko mazboot karta hai, mood theek rakhta hai aur immunity support karta hai. Dhoop sabse achha source hai.", en: "Vitamin D strengthens bones, lifts mood and supports immunity. Sunlight is the best source." },
    "vitamin b12": { hi: "B12 khoon aur naso ke liye zaroori hai — kamzori aur thakaan door karta hai.", en: "B12 is vital for blood and nerves — it fights weakness and fatigue." },
    magnesium: { hi: "Magnesium naso aur maanspeshiyon ko shaant karta hai, neend aur stress me madad karta hai.", en: "Magnesium calms nerves and muscles, helping sleep and stress." },
  };
  let hit = null;
  for (const k in WHY) if (key.includes(k)) { hit = WHY[k]; break; }
  const base = hit ? (lang === "hi" ? hit.hi : hit.en)
    : (lang === "hi" ? `"${text}" ek aam gharelu/ayurvedic upay hai jo sharir ko santulit karne aur aaram dene mein madad karta hai.` : `"${text}" is a common home/ayurvedic measure that helps balance and soothe the body.`);
  return { text, explanation: base, source: "basic" };
}

// ---- AI chat guide (F7) ----
async function chat(ctx) {
  const user = ctx.user;
  const b = ctx.body || {};
  const lang = b.language === "en" ? "en" : "hi";
  const msgs = Array.isArray(b.messages) ? b.messages.slice(-6) : [];
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  if (!lastUser) throw new HttpError(400, "Message daalein");
  if (!isPremium(user)) return { reply: lang === "hi" ? "AI chat Premium feature hai. Premium lein to apne plan ke baare mein kuch bhi pooch sakte hain. 🌿" : "AI chat is a Premium feature. Go Premium to ask anything about your plan. 🌿", source: "basic" };
  const mem = resolveMemberId(ctx);
  const latest = db.plans.filter((p) => p.user_id === user.id && belongsTo(p, mem.id, mem.isSelf)).sort((a, b2) => (b2.created_at || "").localeCompare(a.created_at || ""))[0];
  const planCtx = latest && latest.plan ? JSON.stringify({ summary: latest.plan.summary, dosha: latest.plan.dosha_analysis, diet: latest.plan.diet }).slice(0, 1500) : "no plan yet";
  const langName = lang === "hi" ? "Hinglish (Roman Hindi)" : "English";
  const convo = msgs.map((m) => `${m.role === "user" ? "User" : "Coach"}: ${String(m.content).slice(0, 500)}`).join("\n");
  const prompt = `You are "NaturalHeal", a warm natural-wellness coach. Answer the user's question in ${langName}, short and practical (2-4 sentences). Base answers on their plan context. No medicines, no diagnosis; for anything serious tell them to see a doctor.\n\nUser's plan context: ${planCtx}\n\nConversation:\n${convo}\nCoach:`;
  const txt = await aiText(prompt, 320);
  return { reply: txt || (lang === "hi" ? "Abhi jawab nahi mil paaya, dobara koshish karein." : "Couldn't answer right now, please try again."), source: txt ? "ai" : "basic" };
}

module.exports = { health, publicStats, register, login, me, putProfile, generate, listPlans, getPlan, deletePlan, logSymptom, listSymptoms, deleteSymptom, dashboard, insight, listMembers, addMember, updateMember, deleteMember, season, progress, explain, chat };
