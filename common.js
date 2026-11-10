import { firebaseConfig, playerUrl } from "./config.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
export const $ = (id) => document.getElementById(id);
export const isLocal = !firebaseConfig;
export const PLAYER_URL = playerUrl || new URL("index.html", location.href).href;

/* ---------- Data layer ----------
   Same small API in both modes:
   on(path, cb) -> unsubscribe · get(path) · set(path, value|null) · update({path: value}) */
export async function connect(role) {
  return isLocal ? localDb(role) : firebaseDb(role);
}

function localDb(role) {
  const KEY = "wst-local-db";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } };
  const listeners = new Set();
  const keys = (p) => p.split("/").filter(Boolean);
  const getAt = (t, p) => keys(p).reduce((o, k) => (o == null ? undefined : o[k]), t);
  const setAt = (t, p, v) => {
    const ks = keys(p); let o = t;
    for (let i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; }
    if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
  };
  const notify = () => { const t = read(); listeners.forEach(l => l(t)); };
  const write = (t) => { localStorage.setItem(KEY, JSON.stringify(t)); notify(); };
  addEventListener("storage", (e) => { if (e.key === KEY) notify(); });
  // Each player tab is its own player in demo mode.
  let uid = "host";
  if (role === "player") {
    try { uid = sessionStorage.getItem("wst-uid") || ("p" + Math.random().toString(36).slice(2, 10)); sessionStorage.setItem("wst-uid", uid); }
    catch (_) { uid = "p" + Math.random().toString(36).slice(2, 10); }
  }
  return {
    mode: "local", uid, isAdmin: role === "host",
    on(path, cb) {
      let last;
      const l = (t) => { const v = getAt(t, path); const s = JSON.stringify(v ?? null); if (s !== last) { last = s; cb(v === undefined ? null : JSON.parse(s)); } };
      listeners.add(l); l(read()); return () => listeners.delete(l);
    },
    async get(path) { const v = getAt(read(), path); return v === undefined ? null : JSON.parse(JSON.stringify(v)); },
    async set(path, v) { const t = read(); setAt(t, path, v); write(t); },
    async update(obj) { const t = read(); for (const [p, v] of Object.entries(obj)) setAt(t, p, v); write(t); },
    async signIn() {}, async signOut() {}
  };
}

async function firebaseDb(role) {
  const V = "10.12.2", base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, D, A] = await Promise.all([
    import(base + "firebase-app.js"), import(base + "firebase-database.js"), import(base + "firebase-auth.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const db = D.getDatabase(app), auth = A.getAuth(app);
  let user = await new Promise(res => { const u = A.onAuthStateChanged(auth, x => { u(); res(x); }); });
  if (role === "player" && !user) user = (await A.signInAnonymously(auth)).user;
  const api = {
    mode: "firebase", uid: user ? user.uid : null, isAdmin: !!(user && !user.isAnonymous),
    on(path, cb, err) { return D.onValue(D.ref(db, path), s => cb(s.val()), e => err && err(e)); },
    async get(path) { return (await D.get(D.ref(db, path))).val(); },
    set: (p, v) => D.set(D.ref(db, p), v),
    update: (o) => D.update(D.ref(db), o),
    async signIn(email, pw) { const c = await A.signInWithEmailAndPassword(auth, email, pw); api.uid = c.user.uid; api.isAdmin = true; },
    async signOut() { await A.signOut(auth); api.uid = null; api.isAdmin = false; }
  };
  return api;
}

/* ---------- Shared bits of the look ---------- */
export function butterflies(n = 9) {
  if (document.getElementById("flutter")) return;
  const layer = document.createElement("div");
  layer.id = "flutter"; layer.setAttribute("aria-hidden", "true");
  const svg = (c) => `<svg viewBox="0 0 40 32" width="100%" height="100%"><g fill="${c}">
    <path class="wl" d="M20 16 C14 2, 2 2, 3 12 C4 20, 14 20, 20 16Z"/><path class="wl" d="M20 17 C13 20, 6 28, 11 30 C16 31, 19 24, 20 17Z"/>
    <path class="wr" d="M20 16 C26 2, 38 2, 37 12 C36 20, 26 20, 20 16Z"/><path class="wr" d="M20 17 C27 20, 34 28, 29 30 C24 31, 21 24, 20 17Z"/></g>
    <rect x="19.2" y="10" width="1.6" height="14" rx=".8" fill="#5a3410"/></svg>`;
  const colors = ["var(--gold)", "var(--candle)", "var(--gold)", "var(--magenta)", "var(--gold)", "var(--sky)"];
  for (let i = 0; i < n; i++) {
    const b = document.createElement("span");
    b.className = "bfly";
    const size = 18 + Math.random() * 22;
    b.style.cssText = `--x:${Math.random() * 100}vw;--d:${14 + Math.random() * 16}s;--delay:${-Math.random() * 30}s;--drift:${(Math.random() * 30 - 15)}vw;width:${size}px;height:${size * .8}px`;
    b.innerHTML = svg(colors[i % colors.length]);
    layer.appendChild(b);
  }
  document.body.prepend(layer);
}

export function podiumHTML(top, answer, total) {
  if (!top || !top.length) return '<p class="note">Nobody guessed this one.</p>';
  const max = Math.max(...top.map(t => t.count), 1);
  return top.map((t, i) => {
    const right = answer && norm(t.name) === norm(answer);
    const pct = total ? Math.round(t.count / total * 100) : 0;
    return `<div class="pod${right ? " right" : ""}"><span class="rank">${i + 1}</span>
      <div class="barwrap"><div class="bar" style="width:${t.count / max * 100}%"></div><div class="nm">${esc(t.name)}</div></div>
      <span class="num">${t.count} ${t.count === 1 ? "vote" : "votes"} · ${pct}%</span></div>`;
  }).join("");
}

export function leaderboardHTML(rows) {
  if (!rows || !rows.length) return '<p class="note">No correct guesses were recorded.</p>';
  return `<ol class="leader">${rows.map(r => `<li class="rank-${r.rank}"><span class="medal">${r.rank}</span><span class="lname">${esc(r.name)}</span><span class="lscore">${r.correct} correct</span></li>`).join("")}</ol>`;
}

export function favsHTML(rows) {
  if (!rows || !rows.length) return '<p class="note">No favourites were picked.</p>';
  return `<div class="favs">${rows.map((f, i) => `<figure class="fav${i === 0 ? " top" : ""}"><blockquote>${esc(f.text)}</blockquote>
    <figcaption><span>${esc(f.name)}</span><span class="hearts">♥ ${f.likes}</span></figcaption></figure>`).join("")}</div>`;
}

/* Name autocomplete, shared by any input that needs it */
export function combobox(input, list, getNames, onChange) {
  let active = -1, matches = [];
  const close = () => { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
  const render = () => {
    const q = norm(input.value);
    if (!q) { close(); return; }
    const all = getNames();
    const starts = all.filter(n => norm(n).split(" ").some(w => w.startsWith(q)) || norm(n).startsWith(q));
    const contains = all.filter(n => !starts.includes(n) && norm(n).includes(q));
    matches = starts.concat(contains).slice(0, 8);
    list.innerHTML = matches.length ? matches.map((n, i) => {
      const k = norm(n).indexOf(q);
      const label = k >= 0 ? esc(n.slice(0, k)) + "<b>" + esc(n.slice(k, k + q.length)) + "</b>" + esc(n.slice(k + q.length)) : esc(n);
      return `<li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === active}">${label}</li>`;
    }).join("") : '<li class="none" role="option" aria-disabled="true">No one by that name</li>';
    list.hidden = false; input.setAttribute("aria-expanded", "true");
    if (active >= 0) input.setAttribute("aria-activedescendant", "opt-" + active);
  };
  const pick = (i) => { input.value = matches[i]; close(); onChange(); };
  input.addEventListener("input", () => { active = -1; render(); onChange(); });
  input.addEventListener("focus", () => { if (input.value) render(); });
  input.addEventListener("keydown", (e) => {
    if (list.hidden || !matches.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % matches.length; render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + matches.length) % matches.length; render(); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") close();
  });
  list.addEventListener("mousedown", (e) => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
  document.addEventListener("click", (e) => { if (e.target !== input && !list.contains(e.target)) close(); });
  return { close };
}
