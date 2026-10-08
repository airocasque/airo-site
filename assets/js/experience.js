// AIRO — scène 3D de la borne, pilotée par le défilement de la page.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { buildAdventureHelmet, helmetMaterials } from "./helmet.js";
import { buildShowroom } from "./showroom.js";

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
const FONT = '"Archivo", "Arial Narrow", sans-serif';
const BODY = '"Archivo", system-ui, sans-serif';

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if ("fontStretch" in g) g.fontStretch = "ultra-condensed"; // Archivo étroit, comme sur le site
  return [c, g];
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

function fanTex() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = "#151a24"; rr(g, 0, 0, 256, 256, 20); g.fill();
  g.strokeStyle = "#3a4458"; g.lineWidth = 5;
  for (let r = 30; r < 120; r += 18) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  for (let a = 0; a < 4; a++) { g.save(); g.translate(128, 128); g.rotate(a * Math.PI / 2 + 0.4); g.fillRect(-3, 0, 6, 118); g.restore(); }
  g.fillStyle = "#2a3346"; g.beginPath(); g.arc(128, 128, 22, 0, Math.PI * 2); g.fill();
  return texFrom(c, 2);
}

/* Écran tactile : redessiné uniquement quand son état change. */
function makeScreen() {
  const [c, g] = makeCanvas(1024, 674);
  const tex = texFrom(c);
  let key = "";
  const W = 1024, H = 674;

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
      [["NETTOYAGE AVANCÉ", "10 MIN"], ["NETTOYAGE RAPIDE", "7 MIN"], ["SÉCHAGE SEUL", "3 MIN"]].forEach(([n, d], i) => {
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

/* ---------- construction de la borne ----------
   Proportions et textures relevées sur la photo de la borne (façade et flanc redressés). */
const W = 0.68, D = 0.6, H = 1.9, CD = 0.40;   // largeur, profondeur, hauteur, profondeur des casiers
const Y0 = 0.03, BH = H - Y0;                    // bas de la caisse (au-dessus des pieds), hauteur texturée
const ZF = D / 2;                                // plan de façade
const LOCKERS = { B: 0.30, A: 0.76 };            // bas de chaque module casier
const LH = 0.46;                                 // hauteur d'un module casier
const DOOR = { x0: -0.30, x1: 0.30, y0: 0.006, y1: 0.381 };   // porte (repère du module), charnière à droite
const WIN = { x0: -0.199, x1: 0.267, y0: 0.02, y1: 0.37 };    // vitre, mesurée sur la photo
const CAV = { x0: -0.212, x1: 0.28, y0: 0.012, y1: 0.376 };   // intérieur du casier
const SCREEN = { x0: -0.227, x1: 0.227, y0: 1.515, y1: 1.814 };

const frontV = (y) => (y - Y0) / BH;
const frontU = (x) => (x + W / 2) / W;
function photoPlane(x0, x1, y0, y1) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  const uv = g.attributes.uv, u0 = frontU(x0), u1 = frontU(x1), v0 = frontV(y0), v1 = frontV(y1);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  return g;
}

function buildMachine(mats) {
  const machine = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = machine) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const zoneD = CD + 0.02, zoneZ = ZF - zoneD / 2;

  // bloc arrière, coins arrondis côté dos
  const rearDepth = D - zoneD, r = 0.035, hw = W / 2, hd = rearDepth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd); shape.lineTo(hw, -hd); shape.lineTo(hw, hd - r); shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd); shape.quadraticCurveTo(-hw, hd, -hw, hd - r); shape.lineTo(-hw, -hd);
  const rear = new THREE.ExtrudeGeometry(shape, { depth: BH, bevelEnabled: false, curveSegments: 10 });
  rear.rotateX(-Math.PI / 2);
  add(rear, mats.body, 0, Y0, -D / 2 + hd);

  // blocs pleins de façade + leur face photo
  const block = (y0, y1) => {
    add(new THREE.BoxGeometry(W, y1 - y0, zoneD), mats.body, 0, (y0 + y1) / 2, zoneZ);
    add(photoPlane(-W / 2, W / 2, y0, y1), mats.front, 0, 0, ZF + 0.0006);
  };
  block(Y0, LOCKERS.B);          // socle « AIRO »
  block(1.22, 1.49);             // panneau de commande
  block(1.49, H);                // bloc écran

  // écran tactile animé, posé sur la dalle de la photo
  const scr = new THREE.PlaneGeometry(SCREEN.x1 - SCREEN.x0, SCREEN.y1 - SCREEN.y0);
  const screenMesh = add(scr, mats.screen, (SCREEN.x0 + SCREEN.x1) / 2, (SCREEN.y0 + SCREEN.y1) / 2, ZF + 0.0015);

  // pieds
  const foot = new THREE.CylinderGeometry(0.022, 0.028, Y0, 20);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(foot, mats.metal, sx * (W / 2 - 0.06), Y0 / 2, sz * (D / 2 - 0.07)));

  // flancs identiques (photo du flanc redressée) et dos
  const sideGeo = new THREE.PlaneGeometry(D - 0.012, BH);
  const right = add(sideGeo, mats.side, W / 2 + 0.0015, Y0 + BH / 2, 0); right.rotation.y = Math.PI / 2;
  const left = add(sideGeo, mats.side, -W / 2 - 0.0015, Y0 + BH / 2, 0); left.rotation.y = -Math.PI / 2;
  const back = add(new THREE.PlaneGeometry(W - 0.07, BH), mats.back, 0, Y0 + BH / 2, -D / 2 - 0.0015); back.rotation.y = Math.PI;

  // bandeaux LED : arêtes avant et haut (animés à l'allumage)
  const leds = [];
  const ledV = new THREE.BoxGeometry(0.011, BH - 0.02, 0.011); ledV.translate(0, (BH - 0.02) / 2, 0);
  leds.push(add(ledV, mats.led, W / 2 - 0.004, Y0 + 0.01, ZF + 0.002));
  leds.push(add(ledV, mats.led, -W / 2 + 0.004, Y0 + 0.01, ZF + 0.002));
  const ledH = new THREE.BoxGeometry(W, 0.011, 0.011);
  leds.push(add(ledH, mats.led, 0, H - 0.004, ZF + 0.002));
  const ledBack = new THREE.BoxGeometry(0.011, BH - 0.06, 0.011); ledBack.translate(0, (BH - 0.06) / 2, 0);
  leds.push(add(ledBack, mats.ledSoft, W / 2 - 0.004, Y0 + 0.03, -D / 2 + 0.03));
  leds.push(add(ledBack, mats.ledSoft, -W / 2 + 0.004, Y0 + 0.03, -D / 2 + 0.03));

  // modules casiers
  const lockers = {};
  for (const [id, y0] of Object.entries(LOCKERS)) {
    const grp = new THREE.Group(); grp.position.y = y0; machine.add(grp);
    const cw = CAV.x1 - CAV.x0, ch = CAV.y1 - CAV.y0, cx = (CAV.x0 + CAV.x1) / 2;
    const cz = ZF - CD / 2 - 0.02;
    // cadre fixe autour de l'ouverture
    add(new THREE.BoxGeometry(CAV.x0 + W / 2, LH, zoneD), mats.body, (-W / 2 + CAV.x0) / 2, LH / 2, zoneZ, grp);
    add(new THREE.BoxGeometry(W / 2 - CAV.x1, LH, zoneD), mats.body, (CAV.x1 + W / 2) / 2, LH / 2, zoneZ, grp);
    add(new THREE.BoxGeometry(cw, CAV.y0, zoneD), mats.body, cx, CAV.y0 / 2, zoneZ, grp);
    add(new THREE.BoxGeometry(cw, LH - CAV.y1, zoneD), mats.body, cx, (CAV.y1 + LH) / 2, zoneZ, grp);
    // bandeau « Veuillez fermer la porte… » (photo)
    add(photoPlane(-W / 2, W / 2, y0 + DOOR.y1, y0 + LH), mats.front, 0, -y0, ZF + 0.0006, grp);
    add(photoPlane(-W / 2, W / 2, y0, y0 + DOOR.y0), mats.front, 0, -y0, ZF + 0.0006, grp);

    // intérieur éclairé
    add(new THREE.BoxGeometry(cw, ch, CD), mats.interior, cx, CAV.y0 + ch / 2, cz, grp);
    const bar = add(new THREE.PlaneGeometry(cw * 0.5, 0.01), mats.ledWhite, cx - cw * 0.18, CAV.y1 - 0.003, cz + CD / 2 - 0.06, grp);
    bar.rotation.x = Math.PI / 2;
    add(new THREE.PlaneGeometry(0.11, 0.11), mats.fan, cx + 0.11, CAV.y0 + ch * 0.66, cz - CD / 2 + 0.002, grp);
    const dock = buildDock(mats); dock.position.set(cx, CAV.y0, cz + 0.03); grp.add(dock);
    const light = new THREE.PointLight(0xdfe8ff, 0.4, 0.9, 2);
    light.position.set(cx, CAV.y1 - 0.05, cz + 0.08); grp.add(light);

    // porte vitrée, texturée avec la photo, charnière à droite
    const dw = DOOR.x1 - DOOR.x0, dh = DOOR.y1 - DOOR.y0, dcy = (DOOR.y0 + DOOR.y1) / 2;
    const pivot = new THREE.Group(); pivot.position.set(DOOR.x1, dcy, ZF + 0.001); grp.add(pivot);
    const fs = new THREE.Shape();
    fs.moveTo(-dw, -dh / 2); fs.lineTo(0, -dh / 2); fs.lineTo(0, dh / 2); fs.lineTo(-dw, dh / 2); fs.closePath();
    const hx0 = WIN.x0 - DOOR.x1, hx1 = WIN.x1 - DOOR.x1, hy0 = WIN.y0 - dcy, hy1 = WIN.y1 - dcy;
    const hole = new THREE.Path();
    hole.moveTo(hx0, hy0); hole.lineTo(hx1, hy0); hole.lineTo(hx1, hy1); hole.lineTo(hx0, hy1); hole.closePath();
    fs.holes.push(hole);
    const doorTex = mats.front.map.clone();
    doorTex.repeat.set(1 / W, 1 / BH);
    doorTex.offset.set(frontU(DOOR.x1), frontV(y0 + dcy));
    doorTex.needsUpdate = true;
    const doorMat = mats.front.clone(); doorMat.map = doorTex; doorMat.emissiveMap = doorTex;
    add(new THREE.ExtrudeGeometry(fs, { depth: 0.014, bevelEnabled: false }), [doorMat, mats.door], 0, 0, 0, pivot);
    const glassMat = mats.glass.clone();
    add(new THREE.PlaneGeometry(hx1 - hx0, hy1 - hy0), glassMat, (hx0 + hx1) / 2, (hy0 + hy1) / 2, 0.008, pivot);

    lockers[id] = { grp, pivot, light, glassMat, dockTop: CAV.y0 + 0.095, cx, cz };
  }
  return { machine, screenMesh, lockers, leds };
}

/* Support vapeur AIRO (dôme visible dans chaque casier sur la photo). */
function buildDock(mats) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mats.dock);
  dome.scale.set(0.112, 0.07, 0.082); dome.position.y = 0.03; g.add(dome);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, 1, 48), mats.dockDark);
  skirt.scale.set(0.112, 0.03, 0.082); skirt.position.y = 0.015; g.add(skirt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 64), mats.metal);
  ring.rotation.x = Math.PI / 2; ring.scale.set(0.113, 0.083, 1); ring.position.y = 0.03; g.add(ring);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.014, 0.03), mats.dockDark);
  top.position.y = 0.1; g.add(top);
  const topPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.014), mats.dockLabel);
  topPlate.rotation.x = -Math.PI / 2; topPlate.position.set(0, 0.1072, 0); g.add(topPlate);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.016), mats.dockLabel);
  plate.position.set(0, 0.016, 0.0875); g.add(plate);
  return g;
}

/* Casque AIRO « aventure » (modèle fourni par AIRO, remodélisé dans helmet.js), mis à l'échelle du casier. */
let helmetMats = null;
function buildHelmet() {
  if (!helmetMats) helmetMats = helmetMaterials(FONT);
  const inner = buildAdventureHelmet(helmetMats, 96);
  inner.scale.setScalar(0.098);
  inner.position.y = 0.098 * 0.6;          // la base du casque repose sur le support
  inner.rotation.y = 0;
  const wrap = new THREE.Group(); wrap.add(inner);
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050608);
  scene.fog = new THREE.Fog(0x050608, 10, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);

  // matériaux
  const screen = makeScreen();
  const ledColor = new THREE.Color(0x2f6bff).multiplyScalar(5);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const basic = (o) => new THREE.MeshBasicMaterial(o);
  const loader = new THREE.TextureLoader();
  const loadTex = (src) => new Promise((res) => loader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t); }, undefined, () => res(null)));
  const [frontTex, sideTexPhoto] = await Promise.all([loadTex("assets/img/tex-front.webp"), loadTex("assets/img/tex-side.webp")]);
  // la photo est déjà éclairée : une part émissive garde son rendu, le reste réagit à la lumière de la scène
  const photoMat = (map, fallback) => map
    ? std({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.55, metalness: 0.25, roughness: 0.42 })
    : std({ map: fallback, metalness: 0.3, roughness: 0.45 });
  const mats = {
    body: std({ color: 0x0c0d10, metalness: 0.6, roughness: 0.36 }),
    metal: std({ color: 0xb8bfca, metalness: 1, roughness: 0.22 }),
    front: photoMat(frontTex, controlTex()),
    side: photoMat(sideTexPhoto, sideTex()),
    back: std({ map: backTex(), metalness: 0.4, roughness: 0.5 }),
    screen: basic({ map: screen.tex, toneMapped: false, color: new THREE.Color(0.92, 0.92, 0.92) }),
    led: basic({ color: ledColor, toneMapped: false }),
    ledSoft: basic({ color: new THREE.Color(0x2f6bff).multiplyScalar(2), toneMapped: false }),
    ledWhite: basic({ color: new THREE.Color(0xeaf0ff).multiplyScalar(3), toneMapped: false, side: THREE.DoubleSide }),
    interior: std({ color: 0x2b3038, metalness: 0.15, roughness: 0.62, side: THREE.BackSide }),
    fan: std({ map: fanTex(), roughness: 0.6 }),
    dock: new THREE.MeshPhysicalMaterial({ color: 0x23262d, metalness: 0.55, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    dockDark: std({ color: 0x101216, metalness: 0.5, roughness: 0.4 }),
    dockLabel: basic({ map: (() => { const [c, g] = makeCanvas(256, 72); g.fillStyle = "#e9ecf1"; rr(g, 2, 2, 252, 68, 10); g.fill(); g.fillStyle = "#14161b"; rr(g, 8, 8, 240, 56, 8); g.fill(); g.font = `italic 800 46px ${FONT}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("AIRO", 128, 38); return texFrom(c, 4); })() }),
    door: std({ color: 0x0c0d10, metalness: 0.6, roughness: 0.32 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbcd0ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.1, envMapIntensity: 1.3, side: THREE.DoubleSide, depthWrite: false }),
  };

  const { machine, lockers, leds } = buildMachine(mats);
  scene.add(machine);

  // casques AIRO : A suit le parcours du client, B est servi en parallèle dans l'autre casier
  const helmetA = buildHelmet();
  const helmetB = buildHelmet();
  machine.add(helmetA, helmetB);

  // Décor : la borne est installée dans une concession moto (mur de casques, motos exposées, vitrine)
  const { room } = buildShowroom({ font: FONT, mobile });
  scene.add(room);
  // ombre de contact : ancre la borne au sol (suit sa rotation)
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.1, D * 2.1), basic({ map: radialTex("rgba(0,0,0,0.95)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.003; contact.renderOrder = 1; machine.add(contact);

  // éclairage de studio
  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x000000, 0.18));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2.2, 3.4, 4.2); scene.add(key);
  const pool = new THREE.SpotLight(0xf3f5fa, 60, 12, 0.32, 0.9, 1.5);          // spot du plafond sur la borne
  pool.position.set(0.6, 4.5, 1.6); pool.target.position.set(0, 0.6, 0); scene.add(pool, pool.target);
  const wall = new THREE.SpotLight(0x4f7dff, 40, 9, 0.62, 1, 1.4);             // léger halo bleu AIRO sur le mur, caché derrière la borne
  wall.position.set(0, 0.5, -1.0); wall.target.position.set(0, 2.6, -6); scene.add(wall, wall.target);
  const rimR = new THREE.DirectionalLight(0x2f6bff, 1.4); rimR.position.set(-3, 2.5, -3); scene.add(rimR);
  const rimL = new THREE.DirectionalLight(0xbfd0ff, 0.9); rimL.position.set(3.5, 1.8, -2.5); scene.add(rimL);

  // poussières en suspension dans la lumière : donnent de la profondeur, très discrètes
  const dustCount = mobile ? 120 : 260;
  const dustPos = new Float32Array(dustCount * 3);
  const dustSeed = Array.from({ length: dustCount }, () => [Math.random(), Math.random(), Math.random(), 0.4 + Math.random()]);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ map: radialTex("rgba(255,255,255,1)", "rgba(255,255,255,0)", 64), size: 0.018, color: 0xdfe8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // vapeur dans le casier A
  const steamCount = mobile ? 140 : 260;
  const steamPos = new Float32Array(steamCount * 3);
  const steamSeed = Array.from({ length: steamCount }, () => [Math.random(), Math.random(), Math.random(), 0.3 + Math.random()]);
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({ map: radialTex("rgba(255,255,255,0.9)"), size: 0.13, color: 0xd6e6ff, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const steam = new THREE.Points(steamGeo, steamMat);
  machine.add(steam);
  // nappes plus grosses et plus douces, pour donner du volume à la vapeur
  const puffCount = mobile ? 24 : 48;
  const puffPos = new Float32Array(puffCount * 3);
  const puffSeed = Array.from({ length: puffCount }, () => [Math.random(), Math.random(), Math.random(), 0.3 + Math.random()]);
  const puffGeo = new THREE.BufferGeometry();
  puffGeo.setAttribute("position", new THREE.BufferAttribute(puffPos, 3));
  const puffMat = new THREE.PointsMaterial({ map: smokeTex(), size: 0.34, color: 0xe6eeff, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  machine.add(new THREE.Points(puffGeo, puffMat));

  // étincelles de propreté
  const sparkMat = new THREE.SpriteMaterial({ map: radialTex("rgba(255,255,255,1)", "rgba(90,162,255,0)", 64), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = Array.from({ length: 7 }, (_, i) => { const s = new THREE.Sprite(sparkMat); s.userData.a = i * 0.9; machine.add(s); return s; });

  // post-traitement (lueur néon)
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // profondeur de champ : la borne reste nette, la concession derrière se fond comme sur une photo
  const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.0008, maxblur: 0.0045 });
  bokeh.enabled = !mobile;
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.4, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // finition « film » : vignettage et grain très légers, appliqués après la conversion des couleurs
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: mobile ? 0.025 : 0.035 }, uVig: { value: 0.32 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `precision mediump float;
      uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig; varying vec2 vUv;
      float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        float d = distance(vUv, vec2(0.5));
        c.rgb *= 1.0 - uVig * smoothstep(0.35, 0.85, d);
        c.rgb += (rand(vUv * 913.0 + fract(uTime)) - 0.5) * uGrain;
        gl_FragColor = c;
      }`,
  });
  composer.addPass(finish);

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
    bokeh.uniforms.aspect.value = vw / vh;
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- rotation à la souris / au doigt ---------- */
  let userRot = 0, spin = 0, dragging = false, dragId = null, lastX = 0, lastT = 0, lastDrag = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (dragging) return; // un seul doigt pilote la rotation
    dragging = true; dragId = e.pointerId; lastX = e.clientX; lastT = performance.now(); spin = 0;
    canvas.setPointerCapture(e.pointerId); stage.classList.add("is-grabbing");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== dragId) return;
    const now = performance.now(), dx = (e.clientX - lastX) * 0.01;
    userRot += dx;
    spin = dx / Math.max(8, now - lastT) * 16; // vitesse par image, conservée au relâchement
    lastX = e.clientX; lastT = now; lastDrag = now;
  });
  const endDrag = (e) => {
    if (e && e.pointerId !== dragId) return;
    dragging = false; dragId = null; stage.classList.remove("is-grabbing");
    if (performance.now() - lastT > 80) spin = 0; // geste arrêté avant de lâcher : pas d'élan
  };
  canvas.addEventListener("pointerup", endDrag);
  // alternative clavier au glisser : flèches gauche / droite quand la borne a le focus
  canvas.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    userRot += e.key === "ArrowLeft" ? -0.35 : 0.35;
    lastDrag = performance.now(); spin = 0;
  });
  canvas.addEventListener("pointercancel", endDrag);

  let mx = 0, my = 0, smx = 0, smy = 0;
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
    if (window.airoLenis) window.airoLenis.scrollTo(target, { duration: 1.6 });
    else window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
  }));

  /* ---------- repères techniques (pendant la rotation à 360°) ---------- */
  const calloutLayer = document.getElementById("xpCallouts");
  const ANCHORS = [
    { p: [0, 1.665, ZF], n: [0, 0, 1], t: "Écran tactile", s: "Choix du programme" },
    { p: [0, 1.33, ZF], n: [0, 0, 1], t: "Paiement sécurisé", s: "Directement sur la borne" },
    { p: [0.03, 0.88, ZF], n: [0, 0, 1], t: "Casier A", s: "Support vapeur AIRO" },
    { p: [0.03, 0.42, ZF], n: [0, 0, 1], t: "Casier B", s: "Fonctionne indépendamment" },
    { p: [W / 2, 1.25, -0.05], n: [1, 0, 0], t: "Flanc droit", s: "Identique au flanc gauche" },
    { p: [-W / 2, 1.25, -0.05], n: [-1, 0, 0], t: "Flanc gauche", s: "Identique au flanc droit" },
    { p: [W / 2 - 0.004, 1.75, ZF], n: [0.7, 0, 0.7], t: "Bandeaux LED", s: "Signature lumineuse AIRO" },
  ].map((a) => {
    const el = document.createElement("div");
    el.className = "callout";
    el.innerHTML = '<span class="callout__dot"></span><span class="callout__line"></span><span class="callout__text"><strong></strong><span></span></span>';
    el.querySelector("strong").textContent = a.t;
    el.querySelector(".callout__text > span").textContent = a.s;
    if (calloutLayer) calloutLayer.appendChild(el);
    return { el, p: new THREE.Vector3(...a.p), n: new THREE.Vector3(...a.n).normalize(), on: false, left: null, w: 0 };
  });
  const cw = new THREE.Vector3(), cn = new THREE.Vector3(), cc = new THREE.Vector3(), ctr = new THREE.Vector3();
  function updateCallouts(show) {
    if (!calloutLayer) return;
    ctr.set(0, 1, 0).applyMatrix4(machine.matrixWorld).project(camera);
    const midX = (ctr.x * 0.5 + 0.5) * vw;
    for (const a of ANCHORS) {
      let visible = false;
      if (show) {
        cw.copy(a.p).applyMatrix4(machine.matrixWorld);
        cn.copy(a.n).applyQuaternion(machine.quaternion);
        cc.copy(camera.position).sub(cw).normalize();
        visible = cn.dot(cc) > 0.35;
        if (visible) {
          cw.project(camera);
          const x = (cw.x * 0.5 + 0.5) * vw, y = (-cw.y * 0.5 + 0.5) * vh;
          const left = x < midX - 4;
          if (left !== a.left) { a.el.classList.toggle("callout--left", left); a.left = left; a.w = 0; }
          if (!a.w) a.w = a.el.offsetWidth; // mesuré une fois, pas à chaque image
          // l'ancre du repère est son point : on décale la boîte quand le texte part à gauche
          a.el.style.transform = left ? `translate3d(${x - a.w}px, ${y}px, 0)` : `translate3d(${x}px, ${y}px, 0)`;
        }
      }
      if (visible !== a.on) { a.el.classList.toggle("is-on", visible); a.on = visible; }
    }
  }

  /* ---------- boucle ---------- */
  const v3 = new THREE.Vector3(), look = new THREE.Vector3();
  const camFar = { pos: new THREE.Vector3(0, 1.08, 5.2), look: new THREE.Vector3(0, 0.98, 0) };
  const camScreen = { pos: new THREE.Vector3(0.25, 1.55, 2.4), look: new THREE.Vector3(0.22, 1.42, 0) };
  const camLocker = { pos: new THREE.Vector3(0.75, 1.1, 3.4), look: new THREE.Vector3(0.28, 0.95, 0) };
  const camEnd = { pos: new THREE.Vector3(0, 1.15, 5.6), look: new THREE.Vector3(0, 0.98, 0) };
  const mixCam = (a, b, t) => { v3.lerpVectors(a.pos, b.pos, t); look.lerpVectors(a.look, b.look, t); };

  let running = true, looping = false, t0 = performance.now(), firstFrame = true, bootStart = null;
  const vis = new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running && !looping) loop(); });
  vis.observe(xp);

  let lastNow = performance.now();
  const damp = (k, dt) => 1 - Math.pow(1 - k, dt * 60); // même rendu à 30, 60 ou 144 images/s
  function frame(now) {
    const t = (now - t0) / 1000;
    const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    // mise sous tension à l'apparition : LED qui se tracent, écran qui s'allume, casiers éclairés
    if (bootStart === null) bootStart = now;
    const bt = reduceMotion ? 9 : (now - bootStart) / 1000;
    const boot = smooth(0.9, 1.6, bt);
    leds[0].scale.y = leds[1].scale.y = Math.max(0.001, smooth(0.0, 0.9, bt));
    leds[2].scale.x = Math.max(0.001, smooth(0.7, 1.1, bt));
    leds[3].scale.y = leds[4].scale.y = Math.max(0.001, smooth(0.4, 1.3, bt));
    mats.screen.color.setScalar(0.92 * smooth(1.0, 1.5, bt) * (bt < 1.12 && bt > 1.02 ? 0.3 : 1));
    shown += (progress - shown) * (reduceMotion ? 1 : damp(0.12, dt));
    const p = shown;
    const seg = (i) => clamp((p - B[i]) / (B[i + 1] - B[i]));
    let step = 0; for (let i = 0; i < B.length - 1; i++) if (progress >= B[i]) step = i;
    setActive(step);

    // rotation de la borne
    const idle = reduceMotion ? 0 : Math.sin(t * 0.35) * 0.25;
    const rIntro = -0.55 + idle * (1 - smooth(0.0, 0.1, p));
    let rot = lerp(rIntro, Math.PI * 2, smooth(B[1], B[2], p));
    rot = lerp(rot, Math.PI * 2 - 0.5, smooth(B[6], B[7], p));
    if (!dragging) {
      userRot += spin * dt * 60; spin *= Math.pow(0.94, dt * 60); // élan après un lancer, freiné progressivement
      if (Math.abs(spin) < 0.0005 && now - lastDrag > 1800) userRot *= Math.pow(0.95, dt * 60);
    }
    machine.rotation.y = rot + userRot;

    // caméra
    if (p < B[2]) mixCam(camFar, camFar, 0);
    else if (p < B[3]) mixCam(camFar, camScreen, smooth(B[2], B[2] + 0.06, p));
    else if (p < B[6]) {
      mixCam(camScreen, camLocker, smooth(B[3], B[3] + 0.06, p));
      v3.sub(look).multiplyScalar(1 - 0.1 * Math.sin(seg(4) * Math.PI)).add(look); // poussée lente pendant le cycle
    }
    else mixCam(camLocker, camEnd, smooth(B[6], B[7] - 0.02, p));
    if (!sideLayout) {
      const k = Math.max(1, 0.85 / camera.aspect);
      v3.sub(look).multiplyScalar(k * 0.78).add(look);
      // sur mobile le texte occupe le bas de l'écran : on remonte la borne dans le cadre
      v3.y += 0.1; look.y -= 0.32;
    }
    // parallaxe amortie : la caméra suit la souris avec inertie plutôt qu'instantanément
    smx += (mx - smx) * damp(0.05, dt); smy += (my - smy) * damp(0.05, dt);
    if (!reduceMotion) { v3.x += smx * 0.25; v3.y -= smy * 0.12; }
    camera.position.copy(v3);
    camera.lookAt(look);
    bokeh.uniforms.focus.value = v3.distanceTo(look);

    // portes : ouverture avec un léger rebond (ressort), charnière à droite
    const sDep = seg(3), sCyc = seg(4), sRet = seg(5), sEnd = seg(6);
    const springOpen = (x) => { const c = 1.15; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    let doorA = Math.max(smooth(0.0, 0.3, sDep) * (1 - smooth(0.78, 1, sDep)), smooth(0.2, 0.45, sRet) * (1 - smooth(0.1, 0.6, sEnd)));
    if (p < B[3]) doorA = 0;
    lockers.A.pivot.rotation.y = springOpen(doorA) * 1.7 * (doorA > 0 ? 1 : 0);
    const doorB = reduceMotion ? 0 : smooth(0.4, 0.62, sRet) * (1 - smooth(0.1, 0.6, sEnd));
    lockers.B.pivot.rotation.y = springOpen(doorB) * 1.7 * (doorB > 0 ? 1 : 0);

    // trajectoires des casques (repère machine) : arc d'entrée/sortie, légère rotation
    const placeHelmet = (h, L, k, side) => {
      const inside = new THREE.Vector3(L.cx, L.grp.position.y + L.dockTop, L.cz + 0.03);
      const outside = new THREE.Vector3(L.cx + 0.08 * side, L.grp.position.y + 0.16, ZF + 0.5);
      h.position.lerpVectors(outside, inside, k);
      h.position.y += Math.sin(k * Math.PI) * 0.07;
      h.rotation.set(Math.sin(k * Math.PI) * 0.12, lerp(-0.9 * side, 0.2, k), 0);
    };
    const A = lockers.A, Bk = lockers.B;
    let hA = 0;
    if (p < B[3]) hA = 0; else if (p < B[5]) hA = smooth(0.3, 0.72, sDep); else hA = 1 - smooth(0.45, 0.8, sRet);
    placeHelmet(helmetA, A, hA, 1);
    helmetA.visible = p >= B[3] - 0.01 && p < B[6] + 0.05;
    let hB = 0;
    if (p >= B[3] && p < B[5]) hB = 1; else if (p >= B[5]) hB = 1 - smooth(0.62, 0.9, sRet);
    placeHelmet(helmetB, Bk, hB, -1);
    helmetB.visible = hB > 0.001;

    // vapeur : monte pendant le cycle, s'échappe quand la porte se rouvre
    const steamAmt = smooth(0.04, 0.22, sCyc) * (1 - smooth(0.88, 1, sCyc));
    const escape = p >= B[5] ? smooth(0.15, 0.35, sRet) * (1 - smooth(0.35, 0.7, sRet)) : 0;
    const vap = Math.max(steamAmt, escape);
    steamMat.opacity = vap * 0.5;
    puffMat.opacity = vap * 0.22;
    if (vap > 0.001) {
      const ch = CAV.y1 - CAV.y0, cw = CAV.x1 - CAV.x0;
      const fill = (pos, seed, n, spread, rise) => {
        for (let i = 0; i < n; i++) {
          const [a, b, c, sp] = seed[i];
          const yy = (c + t * rise * sp) % 1;
          const out = escape * yy * 0.5;
          pos[i * 3] = A.cx + (a - 0.5) * cw * spread + Math.sin(t * 1.3 + i) * 0.02;
          pos[i * 3 + 1] = A.grp.position.y + CAV.y0 + 0.02 + yy * ch * (0.92 + escape * 0.6);
          pos[i * 3 + 2] = A.cz + (b - 0.5) * CD * 0.8 + out;
        }
      };
      fill(steamPos, steamSeed, steamCount, 0.85, 0.18);
      fill(puffPos, puffSeed, puffCount, 0.7, 0.08);
      steamGeo.attributes.position.needsUpdate = true;
      puffGeo.attributes.position.needsUpdate = true;
    }
    // vitre embuée et lumière bleue pulsée pendant le cycle
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    A.light.intensity = boot * (0.4 + steamAmt * (1.4 + pulse * 1.1));
    A.light.color.setHSL(0.6, 0.3 + steamAmt * 0.7, 0.75 - steamAmt * 0.1);
    Bk.light.intensity = boot * 0.4;
    A.glassMat.opacity = 0.1 + steamAmt * 0.38;
    A.glassMat.roughness = 0.05 + steamAmt * 0.5;
    A.glassMat.color.setHSL(0.6, 0.4, 0.8 + steamAmt * 0.12);

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

    // poussières : dérive lente vers le haut, en boucle
    for (let i = 0; i < dustCount; i++) {
      const [a, b, c, sp] = dustSeed[i];
      const yy = (c + t * 0.012 * sp * (reduceMotion ? 0 : 1)) % 1;
      dustPos[i * 3] = (a - 0.5) * 4.2 + Math.sin(t * 0.2 * sp + i) * 0.08;
      dustPos[i * 3 + 1] = 0.1 + yy * 3.2;
      dustPos[i * 3 + 2] = (b - 0.5) * 3.2 - 0.4;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.35 + steamAmt * 0.25;

    // pulsation des LED
    const breathe = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6);
    mats.led.color.copy(ledColor).multiplyScalar(breathe);

    updateCallouts(sideLayout && step === 1 && !dragging);
    finish.uniforms.uTime.value = reduceMotion ? 0 : t;
    composer.render();
    if (firstFrame) { firstFrame = false; stage.classList.add("is-live"); ready(); }
  }

  // Qualité adaptative : on mesure le temps d'image et on allège le rendu sur les appareils modestes.
  let perfFrames = 0, perfStart = 0, quality = 0;
  const maxDpr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75);
  function adapt(now) {
    if (perfFrames === 0) perfStart = now;
    if (++perfFrames < 90) return;
    const ms = (now - perfStart) / perfFrames;
    perfFrames = 0;
    if (ms > 26 && quality < 3) {
      quality++;
      if (quality === 1) renderer.setPixelRatio(Math.max(1, maxDpr * 0.75));
      if (quality === 2) { renderer.setPixelRatio(1); bokeh.enabled = false; }
      if (quality === 3) { bloom.enabled = false; finish.enabled = false; }
      resize();
    }
  }

  function loop() {
    if (!running) { looping = false; return; }
    looping = true;
    const now = performance.now();
    frame(now);
    if (!document.hidden) adapt(now);
    requestAnimationFrame(loop);
  }
  loop();
}

init().catch((err) => {
  console.error(err);
  stage.classList.add("no-webgl");
  ready();
});
