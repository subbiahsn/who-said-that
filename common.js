import { firebaseConfig, playerUrl } from "./config.js";

export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
export const $ = (id) => document.getElementById(id);
export const isLocal = !firebaseConfig;
export const PLAYER_URL =
  playerUrl || new URL("index.html", location.href).href;

/* ---------- Data layer ----------
   Same small API in both modes:
   on(path, cb) -> unsubscribe · get(path) · set(path, value|null) · update({path: value}) */
export async function connect(role) {
  return isLocal ? localDb(role) : firebaseDb(role);
}

function localDb(role) {
  const KEY = "wst-local-db";
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (_) {
      return {};
    }
  };
  const listeners = new Set();
  const keys = (p) => p.split("/").filter(Boolean);
  const getAt = (t, p) =>
    keys(p).reduce((o, k) => (o == null ? undefined : o[k]), t);
  const setAt = (t, p, v) => {
    const ks = keys(p);
    let o = t;
    for (let i = 0; i < ks.length - 1; i++) {
      if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {};
      o = o[ks[i]];
    }
    if (v === null || v === undefined) delete o[ks[ks.length - 1]];
    else o[ks[ks.length - 1]] = v;
  };
  const notify = () => {
    const t = read();
    listeners.forEach((l) => l(t));
  };
  const write = (t) => {
    localStorage.setItem(KEY, JSON.stringify(t));
    notify();
  };
  addEventListener("storage", (e) => {
    if (e.key === KEY) notify();
  });
  // Each player tab is its own player in demo mode.
  let uid = "host";
  if (role === "player") {
    try {
      uid =
        sessionStorage.getItem("wst-uid") ||
        "p" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("wst-uid", uid);
    } catch (_) {
      uid = "p" + Math.random().toString(36).slice(2, 10);
    }
  }
  return {
    mode: "local",
    uid,
    isAdmin: role === "host",
    on(path, cb) {
      let last;
      const l = (t) => {
        const v = getAt(t, path);
        const s = JSON.stringify(v ?? null);
        if (s !== last) {
          last = s;
          cb(v === undefined ? null : JSON.parse(s));
        }
      };
      listeners.add(l);
      l(read());
      return () => listeners.delete(l);
    },
    async get(path) {
      const v = getAt(read(), path);
      return v === undefined ? null : JSON.parse(JSON.stringify(v));
    },
    async set(path, v) {
      const t = read();
      setAt(t, path, v);
      write(t);
    },
    async update(obj) {
      const t = read();
      for (const [p, v] of Object.entries(obj)) setAt(t, p, v);
      write(t);
    },
    async signIn() {},
    async signOut() {},
  };
}

async function firebaseDb(role) {
  const V = "10.12.2",
    base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, D, A] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-database.js"),
    import(base + "firebase-auth.js"),
  ]);
  const app = initializeApp(firebaseConfig);
  const db = D.getDatabase(app),
    auth = A.getAuth(app);
  let user = await new Promise((res) => {
    const u = A.onAuthStateChanged(auth, (x) => {
      u();
      res(x);
    });
  });
  if (role === "player" && !user) user = (await A.signInAnonymously(auth)).user;
  const api = {
    mode: "firebase",
    uid: user ? user.uid : null,
    isAdmin: !!(user && !user.isAnonymous),
    on(path, cb, err) {
      return D.onValue(
        D.ref(db, path),
        (s) => cb(s.val()),
        (e) => err && err(e),
      );
    },
    async get(path) {
      return (await D.get(D.ref(db, path))).val();
    },
    set: (p, v) => D.set(D.ref(db, p), v),
    update: (o) => D.update(D.ref(db), o),
    async signIn(email, pw) {
      const c = await A.signInWithEmailAndPassword(auth, email, pw);
      api.uid = c.user.uid;
      api.isAdmin = true;
    },
    async signOut() {
      await A.signOut(auth);
      api.uid = null;
      api.isAdmin = false;
    },
  };
  return api;
}

/* ---------- Shared bits of the look ---------- */
export function butterflies(n = 9) {
  if (document.getElementById("flutter")) return;
  const layer = document.createElement("div");
  layer.id = "flutter";
  layer.setAttribute("aria-hidden", "true");
  const svg = (
    c,
  ) => `<svg viewBox="0 0 40 32" width="100%" height="100%"><g fill="${c}">
    <path class="wl" d="M20 16 C14 2, 2 2, 3 12 C4 20, 14 20, 20 16Z"/><path class="wl" d="M20 17 C13 20, 6 28, 11 30 C16 31, 19 24, 20 17Z"/>
    <path class="wr" d="M20 16 C26 2, 38 2, 37 12 C36 20, 26 20, 20 16Z"/><path class="wr" d="M20 17 C27 20, 34 28, 29 30 C24 31, 21 24, 20 17Z"/></g>
    <rect x="19.2" y="10" width="1.6" height="14" rx=".8" fill="#5a3410"/></svg>`;
  const colors = [
    "var(--gold)",
    "var(--candle)",
    "var(--gold)",
    "var(--magenta)",
    "var(--gold)",
    "var(--sky)",
  ];
  for (let i = 0; i < n; i++) {
    const b = document.createElement("span");
    b.className = "bfly";
    const size = 18 + Math.random() * 22;
    b.style.cssText = `--x:${Math.random() * 100}vw;--d:${14 + Math.random() * 16}s;--delay:${-Math.random() * 30}s;--drift:${Math.random() * 30 - 15}vw;width:${size}px;height:${size * 0.8}px`;
    b.innerHTML = svg(colors[i % colors.length]);
    layer.appendChild(b);
  }
  document.body.prepend(layer);
}

export function podiumHTML(top, answer, total) {
  if (!top || !top.length)
    return '<p class="note">Nobody guessed this one.</p>';
  const max = Math.max(...top.map((t) => t.count), 1);
  return top
    .map((t, i) => {
      const right = answer && norm(t.name) === norm(answer);
      const pct = total ? Math.round((t.count / total) * 100) : 0;
      return `<div class="pod${right ? " right" : ""}"><span class="rank">${i + 1}</span>
      <div class="barwrap"><div class="bar" style="width:${(t.count / max) * 100}%"></div><div class="nm">${esc(t.name)}</div></div>
      <span class="num">${t.count} ${t.count === 1 ? "vote" : "votes"} · ${pct}%</span></div>`;
    })
    .join("");
}

export function leaderboardHTML(rows) {
  if (!rows || !rows.length)
    return '<p class="note">No correct guesses were recorded.</p>';
  const n = rows.length;
  // Last place appears first, the winner arrives last.
  return `<ol class="leader">${rows.map((r, i) => `<li class="rank-${r.rank}" style="--d:${(n - 1 - i) * 0.55 + 0.4}s"><span class="medal">${r.rank === 1 ? "👑" : r.rank}</span><span class="lname">${esc(r.name)}</span><span class="lscore"><span class="count" data-to="${r.correct}">0</span> correct</span></li>`).join("")}</ol>`;
}

export function favsHTML(rows) {
  if (!rows || !rows.length)
    return '<p class="note">No favourites were picked.</p>';
  const n = rows.length;
  return `<div class="favs">${rows
    .map(
      (
        f,
        i,
      ) => `<figure class="fav${i === 0 ? " top" : ""}" style="--d:${(n - 1 - i) * 0.7 + 0.6}s"><blockquote>${esc(f.text)}</blockquote>
    <figcaption><span>${esc(f.name)}</span><span class="hearts">♥ <span class="count" data-to="${f.likes}">0</span></span></figcaption></figure>`,
    )
    .join("")}</div>`;
}

/* Set innerHTML only when it changed, so live re-renders don't replay animations. */
export function setHTML(el, html) {
  if (el.dataset.html === html) return false;
  el.dataset.html = html;
  el.innerHTML = html;
  runCounters(el);
  return true;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Numbers tick up from 0 once their row has appeared. */
export function runCounters(root) {
  root.querySelectorAll(".count").forEach((el) => {
    const to = +el.dataset.to || 0;
    if (reduced() || to === 0) {
      el.textContent = to;
      return;
    }
    const row = el.closest("li, figure");
    const delay =
      (parseFloat(row && row.style.getPropertyValue("--d")) || 0) * 1000 + 300;
    const dur = 900,
      t0 = performance.now() + delay;
    const tick = (t) => {
      const p = Math.min(1, Math.max(0, (t - t0) / dur));
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* Confetti burst on a full-screen canvas. */
export function confetti(ms = 5000) {
  if (reduced()) return;
  const cv = document.createElement("canvas");
  cv.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d"),
    dpr = Math.min(devicePixelRatio || 1, 2);
  const fit = () => {
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
  };
  fit();
  const colors = [
    "#f5b83d",
    "#ffdc8f",
    "#e0368c",
    "#2bb37b",
    "#5ab8ea",
    "#fff4e2",
  ];
  const bit = (x, vx, vy) => ({
    x,
    y: -20 * Math.random() - 10,
    vx,
    vy,
    w: 6 + Math.random() * 8,
    h: 10 + Math.random() * 10,
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  });
  const bits = [];
  for (let i = 0; i < 160; i++)
    bits.push(
      bit(
        Math.random() * innerWidth,
        (Math.random() - 0.5) * 3,
        2 + Math.random() * 4,
      ),
    );
  // two side cannons
  for (let i = 0; i < 70; i++) {
    const left = i % 2 === 0,
      b = bit(
        left ? 0 : innerWidth,
        (left ? 1 : -1) * (6 + Math.random() * 9),
        -(8 + Math.random() * 10),
      );
    b.y = innerHeight * 0.7;
    bits.push(b);
  }
  const start = performance.now();
  const frame = (t) => {
    const el = t - start;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = el > ms - 1000 ? Math.max(0, (ms - el) / 1000) : 1;
    bits.forEach((b) => {
      b.vy += 0.12;
      b.vx *= 0.995;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.scale(1, Math.cos(b.r * 2));
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    });
    if (el < ms) requestAnimationFrame(frame);
    else cv.remove();
  };
  addEventListener("resize", fit);
  requestAnimationFrame(frame);
}

/* Name autocomplete, shared by any input that needs it */
export function combobox(input, list, getNames, onChange) {
  let active = -1,
    matches = [];
  const close = () => {
    list.hidden = true;
    active = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };
  const render = () => {
    const q = norm(input.value);
    if (!q) {
      close();
      return;
    }
    const all = getNames();
    const starts = all.filter(
      (n) =>
        norm(n)
          .split(" ")
          .some((w) => w.startsWith(q)) || norm(n).startsWith(q),
    );
    const contains = all.filter(
      (n) => !starts.includes(n) && norm(n).includes(q),
    );
    matches = starts.concat(contains).slice(0, 8);
    list.innerHTML = matches.length
      ? matches
          .map((n, i) => {
            const k = norm(n).indexOf(q);
            const label =
              k >= 0
                ? esc(n.slice(0, k)) +
                  "<b>" +
                  esc(n.slice(k, k + q.length)) +
                  "</b>" +
                  esc(n.slice(k + q.length))
                : esc(n);
            return `<li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === active}">${label}</li>`;
          })
          .join("")
      : '<li class="none" role="option" aria-disabled="true">No one by that name</li>';
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (active >= 0)
      input.setAttribute("aria-activedescendant", "opt-" + active);
  };
  const pick = (i) => {
    input.value = matches[i];
    close();
    onChange();
  };
  input.addEventListener("input", () => {
    active = -1;
    render();
    onChange();
  });
  input.addEventListener("focus", () => {
    if (input.value) render();
  });
  input.addEventListener("keydown", (e) => {
    if (list.hidden || !matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = (active + 1) % matches.length;
      render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = (active - 1 + matches.length) % matches.length;
      render();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") close();
  });
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) {
      e.preventDefault();
      pick(+li.dataset.i);
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target !== input && !list.contains(e.target)) close();
  });
  return { close };
}

/* A tongue-in-cheek "buy the host a coffee" card. No real payments, just fun.
   Player screen: coffee + love buttons (counts are saved under tips/<uid>).
   Host screen: a live glass that fills with every coffee all players send. */
const MAX_COFFEE = 10;
const glassHTML = '<div class="glass" role="img" aria-label="Coffee glass"><div class="liquid"></div></div>';
const setGlass = (card, n) => {
  card.querySelector(".liquid").style.height = Math.min(100, n / MAX_COFFEE * 100) + "%";
  card.querySelector(".glass").classList.toggle("full", n >= MAX_COFFEE);
};
const MOP = "It's overflowing! Someone get the mop.";

/* Host: returns update(totalCoffees) */
export function mountHostTip(host) {
  host.innerHTML = `<section class="card tip">
    <h2>Buy your wonderful hosts a coffee ☕</h2>
    ${glassHTML}
    <p class="tipcount"><b class="tip-total">0</b> <span class="tip-lbl">coffees on their way</span></p>
    <p class="thanks" role="status" aria-live="polite"></p>
  </section>`;
  const card = host.querySelector(".tip");
  return (n) => {
    card.querySelector(".tip-total").textContent = n;
    card.querySelector(".tip-lbl").textContent = n === 1 ? "coffee on its way" : "coffees on their way";
    card.querySelector(".thanks").textContent = n > MAX_COFFEE ? MOP : "";
    setGlass(card, n);
  };
}

/* Player */
export function mountTip(host, { db } = {}) {
  if (host.dataset.tip) return;
  host.dataset.tip = "1";
  host.innerHTML = `<section class="card tip">
    <h2>Buy the host a coffee</h2>
    ${glassHTML}
    <div class="tiers">
      <button class="btn small" type="button" data-kind="coffee">☕ Coffee · <b class="tip-c">0</b></button>
      <button class="btn small" type="button" data-kind="love">♥ Love · <b class="tip-l">0</b></button>
    </div>
    <p class="thanks" role="status" aria-live="polite"></p>
  </section>`;
  const card = host.querySelector(".tip"); let coffee = 0, love = 0;
  const say = card.querySelector(".thanks");
  const paint = () => {
    card.querySelector(".tip-c").textContent = coffee;
    card.querySelector(".tip-l").textContent = love;
    setGlass(card, coffee);
  };
  const save = () => { try { db && db.uid && db.set("tips/" + db.uid, { coffee, love }).catch(() => {}); } catch (_) {} };
  try { db && db.uid && db.get("tips/" + db.uid).then((v) => { if (v && !coffee && !love) { coffee = +v.coffee || 0; love = +v.love || 0; paint(); } }).catch(() => {}); } catch (_) {}
  card.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-kind]"); if (!b) return;
    let em;
    if (b.dataset.kind === "coffee") {
      coffee++; em = "☕";
      say.textContent = coffee > MAX_COFFEE ? MOP : coffee === MAX_COFFEE ? "Glass full! The host is buzzing. ☕" : coffee === 1 ? "A sip! The host is delighted." : "Pouring… keep it coming.";
    } else {
      love++; em = "♥";
      say.textContent = love % 5 === 0 ? "The host is blushing." : "Love received. ♥";
    }
    paint(); save();
    const r = b.getBoundingClientRect(), cr = card.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const p = document.createElement("span"); p.className = "puff"; p.textContent = em;
      if (em === "♥") p.style.color = "#ff9cc9";
      p.style.cssText += `left:${r.left - cr.left + Math.random() * r.width}px;top:${r.top - cr.top}px;--r:${Math.random() * 60 - 30}deg;animation-delay:${i * .08}s`;
      card.appendChild(p); setTimeout(() => p.remove(), 1800);
    }
  });
}
