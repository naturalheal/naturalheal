// ---------------------------------------------------------------------------
// Billing — Razorpay + Stripe (hosted checkout). Koi SDK nahi; fetch + crypto.
// Handlers ko (ctx) milta hai; webhook handlers raw body + response khud bhejte hain.
// ---------------------------------------------------------------------------
const crypto = require("crypto");
const db = require("./store");
const { HttpError, uid } = require("./util");
const { getSettings } = require("./settings");

const RZP_KEY = process.env.RAZORPAY_KEY_ID || "";
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RZP_PLAN = process.env.RAZORPAY_PLAN_ID || "";
const RZP_WEBHOOK = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRICE = process.env.STRIPE_PRICE_ID || "";
const STRIPE_WEBHOOK = process.env.STRIPE_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function grantPremium(userId, { provider, sub_id, customer_id, days = 31 } = {}) {
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  const patch = { plan: "premium", plan_status: "active", plan_expires: expires };
  if (provider) patch.provider = provider;
  if (sub_id) patch.provider_sub_id = sub_id;
  if (customer_id) patch.provider_customer_id = customer_id;
  db.users.update(userId, patch);
}
function revokePremium(userId, status = "cancelled") {
  db.users.update(userId, { plan: "free", plan_status: status });
}
function logPayment(userId, p) {
  db.payments.insert({ id: uid(), user_id: userId, provider: p.provider, amount: p.amount ?? null, currency: p.currency || null, status: p.status || "paid", ref_id: p.ref_id || null, created_at: new Date().toISOString() });
}
const userBySub = (subId) => db.users.findBy("provider_sub_id", subId);

// ---- Pricing info ----
function pricing() {
  const s = getSettings();
  return { inr: s.price_inr, usd: s.price_usd, app_name: s.app_name, blurb_hi: s.premium_blurb_hi, blurb_en: s.premium_blurb_en, app_url: s.app_url || "", share_tagline_hi: s.share_tagline_hi || "", share_tagline_en: s.share_tagline_en || "", invite_video: s.invite_video || "", providers: { razorpay: !!(RZP_KEY && RZP_SECRET), stripe: !!STRIPE_KEY } };
}

// ---- Stripe checkout ----
async function stripeCheckout(ctx) {
  if (!STRIPE_KEY || !STRIPE_PRICE) throw new HttpError(400, "Stripe abhi configure nahi hai");
  const user = ctx.user;
  const body = new URLSearchParams();
  body.append("mode", "subscription");
  body.append("line_items[0][price]", STRIPE_PRICE);
  body.append("line_items[0][quantity]", "1");
  body.append("success_url", `${APP_URL}/?paid=1`);
  body.append("cancel_url", `${APP_URL}/?cancel=1`);
  body.append("client_reference_id", user.id);
  body.append("customer_email", user.email);
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await r.json();
  if (!r.ok) { console.error("stripe:", data.error && data.error.message); throw new HttpError(500, "Stripe checkout nahi ban paaya"); }
  return { url: data.url };
}

// ---- Razorpay subscribe ----
async function razorpaySubscribe(ctx) {
  if (!RZP_KEY || !RZP_SECRET || !RZP_PLAN) throw new HttpError(400, "Razorpay abhi configure nahi hai");
  const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${RZP_KEY}:${RZP_SECRET}`).toString("base64"), "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: RZP_PLAN, total_count: 12, customer_notify: 1, notes: { user_id: ctx.user.id } }),
  });
  const data = await r.json();
  if (!r.ok) { console.error("razorpay:", data.error && data.error.description); throw new HttpError(500, "Razorpay subscription nahi ban paayi"); }
  db.users.update(ctx.user.id, { provider: "razorpay", provider_sub_id: data.id });
  return { url: data.short_url, subscription_id: data.id };
}

// ---- Webhooks (raw body; khud response bhejte hain) ----
function stripeWebhook(ctx) {
  let event;
  try {
    event = STRIPE_WEBHOOK ? verifyStripe(ctx.rawBody, ctx.headers["stripe-signature"], STRIPE_WEBHOOK) : JSON.parse(ctx.rawBody.toString());
  } catch (e) { console.error("stripe webhook sig:", e.message); ctx.res.writeHead(400); ctx.res.end("bad signature"); return { __sent: true }; }
  try {
    const o = event.data.object;
    if (event.type === "checkout.session.completed" && o.client_reference_id) {
      grantPremium(o.client_reference_id, { provider: "stripe", sub_id: o.subscription, customer_id: o.customer });
      logPayment(o.client_reference_id, { provider: "stripe", amount: (o.amount_total || 0) / 100, currency: (o.currency || "").toUpperCase(), status: "paid", ref_id: o.id });
    } else if (event.type === "invoice.paid") {
      const u = o.subscription && userBySub(o.subscription);
      if (u) { grantPremium(u.id, { provider: "stripe" }); logPayment(u.id, { provider: "stripe", amount: (o.amount_paid || 0) / 100, currency: (o.currency || "").toUpperCase(), status: "paid", ref_id: o.id }); }
    } else if (event.type === "customer.subscription.deleted") {
      const u = userBySub(o.id); if (u) revokePremium(u.id);
    }
  } catch (e) { console.error("stripe webhook:", e.message); }
  return { received: true };
}
function verifyStripe(rawBuf, sigHeader, secret) {
  const parts = Object.fromEntries(String(sigHeader).split(",").map((p) => p.split("=")));
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${rawBuf.toString()}`).digest("hex");
  if (!parts.v1 || parts.v1.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) throw new Error("sig mismatch");
  return JSON.parse(rawBuf.toString());
}
function razorpayWebhook(ctx) {
  try {
    if (RZP_WEBHOOK) {
      const expected = crypto.createHmac("sha256", RZP_WEBHOOK).update(ctx.rawBody).digest("hex");
      const got = ctx.headers["x-razorpay-signature"] || "";
      if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) { ctx.res.writeHead(400); ctx.res.end("bad signature"); return { __sent: true }; }
    }
    const event = JSON.parse(ctx.rawBody.toString());
    const sub = event.payload && event.payload.subscription && event.payload.subscription.entity;
    const pay = event.payload && event.payload.payment && event.payload.payment.entity;
    const subId = sub ? sub.id : (pay && pay.subscription_id);
    const u = subId && userBySub(subId);
    if (u) {
      if (["subscription.charged", "subscription.activated", "subscription.authenticated"].includes(event.event)) {
        grantPremium(u.id, { provider: "razorpay" });
        if (pay) logPayment(u.id, { provider: "razorpay", amount: (pay.amount || 0) / 100, currency: pay.currency, status: "paid", ref_id: pay.id });
      } else if (["subscription.cancelled", "subscription.halted", "subscription.completed"].includes(event.event)) {
        revokePremium(u.id);
      }
    }
  } catch (e) { console.error("razorpay webhook:", e.message); }
  return { received: true };
}

module.exports = { pricing, stripeCheckout, razorpaySubscribe, stripeWebhook, razorpayWebhook, grantPremium, revokePremium, logPayment };
