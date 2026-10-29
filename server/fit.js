// ---------------------------------------------------------------------------
// Fit — Weight Loss Program (30/60/90 din).
// Calorie/protein/paani/kadam lakshya (Mifflin BMR x activity), roz ki checklist + wazan,
// hafte-hafte auto-adjust. Text app (fit-i18n.js) me har bhasha me banta hai — yahan sirf numbers/keys.
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError, uid } = require("./util");
const points = require("./points");

const now = () => new Date().toISOString();
const istDay = (iso) => new Date(new Date(iso).getTime() + 19800000).toISOString().slice(0, 10);
const istToday = () => istDay(now());
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
const r1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const TASKS = ["water", "walk", "workout", "diet", "sleep", "nosugar"];
const ACT = { low: 1.2, light: 1.375, active: 1.55 };
const SAFE_PER_WEEK = 0.9;       // ~1 kg/hafte se zyada nahi (sehat ke saath)
const KCAL_PER_KG = 7700;

// Lakshya: calorie (deficit 400-750, minimum 1200 mahila / 1500 purush), protein, paani, kadam
function targets(p, week, kcalAdj, stepAdj) {
  const w = p.cur_kg || p.start_kg;
  const bmr = 10 * w + 6.25 * p.height_cm - 5 * p.age + (p.gender === "female" ? -161 : 5);
  const tdee = bmr * (ACT[p.activity] || 1.2);
  const wantPerDay = (p.expected_loss / p.days) * KCAL_PER_KG;
  const deficit = clamp(wantPerDay, 400, 750);
  const floor = p.gender === "female" ? 1200 : 1500;
  const kcal = Math.round(Math.max(floor, tdee - deficit + (kcalAdj || 0)) / 10) * 10;
  return {
    kcal,
    tdee: Math.round(tdee),
    protein_g: Math.round(clamp(w * 1.2, 50, 140)),
    water_glasses: clamp(Math.round((w * 35) / 250), 8, 14),
    steps: clamp(6000 + (week - 1) * 1000 + (stepAdj || 0), 5000, 12000),
  };
}

function programOf(userId) {
  return db.wl_programs.filter((x) => x.user_id === userId && x.status === "active")
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0] || null;
}
function logsOf(pid) {
  return db.wl_logs.filter((l) => l.program_id === pid).sort((a, b) => a.date.localeCompare(b.date));
}
function dayScore(tasks) { return TASKS.filter((t) => t === "water" ? (tasks.water || 0) >= 1 : !!tasks[t]).length; }

// Hafte-hafte adjust: har poore hafte ke ant me asli vs ummeed wala loss dekho
function weeklyAdjust(p, logs) {
  const today = istToday();
  const day = dayDiff(p.start_date, today) + 1;
  const doneWeeks = Math.floor((day - 1) / 7);
  const adj = (p.adjust || []).slice();
  const perWeek = p.expected_loss / (p.days / 7);
  for (let wk = adj.length + 1; wk <= doneWeeks; wk++) {
    const end = new Date(new Date(p.start_date + "T00:00:00Z").getTime() + (wk * 7 - 1) * 86400000).toISOString().slice(0, 10);
    const weighed = logs.filter((l) => l.weight && l.date <= end);
    const last = weighed[weighed.length - 1];
    let action = "nodata", lost = null;
    if (last) {
      lost = r1(p.start_kg - last.weight);
      const expected = perWeek * wk;
      if (lost < expected * 0.6) action = "slow";      // kam ghata -> calorie -100, kadam +1000
      else if (lost > expected * 1.5 && lost - expected > 1) action = "fast"; // bahut tez -> calorie +100
      else action = "ontrack";
    }
    adj.push({ week: wk, action, lost, expected: r1(perWeek * wk) });
  }
  if (adj.length !== (p.adjust || []).length) db.wl_programs.update(p.id, { adjust: adj });
  const kcalAdj = adj.reduce((s, a) => s + (a.action === "slow" ? -100 : a.action === "fast" ? 100 : 0), 0);
  const stepAdj = adj.reduce((s, a) => s + (a.action === "slow" ? 1000 : 0), 0);
  return { adj, kcalAdj: clamp(kcalAdj, -300, 200), stepAdj: clamp(stepAdj, 0, 3000) };
}

function view(p) {
  const logs = logsOf(p.id);
  const today = istToday();
  const day = clamp(dayDiff(p.start_date, today) + 1, 1, p.days);
  const week = Math.ceil(day / 7);
  const { adj, kcalAdj, stepAdj } = weeklyAdjust(p, logs);
  const weighed = logs.filter((l) => l.weight);
  const cur = weighed.length ? weighed[weighed.length - 1].weight : p.start_kg;
  const t = targets({ ...p, cur_kg: cur }, week, kcalAdj, stepAdj);
  const tl = logs.find((l) => l.date === today);
  // streak: lagatar din jinme 4+ kaam hue (aaj adhoora ho to kal se gino)
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() + 19800000 - i * 86400000).toISOString().slice(0, 10);
    if (d < p.start_date) break;
    const l = logs.find((x) => x.date === d);
    const ok = l && dayScore(l.tasks || {}) >= 4;
    if (ok) streak++; else if (i > 0) break;
  }
  return {
    program: {
      id: p.id, start_date: p.start_date, days: p.days, start_kg: p.start_kg, target_loss: p.target_loss,
      expected_loss: p.expected_loss, goal_kg: r1(p.start_kg - p.target_loss), diet: p.diet, place: p.place,
      gender: p.gender, activity: p.activity, safe_capped: p.expected_loss < p.target_loss,
    },
    day, week, today, cur_kg: cur, lost: r1(p.start_kg - cur), targets: t, streak,
    adjust: adj.slice(-1)[0] || null,
    today_log: tl ? { tasks: tl.tasks || {}, weight: tl.weight || null } : { tasks: {}, weight: null },
    weights: weighed.map((l) => ({ date: l.date, kg: l.weight })),
    done_days: logs.filter((l) => dayScore(l.tasks || {}) >= 4).length,
  };
}

function getWL(ctx) {
  const p = programOf(ctx.user.id);
  const last = db.wl_programs.filter((x) => x.user_id === ctx.user.id && x.status !== "active")
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
  return p ? view(p) : { program: null, last: last ? { start_kg: last.start_kg, days: last.days } : null };
}

function startWL(ctx) {
  const b = ctx.body || {};
  const num = (v) => Number(v);
  const start_kg = num(b.weight_kg), height_cm = num(b.height_cm), age = num(b.age);
  if (!(start_kg >= 30 && start_kg <= 250) || !(height_cm >= 120 && height_cm <= 230) || !(age >= 14 && age <= 90)) {
    throw new HttpError(400, "bad_input");
  }
  const days = [30, 60, 90].includes(num(b.days)) ? num(b.days) : 60;
  const target_loss = clamp(r1(num(b.target_loss) || 5), 1, 40);
  const expected_loss = r1(Math.min(target_loss, (days / 7) * SAFE_PER_WEEK));
  db.wl_programs.filter((x) => x.user_id === ctx.user.id && x.status === "active").forEach((x) => db.wl_programs.update(x.id, { status: "stopped" }));
  const p = {
    id: uid(), user_id: ctx.user.id, status: "active", created_at: now(), start_date: istToday(),
    start_kg, height_cm, age, gender: b.gender === "female" ? "female" : "male",
    activity: ACT[b.activity] ? b.activity : "low", diet: ["veg", "egg", "nonveg"].includes(b.diet) ? b.diet : "veg",
    place: b.place === "gym" ? "gym" : "home", days, target_loss, expected_loss, adjust: [],
  };
  db.wl_programs.insert(p);
  db.wl_logs.insert({ id: uid(), program_id: p.id, user_id: ctx.user.id, date: p.start_date, weight: start_kg, tasks: {} });
  return view(p);
}

function logWL(ctx) {
  const p = programOf(ctx.user.id);
  if (!p) throw new HttpError(404, "no_program");
  const b = ctx.body || {};
  const date = istToday();
  let l = db.wl_logs.filter((x) => x.program_id === p.id && x.date === date)[0];
  if (!l) l = db.wl_logs.insert({ id: uid(), program_id: p.id, user_id: ctx.user.id, date, weight: null, tasks: {} });
  const tasks = { ...(l.tasks || {}) };
  if (b.tasks && typeof b.tasks === "object") {
    for (const k of TASKS) if (k in b.tasks) tasks[k] = k === "water" ? clamp(Math.round(Number(b.tasks[k]) || 0), 0, 20) : !!b.tasks[k];
  }
  const patch = { tasks };
  if (b.weight != null && b.weight !== "") {
    const w = Number(b.weight);
    if (!(w >= 30 && w <= 250)) throw new HttpError(400, "bad_weight");
    patch.weight = r1(w);
  }
  const before = dayScore(l.tasks || {});
  db.wl_logs.update(l.id, patch);
  let awarded = 0;
  if (before < 4 && dayScore(tasks) >= 4) awarded = points.award(ctx.user.id, "log", { note: "weight-loss day" }).awarded;
  return { ...view(p), points_awarded: awarded };
}

function stopWL(ctx) {
  const p = programOf(ctx.user.id);
  if (p) db.wl_programs.update(p.id, { status: "stopped", stopped_at: now() });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Yoga — guided session poore hone par minute likho; streak, hafte ke minute, aaj ke session
// ---------------------------------------------------------------------------
const YOGA_SESSIONS = ["ai", "morning", "back", "stress", "weight", "digest", "diabetes", "thyroid", "knee", "women", "bp"];
function yogaView(userId) {
  const logs = db.yoga_logs.filter((l) => l.user_id === userId);
  const today = istToday();
  const byDay = {};
  logs.forEach((l) => { byDay[l.date] = (byDay[l.date] || 0) + (l.minutes || 0); });
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() + 19800000 - i * 86400000).toISOString().slice(0, 10);
    week.push({ date: d, min: byDay[d] || 0 });
  }
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() + 19800000 - i * 86400000).toISOString().slice(0, 10);
    if (byDay[d]) streak++; else if (i > 0) break;
  }
  return {
    today_min: byDay[today] || 0, streak, week,
    total_sessions: logs.length, total_min: logs.reduce((s, l) => s + (l.minutes || 0), 0),
    done_today: [...new Set(logs.filter((l) => l.date === today).map((l) => l.session))],
  };
}
function getYoga(ctx) { return yogaView(ctx.user.id); }
function doneYoga(ctx) {
  const b = ctx.body || {};
  if (!YOGA_SESSIONS.includes(b.session)) throw new HttpError(400, "session?");
  const minutes = clamp(Math.round(Number(b.minutes) || 0), 1, 90);
  db.yoga_logs.insert({ id: uid(), user_id: ctx.user.id, date: istToday(), session: b.session, minutes, created_at: now() });
  const awarded = points.award(ctx.user.id, "log", { note: "yoga" }).awarded;
  return { ...yogaView(ctx.user.id), points_awarded: awarded };
}

// ---------------------------------------------------------------------------
// Gym — lakshya/level/din/jagah ka profile; har workout ke sets (kg x reps) ka log.
// App plan (split) khud banati hai; server pichhla set aur best (PR) har exercise ka deta hai.
// ---------------------------------------------------------------------------
const GYM_GOALS = ["fat", "muscle", "strength"], GYM_LEVELS = ["beg", "int", "adv"];
function gymProfileOf(userId) { return db.gym_profiles.findBy("user_id", userId) || null; }
function gymView(userId) {
  const prof = gymProfileOf(userId);
  const logs = db.gym_logs.filter((l) => l.user_id === userId).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const last = {}, best = {};
  for (const l of logs) for (const e of l.entries || []) {
    if (!e.sets || !e.sets.length) continue;
    last[e.ex] = { date: l.date, sets: e.sets };
    const top = Math.max(...e.sets.map((s) => Number(s.kg) || 0));
    if (top > (best[e.ex] || 0)) best[e.ex] = top;
  }
  const today = istToday();
  const since = (n) => new Date(Date.now() + 19800000 - n * 86400000).toISOString().slice(0, 10);
  const mine = prof ? logs.filter((l) => (l.created_at || "") >= (prof.updated_at || prof.created_at || "")) : [];
  const lastLog = logs[logs.length - 1];
  return {
    profile: prof ? { goal: prof.goal, level: prof.level, days: prof.days, place: prof.place } : null,
    next: mine.length,                                       // split me agla din
    last, best,
    done_today: logs.some((l) => l.date === today),
    week: logs.filter((l) => l.date >= since(6)).length,
    month: new Set(logs.filter((l) => l.date >= since(29)).map((l) => l.date)).size,
    total: logs.length,
    last_session: lastLog ? { date: lastLog.date, day: lastLog.day, volume: Math.round((lastLog.entries || []).reduce((s, e) => s + (e.sets || []).reduce((a, x) => a + (Number(x.kg) || 0) * (Number(x.reps) || 0), 0), 0)) } : null,
  };
}
function getGym(ctx) { return gymView(ctx.user.id); }
function setupGym(ctx) {
  const b = ctx.body || {};
  const row = {
    goal: GYM_GOALS.includes(b.goal) ? b.goal : "fat", level: GYM_LEVELS.includes(b.level) ? b.level : "beg",
    days: [3, 4, 5].includes(Number(b.days)) ? Number(b.days) : 3, place: b.place === "home" ? "home" : "gym", updated_at: now(),
  };
  const cur = gymProfileOf(ctx.user.id);
  if (cur) db.gym_profiles.update(cur.id, row); else db.gym_profiles.insert({ id: uid(), user_id: ctx.user.id, created_at: now(), ...row });
  return gymView(ctx.user.id);
}
function logGym(ctx) {
  const b = ctx.body || {};
  const entries = (Array.isArray(b.entries) ? b.entries : []).slice(0, 15).map((e) => ({
    ex: String(e.ex || "").slice(0, 30),
    sets: (Array.isArray(e.sets) ? e.sets : []).slice(0, 8)
      .map((s) => ({ kg: clamp(r1(Number(s.kg) || 0), 0, 400), reps: clamp(Math.round(Number(s.reps) || 0), 0, 100) }))
      .filter((s) => s.reps > 0),
  })).filter((e) => e.ex && e.sets.length);
  if (!entries.length) throw new HttpError(400, "empty");
  db.gym_logs.insert({ id: uid(), user_id: ctx.user.id, date: istToday(), day: String(b.day || "").slice(0, 20), entries, created_at: now() });
  const awarded = points.award(ctx.user.id, "log", { note: "gym" }).awarded;
  return { ...gymView(ctx.user.id), points_awarded: awarded };
}

module.exports = { getWL, startWL, logWL, stopWL, targets, TASKS, getYoga, doneYoga, getGym, setupGym, logGym };
