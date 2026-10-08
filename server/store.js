// ---------------------------------------------------------------------------
// Data store — ek JSON file mein sab data (koi database install nahi chahiye).
// Tables: users, health_profiles, ai_plans, payments
// Bade scale pe PostgreSQL pe jaana ho to schema.sql ready hai.
// ---------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", process.env.DB_FILE || "naturalheal-data.json");

let data = { users: [], health_profiles: [], ai_plans: [], payments: [], symptoms: [], members: [], settings: [], posts: [], shares: [], points_ledger: [], redemptions: [] };
try {
  if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (e) { console.error("data file padhne mein dikkat, naya banayenge:", e.message); }
for (const k of ["users", "health_profiles", "ai_plans", "payments", "symptoms", "members", "settings", "posts", "shares", "points_ledger", "redemptions"]) if (!data[k]) data[k] = [];

function save() {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 0));
  fs.renameSync(tmp, FILE);
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
  _raw: () => data,
};
