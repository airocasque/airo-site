// AIRO — scène 3D de la borne, pilotée par le défilement de la page.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const stage = document.getElementById("xpStage");
const canvas = document.getElementById("xpCanvas");
const xp = document.getElementById("xp");
const steps = Array.from(document.querySelectorAll(".xp-step"));
const dots = Array.from(document.querySelectorAll(".xp-dots button"));

const ready = () => window.dispatchEvent(new Event("airo:ready"));
const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- utilitaires ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const BLUE = "#2f7bff";
const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';
const BODY = 'Inter, system-ui, sans-serif';

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
function texFrom(c, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function loadImage(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/* ---------- textures procédurales ---------- */
function radialTex(inner, outer = "rgba(0,0,0,0)", size = 256) {
  const [c, g] = makeCanvas(size, size);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return texFrom(c, 1);
}

function smokeTex() {
  const s = 256;
  const [c, g] = makeCanvas(s, s);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) {
    const r = 20 + rnd() * 60;
    const a = rnd() * Math.PI * 2, d = rnd() * 70;
    const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,0.10)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }
  // fondu circulaire pour éviter les bords carrés
  g.globalCompositeOperation = "destination-in";
  const m = g.createRadialGradient(s / 2, s / 2, s * 0.15, s / 2, s / 2, s / 2);
  m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, s, s);
  return texFrom(c, 1);
}

function sideTex() {
  const W = 512, H = 1600;
  const [c, g] = makeCanvas(W, H);
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1734"); bg.addColorStop(0.5, "#060b18"); bg.addColorStop(1, "#04060d");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // éclairs bleus / volutes
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    let x = rnd() * W, y = rnd() * H * 0.6;
    g.moveTo(x, y);
    for (let k = 0; k < 9; k++) { x += (rnd() - 0.5) * 90; y += 30 + rnd() * 50; g.lineTo(x, y); }
    g.strokeStyle = `rgba(80,150,255,${0.15 + rnd() * 0.35})`;
    g.lineWidth = 1 + rnd() * 2;
    g.shadowColor = BLUE; g.shadowBlur = 18;
    g.stroke();
  }
  g.shadowBlur = 0;
  const glow = g.createRadialGradient(W * 0.6, H * 0.25, 0, W * 0.6, H * 0.25, 420);
  glow.addColorStop(0, "rgba(47,123,255,0.28)"); glow.addColorStop(1, "rgba(47,123,255,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // logo vertical
  g.save();
  g.translate(150, 70); g.rotate(Math.PI / 2);
  g.font = `italic 800 250px ${FONT}`;
  const tg = g.createLinearGradient(0, -200, 0, 0);
  tg.addColorStop(0, "#ffffff"); tg.addColorStop(1, "#b9d3ff");
  g.fillStyle = tg; g.shadowColor = "rgba(47,123,255,0.8)"; g.shadowBlur = 24;
  g.fillText("AIRO", 0, 0);
  g.restore();
  g.save();
  g.translate(330, 70); g.rotate(Math.PI / 2);
  g.font = `700 44px ${FONT}`; g.fillStyle = "#5aa2ff";
  g.fillText("NETTOYAGE PAR VAPEUR", 0, 0);
  g.font = `600 36px ${FONT}`; g.fillStyle = "#c9d6f0";
  g.fillText("NOUVELLE GÉNÉRATION", 0, -48);
  g.restore();

  // silhouette de casque
  g.save();
  g.translate(W / 2 + 20, 860);
  const sh = g.createLinearGradient(-150, -150, 150, 150);
  sh.addColorStop(0, "#2a3346"); sh.addColorStop(0.5, "#0d111b"); sh.addColorStop(1, "#05070c");
  g.fillStyle = sh;
  g.beginPath();
  g.moveTo(-150, 90); g.bezierCurveTo(-170, -120, -40, -190, 60, -170);
  g.bezierCurveTo(170, -150, 190, -10, 160, 110); g.lineTo(60, 150); g.lineTo(-120, 140); g.closePath(); g.fill();
  g.strokeStyle = "rgba(90,162,255,0.9)"; g.lineWidth = 3; g.shadowColor = BLUE; g.shadowBlur = 20; g.stroke();
  g.shadowBlur = 0;
  const vg = g.createLinearGradient(0, -60, 160, 60);
  vg.addColorStop(0, "#0c2a6e"); vg.addColorStop(1, "#3d7dff");
  g.fillStyle = vg;
  g.beginPath(); g.moveTo(10, -70); g.bezierCurveTo(110, -80, 168, -30, 165, 40); g.lineTo(20, 40); g.closePath(); g.fill();
  g.restore();

  // liste d'atouts
  const items = [["VAPEUR SÈCHE", "HAUTE PERFORMANCE"], ["DÉSINFECTION", "PROUVÉE"], ["ÉLIMINE 99,9 %", "DES BACTÉRIES"], ["NEUTRALISE", "LES ODEURS"], ["SÉCHAGE RAPIDE", "INTÉGRÉ"], ["COMPATIBLE", "TOUS CASQUES"]];
  items.forEach(([a, b], i) => {
    const y = 1090 + i * 78;
    g.strokeStyle = "#5aa2ff"; g.lineWidth = 3;
    g.beginPath(); g.arc(150, y + 6, 20, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#5aa2ff"; g.beginPath(); g.arc(150, y + 6, 6, 0, Math.PI * 2); g.fill();
    g.font = `700 30px ${FONT}`; g.fillStyle = "#e8eefc"; g.fillText(a, 190, y);
    g.font = `600 26px ${FONT}`; g.fillStyle = "#8fa6cf"; g.fillText(b, 190, y + 28);
  });
  return texFrom(c);
}

function backTex() {
  const [c, g] = makeCanvas(512, 1600);
  g.fillStyle = "#0a0d15"; g.fillRect(0, 0, 512, 1600);
  g.fillStyle = "#05070b";
  for (let r = 0; r < 14; r++) rr(g, 120, 160 + r * 26, 272, 10, 5), g.fill();
  for (let r = 0; r < 10; r++) rr(g, 120, 1200 + r * 26, 272, 10, 5), g.fill();
  g.strokeStyle = "#1a2030"; g.lineWidth = 4; rr(g, 60, 640, 392, 420, 18); g.stroke();
  g.font = `700 40px ${FONT}`; g.fillStyle = "#2a3550"; g.textAlign = "center"; g.fillText("AIRO", 256, 870);
  return texFrom(c);
}

function controlTex() {
  const [c, g] = makeCanvas(1024, 320);
  const bg = g.createLinearGradient(0, 0, 0, 320);
  bg.addColorStop(0, "#0c1120"); bg.addColorStop(1, "#070a12");
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 320);
  const step = (n, x, y, l1, l2) => {
    g.font = `700 54px ${FONT}`; g.fillStyle = "#5aa2ff"; g.fillText(n, x, y + 30);
    g.strokeStyle = "#8fa6cf"; g.lineWidth = 2; rr(g, x + 44, y - 12, 40, 40, 8); g.stroke();
    g.font = `600 24px ${FONT}`; g.fillStyle = "#dfe7f7"; g.fillText(l1, x + 96, y + 6); g.fillText(l2, x + 96, y + 32);
  };
  step("1", 60, 60, "SÉLECTIONNEZ", "UN CASIER");
  step("2", 60, 170, "CHOISISSEZ", "UN PROGRAMME");
  step("3", 650, 60, "PAYEZ", "");
  step("4", 650, 170, "PLACEZ VOTRE", "CASQUE");
  // terminal de paiement
  g.fillStyle = "#11182a"; rr(g, 440, 40, 140, 220, 18); g.fill();
  g.strokeStyle = "#2b3a5c"; g.lineWidth = 3; g.stroke();
  const sc = g.createLinearGradient(0, 70, 0, 160);
  sc.addColorStop(0, "#1d4fb8"); sc.addColorStop(1, "#0b2460");
  g.fillStyle = sc; rr(g, 462, 62, 96, 110, 10); g.fill();
  g.fillStyle = "#cfe0ff"; g.font = `700 22px ${FONT}`; g.textAlign = "center"; g.fillText("AIRO", 510, 125);
  for (let i = 0; i < 3; i++) { g.fillStyle = "#2b3a5c"; rr(g, 470 + i * 30, 192, 22, 22, 5); g.fill(); }
  g.textAlign = "left";
  g.font = `600 22px ${BODY}`; g.fillStyle = "#8fa6cf"; g.fillText("PAIEMENT SÉCURISÉ", 420, 300);
  g.strokeStyle = "#5aa2ff"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(395, 280); g.lineTo(410, 286); g.lineTo(410, 298); g.quadraticCurveTo(402, 308, 395, 310); g.quadraticCurveTo(388, 308, 380, 298); g.lineTo(380, 286); g.closePath(); g.stroke();
  return texFrom(c);
}

function labelTex() {
  const [c, g] = makeCanvas(1024, 90);
  g.fillStyle = "#0a0e18"; g.fillRect(0, 0, 1024, 90);
  g.font = `500 34px ${BODY}`; g.fillStyle = "#e6ecf8"; g.textBaseline = "middle";
  g.fillText("Veuillez fermer la porte après avoir retiré votre casque.", 34, 47);
  return texFrom(c);
}

function badgeTex(letter) {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = "#2f7bff"; rr(g, 4, 4, 120, 120, 14); g.fill();
  g.font = `700 92px ${FONT}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(letter, 64, 70);
  return texFrom(c, 2);
}

function fanTex() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = "#151a24"; rr(g, 0, 0, 256, 256, 20); g.fill();
  g.strokeStyle = "#3a4458"; g.lineWidth = 5;
  for (let r = 30; r < 120; r += 18) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  for (let a = 0; a < 4; a++) { g.save(); g.translate(128, 128); g.rotate(a * Math.PI / 2 + 0.4); g.fillRect(-3, 0, 6, 118); g.restore(); }
  g.fillStyle = "#2a3346"; g.beginPath(); g.arc(128, 128, 22, 0, Math.PI * 2); g.fill();
  return texFrom(c, 2);
}

function baseTex(logo) {
  const [c, g] = makeCanvas(1024, 380);
  const bg = g.createLinearGradient(0, 0, 0, 380);
  bg.addColorStop(0, "#0b0f1b"); bg.addColorStop(1, "#05070c");
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 380);
  const glow = g.createRadialGradient(512, 160, 0, 512, 160, 300);
  glow.addColorStop(0, "rgba(47,123,255,0.35)"); glow.addColorStop(1, "rgba(47,123,255,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 1024, 380);
  if (logo) {
    const h = 240, w = h * (logo.width / logo.height);
    g.drawImage(logo, 512 - w / 2, 22, w, h);
  } else {
    g.font = `italic 800 160px ${FONT}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText("AIRO", 512, 200);
  }
  g.textAlign = "center"; g.font = `500 30px ${BODY}`; g.fillStyle = "#c9d6f0";
  g.fillText("@airo.officiel", 512, 330);
  return texFrom(c);
}

function bezelTex() {
  const [c, g] = makeCanvas(1024, 736);
  g.fillStyle = "#06080e"; g.fillRect(0, 0, 1024, 736);
  const sh = g.createLinearGradient(0, 0, 1024, 736);
  sh.addColorStop(0, "rgba(255,255,255,0.05)"); sh.addColorStop(0.5, "rgba(255,255,255,0)");
  g.fillStyle = sh; g.fillRect(0, 0, 1024, 736);
  return texFrom(c);
}

/* Écran tactile : redessiné uniquement quand son état change. */
function makeScreen() {
  const [c, g] = makeCanvas(1024, 590);
  const tex = texFrom(c);
  let key = "";
  const W = 1024, H = 590;

  function landscape() {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, "#1f5fd0"); sky.addColorStop(1, "#a8cfff");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const mount = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H * 0.55); pts.forEach(([x, y]) => g.lineTo(x * W, y * H)); g.lineTo(W, H * 0.55); g.closePath(); g.fill(); };
    mount("#cfe0f7", [[0.05, 0.42], [0.18, 0.3], [0.3, 0.4], [0.42, 0.26], [0.55, 0.38], [0.68, 0.24], [0.82, 0.36], [0.95, 0.3]]);
    mount("#5b79a8", [[0.1, 0.5], [0.25, 0.42], [0.4, 0.5], [0.6, 0.44], [0.8, 0.5], [1, 0.46]]);
    g.save(); g.translate(0, H * 1.1); g.scale(1, -1); g.globalAlpha = 0.45;
    g.drawImage(c, 0, 0, W, H * 0.55, 0, 0, W, H * 0.55);
    g.restore(); g.globalAlpha = 1;
    const lake = g.createLinearGradient(0, H * 0.55, 0, H);
    lake.addColorStop(0, "rgba(30,80,170,0.35)"); lake.addColorStop(1, "rgba(8,20,50,0.9)");
    g.fillStyle = lake; g.fillRect(0, H * 0.55, W, H * 0.45);
  }
  function panel() {
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a1a3d"); bg.addColorStop(1, "#050b1a");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
  }
  function title(t, y = 70) {
    g.textAlign = "center"; g.font = `700 46px ${FONT}`; g.fillStyle = "#fff"; g.fillText(t, W / 2, y);
  }

  function draw(state, a = 0) {
    const k = state + ":" + a;
    if (k === key) return;
    key = k;
    g.save();
    g.textAlign = "left"; g.textBaseline = "alphabetic";
    if (state === "home") {
      landscape();
      g.fillStyle = "rgba(4,8,20,0.55)"; rr(g, W / 2 - 230, H - 120, 460, 72, 36); g.fill();
      g.textAlign = "center"; g.font = `600 30px ${BODY}`; g.fillStyle = "#fff";
      g.fillText("Touchez l'écran pour commencer", W / 2, H - 74);
      g.font = `italic 800 64px ${FONT}`; g.fillText("AIRO", W / 2, 90);
    } else if (state === "select") {
      panel(); title("SÉLECTIONNEZ VOTRE PROGRAMME");
      [["EXPRESS", "≈ 3 MIN"], ["STANDARD", "≈ 5 MIN"], ["INTENSIF", "≈ 9-10 MIN"]].forEach(([n, d], i) => {
        const y = 130 + i * 128, on = i === a;
        g.fillStyle = on ? "#2f7bff" : "rgba(255,255,255,0.06)";
        if (on) { g.shadowColor = "#5aa2ff"; g.shadowBlur = 30; }
        rr(g, 150, y, W - 300, 100, 18); g.fill(); g.shadowBlur = 0;
        g.strokeStyle = on ? "#9cc3ff" : "rgba(255,255,255,0.15)"; g.lineWidth = 2; g.stroke();
        g.textAlign = "left"; g.font = `700 44px ${FONT}`; g.fillStyle = "#fff"; g.fillText(n, 196, y + 64);
        g.textAlign = "right"; g.font = `600 38px ${FONT}`; g.fillStyle = on ? "#fff" : "#9cc3ff"; g.fillText(d, W - 196, y + 64);
      });
    } else if (state === "place") {
      panel(); title("CASIER A OUVERT");
      g.textAlign = "center"; g.font = `500 32px ${BODY}`; g.fillStyle = "#c9d6f0";
      g.fillText("Placez votre casque sur le support", W / 2, 140);
      g.fillText("puis refermez la porte.", W / 2, 186);
      g.fillStyle = "#2f7bff"; rr(g, W / 2 - 90, 250, 180, 180, 24); g.fill();
      g.font = `700 140px ${FONT}`; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText("A", W / 2, 346);
    } else if (state === "cycle") {
      panel();
      const pct = a / 100;
      const phase = pct < 0.45 ? "VAPEUR SÈCHE" : pct < 0.75 ? "DÉSINFECTION" : "SÉCHAGE";
      title("CYCLE EN COURS — CASIER A", 66);
      g.lineWidth = 22; g.strokeStyle = "rgba(255,255,255,0.08)";
      g.beginPath(); g.arc(W / 2, 320, 150, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#3b86ff"; g.shadowColor = "#5aa2ff"; g.shadowBlur = 28; g.lineCap = "round";
      g.beginPath(); g.arc(W / 2, 320, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.01, pct)); g.stroke();
      g.shadowBlur = 0;
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.font = `700 96px ${FONT}`;
      g.fillText(a + " %", W / 2, 310);
      g.font = `600 30px ${FONT}`; g.fillStyle = "#9cc3ff"; g.fillText(phase, W / 2, 380);
    } else if (state === "done") {
      panel();
      g.fillStyle = "#22c55e"; g.shadowColor = "#4ade80"; g.shadowBlur = 40;
      g.beginPath(); g.arc(W / 2, 230, 100, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = "#fff"; g.lineWidth = 18; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(W / 2 - 44, 232); g.lineTo(W / 2 - 10, 266); g.lineTo(W / 2 + 50, 196); g.stroke();
      g.textAlign = "center"; g.font = `700 64px ${FONT}`; g.fillStyle = "#fff"; g.fillText("CASQUE PRÊT", W / 2, 420);
      g.font = `500 30px ${BODY}`; g.fillStyle = "#c9d6f0"; g.fillText("Propre, désinfecté et sec.", W / 2, 470);
    }
    g.restore();
    tex.needsUpdate = true;
  }
  draw("home");
  return { tex, draw };
}

/* ---------- construction de la borne ---------- */
const W = 0.68, D = 0.6, H = 1.9, CD = 0.42; // largeur, profondeur, hauteur, profondeur des casiers
const ZF = D / 2;                              // plan de façade
const LOCKERS = { B: 0.27, A: 0.74 };          // bas de chaque module casier
const LH = 0.46;                               // hauteur d'un module casier
const DOOR_H = 0.385, DOOR_W = W - 0.06;

function buildMachine(mats) {
  const machine = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = machine) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // bloc arrière arrondi
  const rearDepth = D - CD - 0.02;
  const shape = new THREE.Shape();
  const r = 0.035, hw = W / 2, hd = rearDepth / 2;
  // coins arrondis côté dos (+y du profil devient -z après rotation)
  shape.moveTo(-hw, -hd); shape.lineTo(hw, -hd); shape.lineTo(hw, hd - r); shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd); shape.quadraticCurveTo(-hw, hd, -hw, hd - r); shape.lineTo(-hw, -hd);
  const rear = new THREE.ExtrudeGeometry(shape, { depth: H - 0.03, bevelEnabled: false, curveSegments: 8 });
  rear.rotateX(-Math.PI / 2);
  add(rear, mats.body, 0, 0.03, -D / 2 + hd);

  const zoneZ = ZF - (CD + 0.02) / 2, zoneD = CD + 0.02;
  // blocs pleins de la façade
  const block = (y0, h, frontMat) => {
    const geo = new THREE.BoxGeometry(W, h, zoneD);
    const m = add(geo, [mats.body, mats.body, mats.body, mats.body, frontMat || mats.body, mats.body], 0, y0 + h / 2, zoneZ);
    return m;
  };
  block(0.03, LOCKERS.B - 0.03, mats.base);              // socle
  block(1.20, 0.20, mats.control);                       // panneau de commande
  block(1.40, 0.46, mats.bezel);                         // bloc écran
  block(1.86, 0.04);                                     // capot

  // écran
  const screen = add(new THREE.PlaneGeometry(0.56, 0.32), mats.screen, 0, 1.635, ZF + 0.002);
  screen.renderOrder = 1;

  // pieds
  const foot = new THREE.CylinderGeometry(0.025, 0.03, 0.03, 20);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(foot, mats.metal, sx * (W / 2 - 0.06), 0.015, sz * (D / 2 - 0.06)));

  // flancs identiques
  const sideGeo = new THREE.PlaneGeometry(D - 0.02, H - 0.03);
  const right = add(sideGeo, mats.side, W / 2 + 0.002, 0.03 + (H - 0.03) / 2, 0); right.rotation.y = Math.PI / 2;
  const left = add(sideGeo, mats.side, -W / 2 - 0.002, 0.03 + (H - 0.03) / 2, 0); left.rotation.y = -Math.PI / 2;
  const back = add(new THREE.PlaneGeometry(W - 0.07, H - 0.03), mats.back, 0, 0.03 + (H - 0.03) / 2, -D / 2 - 0.002); back.rotation.y = Math.PI;

  // bandes LED de façade
  const ledV = new THREE.BoxGeometry(0.012, H - 0.05, 0.012);
  add(ledV, mats.led, W / 2 - 0.004, 0.03 + (H - 0.05) / 2 + 0.01, ZF + 0.001);
  add(ledV, mats.led, -W / 2 + 0.004, 0.03 + (H - 0.05) / 2 + 0.01, ZF + 0.001);
  add(new THREE.BoxGeometry(W, 0.012, 0.012), mats.led, 0, H - 0.004, ZF + 0.001);
  add(new THREE.BoxGeometry(W - 0.12, 0.006, 0.006), mats.ledSoft, 0, 1.40, ZF + 0.003);

  // modules casiers
  const lockers = {};
  for (const [id, y0] of Object.entries(LOCKERS)) {
    const grp = new THREE.Group(); grp.position.y = y0; machine.add(grp);
    const wallT = 0.035, cw = W - 2 * wallT, ch = LH - 0.075, cd = CD;
    const cz = ZF - cd / 2 - 0.02;
    // parois latérales et bandeau supérieur
    add(new THREE.BoxGeometry(wallT, LH, zoneD), mats.body, -W / 2 + wallT / 2, LH / 2, zoneZ, grp);
    add(new THREE.BoxGeometry(wallT, LH, zoneD), mats.body, W / 2 - wallT / 2, LH / 2, zoneZ, grp);
    add(new THREE.BoxGeometry(W, 0.012, zoneD), mats.body, 0, 0.006, zoneZ, grp);
    add(new THREE.BoxGeometry(W - 2 * wallT, 0.062, zoneD), [mats.body, mats.body, mats.body, mats.body, mats.label, mats.body], 0, LH - 0.031, zoneZ, grp);
    // intérieur du casier
    const cavity = add(new THREE.BoxGeometry(cw, ch, cd), mats.interior, 0, 0.012 + ch / 2, cz, grp);
    cavity.material = mats.interior;
    add(new THREE.PlaneGeometry(cw - 0.04, 0.012), mats.ledWhite, 0, 0.012 + ch - 0.002, cz + cd / 2 - 0.05, grp).rotation.x = Math.PI / 2;
    add(new THREE.PlaneGeometry(0.12, 0.12), mats.fan, 0.12, 0.012 + ch * 0.62, cz - cd / 2 + 0.002, grp);
    // support / station vapeur
    const dock = new THREE.Group(); dock.position.set(0, 0.012, cz + 0.02); grp.add(dock);
    add(new THREE.CylinderGeometry(0.12, 0.135, 0.045, 48), mats.dock, 0, 0.0225, 0, dock);
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.012, 48), mats.metal, 0, 0.051, 0, dock);
    add(new THREE.PlaneGeometry(0.07, 0.018), mats.dockLabel, 0, 0.024, 0.132, dock);
    // lumière intérieure
    const light = new THREE.PointLight(0x9cc3ff, 0.35, 0.9, 2);
    light.position.set(0, ch - 0.04, cz + 0.05); grp.add(light);

    // porte vitrée, charnière à droite
    const pivot = new THREE.Group(); pivot.position.set(W / 2 - 0.03, 0.012 + 0.0055 + DOOR_H / 2, ZF + 0.001); grp.add(pivot);
    const fs = new THREE.Shape();
    fs.moveTo(-DOOR_W, -DOOR_H / 2); fs.lineTo(0, -DOOR_H / 2); fs.lineTo(0, DOOR_H / 2); fs.lineTo(-DOOR_W, DOOR_H / 2); fs.closePath();
    const hole = new THREE.Path();
    const hx0 = -DOOR_W + 0.105, hx1 = -0.025, hy = DOOR_H / 2 - 0.025;
    hole.moveTo(hx0, -hy); hole.lineTo(hx1, -hy); hole.lineTo(hx1, hy); hole.lineTo(hx0, hy); hole.closePath();
    fs.holes.push(hole);
    const frameGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
    add(frameGeo, mats.door, 0, 0, 0, pivot);
    add(new THREE.PlaneGeometry(hx1 - hx0, hy * 2), mats.glass, (hx0 + hx1) / 2, 0, 0.009, pivot);
    add(new THREE.PlaneGeometry(0.05, 0.05), id === "A" ? mats.badgeA : mats.badgeB, -DOOR_W + 0.052, DOOR_H / 2 - 0.055, 0.0185, pivot);
    add(new THREE.BoxGeometry(0.026, 0.12, 0.006), mats.handleRecess, -DOOR_W + 0.052, -0.04, 0.016, pivot);
    add(new THREE.BoxGeometry(0.012, 0.1, 0.012), mats.metal, -DOOR_W + 0.052, -0.04, 0.02, pivot);

    lockers[id] = { grp, pivot, light, dockTop: 0.012 + 0.057, cz };
  }
  return { machine, screen, lockers };
}

function buildHelmet(mats) {
  const h = new THREE.Group();
  const R = 0.105;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.66), mats.helmet);
  shell.scale.set(0.9, 0.96, 1.18);
  h.add(shell);
  const chin = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 12, Math.PI / 2 - 0.95, 1.9, Math.PI * 0.6, Math.PI * 0.16), mats.helmet);
  chin.scale.set(0.92, 1, 1.12);
  h.add(chin);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(R * 1.015, 48, 16, Math.PI / 2 - 0.95, 1.9, Math.PI * 0.33, Math.PI * 0.27), mats.visor);
  visor.scale.set(0.92, 1, 1.12);
  h.add(visor);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, 0.006, 8, 64), mats.metal);
  trim.rotation.x = Math.PI / 2; trim.position.y = -R * 0.47; trim.scale.set(1.07, 1.3, 1);
  h.add(trim);
  h.rotation.x = 0.12;
  h.position.y = R * 0.45;
  const wrap = new THREE.Group(); wrap.add(h);
  return wrap;
}

/* ---------- initialisation ---------- */
async function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    stage.classList.add("no-webgl");
    ready();
    return;
  }
  const mobile = isMobile();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  try { await Promise.race([document.fonts.load(`800 100px ${FONT}`), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* police de secours */ }
  const logo = await loadImage("assets/img/logo.png");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  scene.fog = new THREE.Fog(0x04060c, 9, 18);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);

  // matériaux
  const screen = makeScreen();
  const ledColor = new THREE.Color(0x2f7bff).multiplyScalar(5);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const basic = (o) => new THREE.MeshBasicMaterial(o);
  const mats = {
    body: std({ color: 0x0b0e16, metalness: 0.55, roughness: 0.38 }),
    metal: std({ color: 0x8a94a8, metalness: 1, roughness: 0.28 }),
    side: std({ map: sideTex(), metalness: 0.3, roughness: 0.45 }),
    back: std({ map: backTex(), metalness: 0.4, roughness: 0.5 }),
    control: std({ map: controlTex(), metalness: 0.2, roughness: 0.4, emissive: 0xffffff, emissiveMap: null }),
    label: std({ map: labelTex(), roughness: 0.5 }),
    base: std({ map: baseTex(logo), metalness: 0.2, roughness: 0.4 }),
    bezel: std({ map: bezelTex(), metalness: 0.4, roughness: 0.2 }),
    screen: basic({ map: screen.tex, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }),
    led: basic({ color: ledColor, toneMapped: false }),
    ledSoft: basic({ color: new THREE.Color(0x2f7bff).multiplyScalar(2.2), toneMapped: false }),
    ledWhite: basic({ color: new THREE.Color(0xcfe0ff).multiplyScalar(3), toneMapped: false, side: THREE.DoubleSide }),
    interior: std({ color: 0x1a2030, metalness: 0.2, roughness: 0.7, side: THREE.BackSide }),
    fan: std({ map: fanTex(), roughness: 0.6 }),
    dock: std({ color: 0x2a3140, metalness: 0.8, roughness: 0.3 }),
    dockLabel: basic({ map: (() => { const [c, g] = makeCanvas(256, 64); g.fillStyle = "#0b0f1a"; g.fillRect(0, 0, 256, 64); g.font = `italic 800 52px ${FONT}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText("AIRO", 128, 52); return texFrom(c, 2); })() }),
    door: std({ color: 0x0c1019, metalness: 0.6, roughness: 0.32 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fbfff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.12, envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false }),
    badgeA: basic({ map: badgeTex("A") }),
    badgeB: basic({ map: badgeTex("B") }),
    handleRecess: std({ color: 0x030408, roughness: 0.9 }),
    helmet: new THREE.MeshPhysicalMaterial({ color: 0x15181f, metalness: 0.35, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x163c9c, metalness: 0.9, roughness: 0.06, clearcoat: 1, emissive: 0x0a2a80, emissiveIntensity: 0.18, side: THREE.DoubleSide }),
  };
  mats.control.emissiveMap = mats.control.map; mats.control.emissiveIntensity = 0.35;
  mats.base.emissive = new THREE.Color(0xffffff); mats.base.emissiveMap = mats.base.map; mats.base.emissiveIntensity = 0.3;
  mats.label.emissive = new THREE.Color(0xffffff); mats.label.emissiveMap = mats.label.map; mats.label.emissiveIntensity = 0.25;
  mats.side.emissive = new THREE.Color(0xffffff); mats.side.emissiveMap = mats.side.map; mats.side.emissiveIntensity = 0.2;

  const { machine, lockers } = buildMachine(mats);
  scene.add(machine);

  // casques : un qui suit le cycle (A), un déjà en place (B)
  const helmetA = buildHelmet(mats);
  const helmetB = buildHelmet(mats);
  lockers.B.grp.add(helmetB);
  helmetB.position.set(0, lockers.B.dockTop, lockers.B.cz + 0.02);
  helmetB.rotation.y = 0.5;
  machine.add(helmetA);

  // sol, halo et fond
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), std({ color: 0x05070d, metalness: 0.75, roughness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), basic({ map: radialTex("rgba(47,123,255,0.4)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.002; scene.add(halo);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), basic({ map: radialTex("rgba(30,80,200,0.2)", "rgba(4,6,12,0)", 512), transparent: true, depthWrite: false, fog: false }));
  backdrop.position.set(0, 2.4, -5); scene.add(backdrop);

  // lumières
  scene.add(new THREE.HemisphereLight(0x9cb8ff, 0x05070c, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 3.5, 4); scene.add(key);
  const rimR = new THREE.DirectionalLight(0x2f7bff, 2.6); rimR.position.set(-3, 2.5, -3); scene.add(rimR);
  const rimL = new THREE.DirectionalLight(0x5aa2ff, 1.6); rimL.position.set(3.5, 1.5, -2.5); scene.add(rimL);

  // fumée d'ambiance
  const smokeMap = smokeTex();
  const smokes = [];
  const nSmoke = mobile ? 12 : 22;
  for (let i = 0; i < nSmoke; i++) {
    const m = new THREE.SpriteMaterial({ map: smokeMap, color: new THREE.Color().setHSL(0.61, 0.7, 0.22 + Math.random() * 0.14), transparent: true, opacity: 0.0, depthWrite: false });
    const s = new THREE.Sprite(m);
    // surtout derrière et sur les côtés ; quelques nappes basses devant
    const low = i % 4 === 0;
    const a = low ? Math.random() * Math.PI * 2 : Math.PI + Math.random() * Math.PI, d = 0.7 + Math.random() * 2.2;
    s.userData = { a, d, y: low ? 0.08 + Math.random() * 0.2 : 0.2 + Math.random() * 1.6, sc: 1.4 + Math.random() * 2.4, sp: (Math.random() - 0.5) * 0.12, base: 0.08 + Math.random() * 0.12, ph: Math.random() * 10 };
    s.scale.setScalar(s.userData.sc);
    scene.add(s); smokes.push(s);
  }

  // vapeur dans le casier A
  const steamCount = mobile ? 140 : 260;
  const steamPos = new Float32Array(steamCount * 3);
  const steamSeed = Array.from({ length: steamCount }, () => [Math.random(), Math.random(), Math.random(), 0.3 + Math.random()]);
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({ map: radialTex("rgba(255,255,255,0.9)"), size: 0.13, color: 0xd6e6ff, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const steam = new THREE.Points(steamGeo, steamMat);
  lockers.A.grp.add(steam);

  // étincelles de propreté
  const sparkMat = new THREE.SpriteMaterial({ map: radialTex("rgba(255,255,255,1)", "rgba(90,162,255,0)", 64), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = Array.from({ length: 7 }, (_, i) => { const s = new THREE.Sprite(sparkMat); s.userData.a = i * 0.9; machine.add(s); return s; });

  // post-traitement (lueur néon)
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.45, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- taille & cadrage ---------- */
  let vw = 1, vh = 1, sideLayout = true;
  function resize() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    sideLayout = vw > 900;
    renderer.setSize(vw, vh, false);
    composer.setSize(vw, vh);
    bloom.resolution.set(vw, vh);
    camera.aspect = sideLayout ? (vw * 1.5) / vh : vw / vh;
    if (sideLayout) camera.setViewOffset(vw * 1.5, vh, 0, 0, vw, vh); // machine à droite, texte à gauche
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- rotation à la souris / au doigt ---------- */
  let userRot = 0, dragging = false, lastX = 0, lastDrag = 0;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); stage.classList.add("is-grabbing"); });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    userRot += (e.clientX - lastX) * 0.01; lastX = e.clientX; lastDrag = performance.now();
  });
  const endDrag = () => { dragging = false; stage.classList.remove("is-grabbing"); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  let mx = 0, my = 0;
  window.addEventListener("pointermove", (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  /* ---------- progression au défilement ---------- */
  // Bornes des étapes (fraction de la section) : intro, 360°, programme, dépôt, cycle, retrait, fin.
  // Calculées depuis la hauteur réelle de chaque bloc de texte (voir .xp-step dans style.css).
  const B = [0, 0.06, 0.28, 0.43, 0.6, 0.77, 0.93, 1];
  function measure() {
    const total = xp.offsetHeight - window.innerHeight;
    steps.forEach((s, i) => { if (i > 0) B[i] = clamp((s.offsetTop - window.innerHeight * 0.5) / Math.max(1, total)); });
  }
  let progress = 0, shown = 0;
  function readScroll() {
    const r = xp.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    progress = clamp(-r.top / Math.max(1, total));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); readScroll(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); readScroll(); }).observe(xp);
  measure();
  readScroll();

  let activeStep = -1;
  function setActive(i) {
    if (i === activeStep) return;
    activeStep = i;
    stage.classList.toggle("hint-off", i > 1);
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    dots.forEach((d, k) => { d.classList.toggle("is-active", k === i); d.setAttribute("aria-current", k === i ? "step" : "false"); });
  }
  dots.forEach((d, k) => d.addEventListener("click", () => {
    const r = xp.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const target = window.scrollY + r.top + total * ((B[k] + B[k + 1]) / 2);
    window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
  }));

  /* ---------- boucle ---------- */
  const v3 = new THREE.Vector3(), look = new THREE.Vector3();
  const camFar = { pos: new THREE.Vector3(0, 1.08, 5.2), look: new THREE.Vector3(0, 0.98, 0) };
  const camScreen = { pos: new THREE.Vector3(0.05, 1.55, 2.4), look: new THREE.Vector3(0, 1.42, 0) };
  const camLocker = { pos: new THREE.Vector3(0.6, 1.12, 3.4), look: new THREE.Vector3(0, 0.98, 0) };
  const camEnd = { pos: new THREE.Vector3(0, 1.15, 5.6), look: new THREE.Vector3(0, 0.98, 0) };
  const mixCam = (a, b, t) => { v3.lerpVectors(a.pos, b.pos, t); look.lerpVectors(a.look, b.look, t); };

  let running = true, looping = false, t0 = performance.now(), firstFrame = true;
  const vis = new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running && !looping) loop(); });
  vis.observe(xp);

  function frame(now) {
    const t = (now - t0) / 1000;
    shown += (progress - shown) * (reduceMotion ? 1 : 0.09);
    const p = shown;
    const seg = (i) => clamp((p - B[i]) / (B[i + 1] - B[i]));
    let step = 0; for (let i = 0; i < B.length - 1; i++) if (progress >= B[i]) step = i;
    setActive(step);

    // rotation de la borne
    const idle = reduceMotion ? 0 : Math.sin(t * 0.35) * 0.25;
    const rIntro = -0.55 + idle * (1 - smooth(0.0, 0.1, p));
    let rot = lerp(rIntro, Math.PI * 2, smooth(B[1], B[2], p));
    rot = lerp(rot, Math.PI * 2 - 0.5, smooth(B[6], B[7], p));
    if (!dragging && now - lastDrag > 1800) userRot *= 0.94;
    machine.rotation.y = rot + userRot;

    // caméra
    if (p < B[2]) mixCam(camFar, camFar, 0);
    else if (p < B[3]) mixCam(camFar, camScreen, smooth(B[2], B[2] + 0.06, p));
    else if (p < B[6]) mixCam(camScreen, camLocker, smooth(B[3], B[3] + 0.06, p));
    else mixCam(camLocker, camEnd, smooth(B[6], B[7] - 0.02, p));
    if (!sideLayout) {
      const k = Math.max(1, 0.85 / camera.aspect);
      v3.sub(look).multiplyScalar(k * 0.78).add(look);
      // sur mobile le texte occupe le bas de l'écran : on remonte la borne dans le cadre
      v3.y += 0.1; look.y -= 0.32;
    }
    if (!reduceMotion) { v3.x += mx * 0.25; v3.y -= my * 0.12; }
    camera.position.copy(v3);
    camera.lookAt(look);

    // porte A, casque A, vapeur
    const sDep = seg(3), sCyc = seg(4), sRet = seg(5), sEnd = seg(6);
    let doorA = 0;
    doorA = Math.max(doorA, smooth(0.0, 0.3, sDep) * (1 - smooth(0.78, 1, sDep)));
    doorA = Math.max(doorA, smooth(0.25, 0.5, sRet) * (1 - smooth(0.1, 0.6, sEnd)));
    if (p < B[3]) doorA = 0;
    lockers.A.pivot.rotation.y = doorA * 1.75;
    const doorB = reduceMotion ? 0 : smooth(0.45, 0.75, sRet) * (1 - smooth(0.1, 0.6, sEnd)) * 0.9;
    lockers.B.pivot.rotation.y = doorB * 1.75;

    // trajectoire du casque A (repère machine)
    const A = lockers.A;
    const inside = new THREE.Vector3(0, A.grp.position.y + A.dockTop, A.cz + 0.02);
    const outside = new THREE.Vector3(0.05, A.grp.position.y + 0.12, ZF + 0.45);
    let hIn = 0;
    if (p < B[3]) hIn = 0;
    else if (p < B[5]) hIn = smooth(0.32, 0.75, sDep);
    else hIn = 1 - smooth(0.5, 0.85, sRet);
    helmetA.position.lerpVectors(outside, inside, hIn);
    helmetA.position.y += Math.sin(hIn * Math.PI) * 0.06;
    helmetA.rotation.y = lerp(-0.6, 0.35, hIn);
    helmetA.visible = p >= B[3] - 0.01 && p < B[6] + 0.06;
    helmetA.scale.setScalar(helmetA.visible ? 1 : 0.001);

    const steamAmt = smooth(0.05, 0.25, sCyc) * (1 - smooth(0.85, 1, sCyc)) + (p >= B[5] ? (1 - smooth(0, 0.25, sRet)) * 0.0 : 0);
    steamMat.opacity = steamAmt * 0.55;
    if (steamAmt > 0.001) {
      const ch = LH - 0.075, cw = W - 0.07;
      for (let i = 0; i < steamCount; i++) {
        const [a, b, c, sp] = steamSeed[i];
        const yy = ((c + t * 0.18 * sp) % 1);
        steamPos[i * 3] = (a - 0.5) * cw * 0.85 + Math.sin(t * 1.3 + i) * 0.02;
        steamPos[i * 3 + 1] = 0.03 + yy * ch * 0.92;
        steamPos[i * 3 + 2] = A.cz + (b - 0.5) * CD * 0.8;
      }
      steamGeo.attributes.position.needsUpdate = true;
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    A.light.intensity = 0.35 + steamAmt * (1.6 + pulse * 1.2);
    A.light.color.setHSL(0.6, 1, 0.65 + steamAmt * 0.1);
    mats.glass.opacity = 0.12 + steamAmt * 0.12;

    // étincelles quand le casque sort propre
    const sparkAmt = smooth(0.55, 0.75, sRet) * (1 - smooth(0.0, 0.5, sEnd));
    sparkMat.opacity = sparkAmt;
    sparks.forEach((s, i) => {
      const a = s.userData.a + t * 1.4;
      s.position.set(helmetA.position.x + Math.cos(a) * 0.16, helmetA.position.y + 0.06 + Math.sin(a * 1.7) * 0.08, helmetA.position.z + Math.sin(a) * 0.12);
      s.scale.setScalar((0.03 + 0.03 * Math.abs(Math.sin(t * 4 + i))) * sparkAmt + 0.0001);
    });

    // écran
    if (p < B[2]) screen.draw("home");
    else if (p < B[3]) screen.draw("select", Math.min(2, Math.floor(seg(2) * 3.2)));
    else if (p < B[4]) screen.draw("place");
    else if (p < B[5]) screen.draw("cycle", Math.round(smooth(0.05, 0.95, sCyc) * 100));
    else if (p < B[6]) screen.draw("done");
    else screen.draw("home");

    // fumée
    smokes.forEach((s) => {
      const u = s.userData;
      const a = u.a + t * u.sp * (reduceMotion ? 0 : 1);
      s.position.set(Math.cos(a) * u.d, u.y + Math.sin(t * 0.3 + u.ph) * 0.08, Math.sin(a) * u.d - 0.4);
      s.material.rotation = u.ph + t * u.sp;
      const target = u.base * (1 + steamAmt * 0.6);
      s.material.opacity += (target - s.material.opacity) * 0.02;
    });

    // pulsation des LED
    const breathe = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6);
    mats.led.color.copy(ledColor).multiplyScalar(breathe);

    composer.render();
    if (firstFrame) { firstFrame = false; stage.classList.add("is-live"); ready(); }
  }

  function loop() {
    if (!running) { looping = false; return; }
    looping = true;
    frame(performance.now());
    requestAnimationFrame(loop);
  }
  loop();
}

init().catch((err) => {
  console.error(err);
  stage.classList.add("no-webgl");
  ready();
});
