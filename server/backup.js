// ---------------------------------------------------------------------------
// Roz ka automatic backup — poore data ka gzip snapshot, roz ~3 baje raat (IST).
// Teen jagah: (1) Upstash me alag key (30 din), (2) admin ke Telegram par file (server se bahar),
// (3) disk par backups/ folder (jahan disk pakki ho). Admin panel se: abhi backup, download, restore.
// Restore se pehle hamesha ek "pre-restore" backup banta hai.
// ---------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const db = require("./store");
const { HttpError } = require("./util");
const { getSettings } = require("./settings");

const UP_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const UP_PREFIX = (process.env.UPSTASH_KEY || "naturalheal:db") + ":backup:";
const KEEP_DAYS = Math.max(3, Number(process.env.BACKUP_KEEP_DAYS) || 30);
const HOUR_IST = Math.min(23, Math.max(0, Number(process.env.BACKUP_HOUR_IST) || 3));
const DIR = path.join(path.dirname(db.dbPath), "backups");

const istNow = () => new Date(Date.now() + 19800000);
const istDate = () => istNow().toISOString().slice(0, 10);
let status = { last: null, last_ok: null, last_error: null, running: false, sent: {} };

async function upstash(cmd) {
  const r = await fetch(UP_URL, { method: "POST", headers: { Authorization: "Bearer " + UP_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error("upstash HTTP " + r.status);
  return r.json();
}
const remoteOn = () => !!(UP_URL && UP_TOKEN);

function counts(d) { const c = {}; for (const k of Object.keys(d)) if (Array.isArray(d[k])) c[k] = d[k].length; return c; }
// Snapshot: { meta, data } -> gzip
function snapshot(reason) {
  const data = db._raw();
  const meta = { app: "naturalheal", reason, created_at: new Date().toISOString(), date_ist: istDate(), counts: counts(data) };
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify({ meta, data })), { level: 9 });
  return { meta, gz };
}

async function toUpstash(name, gz, meta) {
  if (!remoteOn()) return null;
  await upstash(["SET", UP_PREFIX + name, gz.toString("base64"), "EX", String(KEEP_DAYS * 86400)]);
  // chhoti index list (naam, size, ginti)
  let idx = [];
  try { const r = await upstash(["GET", UP_PREFIX + "index"]); idx = r && r.result ? JSON.parse(r.result) : []; } catch (_) {}
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
  idx = idx.filter((x) => x.name !== name && x.created_at >= cutoff);
  idx.push({ name, size: gz.length, created_at: meta.created_at, reason: meta.reason, counts: meta.counts });
  await upstash(["SET", UP_PREFIX + "index", JSON.stringify(idx.slice(-60))]);
  return true;
}
async function toTelegram(name, gz, meta) {
  const s = getSettings();
  if (!s.telegram_bot_token || !s.telegram_chat_id) return null;
  if (gz.length > 45 * 1024 * 1024) throw new Error("backup 45MB se bada — Telegram par nahi gaya");
  const fd = new FormData();
  fd.append("chat_id", s.telegram_chat_id);
  const total = Object.values(meta.counts).reduce((a, b) => a + b, 0);
  fd.append("caption", `🗄️ ${s.app_name || "NaturalHeal"} backup ${meta.date_ist} (${meta.reason})\nUsers: ${meta.counts.users || 0} · Records: ${total} · ${(gz.length / 1024).toFixed(0)} KB`);
  fd.append("document", new Blob([gz], { type: "application/gzip" }), `naturalheal-backup-${name}.json.gz`);
  const r = await fetch(`https://api.telegram.org/bot${s.telegram_bot_token}/sendDocument`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("telegram HTTP " + r.status);
  return true;
}
async function toEmail(name, gz, meta) {
  const { sendMail, mailReady } = require("./mailer");
  if (!mailReady()) return null;
  const s = getSettings(), total = Object.values(meta.counts).reduce((a, b) => a + b, 0);
  const big = gz.length > 20 * 1024 * 1024;
  await sendMail({
    subject: `🗄️ ${s.app_name || "NaturalHeal"} backup ${meta.date_ist} (${meta.reason})`,
    text: `Roz ka automatic backup.\n\nDate: ${meta.date_ist}\nUsers: ${meta.counts.users || 0}\nRecords: ${total}\nSize: ${(gz.length / 1024).toFixed(0)} KB\n\n` +
      (big ? "File 20MB se badi hai — admin panel se download karein." : "File attached hai (.json.gz). Restore: Admin → Settings → Backup → File se restore.") +
      "\n\nIs file me sabka data hai — kisi ke saath share na karein.",
    attachments: big ? [] : [{ filename: `naturalheal-backup-${name}.json.gz`, content: gz, type: "application/gzip" }],
  });
  return true;
}
function toDisk(name, gz) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, `naturalheal-backup-${name}.json.gz`), gz);
    const files = fs.readdirSync(DIR).filter((f) => f.startsWith("naturalheal-backup-")).sort();
    while (files.length > KEEP_DAYS) fs.unlinkSync(path.join(DIR, files.shift()));
    return true;
  } catch (_) { return null; }
}

// Backup chalao (auto / manual / pre-restore)
async function runBackup(reason = "auto") {
  if (status.running) return status;
  status.running = true;
  const name = reason === "auto" ? istDate() : `${istDate()}-${reason}-${Date.now().toString(36)}`;
  const sent = {};
  try {
    const { meta, gz } = snapshot(reason);
    sent.disk = toDisk(name, gz);
    try { sent.upstash = await toUpstash(name, gz, meta); } catch (e) { sent.upstash = false; sent.upstash_err = e.message; }
    try { sent.telegram = await toTelegram(name, gz, meta); } catch (e) { sent.telegram = false; sent.telegram_err = e.message; }
    if (reason !== "pre-restore") { try { sent.email = await toEmail(name, gz, meta); } catch (e) { sent.email = false; sent.email_err = e.message; } }
    const ok = sent.upstash || sent.telegram || sent.email || sent.disk;
    status = { ...status, last: new Date().toISOString(), last_name: name, size: gz.length, counts: meta.counts, sent, last_error: ok ? null : "kahin save nahi hua" };
    if (ok) status.last_ok = status.last;
    if (reason === "auto" && ok && remoteOn()) { try { await upstash(["SET", UP_PREFIX + "lastauto", istDate()]); } catch (_) {} }
    if (reason === "auto" && ok) status.last_auto = istDate();
  } catch (e) {
    status = { ...status, last: new Date().toISOString(), last_error: e.message, sent };
  }
  status.running = false;
  return status;
}

// Har 15 min dekho: aaj ka auto backup hua? (restart ke baad bhi Upstash se yaad rahta hai)
async function tick() {
  try {
    if (istNow().getUTCHours() < HOUR_IST) return;
    const today = istDate();
    if (status.last_auto === today) return;
    if (remoteOn()) {
      try { const r = await upstash(["GET", UP_PREFIX + "lastauto"]); if (r && r.result === today) { status.last_auto = today; return; } } catch (_) {}
    }
    await runBackup("auto");
  } catch (e) { console.error("backup tick:", e.message); }
}
function startScheduler() {
  setTimeout(tick, 60 * 1000);
  setInterval(tick, 15 * 60 * 1000);
  console.log(`  Backup: roz ~${HOUR_IST}:00 IST (Upstash${remoteOn() ? " ✓" : " ✗"}, Telegram, disk) ✓`);
}

// ---------------- admin ----------------
async function listBackups() {
  let up = [];
  if (remoteOn()) { try { const r = await upstash(["GET", UP_PREFIX + "index"]); up = r && r.result ? JSON.parse(r.result) : []; } catch (_) {} }
  let disk = [];
  try { disk = fs.readdirSync(DIR).filter((f) => f.startsWith("naturalheal-backup-")).map((f) => ({ name: f.replace(/^naturalheal-backup-|\.json\.gz$/g, ""), size: fs.statSync(path.join(DIR, f)).size, disk: true })); } catch (_) {}
  const map = {};
  for (const x of disk) map[x.name] = { ...x };
  for (const x of up) map[x.name] = { ...(map[x.name] || {}), ...x, upstash: true };
  return Object.values(map).sort((a, b) => b.name.localeCompare(a.name));
}
async function adminStatus() {
  const s = getSettings();
  const { mailReady } = require("./mailer");
  return { status, hour_ist: HOUR_IST, keep_days: KEEP_DAYS, where: { upstash: remoteOn(), telegram: !!(s.telegram_bot_token && s.telegram_chat_id), email: mailReady() ? s.backup_email : "", disk: db.onDisk }, list: await listBackups() };
}
async function adminRun() { await runBackup("manual"); return adminStatus(); }
async function loadBackup(name) {
  if (!/^[\w.:-]{6,80}$/.test(name)) throw new HttpError(400, "name?");
  if (remoteOn()) {
    try { const r = await upstash(["GET", UP_PREFIX + name]); if (r && r.result) return Buffer.from(r.result, "base64"); } catch (_) {}
  }
  const f = path.join(DIR, `naturalheal-backup-${name}.json.gz`);
  if (fs.existsSync(f)) return fs.readFileSync(f);
  throw new HttpError(404, "backup nahi mila");
}
// Download: ?name= (purana backup) ya abhi ka taaza
async function adminDownload(ctx) {
  const name = ctx.query && ctx.query.name;
  const gz = name ? await loadBackup(name) : snapshot("download").gz;
  ctx.res.writeHead(200, { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="naturalheal-backup-${name || istDate()}.json.gz"` });
  ctx.res.end(gz);
  return { __sent: true };
}
// Restore: { name } (list se) ya { file_b64 } (upload .json.gz / .json), confirm:"RESTORE"
async function adminRestore(ctx) {
  const b = ctx.body || {};
  if (b.confirm !== "RESTORE") throw new HttpError(400, "Confirm ke liye 'RESTORE' likhein");
  let buf;
  if (b.name) buf = await loadBackup(String(b.name));
  else if (b.file_b64) buf = Buffer.from(String(b.file_b64), "base64");
  else throw new HttpError(400, "backup chunein");
  let obj;
  try { const raw = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf; obj = JSON.parse(raw.toString("utf8")); }
  catch (_) { throw new HttpError(400, "file sahi backup nahi hai"); }
  const data = obj && obj.data && obj.meta ? obj.data : obj; // purana manual backup (sirf data) bhi chale
  if (!data || !Array.isArray(data.users) || !data.users.some((u) => u.is_admin)) throw new HttpError(400, "is backup me admin account nahi — restore roka gaya");
  await runBackup("pre-restore");
  db.replaceAll(data);
  return { ok: true, counts: counts(data) };
}

module.exports = { startScheduler, runBackup, adminStatus, adminRun, adminDownload, adminRestore };
