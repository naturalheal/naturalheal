// ---------------------------------------------------------------------------
// Sharing / Referral — Phase 1 (bina points ke; points baad me add honge).
// Har user ka apna ref_code + link. Naya user us link se aaye to referred_by set.
// Share events (whatsapp/plan/remedy) log hote hain taaki admin report bane.
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError, uid } = require("./util");
const points = require("./points");
const now = () => new Date().toISOString();

// Chhota, aasan code (I/O/0/1 hata ke confusion na ho)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode(n = 6) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
// User ko ek unique ref_code pakka de do
function ensureRefCode(user) {
  if (user.ref_code) return user.ref_code;
  let code;
  do { code = genCode(6); } while (db.users.findBy("ref_code", code));
  db.users.update(user.id, { ref_code: code });
  return code;
}
// ref_code se referrer dhoondo (register ke waqt)
function findReferrer(code) {
  if (!code) return null;
  const c = String(code).trim().toUpperCase().slice(0, 12);
  if (!c) return null;
  return db.users.findBy("ref_code", c) || null;
}

const SHARE_TYPES = ["invite", "whatsapp", "plan", "remedy", "report", "community", "progress", "streak", "festival", "qr", "other"];

// ---- User: apni referral info ----
function referralInfo(ctx) {
  const user = ctx.user;
  const code = ensureRefCode(user);
  const referred = db.users.count((u) => u.referred_by === user.id);
  const shares = db.shares.count((s) => s.user_id === user.id);
  return { code, path: "/?ref=" + code, referred, shares };
}

// ---- User: share event log (analytics + aage points ke liye base) ----
function logShare(ctx) {
  const b = ctx.body || {};
  const type = SHARE_TYPES.includes(b.type) ? b.type : "other";
  db.shares.insert({ id: uid(), user_id: ctx.user.id, type, created_at: now() });
  const pts = points.award(ctx.user.id, "share", { note: type }).awarded; // roz cap
  return { ok: true, points_awarded: pts };
}

// ---- ADMIN: referral + sharing report ----
function referralReport() {
  const users = db.users.all();
  const referredUsers = users.filter((u) => u.referred_by);
  // top referrers
  const countBy = {};
  referredUsers.forEach((u) => { countBy[u.referred_by] = (countBy[u.referred_by] || 0) + 1; });
  const topReferrers = Object.entries(countBy)
    .map(([id, count]) => { const u = db.users.get(id) || {}; return { name: u.name || "—", email: u.email || "", code: u.ref_code || "", count }; })
    .sort((a, b) => b.count - a.count).slice(0, 50);
  // share events by type
  const shares = db.shares.all();
  const byType = {};
  shares.forEach((s) => { byType[s.type || "other"] = (byType[s.type || "other"] || 0) + 1; });
  return {
    totalReferredSignups: referredUsers.length,
    activeReferrers: Object.keys(countBy).length,
    totalShares: shares.length,
    byType,
    topReferrers,
  };
}

module.exports = { referralInfo, logShare, referralReport, ensureRefCode, findReferrer };
