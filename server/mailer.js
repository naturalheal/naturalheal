// ---------------------------------------------------------------------------
// Email bhejna (koi npm package nahi):
//  - "resend": Resend HTTPS API (free 3000/mahina) — free host par bhi chalta hai (sujhav)
//  - "smtp":   Gmail / Zoho / koi bhi SMTP (Gmail me "App password") — chhota khud ka client
//              (465 = seedha TLS, 587 = STARTTLS). Kuch free host SMTP port band rakhte hain.
// ---------------------------------------------------------------------------
const net = require("net");
const tls = require("tls");
const { getSettings } = require("./settings");

const b64 = (s) => Buffer.from(s).toString("base64");
const wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n").trim();
const encSubject = (s) => `=?UTF-8?B?${b64(s)}?=`;

function mailConfig() {
  const s = getSettings();
  return {
    to: s.backup_email || "", provider: s.mail_provider === "smtp" ? "smtp" : "resend",
    resendKey: s.resend_api_key || "", from: s.mail_from || "",
    host: s.smtp_host || "", port: Number(s.smtp_port) || 465, user: s.smtp_user || "", pass: s.smtp_pass || "",
    app: s.app_name || "NaturalHeal AI",
  };
}
function mailReady(c = mailConfig()) {
  if (!c.to) return false;
  return c.provider === "resend" ? !!c.resendKey : !!(c.host && c.user && c.pass);
}

// ---------------- Resend ----------------
async function viaResend(c, { subject, text, attachments }) {
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

// ---------------- SMTP ----------------
function buildMime(from, to, subject, text, attachments) {
  const bnd = "nh_" + Date.now().toString(36);
  const parts = [
    `From: ${from}`, `To: ${to}`, `Subject: ${encSubject(subject)}`, `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${bnd}"`, "",
    `--${bnd}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64(text)),
  ];
  for (const a of attachments || []) {
    parts.push(`--${bnd}`, `Content-Type: ${a.type || "application/octet-stream"}; name="${a.filename}"`,
      `Content-Disposition: attachment; filename="${a.filename}"`, "Content-Transfer-Encoding: base64", "", wrap76(a.content.toString("base64")));
  }
  parts.push(`--${bnd}--`, "");
  return parts.join("\r\n");
}
function viaSmtp(c, { subject, text, attachments }) {
  return new Promise((resolve, reject) => {
    const secure = c.port === 465;
    let sock, buf = "", waiting = null, finished = false;
    const timer = setTimeout(() => fail(new Error("SMTP timeout")), 45000);
    function fail(e) { if (finished) return; finished = true; clearTimeout(timer); try { sock.destroy(); } catch (_) {} reject(e); }
    function feed(d) { buf += d.toString("utf8"); check(); }
    function check() {
      if (!waiting) return;
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const res = { code: +lines[i].slice(0, 3), text: lines.slice(0, i + 1).join("\n") };
          buf = lines.slice(i + 1).join("\r\n");
          const w = waiting; waiting = null; w(res); return;
        }
      }
    }
    const read = () => new Promise((res) => { waiting = res; check(); });
    async function cmd(line, ok) {
      if (line != null) sock.write(line + "\r\n");
      const r = await read();
      if (!ok.includes(r.code)) throw new Error("SMTP " + r.code + ": " + r.text.slice(0, 200));
      return r;
    }
    function attach(s) { sock = s; sock.on("data", feed); sock.on("error", fail); }
    (async () => {
      attach(secure ? tls.connect({ host: c.host, port: c.port, servername: c.host }) : net.connect({ host: c.host, port: c.port }));
      await cmd(null, [220]);
      let ehlo = await cmd("EHLO naturalheal", [250]);
      if (!secure && /STARTTLS/i.test(ehlo.text)) {
        await cmd("STARTTLS", [220]);
        sock.removeAllListeners("data");
        const up = tls.connect({ socket: sock, servername: c.host });
        await new Promise((r, j) => { up.once("secureConnect", r); up.once("error", j); });
        attach(up);
        ehlo = await cmd("EHLO naturalheal", [250]);
      }
      if (c.user) {
        await cmd("AUTH LOGIN", [334]);
        await cmd(b64(c.user), [334]);
        await cmd(b64(c.pass), [235]);
      }
      const fromAddr = (c.from.match(/<([^>]+)>/) || [])[1] || c.from || c.user;
      await cmd(`MAIL FROM:<${fromAddr}>`, [250]);
      await cmd(`RCPT TO:<${c.to}>`, [250, 251]);
      await cmd("DATA", [354]);
      const mime = buildMime(c.from || `${c.app} Backup <${fromAddr}>`, c.to, subject, text, attachments);
      sock.write(mime.replace(/^\./gm, "..") + "\r\n.\r\n");
      await cmd(null, [250]);
      try { sock.write("QUIT\r\n"); } catch (_) {}
      finished = true; clearTimeout(timer); setTimeout(() => { try { sock.end(); } catch (_) {} }, 200);
      resolve(true);
    })().catch(fail);
  });
}

// Bhejo: { subject, text, attachments:[{filename, content(Buffer), type}] }
async function sendMail(msg) {
  const c = mailConfig();
  if (!mailReady(c)) throw new Error("email set nahi (admin me backup email + Resend key ya SMTP bharein)");
  return c.provider === "smtp" ? viaSmtp(c, msg) : viaResend(c, msg);
}

module.exports = { sendMail, mailReady, mailConfig };
