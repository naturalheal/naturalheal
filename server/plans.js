// ---------------------------------------------------------------------------
// Plan features — free vs premium. Pricing/limit ab admin settings se aate hain.
// ---------------------------------------------------------------------------
const { getSettings } = require("./settings");

// kya user premium hai (abhi tak valid)?
function isPremium(user) {
  if (!user || user.plan !== "premium") return false;
  if (user.plan_status !== "active") return false;
  if (user.plan_expires && new Date(user.plan_expires) < new Date()) return false;
  return true;
}

function featuresFor(user) {
  if (isPremium(user)) return { ai_plan: true, report_analysis: true, saved_plans: Infinity };
  return { ai_plan: false, report_analysis: false, saved_plans: getSettings().free_plan_limit };
}

module.exports = { isPremium, featuresFor };
