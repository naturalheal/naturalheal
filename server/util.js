// Chhote helpers — koi external package nahi
const crypto = require("crypto");

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra || {}; }
}
const uid = () => crypto.randomUUID();

module.exports = { HttpError, uid };
