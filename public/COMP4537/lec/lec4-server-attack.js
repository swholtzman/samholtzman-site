"use strict";

const http = require("http");
const crypto = require("crypto");

// --- Config you can tweak ---
const PORT = 8000;
const FUNNY_REDIRECT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // harmless rickroll
const RATE_LIMIT_WINDOW_MS = 60_000;        // 1 minute
const RATE_LIMIT_MAX = 30;                  // max requests per IP per window
const SECRET_TOKEN = "general-kenobi";         
// --------------------------------

/** Very tiny in-memory rate limiter */
const bucket = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || now > entry.resetAt) {
    bucket.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }
  entry.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  if (entry.count > RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0, resetMs: entry.resetAt - now };
  }
  return { ok: true, remaining, resetMs: entry.resetAt - now };
}

function setSecurityHeaders(res) {
  // General security headers (small site friendly)
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), fullscreen=(self)");
  // Only useful over HTTPS, but harmless elsewhere:
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // CORS – keep simple. For a static demo page, you can also remove this entirely.
  res.setHeader("Access-Control-Allow-Origin", "*");
}

function sendHTML(res, status, html, extraHeaders={}) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...extraHeaders });
  res.end(html);
}

function redirect(res, location, status = 302) {
  res.writeHead(status, { Location: location, "Content-Type": "text/plain; charset=utf-8" });
  res.end(`Redirecting to ${location}`);
}

function getClientIp(req) {
  const xfwd = req.headers["x-forwarded-for"];
  return (Array.isArray(xfwd) ? xfwd[0] : (xfwd || "")).split(",")[0].trim() ||
         req.socket.remoteAddress || "unknown";
}

const server = http.createServer((req, res) => {
  const ip = getClientIp(req);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  setSecurityHeaders(res);

  // Basic access log
  console.log(
    `[${new Date().toISOString()}] ${ip} ${req.method} ${path} UA="${req.headers["user-agent"] || "-"}"`
  );

  // Ignore noisy favicon requests cleanly
  if (path === "/favicon.ico") {
    res.writeHead(204); // No Content
    return res.end();
  }

  // Rate limit check
  const rl = checkRateLimit(ip);
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_MAX.toString());
  res.setHeader("X-RateLimit-Remaining", rl.remaining.toString());
  res.setHeader("X-RateLimit-Reset", Math.ceil((Date.now() + rl.resetMs) / 1000).toString());

  if (!rl.ok) {
    // Playful 429 with a tiny countdown
    return sendHTML(res, 429, `
      <!doctype html><meta charset="utf-8">
      <title>Too many vibes</title>
      <h1>🛑 Whoa there, speed racer!</h1>
      <p>You’ve sent a few too many requests. Take a ${Math.ceil(rl.resetMs/1000)}-second breather.</p>
      <p><small>Rate limits keep the gremlins at bay 🧌</small></p>
      <script>
        let s=${Math.ceil(rl.resetMs/1000)};
        const el=document.createElement('div'); document.body.appendChild(el);
        const t=setInterval(()=>{ el.textContent = "Retry in " + (s--) + "s…"; if(s<0) clearInterval(t); }, 1000);
        // harmless popup for fun
        setTimeout(()=> alert("Hydrate check 💧"), 1200);
      </script>
    `, { "Retry-After": Math.ceil(rl.resetMs/1000).toString() });
  }

  // Honey paths → cheeky redirect
  const honey = [/^\/admin\b/i, /^\/wp-admin\b/i, /^\/phpmyadmin\b/i, /^\/login\b/i];
  if (honey.some(rx => rx.test(path))) {
    return redirect(res, FUNNY_REDIRECT);
  }

  // “Sensitive” file probes → 418 I'm a teapot
  const probes = ["/.env", "/.git", "/package-lock.json", "/composer.lock", "/server.key"];
  if (probes.includes(path)) {
    return sendHTML(res, 418, `
      <!doctype html><meta charset="utf-8">
      <title>418 I'm a teapot</title>
      <pre>
      _...._
    .´  _  \`.
   |   (_)   |   I'm a teapot.
   |  _____  |   Not an /.env dispenser ☕
   |_(_____)_|   Move along, curious traveler.
      </pre>
    `);
  }

  // Tiny auth gate for /secret
  if (path === "/secret") {
    const token = url.searchParams.get("token");
    if (token !== SECRET_TOKEN) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="shh", charset="UTF-8"');
      return sendHTML(res, 401, `
        <!doctype html><meta charset="utf-8">
        <h1>🔐 Access Denied</h1>
        <p>Present the secret token as <code>?token=let-me-in</code>.</p>
        <p><small>Hint: It’s in <code>server.js</code> → <code>SECRET_TOKEN</code> (change it!).</small></p>
      `);
    }
    return sendHTML(res, 200, `
      <!doctype html><meta charset="utf-8">
      <h1>🤫 Welcome to the secret lounge</h1>
      <p>Here’s a random session cookie (demo only):</p>
      <code>${crypto.randomBytes(16).toString("hex")}</code>
    `, { "Set-Cookie": `sid=${crypto.randomBytes(12).toString("hex")}; HttpOnly; Path=/; SameSite=Lax` });
  }

  // Home page
  if (path === "/") {
    return sendHTML(res, 200, `
      <!doctype html><meta charset="utf-8">
      <h1>Hello There…</h1>
      <p>This tiny server adds light security headers, a fun rate limiter, and honey traps.</p>
      <ul>
        <li>Try <a href="/secret">/secret</a> (needs <code>?token=${SECRET_TOKEN}</code>)</li>
        <li>Try a honey path like <a href="/admin">/admin</a></li>
        <li>Probe <a href="/.env">/.env</a> to meet the teapot</li>
        <li>Hammer refresh to tickle the rate limiter</li>
      </ul>
      <p><small>Pro-tip: run behind a reverse proxy and use HTTPS for HSTS to matter.</small></p>
    `);
  }

  // Everything else → 404
  return sendHTML(res, 404, `
    <!doctype html><meta charset="utf-8">
    <h1>404 Not Found</h1>
    <p>The thing you seek is not here. Perhaps it’s in another castle 🏰</p>
  `);
});

server.listen(PORT, () => {
  console.log(`Server is running and listening on http://localhost:${PORT}`);
});