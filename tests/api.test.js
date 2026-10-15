process.env.DB_PATH = ":memory:";           // tests use a temporary database
const { test, before, after } = require("node:test");
const assert = require("node:assert");

const db = require("../db");
const { seed } = require("../seed");
const { createApp } = require("../app");

let server, base;
before(() => { seed(db); server = createApp().listen(0); base = "http://127.0.0.1:" + server.address().port; });
after(() => server.close());

async function call(method, url, body, root = base) {
  const res = await fetch(root + url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)) });
  return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
}

const validInternship = { title: "Backend Intern", domain: "Full Stack Development", mode: "Remote", location: "Kolkata", skills: ["Node.js"], openings: 2 };
const validApplication = { internshipId: "INT-101", fullName: "Debasis Samui", email: "debasis@example.com", phone: "9876543210", coverNote: "I enjoy building web projects and want to learn more." };

test("GET /api/internships returns seeded records with pagination meta", async () => {
  const r = await call("GET", "/api/internships?limit=2");
  assert.equal(r.status, 200);
  assert.equal(r.json.data.length, 2);
  assert.deepEqual(r.json.meta, { page: 1, limit: 2, total: 5, totalPages: 3 });
});

test("GET /api/internships filters by mode and search text", async () => {
  const r = await call("GET", "/api/internships?mode=Remote&q=Frontend");
  assert.equal(r.json.data.length, 1);
  assert.equal(r.json.data[0].id, "INT-101");
});

test("GET /api/internships rejects a bad page or limit", async () => {
  assert.equal((await call("GET", "/api/internships?page=0")).status, 400);
  assert.equal((await call("GET", "/api/internships?limit=500")).status, 400);
});

test("SQL injection text in the search is treated as plain text", async () => {
  const r = await call("GET", "/api/internships?q=" + encodeURIComponent("' OR 1=1; DROP TABLE internships; --"));
  assert.equal(r.status, 200);
  assert.equal(r.json.data.length, 0);
  assert.equal((await call("GET", "/api/internships")).json.meta.total, 5);   // table still there
});

test("GET /api/internships/:id returns one record or 404", async () => {
  assert.equal((await call("GET", "/api/internships/INT-102")).json.data.title, "API Engineering Intern");
  assert.equal((await call("GET", "/api/internships/INT-999")).status, 404);
});

test("POST /api/internships creates a record (201) and rejects bad data (400)", async () => {
  const ok = await call("POST", "/api/internships", validInternship);
  assert.equal(ok.status, 201);
  assert.equal(ok.json.data.id, "INT-106");
  const bad = await call("POST", "/api/internships", { title: "a", mode: "x", skills: [], openings: -1 });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error.code, "VALIDATION_ERROR");
  assert.ok(bad.json.error.details.length >= 4);
});

test("PUT and DELETE work and return 404 for unknown ids", async () => {
  const put = await call("PUT", "/api/internships/INT-106", { ...validInternship, title: "Backend Intern II" });
  assert.equal(put.json.data.title, "Backend Intern II");
  assert.equal((await call("PUT", "/api/internships/INT-999", validInternship)).status, 404);
  assert.equal((await call("DELETE", "/api/internships/INT-106")).status, 200);
  assert.equal((await call("DELETE", "/api/internships/INT-106")).status, 404);
});

test("Broken JSON returns 400 INVALID_JSON", async () => {
  const r = await call("POST", "/api/internships", "{bad");
  assert.equal(r.status, 400);
  assert.equal(r.json.error.code, "INVALID_JSON");
});

test("POST /api/applications accepts a valid application (201)", async () => {
  const r = await call("POST", "/api/applications", validApplication);
  assert.equal(r.status, 201);
  assert.equal(r.json.data.status, "received");
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM applications").get().c, 1);
});

test("POST /api/applications validates on the server (400 with details)", async () => {
  const r = await call("POST", "/api/applications", { internshipId: "INT-101", fullName: "A", email: "not-an-email", phone: "12", coverNote: "short" });
  assert.equal(r.status, 400);
  assert.equal(r.json.error.details.length, 4);
});

test("POST /api/applications returns 404 for an unknown internship", async () => {
  assert.equal((await call("POST", "/api/applications", { ...validApplication, internshipId: "INT-999" })).status, 404);
});

test("POST /api/applications blocks a duplicate application (409)", async () => {
  const r = await call("POST", "/api/applications", validApplication);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "DUPLICATE_APPLICATION");
});

test("Security headers are set and x-powered-by is hidden", async () => {
  const r = await call("GET", "/api/internships");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.ok(r.headers.get("content-security-policy"));
  assert.equal(r.headers.get("x-powered-by"), null);
});

test("Rate limit returns 429 after too many requests", async () => {
  const limited = createApp({ applyLimit: 2 }).listen(0);
  const root = "http://127.0.0.1:" + limited.address().port;
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await call("POST", "/api/applications", {}, root)).status);
  limited.close();
  assert.deepEqual(codes, [400, 400, 429]);
});

test("The frontend page is served at /", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /InternBoard/);
});
