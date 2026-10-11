// AIRO — film de la borne piloté par le défilement (comme les pages produit Apple / Ducati).
// Les images sont tournées hors ligne dans le studio 3D (tools/film.js → assets/film/d|m/NNN.webp) ;
// ici on se contente de les afficher selon la position de défilement : fluide, léger, identique partout.
const stage = document.getElementById("xpStage");
const canvas = document.getElementById("xpCanvas");
const xp = document.getElementById("xp");
const steps = Array.from(document.querySelectorAll(".xp-step"));
const dots = Array.from(document.querySelectorAll(".xp-dots button"));
const hsLayer = document.getElementById("xpHotspots");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const files = window.__AIRO_FILES || {};
const url = (f) => files[f] || f;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ready = () => window.dispatchEvent(new Event("airo:ready"));

const N = 150;
const portrait = () => window.innerWidth <= 900;
let set = portrait() ? "m" : "d";
const frames = { d: new Array(N), m: new Array(N) };
let spots = { d: null, m: null };
// repères des étapes au moment du tournage (meta.json) : la page les a peut-être à d'autres hauteurs
const filmB = { d: null, m: null };
const ctx = canvas.getContext("2d", { alpha: false });

/* ---------- chargement : la 1re image tout de suite, puis du grossier au fin (1/8, 1/4, 1/2, tout) ---------- */
function load(s, i) {
  if (frames[s][i]) return frames[s][i].p;
  const img = new Image(); img.decoding = "async";
  const rec = { img, ok: false };
  rec.p = new Promise((res) => { img.onload = () => { rec.ok = true; res(); kick(); }; img.onerror = res; });
  img.src = url(`assets/film/${s}/${String(i).padStart(3, "0")}.webp`);
  frames[s][i] = rec;
  return rec.p;
}
async function loadSet(s) {
  if (!spots[s]) fetch(url(`assets/film/${s}/hotspots.json`)).then((r) => r.json()).then((j) => { spots[s] = j; kick(); }).catch(() => {});
  if (!filmB[s]) fetch(url(`assets/film/${s}/meta.json`)).then((r) => r.json()).then((j) => { filmB[s] = j.B; kick(); }).catch(() => {});
  await load(s, 0);
  for (const step of [16, 8, 4, 2, 1]) {
    const batch = [];
    for (let i = 0; i < N; i += step) batch.push(load(s, i));
    await Promise.all(batch);
  }
}
function nearest(s, i) {
  for (let d = 0; d < N; d++) {
    const a = frames[s][i - d], b = frames[s][i + d];
    if (a && a.ok) return a.img;
    if (b && b.ok) return b.img;
  }
  return null;
}

/* ---------- dessin : image « cover » ---------- */
let vw = 1, vh = 1, dpr = 1, fit = { s: 1, x: 0, y: 0, w: 1, h: 1 };
function resize() {
  vw = stage.clientWidth; vh = stage.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  const ns = portrait() ? "m" : "d";
  if (ns !== set) { set = ns; loadSet(set); }
  drawn = -1;
}
function cover(img) {
  const s = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  // ordinateur : la borne est à droite dans l'image, on garde ce côté ; mobile : centré, calé en haut
  const x = set === "d" ? vw - w : (vw - w) / 2, y = set === "d" ? (vh - h) / 2 : 0;
  fit = { x, y, w, h };
  return fit;
}
let drawn = -1;
function draw(i) {
  const img = nearest(set, i);
  if (!img) return;
  const key = i * 2 + (img === (frames[set][i] && frames[set][i].img) ? 1 : 0);
  if (key === drawn) return;
  drawn = key;
  const f = cover(img);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, vw, vh);
  ctx.drawImage(img, f.x, f.y, f.w, f.h);
}

/* ---------- étapes de la présentation ---------- */
// repères des étapes sur la page, mesurés comme dans experience.js (hauteur réelle des blocs de texte)
const B = [0, 0.06, 0.28, 0.43, 0.6, 0.77, 0.93, 1];
function measure() {
  const total = xp.offsetHeight - window.innerHeight;
  steps.forEach((s, i) => { if (i > 0) B[i] = clamp((s.offsetTop - window.innerHeight * 0.5) / Math.max(1, total)); });
}
// position dans le film : même étape, même fraction de l'étape que sur la page
function filmPos(p) {
  const F = filmB[set] || B;
  let k = 0; while (k < B.length - 2 && p >= B[k + 1]) k++;
  const f = clamp((p - B[k]) / Math.max(1e-6, B[k + 1] - B[k]));
  return F[k] + f * (F[k + 1] - F[k]);
}
let progress = 0, shown = 0, activeStep = -1;
function readScroll() {
  const r = xp.getBoundingClientRect();
  progress = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  stage.classList.toggle("is-past", r.bottom < 0);
}
function setActive(i) {
  if (i === activeStep) return;
  activeStep = i;
  stage.classList.toggle("hint-off", i > 1);
  steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
  dots.forEach((d, k) => { d.classList.toggle("is-active", k === i); d.setAttribute("aria-current", k === i ? "step" : "false"); });
}
// le texte de chaque étape apparaît quand la borne y est (repères du tournage, pas la hauteur des blocs)
function stepScroll(k) {
  const r = xp.getBoundingClientRect();
  return window.scrollY + r.top + (r.height - window.innerHeight) * ((B[k] + B[k + 1]) / 2);
}
dots.forEach((d, k) => d.addEventListener("click", () => {
  if (window.airoLenis) window.airoLenis.scrollTo(stepScroll(k), { duration: 1.6 });
  else window.scrollTo({ top: stepScroll(k), behavior: reduceMotion ? "auto" : "smooth" });
}));

/* ---------- points interactifs (positions enregistrées pendant le tournage) ---------- */
const HS = [
  { t: "Écran tactile", d: "Le client choisit son programme : nettoyage avancé (10 min), rapide (7 min) ou séchage seul (3 min)." },
  { t: "Paiement par carte", d: "Terminal de paiement intégré : le client paie directement sur la borne. Aucun personnel n’est nécessaire." },
  { t: "Vapeur sèche", d: "Le casque se pose sur le support vapeur. La vapeur traverse les mousses, élimine 99,9 % des bactéries et neutralise les odeurs." },
  { t: "Deux casiers indépendants", d: "Chaque casier fonctionne seul : deux clients peuvent utiliser la borne en même temps. Le séchage est intégré au cycle." },
  { t: "Signature lumineuse", d: "Les bandeaux LED AIRO rendent la borne visible de loin dans votre point de vente." },
];
const card = document.createElement("div");
card.className = "hs-card"; card.id = "hsCard"; card.setAttribute("role", "dialog"); card.setAttribute("aria-labelledby", "hsTitle"); card.hidden = true;
card.innerHTML = '<button type="button" class="hs-card__close" aria-label="Fermer">×</button><span class="hs-card__n"></span><h3 id="hsTitle"></h3><p></p><a href="#devis" class="hs-card__cta">Demander un devis →</a>';
let openHs = -1;
if (hsLayer) {
  HS.forEach((h, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "hs"; b.tabIndex = -1;
    b.setAttribute("aria-label", h.t); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "hsCard");
    b.innerHTML = '<span class="hs__ring"></span><span class="hs__dot"></span>';
    b.addEventListener("click", (ev) => { ev.stopPropagation(); openHs === i ? closeHs() : openCard(i); });
    hsLayer.appendChild(b);
    Object.assign(h, { el: b, on: false, x: 0, y: 0 });
  });
  hsLayer.appendChild(card);
}
function openCard(i) {
  if (openHs >= 0) HS[openHs].el.setAttribute("aria-expanded", "false");
  openHs = i; const h = HS[i];
  card.querySelector(".hs-card__n").textContent = `${String(i + 1).padStart(2, "0")} / ${String(HS.length).padStart(2, "0")}`;
  card.querySelector("h3").textContent = h.t; card.querySelector("p").textContent = h.d;
  h.el.setAttribute("aria-expanded", "true");
  card.hidden = false; card.classList.remove("is-on"); void card.offsetWidth; card.classList.add("is-on");
  placeCard();
}
function closeHs(focusBack) {
  if (openHs < 0) return;
  const h = HS[openHs]; h.el.setAttribute("aria-expanded", "false");
  if (focusBack) h.el.focus();
  openHs = -1; card.classList.remove("is-on"); card.hidden = true;
}
card.querySelector(".hs-card__close").addEventListener("click", () => closeHs(true));
card.querySelector(".hs-card__cta").addEventListener("click", () => closeHs());
document.addEventListener("pointerdown", (ev) => { if (openHs >= 0 && !card.contains(ev.target) && !ev.target.closest(".hs")) closeHs(); });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeHs(true); });
function placeCard() {
  if (openHs < 0) return;
  const h = HS[openHs], cw = card.offsetWidth, ch = card.offsetHeight, m = 14;
  if (portrait()) {   // mobile : au-dessus ou au-dessous du point, jamais sous le texte du bas
    const above = h.y - 30 - ch >= 64;
    card.style.transform = `translate3d(${m}px, ${above ? h.y - 30 - ch : h.y + 30}px, 0)`;
    card.style.transformOrigin = `${h.x - m}px ${above ? "100%" : "0%"}`;
    return;
  }
  const right = h.x + 26 + cw <= vw - m;
  const x = clamp(right ? h.x + 26 : h.x - 26 - cw, m, vw - cw - m);
  const y = clamp(h.y - ch / 2, 72, vh - ch - m);
  card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  card.style.transformOrigin = right ? "left center" : "right center";
}
function updateHotspots(i, show) {
  const fr = spots[set] && spots[set][i];
  for (let k = 0; k < HS.length; k++) {
    const h = HS[k], pt = show && fr && fr[k];
    let vis = false;
    if (pt) {
      h.x = fit.x + pt[0] * fit.w; h.y = fit.y + pt[1] * fit.h;
      vis = h.y > 70 && h.y < vh * (portrait() ? 0.56 : 0.94) && h.x > 10 && h.x < vw - 10;
      if (vis) h.el.style.transform = `translate3d(${h.x}px, ${h.y}px, 0)`;
    }
    if (vis !== h.on) { h.el.classList.toggle("is-on", vis); h.el.tabIndex = vis ? 0 : -1; h.on = vis; }
  }
  if (openHs >= 0) { if (!HS[openHs].on) closeHs(); else placeCard(); }
}

/* ---------- boucle : uniquement quand le défilement bouge ---------- */
let raf = 0, live = false;
function tick() {
  raf = 0;
  shown += (progress - shown) * (reduceMotion ? 1 : 0.18);
  if (Math.abs(progress - shown) < 0.0004) shown = progress;
  const i = Math.round(filmPos(shown) * (N - 1));
  let step = 0; for (let k = 0; k < B.length - 1; k++) if (progress >= B[k]) step = k;
  setActive(step);
  draw(i);
  updateHotspots(i, step === 0 || step === 6 || (portrait() && step === 1));
  if (!live && nearest(set, i)) { live = true; stage.classList.add("is-live"); ready(); }
  if (shown !== progress || !live) raf = requestAnimationFrame(tick);
}
const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
window.addEventListener("scroll", () => { readScroll(); kick(); }, { passive: true });
window.addEventListener("resize", () => { resize(); measure(); readScroll(); kick(); });
if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); readScroll(); kick(); }).observe(xp);
resize(); measure(); readScroll();
loadSet(set).then(kick);
load(set, 0).then(kick);
// filet de sécurité : la page ne reste jamais bloquée derrière l'écran d'intro
setTimeout(() => { if (!live) { stage.classList.add("no-webgl"); ready(); } }, 8000);
