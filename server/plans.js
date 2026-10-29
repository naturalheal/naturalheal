// ---------------------------------------------------------------------------
// Plan features — free vs premium. Pricing/limit ab admin settings se aate hain.
// ---------------------------------------------------------------------------
const { getSettings } = require("./settings");

// kya user premium hai (abhi tak valid)?
function isPremium(user) {
  if (!user) return false;
  if (user.is_admin) return true; // owner/admin ko hamesha full AI access
  if (user.plan !== "premium") return false;
  if (user.plan_status !== "active") return false;
  if (user.plan_expires && new Date(user.plan_expires) < new Date()) return false;
  return true;
}

function featuresFor(user) {
  if (isPremium(user)) return { ai_plan: true, report_analysis: true, saved_plans: Infinity };
  return { ai_plan: false, report_analysis: false, saved_plans: getSettings().free_plan_limit };
}

// Recharge-mahine ki shuruaat: recharge ki taarikh; purane users me expiry se 31 din pehle; admin ke liye calendar mahina
function periodStart(user) {
  if (user.plan_period_start) return user.plan_period_start;
  if (user.plan_expires && !user.is_admin) return new Date(new Date(user.plan_expires).getTime() - 31 * 864e5).toISOString();
  const d = new Date(Date.now() + 19800000); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 19800000).toISOString();
}
function periodEnd(user) {
  if (user.plan_expires && !user.is_admin) return user.plan_expires;
  const d = new Date(Date.now() + 19800000); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 19800000).toISOString();
}
// Is recharge-mahine me AI plan: kitne bane / kitne baaki
function planQuota(user, plansDb) {
  if (!isPremium(user)) return null;
  const limit = Number(getSettings().premium_plans_per_month) || 0;
  const from = periodStart(user);
  const used = plansDb.count((p) => p.user_id === user.id && p.source === "ai" && (p.created_at || "") >= from);
  return { limit, used, left: limit ? Math.max(0, limit - used) : null, renews: periodEnd(user) };
}

module.exports = { isPremium, featuresFor, periodStart, periodEnd, planQuota };
