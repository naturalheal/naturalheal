// ---------------------------------------------------------------------------
// Community Healing Circles — log apni natural healing kahani share karein.
// Auto-moderation: gaali / spam / khatarnaak daave wali post chhup jaati hai
// (status "hidden") aur admin review ke liye jaati hai. Report button bhi hai.
// ---------------------------------------------------------------------------
const db = require("./store");
const { HttpError, uid } = require("./util");
const points = require("./points");

const now = () => new Date().toISOString();

// Auto-ban shabd (gaali, spam, nafrat, khatarnaak daave). Chhoti par kaam ki list.
const BANNED = [
  // abuse / hate (roman hindi + english)
  "madarchod", "behenchod", "bhosdi", "chutiya", "chutiye", "gaand", "gandu", "randi", "lund", "loda", "harami",
  "fuck", "bitch", "bastard", "asshole", "motherfuck", "nigger", "slut",
  // spam / scam
  "buy now", "click here", "whatsapp me", "earn money", "lottery", "casino", "viagra", "porn", "xxx", "crypto profit",
  // khatarnaak jhoothe daave (false cure claims)
  "100% cure", "cancer cure", "guaranteed cure", "miracle cure", "cure diabetes forever", "stop your medicine", "band kar do dawai", "dawai chhod do",
];

function moderate(title, body) {
  const t = (title + " " + body).toLowerCase();
  const hit = BANNED.find((w) => t.includes(w));
  if (hit) return { status: "hidden", flag: hit };
  // bahut chhoti ya link-bhari post -> review
  const links = (t.match(/https?:\/\//g) || []).length;
  if (links >= 2) return { status: "hidden", flag: "links" };
  return { status: "approved", flag: null };
}

const REPORT_LIMIT = 3; // itni report par post chhup jaati hai

function pub(p, lang) {
  return {
    id: p.id, author: p.author_name || (lang === "en" ? "Someone" : "Koi"),
    tag: p.tag || "", title: p.title, body: p.body, likes: p.likes || 0,
    created_at: p.created_at, mine: false,
  };
}

// ---- User: list (sirf approved) ----
function listPosts(ctx) {
  const lang = (ctx.query && ctx.query.language) === "en" ? "en" : "hi";
  const tag = ctx.query && ctx.query.tag;
  let rows = db.posts.filter((p) => p.status === "approved");
  if (tag) rows = rows.filter((p) => p.tag === tag);
  rows = rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 80);
  const out = rows.map((p) => { const o = pub(p, lang); o.mine = p.user_id === ctx.user.id; return o; });
  return { posts: out };
}

// ---- User: create ----
function createPost(ctx) {
  const b = ctx.body || {};
  const lang = b.language === "en" ? "en" : "hi";
  const title = String(b.title || "").trim().slice(0, 120);
  const body = String(b.body || "").trim().slice(0, 2000);
  const tag = String(b.tag || "").trim().slice(0, 40);
  if (!title || !body) throw new HttpError(400, lang === "en" ? "Title and story are required" : "Title aur kahani dono bharein");
  const mod = moderate(title, body);
  const anon = b.anon ? true : false;
  const post = {
    id: uid(), user_id: ctx.user.id,
    author_name: anon ? (lang === "en" ? "Anonymous" : "Anonymous") : ctx.user.name,
    tag, title, body, status: mod.status, flag: mod.flag, likes: 0, liked_by: [], report_count: 0, reported_by: [],
    created_at: now(),
  };
  db.posts.insert(post);
  if (mod.status === "approved") {
    const pts = points.award(ctx.user.id, "post", { ref: post.id, note: "community story" }).awarded;
    return { ok: true, status: "approved", id: post.id, points_awarded: pts };
  }
  // chhup gayi -> user ko batayein ki review me hai
  return { ok: true, status: "pending", msg: lang === "en" ? "Your post is under review and will show once approved." : "Aapki post review me hai, approve hone par dikhegi." };
}

// ---- User: like ----
function likePost(ctx) {
  const p = db.posts.get(ctx.params.id);
  if (!p || p.status !== "approved") throw new HttpError(404, "Post nahi mili");
  p.liked_by = p.liked_by || [];
  let added = false;
  if (p.liked_by.includes(ctx.user.id)) { p.liked_by = p.liked_by.filter((x) => x !== ctx.user.id); }
  else { p.liked_by.push(ctx.user.id); added = true; }
  db.posts.update(p.id, { liked_by: p.liked_by, likes: p.liked_by.length });
  let pts = 0;
  if (added && p.user_id !== ctx.user.id) pts = points.award(ctx.user.id, "like", { note: "liked a story" }).awarded; // roz cap; apni post par nahi
  return { ok: true, likes: p.liked_by.length, points_awarded: pts };
}

// ---- User: report (galat/negative post) ----
function reportPost(ctx) {
  const p = db.posts.get(ctx.params.id);
  if (!p) throw new HttpError(404, "Post nahi mili");
  p.reported_by = p.reported_by || [];
  if (!p.reported_by.includes(ctx.user.id)) p.reported_by.push(ctx.user.id);
  const count = p.reported_by.length;
  const patch = { reported_by: p.reported_by, report_count: count };
  if (count >= REPORT_LIMIT && p.status === "approved") patch.status = "hidden", patch.flag = "reported";
  db.posts.update(p.id, patch);
  return { ok: true };
}

// ---- User: delete apni post ----
function deleteMyPost(ctx) {
  const p = db.posts.get(ctx.params.id);
  if (!p || p.user_id !== ctx.user.id) throw new HttpError(404, "Post nahi mili");
  db.posts.remove((x) => x.id === p.id);
  return { ok: true };
}

// ================= ADMIN moderation =================
function adminListPosts(ctx) {
  const status = ctx.query && ctx.query.status; // approved|hidden|all
  let rows = db.posts.all();
  if (status && status !== "all") rows = rows.filter((p) => p.status === status);
  rows = rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 200);
  const out = rows.map((p) => {
    const u = db.users.get(p.user_id) || {};
    return { id: p.id, author: p.author_name, user_name: u.name, user_email: u.email, tag: p.tag, title: p.title, body: p.body, status: p.status, flag: p.flag || "", likes: p.likes || 0, report_count: p.report_count || 0, created_at: p.created_at };
  });
  const counts = { approved: db.posts.count((p) => p.status === "approved"), hidden: db.posts.count((p) => p.status === "hidden"), total: db.posts.count() };
  return { posts: out, counts };
}
function adminSetStatus(ctx) {
  const p = db.posts.get(ctx.params.id);
  if (!p) throw new HttpError(404, "Post nahi mili");
  const s = (ctx.body && ctx.body.status) === "approved" ? "approved" : "hidden";
  db.posts.update(p.id, { status: s });
  // approve karte waqt author ko points (ek hi baar — ref=post.id)
  if (s === "approved") points.award(p.user_id, "post", { ref: p.id, note: "community story" });
  return { ok: true, status: s };
}
function adminDeletePost(ctx) {
  const p = db.posts.get(ctx.params.id);
  if (!p) throw new HttpError(404, "Post nahi mili");
  db.posts.remove((x) => x.id === p.id);
  return { ok: true };
}

module.exports = {
  listPosts, createPost, likePost, reportPost, deleteMyPost,
  adminListPosts, adminSetStatus, adminDeletePost,
};
