// lec4-client.js — client-side playful security demo
(() => {
    const RATE_LIMIT_MAX = 12;      // per minute per browser tab
    const RATE_LIMIT_WINDOW_MS = 60_000;
    const FUNNY_REDIRECT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  
    // rate-limit tracked per path using localStorage
    function checkClientRateLimit(key="lec4_rl") {
      try {
        const now = Date.now();
        const raw = localStorage.getItem(key);
        let entry = raw ? JSON.parse(raw) : null;
        if (!entry || now > entry.resetAt) {
          entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
        } else {
          entry.count++;
        }
        localStorage.setItem(key, JSON.stringify(entry));
        return entry;
      } catch (e) { return { count: 0, resetAt: Date.now()+RATE_LIMIT_WINDOW_MS }; }
    }
  
    // run on page load
    window.addEventListener("load", () => {
      const entry = checkClientRateLimit();
      if (entry.count > RATE_LIMIT_MAX) {
        // gentle popup + replace body with message
        alert("Slow down, champ — page is politely tired 😴");
        document.body.innerHTML = `<h1>Too many clicks — try again after ${Math.ceil((entry.resetAt-Date.now())/1000)}s</h1>`;
        return;
      }
  
      // honey path: detect hash or path fragment that looks like /admin
      const p = location.pathname.toLowerCase();
      if (p.includes("/admin") || p.includes("/wp-admin") || p.includes("/phpmyadmin")) {
        // playful redirect after 700ms
        setTimeout(() => {
          window.location.href = FUNNY_REDIRECT;
        }, 700);
        document.body.innerHTML = `<h1>Redirecting you to something more wholesome…</h1>`;
        return;
      }
  
      // playful hydration popup (only once per session)
      if (!sessionStorage.getItem("lec4_hydrate")) {
        setTimeout(()=> alert("Hydrate check 💧 — remember to drink water!"), 1200);
        sessionStorage.setItem("lec4_hydrate", "1");
      }
  
      // show a little UI
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.right = "12px";
      el.style.bottom = "12px";
      el.style.padding = "8px 10px";
      el.style.borderRadius = "8px";
      el.style.background = "rgba(0,0,0,0.75)";
      el.style.color = "white";
      el.style.fontFamily = "sans-serif";
      el.style.fontSize = "13px";
      el.innerHTML = `Clicks: ${entry.count}/${RATE_LIMIT_MAX}`;
      document.body.appendChild(el);
    });
  })();