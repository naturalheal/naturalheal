// ---------------------------------------------------------------------------
// Healing Points — reward engine.
// Har activity par points (rules admin settings se). Redeem: Premium ya product coupon.
// Anti-cheat: once-only, daily caps, member cap, referral once-per-user, freeze.
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError, uid } = require("./util");
const { getSettings } = require("./settings");
const { grantPremium } = require("./billing");

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
function rules() { return getSettings().points; }

const ONCE = ["plan", "profile"];
const DAILY_CAP = { share: "share_daily_cap", like: "like_daily_cap" };

function ledgerOf(userId) { return db.points_ledger.filter((l) => l.user_id === userId); }
function sumToday(userId, type) {
  const d = today();
  return ledgerOf(userId).filter((l) => l.type === type && (l.created_at || "").slice(0, 10) === d).reduce((a, l) => a + (l.points || 0), 0);
}
function countType(userId, type) { return db.points_ledger.count((l) => l.user_id === userId && l.type === type); }
function hasRef(userId, type, ref) { return !!db.points_ledger.filter((l) => l.user_id === userId && l.type === type && l.ref === ref)[0]; }

// Core: kisi user ko ek activity ke points do (sari guards ke saath)
function award(userId, type, opts = {}) {
  const user = db.users.get(userId);
  if (!user) return { awarded: 0, balance: 0 };
  if (user.points_frozen) return { awarded: 0, balance: user.points || 0 }; // suspected fraud -> kuch na mile
  const r = rules();
  let base = Number(r[type] || 0);
  if (base <= 0) return { awarded: 0, balance: user.points || 0 };

  // once-only (plan, profile)
  if (ONCE.includes(type) && countType(userId, type) > 0) return { awarded: 0, balance: user.points || 0 };
  // ek din me ek hi baar (log)
  if (type === "log" && sumToday(userId, "log") > 0) return { awarded: 0, balance: user.points || 0 };
  // member cap
  if (type === "member" && countType(userId, "member") >= Number(r.member_max_awards || 5)) return { awarded: 0, balance: user.points || 0 };
  // referral ke liye ref zaroori; aur jahan ref diya ho wahan same ref dobara nahi (post/referral)
  if (type === "referral" && !opts.ref) return { awarded: 0, balance: user.points || 0 };
  if (opts.ref && hasRef(userId, type, opts.ref)) return { awarded: 0, balance: user.points || 0 };
  // daily cap (share, like)
  if (DAILY_CAP[type]) {
    const cap = Number(r[DAILY_CAP[type]] || 0);
    const got = sumToday(userId, type);
    if (got >= cap) return { awarded: 0, balance: user.points || 0 };
    if (got + base > cap) base = cap - got;
  }
  if (base <= 0) return { awarded: 0, balance: user.points || 0 };

  db.points_ledger.insert({ id: uid(), user_id: userId, type, points: base, note: opts.note || "", ref: opts.ref || null, created_at: now() });
  const balance = (user.points || 0) + base;
  db.users.update(userId, { points: balance });
  return { awarded: base, balance };
}

function balanceOf(userId) { const u = db.users.get(userId); return u ? (u.points || 0) : 0; }

// ---- User: summary (balance + rules + recent ledger) ----
const EARN_LABELS = {
  referral: { hi: "Dost aapke link se aaya", en: "Friend joined via your link" },
  plan: { hi: "Pehla plan banaya", en: "Made first plan" },
  profile: { hi: "Profile poori bhari", en: "Completed profile" },
  post: { hi: "Kahani share ki (approve)", en: "Story approved" },
  share: { hi: "App/content share kiya", en: "Shared app/content" },
  like: { hi: "Kisi post ko like kiya", en: "Liked a post" },
  member: { hi: "Family member joda", en: "Added family member" },
  log: { hi: "Aaj symptom log kiya", en: "Logged symptom today" },
};
function summary(ctx) {
  const u = ctx.user;
  const r = rules();
  const earn = Object.keys(EARN_LABELS).filter((k) => Number(r[k] || 0) > 0)
    .map((k) => ({ type: k, points: Number(r[k]), label: EARN_LABELS[k] }));
  const recent = ledgerOf(u.id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 25)
    .map((l) => ({ type: l.type, points: l.points, note: l.note, created_at: l.created_at }));
  const myRedemptions = db.redemptions.filter((x) => x.user_id === u.id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 10);
  const s = getSettings();
  const rpp = Number(r.rupee_per_point || 0.01);
  const price = Number(s.price_inr || 0);
  const premiumNeeded = rpp > 0 ? Math.ceil(price / rpp) : 0;
  return {
    balance: u.points || 0, frozen: !!u.points_frozen,
    earn, recent, redemptions: myRedemptions,
    redeem: {
      rupee_per_point: rpp,
      wallet_rupees: Math.floor((u.points || 0) * rpp),
      price_inr: price,
      premium_points_needed: premiumNeeded,
      can_premium: (u.points || 0) >= premiumNeeded && premiumNeeded > 0,
      product_min: Number(r.product_min_points || 0),
      coupon_enabled: !!s.coupon_enabled,
    },
  };
}

// ---- User: Premium ko points se "kharido" (₹ wallet poora bill cover kare -> FREE premium) ----
function redeemPremium(ctx) {
  const u = ctx.user;
  if (u.points_frozen) throw new HttpError(403, "Aapke points abhi hold par hain. Admin se sampark karein.");
  const s = getSettings();
  const r = s.points;
  const months = Math.max(1, Math.min(12, parseInt((ctx.body || {}).months, 10) || 1));
  const rpp = Number(r.rupee_per_point || 0.01);
  const price = Number(s.price_inr || 0) * months;        // ₹ bill
  const need = rpp > 0 ? Math.ceil(price / rpp) : Infinity; // itne points poora bill cover karenge
  if ((u.points || 0) < need) {
    const haveRs = Math.floor((u.points || 0) * rpp);
    throw new HttpError(402, `₹${price} ke liye ${need} points chahiye. Aapke paas ${u.points || 0} points (lagbhag ₹${haveRs}).`);
  }
  const balance = (u.points || 0) - need;
  db.users.update(u.id, { points: balance });
  db.points_ledger.insert({ id: uid(), user_id: u.id, type: "redeem_premium", points: -need, note: `₹${price} premium (${months} mahina) points se`, created_at: now() });
  grantPremium(u.id, { provider: "points", days: 31 * months });
  const after = db.users.get(u.id);
  db.redemptions.insert({ id: uid(), user_id: u.id, kind: "premium", points: need, months, rupees: price, status: "done", created_at: now() });
  return { ok: true, balance, months, rupees_saved: price, expires: after.plan_expires };
}

// ---- User: redeem Product coupon ----
function genCoupon() { const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let s = "NH-"; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function redeemProduct(ctx) {
  const u = ctx.user;
  if (u.points_frozen) throw new HttpError(403, "Aapke points abhi hold par hain. Admin se sampark karein.");
  if (!getSettings().coupon_enabled) throw new HttpError(403, "Coupon redeem abhi band hai. Jald hi special offer me aayega.");
  const r = rules();
  const pts = Math.max(0, parseInt((ctx.body || {}).points, 10) || 0);
  const min = Number(r.product_min_points || 100);
  if (pts < min) throw new HttpError(400, `Kam se kam ${min} points chahiye.`);
  if ((u.points || 0) < pts) throw new HttpError(402, `Itne points nahi hain. Aapke paas ${u.points || 0}.`);
  const rupees = Math.round(pts * Number(r.rupee_per_point || 0));
  const balance = (u.points || 0) - pts;
  db.users.update(u.id, { points: balance });
  db.points_ledger.insert({ id: uid(), user_id: u.id, type: "redeem_product", points: -pts, note: `₹${rupees} coupon`, created_at: now() });
  const code = genCoupon();
  const red = { id: uid(), user_id: u.id, kind: "product", points: pts, rupees, code, status: "pending", created_at: now() };
  db.redemptions.insert(red);
  return { ok: true, balance, code, rupees };
}

// ================= ADMIN =================
function adminOverview() {
  const users = db.users.all();
  const inWallet = users.reduce((a, u) => a + (u.points || 0), 0);
  const led = db.points_ledger.all();
  const earned = led.filter((l) => l.points > 0).reduce((a, l) => a + l.points, 0);
  const redeemed = -led.filter((l) => l.points < 0).reduce((a, l) => a + l.points, 0);
  const top = users.filter((u) => (u.points || 0) > 0 || countType(u.id, "referral") > 0)
    .map((u) => ({ id: u.id, name: u.name, email: u.email, points: u.points || 0, frozen: !!u.points_frozen }))
    .sort((a, b) => b.points - a.points).slice(0, 50);
  const pendingProduct = db.redemptions.count((x) => x.kind === "product" && x.status === "pending");
  return { inWallet, earned, redeemed, totalUsers: users.length, pendingProduct, top };
}
function adminLedger(ctx) {
  const u = db.users.get(ctx.params.id);
  if (!u) throw new HttpError(404, "User nahi mila");
  const led = ledgerOf(u.id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 200);
  return { user: { id: u.id, name: u.name, email: u.email, points: u.points || 0, frozen: !!u.points_frozen }, ledger: led };
}
function adminAdjust(ctx) {
  const u = db.users.get(ctx.params.id);
  if (!u) throw new HttpError(404, "User nahi mila");
  const pts = parseInt((ctx.body || {}).points, 10) || 0;
  const note = String((ctx.body || {}).note || "admin adjust").slice(0, 120);
  if (!pts) throw new HttpError(400, "Kitne points +/- karne hain?");
  const balance = Math.max(0, (u.points || 0) + pts);
  db.users.update(u.id, { points: balance });
  db.points_ledger.insert({ id: uid(), user_id: u.id, type: "admin_adjust", points: pts, note, created_at: now() });
  return { ok: true, balance };
}
function adminFreeze(ctx) {
  const u = db.users.get(ctx.params.id);
  if (!u) throw new HttpError(404, "User nahi mila");
  const on = !!(ctx.body || {}).on;
  db.users.update(u.id, { points_frozen: on ? 1 : 0 });
  return { ok: true, frozen: on };
}
function adminRedemptions(ctx) {
  const status = ctx.query && ctx.query.status;
  let rows = db.redemptions.all();
  if (status && status !== "all") rows = rows.filter((x) => x.status === status);
  rows = rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 200).map((x) => {
    const u = db.users.get(x.user_id) || {};
    return { ...x, name: u.name, email: u.email };
  });
  const counts = { pending: db.redemptions.count((x) => x.status === "pending"), done: db.redemptions.count((x) => x.status === "done"), total: db.redemptions.count() };
  return { redemptions: rows, counts };
}
function adminSetRedemption(ctx) {
  const x = db.redemptions.get(ctx.params.id);
  if (!x) throw new HttpError(404, "Redemption nahi mila");
  const status = (ctx.body || {}).status;
  if (!["approved", "rejected"].includes(status)) throw new HttpError(400, "status approved/rejected hona chahiye");
  if (x.status !== "pending") throw new HttpError(400, "Ye already process ho chuka hai");
  if (status === "rejected") {
    // points wapas
    const u = db.users.get(x.user_id);
    if (u) {
      db.users.update(u.id, { points: (u.points || 0) + (x.points || 0) });
      db.points_ledger.insert({ id: uid(), user_id: u.id, type: "refund", points: x.points || 0, note: "coupon reject refund", created_at: now() });
    }
  }
  db.redemptions.update(x.id, { status });
  return { ok: true, status };
}

module.exports = { award, balanceOf, summary, redeemPremium, redeemProduct, adminOverview, adminLedger, adminAdjust, adminFreeze, adminRedemptions, adminSetRedemption };
