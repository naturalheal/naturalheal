// ---------------------------------------------------------------------------
// Admin handlers — sirf admin ke liye (router admin:true laga deta hai)
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError } = require("./util");
const { grantPremium, revokePremium } = require("./billing");
const { isPremium } = require("./plans");
const { getSettings, saveSettings } = require("./settings");

function stats() {
  const users = db.users.all();
  const premium = users.filter((u) => isPremium(u)).length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = users.filter((u) => new Date(u.created_at) >= monthStart).length;
  const paid = db.payments.filter((p) => p.status === "paid");
  const revMap = {};
  paid.forEach((p) => { const c = p.currency || "?"; revMap[c] = (revMap[c] || 0) + (p.amount || 0); });
  const revenue = Object.entries(revMap).map(([currency, total]) => ({ currency, total }));
  return {
    totalUsers: users.length, premium, free: users.length - premium,
    plans: db.plans.count(), symptoms: db.symptoms.count(), members: db.members.count(),
    newThisMonth, revenue,
  };
}

// ---- Settings (edit/customize) ----
function readSettings() { return { settings: getSettings() }; }
function writeSettings(ctx) { return { settings: saveSettings(ctx.body || {}) }; }

// ---- Plans report ----
function plansReport() {
  const all = db.plans.all();
  const bySource = {};
  all.forEach((p) => { bySource[p.source || "?"] = (bySource[p.source || "?"] || 0) + 1; });
  const recent = all.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 60).map((p) => {
    const u = db.users.get(p.user_id) || {};
    return { title: p.title, source: p.source, created_at: p.created_at, name: u.name, email: u.email };
  });
  return { total: all.length, bySource, recent };
}

// ---- Symptoms report ----
function symptomsReport() {
  const all = db.symptoms.all();
  const by = {};
  all.forEach((s) => { (by[s.symptom] = by[s.symptom] || []).push(s.sev); });
  const top = Object.entries(by).map(([symptom, arr]) => ({ symptom, count: arr.length, avgSev: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 }))
    .sort((a, b) => b.count - a.count).slice(0, 15);
  return { total: all.length, top };
}

// ---- Members report ----
function membersReport() {
  const all = db.members.all();
  const family = all.filter((m) => m.relation !== "self").length;
  const byRel = {};
  all.forEach((m) => { byRel[m.relation || "?"] = (byRel[m.relation || "?"] || 0) + 1; });
  return { total: all.length, family, byRel };
}

function listUsers(ctx) {
  const q = String(ctx.query.q || "").toLowerCase();
  const rows = db.users.filter((u) => !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, 200)
    .map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, region: u.region, plan: u.plan, plan_status: u.plan_status, plan_expires: u.plan_expires, provider: u.provider, is_admin: u.is_admin, created_at: u.created_at }));
  return { users: rows };
}

function userDetail(ctx) {
  const u = db.users.get(ctx.params.id);
  if (!u) throw new HttpError(404, "User nahi mila");
  const payments = db.payments.filter((p) => p.user_id === u.id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const planCount = db.plans.count((p) => p.user_id === u.id);
  return { user: { id: u.id, name: u.name, email: u.email, phone: u.phone, region: u.region, plan: u.plan, plan_status: u.plan_status, plan_expires: u.plan_expires, provider: u.provider, is_admin: u.is_admin, created_at: u.created_at }, payments, planCount };
}

function setPremium(ctx) {
  const { on, days } = ctx.body || {};
  if (!db.users.get(ctx.params.id)) throw new HttpError(404, "User nahi mila");
  if (on) grantPremium(ctx.params.id, { provider: "manual", days: Number(days) || 31 });
  else revokePremium(ctx.params.id);
  return { ok: true };
}

// ---- Delete user (saara data ke saath) ----
function deleteUser(ctx) {
  const u = db.users.get(ctx.params.id);
  if (!u) throw new HttpError(404, "User nahi mila");
  if (u.is_admin) throw new HttpError(400, "Admin account delete nahi hota");
  db.plans.remove((p) => p.user_id === u.id);
  db.symptoms.remove((s) => s.user_id === u.id);
  db.members.remove((m) => m.user_id === u.id);
  db.payments.remove((p) => p.user_id === u.id);
  db.profiles.remove((pr) => pr.user_id === u.id);
  db.users.remove((x) => x.id === u.id);
  return { ok: true };
}

// ---- Admin: kisi bhi user ke family members ----
function userMembers(ctx) {
  const u = db.users.get(ctx.params.id);
  if (!u) throw new HttpError(404, "User nahi mila");
  return { user: { id: u.id, name: u.name }, members: db.members.filter((m) => m.user_id === u.id) };
}
function adminUpdateMember(ctx) {
  const m = db.members.get(ctx.params.id);
  if (!m) throw new HttpError(404, "Member nahi mila");
  const b = ctx.body || {};
  db.members.update(m.id, { name: b.name || m.name, relation: b.relation || m.relation, gender: b.gender ?? m.gender, age: b.age ?? m.age });
  return { ok: true };
}
function adminDeleteMember(ctx) {
  const m = db.members.get(ctx.params.id);
  if (!m) throw new HttpError(404, "Member nahi mila");
  if (m.relation === "self") throw new HttpError(400, "Self member delete nahi hota");
  db.members.remove((x) => x.id === m.id);
  return { ok: true };
}

function recentPayments() {
  const rows = db.payments.all().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 100).map((p) => {
    const u = db.users.get(p.user_id) || {};
    return { provider: p.provider, amount: p.amount, currency: p.currency, status: p.status, ref_id: p.ref_id, created_at: p.created_at, name: u.name, email: u.email };
  });
  return { payments: rows };
}

// Fresh start (launch se pehle): sab test data saaf, admin account bacha rehta hai
function resetData(ctx) {
  const b = ctx.body || {};
  if (b.confirm !== "RESET") throw new HttpError(400, "Confirm ke liye 'RESET' likhein");
  db.resetKeepAdmin(ctx.user.id);
  return { ok: true, kept_admin: ctx.user.id };
}

module.exports = { stats, listUsers, userDetail, setPremium, deleteUser, recentPayments, readSettings, writeSettings, plansReport, symptomsReport, membersReport, userMembers, adminUpdateMember, adminDeleteMember, resetData };
