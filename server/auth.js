// ---------------------------------------------------------------------------
// Auth — password hashing (scrypt) + JWT (HS256). Sab Node ke crypto se, koi package nahi.
// ---------------------------------------------------------------------------
const crypto = require("crypto");
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return salt + ":" + h;
}
function checkPassword(pw, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, h] = stored.split(":");
  const hh = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return h.length === hh.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hh));
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function signToken(payload, days = 30) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + days * 86400 }));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(header + "." + body).digest());
  return `${header}.${body}.${sig}`;
}
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, sig] = parts;
  const expect = b64url(crypto.createHmac("sha256", SECRET).update(h + "." + b).digest());
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const body = JSON.parse(Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch (_) { return null; }
}

module.exports = { hashPassword, checkPassword, signToken, verifyToken };
