// ---------------------------------------------------------------------------
// App settings — admin inko panel se edit kar sakta hai (pricing, limit, naam).
// DB mein store hote hain; na ho to .env / default se.
// ---------------------------------------------------------------------------
const db = require("./store");
const { uid } = require("./util");
const SHARE_LANGS = ["hi", "bn", "mr", "gu", "ta", "te", "kn", "pa", "ml"]; // Hindi(hin)+English ke alag fields hain
const num = (k, d) => Number(process.env[k] || d);

function defaults() {
  return {
    app_name: process.env.APP_NAME || "NaturalHeal AI",
    price_inr: num("PRICE_INR", 199),
    price_usd: num("PRICE_USD", 5),
    free_plan_limit: num("FREE_PLAN_LIMIT", 3),
    // Premium user kitne AI plan-update kar sakta hai (cost control).
    premium_plans_per_day: num("PREMIUM_PLANS_PER_DAY", 1),       // normal/din
    premium_emergency_per_day: num("PREMIUM_EMERGENCY_PER_DAY", 1), // emergency/din
    premium_plans_per_month: num("PREMIUM_PLANS_PER_MONTH", 10),    // ek recharge-mahine me max AI plan (0 = koi limit nahi)
    fit_ai_days: num("FIT_AI_DAYS", 7),                             // Fit ka AI diet/yoga/coach itne din me ek hi baar badle
    premium_blurb_hi: "Premium mein: AI gehra plan + report analysis + unlimited plans + AI chat.",
    premium_blurb_en: "Premium unlocks: deeper AI plan + report analysis + unlimited plans + AI chat.",
    app_url: process.env.APP_URL || "",
    // Share/invite content — admin se editable
    share_tagline_hi: "Ghar baithe natural ilaaj — bina dawai ke, bilkul free. Aaj hi try karein 🌿",
    share_tagline_en: "Natural healing at home — no medicines, free. Try it today 🌿",
    // Baaki bhashaon ki apni share line (lang code -> text). Khaali = app ki default line us bhasha me.
    share_taglines: {},
    invite_video: "",
    // Healing Points — har activity ke points + redeem rates (admin se editable)
    points: {
      referral: 50,   // kisi ne aapke link se aakar pehla plan banaya
      plan: 10,       // pehli baar plan banaya (ek baar)
      profile: 10,    // health profile poora bhara (ek baar)
      post: 20,       // community kahani approve hui
      share: 2,       // app/content share kiya (roz cap)
      like: 1,        // kisi post ko like (roz cap)
      member: 5,      // family member joda (max tak)
      log: 5,         // us din symptom log kiya (roz ek baar)
      share_daily_cap: 10,   // share se roz max points
      like_daily_cap: 5,     // like se roz max points
      member_max_awards: 5,  // itne member tak hi points
      redeem_premium_month: 300, // (purana) direct months-based — ab ₹-based use hota hai
      rupee_per_point: 0.01,     // 100 points = ₹1 (admin editable)
      product_min_points: 100,   // product/coupon redeem ke liye min points
    },
    coupon_enabled: false,       // product coupon abhi band; admin jab chahe ON kare
    // UPI direct payment (gateway-free) — admin apna UPI daale
    upi_id: process.env.UPI_ID || "",        // jaise: name@okhdfcbank
    upi_name: process.env.UPI_NAME || "",    // jiske naam par paisa aayega
    upi_auto_approve: false,     // ON = sahi format + non-duplicate UTR par turant premium (bharose par)
    // Admin ko turant alert — Telegram (free). Payment aate hi phone par message.
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || "",
    telegram_chat_id: process.env.TELEGRAM_CHAT_ID || "",
    // Roz ka backup email par bhi (admin ka email) — Resend se
    backup_email: process.env.BACKUP_EMAIL || "",
    resend_api_key: process.env.RESEND_API_KEY || "",
    mail_from: process.env.MAIL_FROM || "",
    // Extra bimariyan/samasyaein — admin ya user add karte hain, sabko chip ke roop me dikhti hain
    custom_concerns: [],         // [{id, label}]
  };
}
function getSettings() {
  const s = db.settings.get("app");
  // Ek baar: purani 15/mahina default ko nayi 10/mahina par (admin ne jaan-boojh kar alag rakha ho to nahi chhedte)
  if (s && s.data && !s.data._quota_v2) {
    if (Number(s.data.premium_plans_per_month) === 15) s.data.premium_plans_per_month = 10;
    s.data._quota_v2 = true;
    db.settings.update("app", { data: s.data });
  }
  return { ...defaults(), ...(s && s.data ? s.data : {}) };
}
function saveSettings(patch) {
  const clean = {};
  if (patch.app_name != null) clean.app_name = String(patch.app_name).slice(0, 40);
  if (patch.price_inr != null) clean.price_inr = Math.max(0, Number(patch.price_inr) || 0);
  if (patch.price_usd != null) clean.price_usd = Math.max(0, Number(patch.price_usd) || 0);
  if (patch.free_plan_limit != null) clean.free_plan_limit = Math.max(0, parseInt(patch.free_plan_limit, 10) || 0);
  if (patch.premium_plans_per_day != null) clean.premium_plans_per_day = Math.max(0, parseInt(patch.premium_plans_per_day, 10) || 0);
  if (patch.premium_emergency_per_day != null) clean.premium_emergency_per_day = Math.max(0, parseInt(patch.premium_emergency_per_day, 10) || 0);
  if (patch.premium_plans_per_month != null) clean.premium_plans_per_month = Math.max(0, parseInt(patch.premium_plans_per_month, 10) || 0);
  if (patch.fit_ai_days != null) clean.fit_ai_days = Math.max(1, Math.min(60, parseInt(patch.fit_ai_days, 10) || 7));
  if (patch.premium_blurb_hi != null) clean.premium_blurb_hi = String(patch.premium_blurb_hi).slice(0, 200);
  if (patch.premium_blurb_en != null) clean.premium_blurb_en = String(patch.premium_blurb_en).slice(0, 200);
  if (patch.app_url != null) clean.app_url = String(patch.app_url).trim().replace(/\/+$/, "").slice(0, 200);
  // Share message lamba aur multi-line ho sakta hai (WhatsApp) — 1000 akshar tak, newlines safe
  if (patch.share_tagline_hi != null) clean.share_tagline_hi = String(patch.share_tagline_hi).replace(/\r/g, "").slice(0, 1000);
  if (patch.share_tagline_en != null) clean.share_tagline_en = String(patch.share_tagline_en).replace(/\r/g, "").slice(0, 1000);
  if (patch.share_taglines && typeof patch.share_taglines === "object") {
    clean.share_taglines = {};
    SHARE_LANGS.forEach((k) => { const v = patch.share_taglines[k]; if (v != null && String(v).trim()) clean.share_taglines[k] = String(v).replace(/\r/g, "").slice(0, 1000); });
  }
  if (patch.invite_video != null) clean.invite_video = String(patch.invite_video).trim().slice(0, 300);
  if (patch.coupon_enabled != null) clean.coupon_enabled = !!patch.coupon_enabled;
  if (patch.upi_id != null) clean.upi_id = String(patch.upi_id).trim().slice(0, 80);
  if (patch.upi_name != null) clean.upi_name = String(patch.upi_name).trim().slice(0, 60);
  if (patch.upi_auto_approve != null) clean.upi_auto_approve = !!patch.upi_auto_approve;
  if (patch.telegram_bot_token != null) clean.telegram_bot_token = String(patch.telegram_bot_token).trim().slice(0, 120);
  if (patch.telegram_chat_id != null) clean.telegram_chat_id = String(patch.telegram_chat_id).trim().slice(0, 40);
  if (patch.backup_email != null) { const e = String(patch.backup_email).trim().slice(0, 120); clean.backup_email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ""; }
  if (patch.mail_from != null) clean.mail_from = String(patch.mail_from).trim().slice(0, 120);
  // secret: admin ko chhupa hua (••••1234) dikhta hai — wahi wapas aaye to purana hi rakho
  for (const k of ["resend_api_key"]) if (patch[k] != null && !String(patch[k]).startsWith("••••")) clean[k] = String(patch[k]).trim().slice(0, 200);
  const cur = db.settings.get("app");
  // Points rules (nested) — sirf valid number keys merge
  let pointsMerged;
  if (patch.points && typeof patch.points === "object") {
    const base = { ...defaults().points, ...((cur && cur.data && cur.data.points) || {}) };
    const allowed = ["referral", "plan", "profile", "post", "share", "like", "member", "log", "share_daily_cap", "like_daily_cap", "member_max_awards", "redeem_premium_month", "rupee_per_point", "product_min_points"];
    allowed.forEach((k) => { if (patch.points[k] != null && !isNaN(Number(patch.points[k]))) base[k] = Math.max(0, Number(patch.points[k])); });
    pointsMerged = base;
  }
  const data = { ...(cur && cur.data ? cur.data : {}), ...clean };
  if (pointsMerged) data.points = pointsMerged;
  if (cur) db.settings.update("app", { data });
  else db.settings.insert({ id: "app", data });
  return getSettings();
}
function persistConcerns(list) {
  const cur = db.settings.get("app");
  const data = { ...(cur && cur.data ? cur.data : {}), custom_concerns: list.slice(0, 300) };
  if (cur) db.settings.update("app", { data }); else db.settings.insert({ id: "app", data });
}
// Nayi samasya/bimari jodo (user ya admin). De-dupe (case-insensitive). Lauta deta hai item.
function addConcern(label) {
  const text = String(label || "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (text.length < 2) return null;
  const s = getSettings();
  const list = Array.isArray(s.custom_concerns) ? s.custom_concerns.slice() : [];
  const low = text.toLowerCase();
  const exist = list.find((c) => (c.label || "").toLowerCase() === low);
  if (exist) return exist;
  const item = { id: "c_" + uid().slice(0, 8), label: text };
  list.push(item);
  persistConcerns(list);
  return item;
}
function removeConcern(id) {
  const s = getSettings();
  persistConcerns((s.custom_concerns || []).filter((c) => c.id !== id));
  return getSettings().custom_concerns;
}

module.exports = { getSettings, saveSettings, defaults, addConcern, removeConcern };
