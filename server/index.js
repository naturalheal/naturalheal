// ---------------------------------------------------------------------------
// NaturalHeal AI — server (sirf Node built-ins, koi npm install nahi).
// Chalaane ke liye bas:  node server/index.js
// ---------------------------------------------------------------------------
const http = require("http");
const fs = require("fs");
const path = require("path");

// --- .env load (chhota parser) ---
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch (_) {}
})();

const routes = require("./routes");
const billing = require("./billing");
const admin = require("./admin");
const kitchen = require("./kitchen");
const community = require("./community");
const share = require("./share");
const points = require("./points");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "..", "public");

// --- Route table: [method, pattern, handler, {auth, admin, raw}] ---
const R = [
  ["GET", "/api/health", routes.health],
  ["GET", "/api/stats/public", routes.publicStats],
  ["POST", "/api/auth/register", routes.register],
  ["POST", "/api/auth/login", routes.login],
  ["GET", "/api/me", routes.me, { auth: true }],
  ["PUT", "/api/profile", routes.putProfile, { auth: true }],
  ["POST", "/api/plan/generate", routes.generate, { auth: true }],
  ["GET", "/api/plans", routes.listPlans, { auth: true }],
  ["GET", "/api/plans/:id", routes.getPlan, { auth: true }],
  ["DELETE", "/api/plans/:id", routes.deletePlan, { auth: true }],
  ["GET", "/api/dashboard", routes.dashboard, { auth: true }],
  ["POST", "/api/insight", routes.insight, { auth: true }],
  ["POST", "/api/symptoms", routes.logSymptom, { auth: true }],
  ["GET", "/api/symptoms", routes.listSymptoms, { auth: true }],
  ["DELETE", "/api/symptoms/:id", routes.deleteSymptom, { auth: true }],
  ["GET", "/api/members", routes.listMembers, { auth: true }],
  ["POST", "/api/members", routes.addMember, { auth: true }],
  ["PUT", "/api/members/:id", routes.updateMember, { auth: true }],
  ["DELETE", "/api/members/:id", routes.deleteMember, { auth: true }],
  ["GET", "/api/season", routes.season, { auth: true }],
  ["GET", "/api/kitchen/options", () => kitchen.kitchenOptions(), { auth: true }],
  ["POST", "/api/kitchen/remedy", kitchen.kitchenRemedy, { auth: true }],
  ["POST", "/api/kitchen/scan", kitchen.kitchenScan, { auth: true }],
  ["GET", "/api/community/posts", community.listPosts, { auth: true }],
  ["POST", "/api/community/posts", community.createPost, { auth: true }],
  ["POST", "/api/community/posts/:id/like", community.likePost, { auth: true }],
  ["POST", "/api/community/posts/:id/report", community.reportPost, { auth: true }],
  ["DELETE", "/api/community/posts/:id", community.deleteMyPost, { auth: true }],
  ["GET", "/api/share/referral", share.referralInfo, { auth: true }],
  ["POST", "/api/share/event", share.logShare, { auth: true }],
  ["GET", "/api/points", points.summary, { auth: true }],
  ["POST", "/api/points/redeem/premium", points.redeemPremium, { auth: true }],
  ["POST", "/api/points/redeem/product", points.redeemProduct, { auth: true }],
  ["GET", "/api/progress", routes.progress, { auth: true }],
  ["POST", "/api/explain", routes.explain, { auth: true }],
  ["POST", "/api/chat", routes.chat, { auth: true }],
  ["GET", "/api/billing/pricing", () => billing.pricing()],
  ["POST", "/api/billing/stripe/checkout", billing.stripeCheckout, { auth: true }],
  ["POST", "/api/billing/razorpay/subscribe", billing.razorpaySubscribe, { auth: true }],
  ["POST", "/api/billing/upi/submit", billing.upiSubmit, { auth: true }],
  ["POST", "/api/billing/webhooks/stripe", billing.stripeWebhook, { raw: true }],
  ["POST", "/api/billing/webhooks/razorpay", billing.razorpayWebhook, { raw: true }],
  ["GET", "/api/admin/stats", admin.stats, { admin: true }],
  ["GET", "/api/admin/users", admin.listUsers, { admin: true }],
  ["GET", "/api/admin/users/:id", admin.userDetail, { admin: true }],
  ["POST", "/api/admin/users/:id/premium", admin.setPremium, { admin: true }],
  ["DELETE", "/api/admin/users/:id", admin.deleteUser, { admin: true }],
  ["GET", "/api/admin/users/:id/members", admin.userMembers, { admin: true }],
  ["PUT", "/api/admin/members/:id", admin.adminUpdateMember, { admin: true }],
  ["DELETE", "/api/admin/members/:id", admin.adminDeleteMember, { admin: true }],
  ["GET", "/api/admin/payments", admin.recentPayments, { admin: true }],
  ["GET", "/api/admin/settings", admin.readSettings, { admin: true }],
  ["PUT", "/api/admin/settings", admin.writeSettings, { admin: true }],
  ["POST", "/api/admin/reset-data", admin.resetData, { admin: true }],
  ["GET", "/api/admin/backup", admin.backup, { admin: true }],
  ["POST", "/api/admin/users/:id/password", admin.resetPassword, { admin: true }],
  ["POST", "/api/admin/concerns", admin.addConcern, { admin: true }],
  ["DELETE", "/api/admin/concerns/:id", admin.deleteConcern, { admin: true }],
  ["GET", "/api/admin/upi", admin.upiList, { admin: true }],
  ["POST", "/api/admin/upi/:id", admin.upiSet, { admin: true }],
  ["POST", "/api/concerns", routes.addConcernRoute, { auth: true }],
  ["GET", "/api/admin/report/plans", admin.plansReport, { admin: true }],
  ["GET", "/api/admin/report/symptoms", admin.symptomsReport, { admin: true }],
  ["GET", "/api/admin/report/members", admin.membersReport, { admin: true }],
  ["GET", "/api/admin/report/referral", share.referralReport, { admin: true }],
  ["GET", "/api/admin/points", points.adminOverview, { admin: true }],
  ["GET", "/api/admin/points/user/:id", points.adminLedger, { admin: true }],
  ["POST", "/api/admin/points/user/:id/adjust", points.adminAdjust, { admin: true }],
  ["POST", "/api/admin/points/user/:id/freeze", points.adminFreeze, { admin: true }],
  ["GET", "/api/admin/redemptions", points.adminRedemptions, { admin: true }],
  ["POST", "/api/admin/redemptions/:id", points.adminSetRedemption, { admin: true }],
  ["GET", "/api/admin/community/posts", community.adminListPosts, { admin: true }],
  ["PUT", "/api/admin/community/posts/:id", community.adminSetStatus, { admin: true }],
  ["DELETE", "/api/admin/community/posts/:id", community.adminDeletePost, { admin: true }],
];

const { verifyToken } = require("./auth");
const db = require("./store");

function matchPattern(pattern, pathname) {
  const pp = pattern.split("/"), xp = pathname.split("/");
  if (pp.length !== xp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(xp[i]);
    else if (pp[i] !== xp[i]) return null;
  }
  return params;
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", () => resolve(Buffer.alloc(0)));
  });
}
function sendJson(res, status, obj) { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
function serveStatic(pathname, res) {
  let rel = pathname === "/" ? "/index.html" : (pathname === "/admin" ? "/admin.html" : pathname);
  let file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) file = path.join(PUBLIC, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) { // SPA fallback
      fs.readFile(path.join(PUBLIC, "index.html"), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end("Not found"); }
        else { res.writeHead(200, { "Content-Type": "text/html" }); res.end(d2); }
      });
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) return serveStatic(pathname, res);

  // find route
  let found = null;
  for (const [method, pattern, handler, opts] of R) {
    if (method !== req.method) continue;
    const params = matchPattern(pattern, pathname);
    if (params) { found = { handler, opts: opts || {}, params }; break; }
  }
  if (!found) return sendJson(res, 404, { error: "Not found" });

  const rawBody = await readBody(req);
  let body = {};
  if (!found.opts.raw) { try { body = rawBody.length ? JSON.parse(rawBody.toString()) : {}; } catch (_) { body = {}; } }

  // auth
  let user = null;
  if (found.opts.auth || found.opts.admin) {
    const dec = verifyToken((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
    if (!dec) return sendJson(res, 401, { error: "Login zaroori hai" });
    user = db.users.get(dec.id);
    if (!user) return sendJson(res, 401, { error: "User nahi mila" });
    if (found.opts.admin && !user.is_admin) return sendJson(res, 403, { error: "Sirf admin ke liye" });
  }

  const query = Object.fromEntries(url.searchParams);
  const ctx = { req, res, params: found.params, query, body, rawBody, headers: req.headers, user };
  try {
    const out = await found.handler(ctx);
    if (out && out.__sent) return;        // webhook ne khud response bhej diya
    sendJson(res, 200, out || { ok: true });
  } catch (e) {
    if (e && e.status) return sendJson(res, e.status, { error: e.message, ...(e.extra || {}) });
    console.error(e);
    sendJson(res, 500, { error: "Server error" });
  }
});

function boot() {
  server.listen(PORT, () => {
    console.log(`\n  🌿 NaturalHeal AI:  http://localhost:${PORT}`);
    console.log(`  Admin panel:        http://localhost:${PORT}/admin`);
    console.log(`  AI mode: ${process.env.ANTHROPIC_API_KEY ? "Claude API (live)" : "Offline fallback (no API key)"}`);
    console.log(`  Data: ${db.remoteOn ? "Upstash permanent ✓" : db.onDisk ? ("Permanent disk ✓ (" + db.dbPath + ")") : "local file (free host par reset ho sakta hai)"}`);
    console.log(`  Payments: Razorpay ${process.env.RAZORPAY_KEY_ID ? "on" : "off"} · Stripe ${process.env.STRIPE_SECRET_KEY ? "on" : "off"}\n`);
  });
}
// Pehle Upstash se data restore karo (agar set hai), phir server chalu karo
(db.init ? db.init() : Promise.resolve()).then(boot).catch((e) => { console.error("store init:", e.message); boot(); });
