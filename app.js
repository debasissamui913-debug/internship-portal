const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const db = require("./db");

const MODES = ["Remote", "Hybrid", "On-site"];

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  res.status(status).json({ success: false, error });
}

const toInternship = row => ({ ...row, skills: JSON.parse(row.skills) });
const isText = (v, min, max) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

// ---------- Validation ----------
function validateInternship(b) {
  const e = [];
  if (!isText(b.title, 3, 100)) e.push("title must be text between 3 and 100 characters");
  if (!isText(b.domain, 2, 60)) e.push("domain must be text between 2 and 60 characters");
  if (!MODES.includes(b.mode)) e.push("mode must be one of: " + MODES.join(", "));
  if (!isText(b.location, 2, 60)) e.push("location must be text between 2 and 60 characters");
  if (!Array.isArray(b.skills) || b.skills.length === 0 || !b.skills.every(s => isText(s, 1, 40))) {
    e.push("skills must be a non-empty array of text values");
  }
  if (!Number.isInteger(b.openings) || b.openings < 0) e.push("openings must be a whole number, 0 or more");
  return e;
}

function validateApplication(b) {
  const e = [];
  if (typeof b.internshipId !== "string" || !/^INT-\d+$/.test(b.internshipId)) e.push("internshipId is missing or invalid");
  if (!isText(b.fullName, 2, 80)) e.push("fullName must be between 2 and 80 characters");
  if (!isText(b.email, 5, 120) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email.trim())) e.push("email must be a valid email address");
  if (b.phone !== undefined && b.phone !== "" && !(typeof b.phone === "string" && /^\+?[0-9 ]{10,15}$/.test(b.phone.trim()))) {
    e.push("phone must have 10 to 15 digits (optional)");
  }
  if (!isText(b.coverNote, 20, 1000)) e.push("coverNote must be between 20 and 1000 characters");
  return e;
}

function nextId() {
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) AS maxNum FROM internships").get();
  return "INT-" + ((row.maxNum || 100) + 1);
}


function createApp(options = {}) {
  const app = express();

  const limiter = (limit, windowMs) => rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => sendError(res, 429, "RATE_LIMITED", "Too many requests. Please try again later.")
  });

  app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { "upgrade-insecure-requests": null } } }));
  app.use(express.json({ limit: "10kb" }));   
  app.use("/api", limiter(options.apiLimit ?? 200, 15 * 60 * 1000));
  const applyLimiter = limiter(options.applyLimit ?? 5, 15 * 60 * 1000);

  app.use(express.static(path.join(__dirname, "public")));

  
  app.get("/api/internships", (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      return sendError(res, 400, "INVALID_QUERY", "page must be 1 or more and limit must be between 1 and 50");
    }
    if (req.query.mode && !MODES.includes(req.query.mode)) {
      return sendError(res, 400, "INVALID_QUERY", "mode must be one of: " + MODES.join(", "));
    }
    const where = [], params = [];
    if (typeof req.query.domain === "string" && req.query.domain) { where.push("domain = ?"); params.push(req.query.domain); }
    if (req.query.mode) { where.push("mode = ?"); params.push(req.query.mode); }
    if (typeof req.query.q === "string" && req.query.q) { where.push("title LIKE ?"); params.push("%" + req.query.q + "%"); }
    const clause = where.length ? "WHERE " + where.join(" AND ") : "";

    const total = db.prepare(`SELECT COUNT(*) AS c FROM internships ${clause}`).get(...params).c;
    const rows = db.prepare(`SELECT * FROM internships ${clause} ORDER BY id LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
    res.json({ success: true, data: rows.map(toInternship), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  app.get("/api/internships/:id", (req, res) => {
    const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(req.params.id);
    if (!row) return sendError(res, 404, "NOT_FOUND", "Internship " + req.params.id + " was not found");
    res.json({ success: true, data: toInternship(row) });
  });

  const clean = b => [b.title.trim(), b.domain.trim(), b.mode, b.location.trim(), JSON.stringify(b.skills.map(s => s.trim())), b.openings];

  app.post("/api/internships", (req, res) => {
    const errors = validateInternship(req.body);
    if (errors.length) return sendError(res, 400, "VALIDATION_ERROR", "Invalid internship data", errors);
    const id = nextId();
    db.prepare("INSERT INTO internships (id, title, domain, mode, location, skills, openings) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, ...clean(req.body));
    res.status(201).json({ success: true, data: toInternship(db.prepare("SELECT * FROM internships WHERE id = ?").get(id)) });
  });

  app.put("/api/internships/:id", (req, res) => {
    if (!db.prepare("SELECT id FROM internships WHERE id = ?").get(req.params.id)) {
      return sendError(res, 404, "NOT_FOUND", "Internship " + req.params.id + " was not found");
    }
    const errors = validateInternship(req.body);
    if (errors.length) return sendError(res, 400, "VALIDATION_ERROR", "Invalid internship data", errors);
    db.prepare("UPDATE internships SET title=?, domain=?, mode=?, location=?, skills=?, openings=?, updated_at=datetime('now') WHERE id=?").run(...clean(req.body), req.params.id);
    res.json({ success: true, data: toInternship(db.prepare("SELECT * FROM internships WHERE id = ?").get(req.params.id)) });
  });

  app.delete("/api/internships/:id", (req, res) => {
    const r = db.prepare("DELETE FROM internships WHERE id = ?").run(req.params.id);
    if (r.changes === 0) return sendError(res, 404, "NOT_FOUND", "Internship " + req.params.id + " was not found");
    res.json({ success: true, data: { message: "Internship " + req.params.id + " deleted" } });
  });

  
  app.post("/api/applications", applyLimiter, (req, res) => {
    const errors = validateApplication(req.body);
    if (errors.length) return sendError(res, 400, "VALIDATION_ERROR", "Invalid application data", errors);

    const internship = db.prepare("SELECT id, title FROM internships WHERE id = ?").get(req.body.internshipId);
    if (!internship) return sendError(res, 404, "NOT_FOUND", "Internship " + req.body.internshipId + " was not found");

    const email = req.body.email.trim().toLowerCase();
    if (db.prepare("SELECT id FROM applications WHERE internship_id = ? AND email = ?").get(internship.id, email)) {
      return sendError(res, 409, "DUPLICATE_APPLICATION", "You have already applied for this internship");
    }
    const result = db.prepare("INSERT INTO applications (internship_id, full_name, email, phone, cover_note) VALUES (?, ?, ?, ?, ?)")
      .run(internship.id, req.body.fullName.trim(), email, (req.body.phone || "").trim() || null, req.body.coverNote.trim());

    res.status(201).json({ success: true, data: { id: Number(result.lastInsertRowid), internshipId: internship.id, internshipTitle: internship.title, status: "received" } });
  });

  app.use((req, res) => sendError(res, 404, "NOT_FOUND", "Route " + req.method + " " + req.path + " does not exist"));
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return sendError(res, 400, "INVALID_JSON", "Request body is not valid JSON");
    if (err.type === "entity.too.large") return sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    console.error(err);
    sendError(res, 500, "SERVER_ERROR", "Something went wrong on the server");
  });

  return app;
}

module.exports = { createApp };
