// ---------------------------------------------------------------------------
// App settings — admin inko panel se edit kar sakta hai (pricing, limit, naam).
// DB mein store hote hain; na ho to .env / default se.
// ---------------------------------------------------------------------------
const db = require("./store");
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
    premium_plans_per_month: num("PREMIUM_PLANS_PER_MONTH", 15),    // mahine ki max limit (0 = no monthly limit)
    premium_blurb_hi: "Premium mein: AI gehra plan + report analysis + unlimited plans + AI chat.",
    premium_blurb_en: "Premium unlocks: deeper AI plan + report analysis + unlimited plans + AI chat.",
    app_url: process.env.APP_URL || "",
    // Share/invite content — admin se editable
    share_tagline_hi: "Ghar baithe natural ilaaj — bina dawai ke, bilkul free. Aaj hi try karein 🌿",
    share_tagline_en: "Natural healing at home — no medicines, free. Try it today 🌿",
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
  };
}
function getSettings() {
  const s = db.settings.get("app");
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
  if (patch.premium_blurb_hi != null) clean.premium_blurb_hi = String(patch.premium_blurb_hi).slice(0, 200);
  if (patch.premium_blurb_en != null) clean.premium_blurb_en = String(patch.premium_blurb_en).slice(0, 200);
  if (patch.app_url != null) clean.app_url = String(patch.app_url).trim().replace(/\/+$/, "").slice(0, 200);
  if (patch.share_tagline_hi != null) clean.share_tagline_hi = String(patch.share_tagline_hi).slice(0, 160);
  if (patch.share_tagline_en != null) clean.share_tagline_en = String(patch.share_tagline_en).slice(0, 160);
  if (patch.invite_video != null) clean.invite_video = String(patch.invite_video).trim().slice(0, 300);
  if (patch.coupon_enabled != null) clean.coupon_enabled = !!patch.coupon_enabled;
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
module.exports = { getSettings, saveSettings, defaults };
