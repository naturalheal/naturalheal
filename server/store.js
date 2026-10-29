// ---------------------------------------------------------------------------
// Data store — ek JSON blob mein sab data (koi database install nahi chahiye).
// Tables: users, health_profiles, ai_plans, payments, ...
//
// PERMANENT DATA (free): agar UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// env me set hain, to poora data Upstash (free cloud Redis) me bhi save hota hai
// aur server restart par wahin se wapas aa jaata hai. Env na ho to pehle jaisa
// local file par chalta hai (free host par restart par reset ho jaata hai).
// ---------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");

// DB_FILE absolute ho (jaise /data/naturalheal-data.json — paid persistent disk) to seedha wahi use karo,
// warna project folder ke andar (free host).
const DBF = process.env.DB_FILE || "naturalheal-data.json";
const FILE = path.isAbsolute(DBF) ? DBF : path.join(__dirname, "..", DBF);
const KEYS = ["users", "health_profiles", "ai_plans", "payments", "symptoms", "members", "settings", "posts", "shares", "points_ledger", "redemptions", "upi_payments", "wl_programs", "wl_logs", "yoga_logs", "gym_profiles", "gym_logs", "fit_ai"];

let data = {};
for (const k of KEYS) data[k] = [];
try {
  if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (e) { console.error("data file padhne mein dikkat, naya banayenge:", e.message); }
for (const k of KEYS) if (!data[k]) data[k] = [];

// ---- One-time fresh wipe (launch se pehle) ----
// Render me env FRESH_WIPE=<koi bhi value> set karo -> ek baar SAARA data saaf.
// Marker save ho jaata hai, isliye dobara deploy par wapas-wapas nahi udta.
// Phir se wipe chahiye to value badal do (jaise go1 -> go2).
const FW = process.env.FRESH_WIPE || "";
if (FW && data._fresh_wipe !== FW) {
  for (const k of KEYS) data[k] = [];
  data._fresh_wipe = FW;
  try {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 0));
    fs.renameSync(tmp, FILE);
  } catch (e) { /* read-only FS */ }
  console.log("  Data: FRESH_WIPE chala — sab data saaf, bilkul naya ✓ (marker=" + FW + ")");
}

// ---- Upstash (free permanent backup) ----
const UP_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const UP_KEY = process.env.UPSTASH_KEY || "naturalheal:db";
const remoteOn = !!(UP_URL && UP_TOKEN);

async function upstash(cmd) {
  const r = await fetch(UP_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + UP_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("upstash HTTP " + r.status);
  return r.json();
}

let pushTimer = null, pushing = false, pushAgain = false;
function pushRemote() {
  if (!remoteOn) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(doPush, 800); // debounce: kai writes ko ek saath bhejo
}
async function doPush() {
  if (!remoteOn) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  try { await upstash(["SET", UP_KEY, JSON.stringify(data)]); }
  catch (e) { console.error("remote save fail:", e.message); }
  pushing = false;
  if (pushAgain) { pushAgain = false; doPush(); }
}

// Boot par Upstash se data wapas load karo (permanent)
async function init() {
  if (!remoteOn) return;
  try {
    const res = await upstash(["GET", UP_KEY]);
    if (res && typeof res.result === "string" && res.result.length) {
      const remote = JSON.parse(res.result);
      if (remote && typeof remote === "object") {
        data = remote;
        for (const k of KEYS) if (!data[k]) data[k] = [];
        console.log("  Data: Upstash se restore ho gaya (permanent) ✓");
        return;
      }
    }
    await doPush(); // Upstash khaali tha — abhi wala data seed kar do
    console.log("  Data: Upstash juda (permanent, fresh) ✓");
  } catch (e) { console.error("remote restore fail:", e.message); }
}

function save() {
  try {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 0));
    fs.renameSync(tmp, FILE);
  } catch (e) { /* read-only FS par Upstash hi asli store hai */ }
  pushRemote();
}

function collection(name) {
  const arr = () => data[name];
  return {
    all: () => arr().slice(),
    get: (id) => arr().find((r) => r.id === id),
    findBy: (k, v) => arr().find((r) => r[k] === v),
    filter: (fn) => arr().filter(fn),
    count: (fn) => (fn ? arr().filter(fn).length : arr().length),
    insert: (o) => { arr().push(o); save(); return o; },
    update: (id, patch) => { const r = arr().find((x) => x.id === id); if (r) { Object.assign(r, patch); save(); } return r; },
    remove: (fn) => { data[name] = arr().filter((r) => !fn(r)); save(); },
  };
}

module.exports = {
  users: collection("users"),
  profiles: collection("health_profiles"),
  plans: collection("ai_plans"),
  payments: collection("payments"),
  symptoms: collection("symptoms"),
  members: collection("members"),
  settings: collection("settings"),
  posts: collection("posts"),
  shares: collection("shares"),
  points_ledger: collection("points_ledger"),
  redemptions: collection("redemptions"),
  upi_payments: collection("upi_payments"),
  wl_programs: collection("wl_programs"),
  wl_logs: collection("wl_logs"),
  yoga_logs: collection("yoga_logs"),
  gym_profiles: collection("gym_profiles"),
  gym_logs: collection("gym_logs"),
  fit_ai: collection("fit_ai"),
  _raw: () => data,
  init,
  remoteOn,
  onDisk: path.isAbsolute(DBF),
  dbPath: FILE,
  // Launch se pehle fresh start: admin ka account rakho, baaki sab test data saaf
  resetKeepAdmin: (adminId) => {
    data.users = (data.users || []).filter((u) => u.id === adminId);
    data.members = (data.members || []).filter((m) => m.user_id === adminId);
    data.health_profiles = (data.health_profiles || []).filter((p) => p.user_id === adminId);
    data.ai_plans = []; data.payments = []; data.symptoms = [];
    data.posts = []; data.shares = []; data.points_ledger = []; data.redemptions = []; data.upi_payments = [];
    data.wl_programs = []; data.wl_logs = []; data.yoga_logs = []; data.gym_profiles = []; data.gym_logs = []; data.fit_ai = [];
    save();
  },
};
