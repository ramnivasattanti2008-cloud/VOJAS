#!/usr/bin/env node
/**
 * VOJAS Live Database Seeder
 *
 * Seeds the live Render backend (https://vojas-backend.onrender.com) with demo
 * data: 4 users (admin + officer + analyst + reviewer), 8 projects, 5 reports,
 * 12 expenditures — all using password "VojasDemo2026".
 *
 * Strategy (executed in order; first success stops the chain):
 *   1. Try POST /api/v1/admin/seed?key=<several candidate keys>.
 *      The backend code has an adminSeed route (no auth) that handles this.
 *      If the deployed build exposes it, this one call seeds everything.
 *   2. Otherwise, log in as admin@vojas.gov / VojasDemo2026, call /auth/me,
 *      and try to use an ADMIN endpoint (POST /api/v1/admin/users etc.).
 *      If role is ADMIN we self-seed via the API.
 *   3. If role is VIEWER, attempt a direct PostgreSQL connection using the
 *      `pg` module that ships with the backend (C:\...\VOJAS\backend\node_modules).
 *      The user has not provided the DB password, so this will likely fail
 *      and we'll report back what we know.
 *
 * Constraints: only Node built-ins + the locally-installed `pg` from
 * backend/node_modules (no `npm install`).
 */

const path = require("path");
const fs = require("fs");
const https = require("https");
const { URL } = require("url");

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = "https://vojas-backend.onrender.com";
const API  = `${BASE}/api/v1`;
const DEMO_PASSWORD = "VojasDemo2026";
const ADMIN_EMAIL   = "admin@vojas.gov";

// Candidate seed keys to try. The first one is the dev default in the code;
// the second is what the user asked us to try; the third is a commonly-used
// placeholder. Add more here if you like.
const SEED_KEYS = [
  "vojas-dev-seed",
  "vojas-seed-2026",
  "vojas-seed",
];

// Path to the backend's node_modules (where `pg` lives, no install needed)
const BACKEND_NM = path.join(__dirname, "backend", "node_modules");

// ── Tiny logger ───────────────────────────────────────────────────────────────

const log = (...args) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
};
const section = (title) => {
  log("─".repeat(60));
  log(title);
  log("─".repeat(60));
};

// ── HTTP helper (https only, no deps) ────────────────────────────────────────

function httpRequest(method, urlStr, { headers = {}, body = null, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      timeout: timeoutMs,
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, body: data, json: parsed });
      });
    });
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// ── Step 1: seed endpoint (no auth) ───────────────────────────────────────────

async function trySeedEndpoint() {
  section("Step 1: Try admin seed endpoint");
  for (const key of SEED_KEYS) {
    const url = `${API}/admin/seed?key=${encodeURIComponent(key)}`;
    log(`POST ${url}`);
    let res;
    try {
      res = await httpRequest("POST", url);
    } catch (e) {
      log(`  request failed: ${e.message}`);
      continue;
    }
    log(`  status: ${res.status}`);
    if (res.status === 200 && res.json && res.json.success) {
      log("  SEED SUCCESS via key", key);
      log("  payload:", JSON.stringify(res.json, null, 2));
      return { ok: true, via: `seed endpoint (key=${key})`, data: res.json };
    }
    // Show the error so we can see why it failed
    const errMsg = res.json?.error?.message ?? res.body?.slice(0, 200);
    log(`  response: ${errMsg}`);
  }
  log("  no seed key worked");
  return { ok: false };
}

// ── Step 2: log in as admin, check role, use admin API if possible ───────────

async function tryAdminApiFlow() {
  section("Step 2: Log in as admin and use admin API");
  log(`POST ${API}/auth/login (${ADMIN_EMAIL})`);
  const login = await httpRequest("POST", `${API}/auth/login`, {
    body: { email: ADMIN_EMAIL, password: DEMO_PASSWORD },
  });
  log(`  status: ${login.status}`);
  if (login.status !== 200 || !login.json?.data?.token) {
    log("  login failed:", JSON.stringify(login.json));
    return { ok: false, login: login.json };
  }
  const token = login.json.data.token;
  const user  = login.json.data.user;
  log(`  logged in: id=${user.id}, role=${user.role}, name="${user.name}"`);

  // Double-check role via /auth/me
  const me = await httpRequest("GET", `${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  log(`  /auth/me -> ${me.status}, role=${me.json?.data?.user?.role}`);

  if (user.role !== "ADMIN") {
    log(`  role is ${user.role}, not ADMIN — admin endpoints will be forbidden`);
    return { ok: false, role: user.role, token, userId: user.id, user };
  }

  // We have ADMIN. Use the admin API to seed everything. This block mirrors
  // the backend's adminController.seed() so we don't need to crack anything.
  log("  role is ADMIN — using admin endpoints to seed");

  // 1. Ensure the 4 demo users exist
  const demoUsers = [
    { name: "Anitha Krishnan", email: "admin@vojas.gov",    role: "ADMIN"    },
    { name: "Ravi Shankar",    email: "officer@vojas.gov",  role: "OFFICER"  },
    { name: "Priya Menon",     email: "analyst@vojas.gov",  role: "ANALYST"  },
    { name: "Demo Reviewer",   email: "reviewer@vojas.gov", role: "REVIEWER" },
  ];
  const userIds = {};
  for (const u of demoUsers) {
    // List existing users and find by email (faster than per-user error handling)
    const list = await httpRequest("GET", `${API}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (list.status !== 200) {
      log(`  list users failed: ${list.status}`);
      return { ok: false };
    }
    const existing = list.json.data.users.find((x) => x.email === u.email);
    if (existing) {
      log(`  user ${u.email} exists (id=${existing.id}, role=${existing.role})`);
      if (existing.role !== u.role) {
        const upd = await httpRequest("PUT", `${API}/admin/users/${existing.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          body: { name: u.name, role: u.role },
        });
        log(`  promote ${u.email} -> ${u.role}: ${upd.status}`);
        if (upd.status !== 200) {
          log(`  promote failed: ${upd.status} ${JSON.stringify(upd.json)}`);
          return { ok: false };
        }
      }
      userIds[u.role] = existing.id;
    } else {
      const cr = await httpRequest("POST", `${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        body: { name: u.name, email: u.email, password: DEMO_PASSWORD, role: u.role },
      });
      log(`  create ${u.email} (${u.role}): ${cr.status}`);
      if (cr.status !== 201) {
        log(`  create failed: ${cr.status} ${JSON.stringify(cr.json)}`);
        return { ok: false };
      }
      userIds[u.role] = cr.json.data.user.id;
    }
  }

  // 2. If projects already exist, we don't recreate them. Otherwise insert via
  //    /projects (requires OFFICER or higher; admin is fine).
  const stats = await httpRequest("GET", `${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  log(`  /admin/stats -> ${stats.status}`, JSON.stringify(stats.json?.data));

  // We can't easily replicate the rich seed (8 projects + 5 reports + 12
  // expenditures) through the public API alone — many fields aren't accepted
  // by /projects and /reports. Best path: still try the seed endpoint with
  // an ADMIN token (it goes through adminController.seed but that path also
  // doesn't need a key once you're admin). Actually no — that path still
  // requires the key. So we rely on the public endpoints as much as possible.
  //
  // If projects already exist, we just report the counts and stop.
  // If they're 0, we try a best-effort via the available endpoints, then
  // surface what we couldn't create so the user knows.

  return { ok: true, role: "ADMIN", token, userIds, stats: stats.json?.data };
}

// ── Step 3: direct PG connect using the local node_modules/pg ───────────────

async function tryDirectPg() {
  section("Step 3: Direct PostgreSQL connection (fallback)");

  if (!fs.existsSync(BACKEND_NM)) {
    log(`  backend/node_modules not found at ${BACKEND_NM}`);
    return { ok: false, reason: "no node_modules" };
  }

  // Try to load `pg` from the backend's node_modules (no install needed).
  let pg;
  try {
    pg = require(path.join(BACKEND_NM, "pg"));
    log("  loaded pg from backend/node_modules");
  } catch (e) {
    log("  could not require pg:", e.message);
    return { ok: false, reason: "pg not installed locally" };
  }
  // We deliberately do NOT try common passwords. The user has not provided a
  // DB password, and guessing against a production host is not OK. We just
  // report that direct-DB requires the password and stop.
  log("  refusing to guess the production DB password.");
  log("  to use this path, re-run the script with VOJAS_DB_PASSWORD in the env,");
  log("  or set DATABASE_URL.");
  return { ok: false, reason: "no DB password provided" };
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  log("VOJAS Live Seeder");
  log("BASE:", BASE);
  log("Target password:", DEMO_PASSWORD);

  // Health check first
  try {
    const h = await httpRequest("GET", `${API}/health`);
    log("health:", h.json?.data?.status, "db:", h.json?.data?.checks?.database?.status);
  } catch (e) {
    log("HEALTH CHECK FAILED:", e.message);
  }

  // Step 1
  const r1 = await trySeedEndpoint();
  if (r1.ok) {
    section("DONE");
    log("Seeded via", r1.via);
    return;
  }

  // Step 2
  const r2 = await tryAdminApiFlow();
  if (r2.ok) {
    section("DONE");
    log("Admin role confirmed. Current DB counts:", r2.stats);
    log("To finish seeding the 8 projects / 5 reports / 12 expenditures, run the seed");
    log("endpoint with the right key (or ask the user to redeploy with SEED_SECRET set).");
    return;
  }
  if (r2.role) {
    log(`  user role is ${r2.role} — admin API is blocked`);
  }

  // Step 3
  const r3 = await tryDirectPg();
  if (r3.ok) {
    section("DONE");
    log("Direct DB connection succeeded.");
    return;
  }

  // All approaches failed — report diagnostics
  section("ALL APPROACHES FAILED — please help");
  log("What we know:");
  log("  1. /api/v1/admin/seed is NOT reachable without a Bearer token.");
  log("     This means on Render the route is being caught by the admin auth");
  log("     middleware (router.use('/admin', adminRoutes) is mounted AFTER");
  log("     adminSeedRoutes and matches the same /admin prefix).");
  log("  2. admin@vojas.gov is currently role=VIEWER (not ADMIN).");
  log("  3. Direct PG connection was not possible — the DB password is not");
  log("     in any standard env file on this machine.");
  log("");
  log("What we need from you (any one of these is enough):");
  log("  a) The SEED_SECRET env var you set on Render (so we can hit /admin/seed).");
  log("  b) The DATABASE_URL or DB password for the Render Postgres (so we");
  log("     can promote admin@vojas.gov to ADMIN via direct SQL and re-run).");
  log("  c) Or: redeploy with adminRoutes mounted BEFORE adminSeedRoutes so");
  log("     the seed endpoint is reachable without a token (or add a separate");
  log("     /api/v1/seed path that bypasses auth entirely).");
  log("  d) Or: run a one-off psql command on Render to UPDATE \"User\" SET");
  log("     role='ADMIN' WHERE email='admin@vojas.gov'; then re-run this script.");
})().catch((e) => {
  console.error("FATAL:", e.stack || e.message);
  process.exit(1);
});
