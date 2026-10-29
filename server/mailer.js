// ---------------------------------------------------------------------------
// Email bhejna — sirf Resend (HTTPS API, free 3000/mahina). Free host par bhi chalta hai,
// koi email password app me nahi rakhna padta. Koi npm package nahi.
// ---------------------------------------------------------------------------
const { getSettings } = require("./settings");

function mailConfig() {
  const s = getSettings();
  return { to: s.backup_email || "", resendKey: s.resend_api_key || "", from: s.mail_from || "", app: s.app_name || "NaturalHeal AI" };
}
function mailReady(c = mailConfig()) { return !!(c.to && c.resendKey); }

// Bhejo: { subject, text, attachments:[{filename, content(Buffer)}] }
async function sendMail({ subject, text, attachments }) {
  const c = mailConfig();
  if (!mailReady(c)) throw new Error("email set nahi (admin me backup email + Resend API key bharein)");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + c.resendKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: c.from || `${c.app} Backup <onboarding@resend.dev>`, to: [c.to], subject, text,
      attachments: (attachments || []).map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
    }),
  });
  if (!r.ok) throw new Error("Resend " + r.status + ": " + (await r.text()).slice(0, 200));
  return true;
}

module.exports = { sendMail, mailReady, mailConfig };
