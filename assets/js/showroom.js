// Décor de la scène 3D : une concession moto (mur de casques, motos exposées, vitrine, sol ciré).
// Tout est procédural : aucune texture externe à charger.
import * as THREE from "three";
import { helmetLiteGeometries } from "./helmet.js";

const ROOM = { back: -7, left: -11, right: 11, h: 4.6 };

function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// petit générateur pseudo-aléatoire : le décor est identique à chaque visite
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* Sol en béton ciré : grandes dalles, nuances et joints. */
function floorTextures() {
  const R = rng(7);
  const [c, g] = canvas(1024, 1024);
  g.fillStyle = "#5b5f66"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) {               // nuages de nuance
    const x = R() * 1024, y = R() * 1024, r = 10 + R() * 60, v = 80 + R() * 28;
    g.fillStyle = `rgba(${v},${v + 3},${v + 8},0.05)`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = "rgba(20,22,26,0.85)"; g.lineWidth = 3;   // joints entre dalles (2 x 2 dalles par motif)
  for (const p of [0, 512, 1024]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 1024); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(1024, p); g.stroke(); }
  const [rc, rg] = canvas(256, 256);                       // rugosité : zones plus ou moins lustrées
  rg.fillStyle = "#6a6a6a"; rg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) { const v = 70 + R() * 90; rg.fillStyle = `rgba(${v},${v},${v},0.08)`; rg.beginPath(); rg.arc(R() * 256, R() * 256, 4 + R() * 26, 0, Math.PI * 2); rg.fill(); }
  return { map: tex(c, { repeat: [12, 12] }), rough: tex(rc, { srgb: false, repeat: [12, 12] }) };
}

/* Fond lumineux du mur de casques : niches rétroéclairées. */
function nicheTexture(cols, rows) {
  const cw = 128, ch = 112;
  const [c, g] = canvas(cols * cw, rows * ch);
  g.fillStyle = "#0b0c0f"; g.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = k * cw + 10, y = r * ch + 8, w = cw - 20, h = ch - 14;
    // niche sombre éclairée par une réglette en haut : la lumière tombe sur le casque
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, "#8d826f"); grd.addColorStop(0.35, "#3a3631"); grd.addColorStop(1, "#141416");
    g.fillStyle = grd; g.beginPath(); g.roundRect(x, y, w, h, 4); g.fill();
    const pool = g.createRadialGradient(x + w / 2, y + h * 0.7, 2, x + w / 2, y + h * 0.7, w * 0.42);
    pool.addColorStop(0, "rgba(255,236,206,0.35)"); pool.addColorStop(1, "rgba(255,236,206,0)");
    g.fillStyle = pool; g.fillRect(x, y, w, h);
    g.fillStyle = "#fff4e4"; g.fillRect(x + 6, y + 2, w - 12, 3);
  }
  return tex(c, { aniso: 4 });
}

/* Vitrine de nuit : rue sombre, lumières floues. */
function windowTexture() {
  const R = rng(3);
  const [c, g] = canvas(1024, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#03060d"); grd.addColorStop(0.55, "#0b1630"); grd.addColorStop(0.75, "#1a2238"); grd.addColorStop(1, "#05070b");
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 70; i++) {
    const x = R() * 1024, y = 230 + R() * 170, r = 4 + R() * 18;
    const warm = R() > 0.45;
    const col = warm ? [255, 186, 110] : [140, 180, 255];
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${col},${0.5 + R() * 0.4})`); rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return tex(c, { aniso: 4 });
}

/* Enseigne néon. */
function neonTexture(text, font, color = "#dfe8ff", glow = "#2f6bff") {
  const [c, g] = canvas(1024, 192);
  if ("fontStretch" in g) g.fontStretch = "condensed";
  g.font = `800 132px ${font}`; g.textAlign = "center"; g.textBaseline = "middle";
  if ("letterSpacing" in g) g.letterSpacing = "18px";
  g.shadowColor = glow; g.shadowBlur = 28; g.fillStyle = color;
  g.fillText(text, 512, 100); g.shadowBlur = 8; g.fillText(text, 512, 100);
  return tex(c, { aniso: 4 });
}

/* Moto procédurale (longueur ≈ 2,1 m). Axe x = avant, z = côté. */
function buildMotorcycle(m, { paint, accent, fairing = false, adventure = false }) {
  const bike = new THREE.Group();
  const add = (geo, mat, x, y, z = 0, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); bike.add(o); return o;
  };
  const r = adventure ? 0.35 : 0.32, tyre = adventure ? 0.075 : 0.065;
  const rearX = -0.74, frontX = adventure ? 0.8 : 0.74;
  for (const [x, rad] of [[rearX, r], [frontX, r * (adventure ? 1.05 : 1)]]) {
    add(new THREE.TorusGeometry(rad - tyre, tyre, 14, 48), m.rubber, x, rad);
    add(new THREE.CylinderGeometry(rad - tyre * 1.6, rad - tyre * 1.6, 0.03, 36), m.rim, x, rad, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, 0.008, 32), m.chrome, x, rad, 0.06, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), m.dark, x, rad, 0, Math.PI / 2);
    for (let k = 0; k < (adventure ? 14 : 5); k++) {   // rayons / bâtons de jante
      const s = add(new THREE.BoxGeometry(0.012, (rad - tyre * 1.6) * 2, 0.02), adventure ? m.chrome : m.rim, x, rad, 0.02);
      s.rotation.z = (k / (adventure ? 14 : 5)) * Math.PI;
    }
  }
  const fr = r * (adventure ? 1.05 : 1);
  // fourche
  const rake = 0.44, forkLen = adventure ? 0.86 : 0.74;
  const dir = new THREE.Vector2(-Math.sin(rake), Math.cos(rake));
  for (const z of [-0.08, 0.08]) {
    add(new THREE.CylinderGeometry(0.024, 0.03, forkLen, 12), m.chrome, frontX + dir.x * forkLen / 2, fr + dir.y * forkLen / 2, z, 0, 0, rake);
  }
  const top = new THREE.Vector2(frontX + dir.x * forkLen, fr + dir.y * forkLen);
  // garde-boue avant
  const fend = add(new THREE.TorusGeometry(fr + 0.03, 0.035, 6, 24, Math.PI * 0.55), adventure ? m.paint2 : m.dark, frontX, fr, 0, 0, 0, Math.PI * 0.25);
  fend.scale.z = 2.2;
  // guidon et rétroviseurs
  add(new THREE.CylinderGeometry(0.014, 0.014, adventure ? 0.82 : 0.66, 10), m.dark, top.x - 0.05, top.y + 0.06, 0, Math.PI / 2);
  for (const z of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), m.dark, top.x - 0.06, top.y + 0.15, z * 0.24, z * 0.4);
    add(new THREE.BoxGeometry(0.03, 0.06, 0.1), m.dark, top.x - 0.06, top.y + 0.25, z * 0.28);
  }
  // phare
  const head = add(new THREE.CylinderGeometry(0.085, 0.07, 0.08, 24), m.dark, top.x + 0.08, top.y - 0.12, 0, 0, 0, Math.PI / 2);
  add(new THREE.CircleGeometry(0.075, 24), m.lamp, top.x + 0.125, top.y - 0.12, 0, 0, Math.PI / 2);
  head.scale.y = 1;
  // cadre
  const frameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(top.x - 0.02, top.y - 0.05, 0), new THREE.Vector3(0.05, 0.84, 0), new THREE.Vector3(-0.3, 0.66, 0), new THREE.Vector3(-0.3, 0.42, 0),
  ]);
  for (const z of [-0.11, 0.11]) { const t = add(new THREE.TubeGeometry(frameCurve, 24, 0.024, 8), m.frame, 0, 0, z); t.position.z = z; }
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(top.x - 0.02, top.y - 0.08, 0), new THREE.Vector3(0.3, 0.5, 0), new THREE.Vector3(0.05, 0.24, 0), new THREE.Vector3(-0.26, 0.3, 0)]), 24, 0.02, 8), m.frame, 0, 0, 0);
  // bras oscillant
  for (const z of [-0.1, 0.1]) {
    const sw = add(new THREE.BoxGeometry(0.48, 0.05, 0.03), m.frame, (rearX - 0.3) / 2, (r + 0.44) / 2, z);
    sw.rotation.z = Math.atan2(0.44 - r, -0.3 - rearX);
  }
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10), accent ? m.accent : m.chrome, -0.36, 0.58, 0.07, 0, 0, -0.5);   // amortisseur
  // moteur
  add(new THREE.BoxGeometry(0.42, 0.3, 0.3), m.engine, 0.02, 0.44);
  for (const [x, rz] of [[0.12, -0.35], [-0.08, 0.3]]) {
    const cyl = add(new THREE.BoxGeometry(0.16, 0.24, 0.22), m.engine, x, 0.66, 0, 0, 0, rz);
    for (let f = -2; f <= 2; f++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.25), m.engine); fin.position.y = f * 0.04; cyl.add(fin); }
  }
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 24), m.chrome, 0.04, 0.42, 0.17, Math.PI / 2);   // carter
  // réservoir
  const tank = add(new THREE.SphereGeometry(1, 32, 16), m.paint, 0.12, adventure ? 0.98 : 0.92, 0, 0, 0, -0.16);
  tank.scale.set(adventure ? 0.36 : 0.32, adventure ? 0.17 : 0.15, adventure ? 0.21 : 0.17);
  // selle
  const seat = add(new THREE.CapsuleGeometry(0.1, 0.42, 6, 16), m.seat, -0.32, adventure ? 0.95 : 0.88, 0, 0, 0, Math.PI / 2 + 0.08);
  seat.scale.set(0.7, 1, 1.25);
  // coque arrière
  const tail = add(new THREE.ConeGeometry(0.12, 0.5, 4), m.paint, -0.68, adventure ? 0.96 : 0.94, 0, 0, Math.PI / 4, Math.PI / 2 + 0.28);
  tail.scale.set(1, 1, 0.8);
  add(new THREE.BoxGeometry(0.03, 0.04, 0.12), m.tail, -0.93, adventure ? 1.02 : 1.0, 0);
  // échappement
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 0.48, 0.12), new THREE.Vector3(0.12, 0.2, 0.16), new THREE.Vector3(-0.3, 0.24, 0.18), new THREE.Vector3(-0.5, 0.44, 0.19)]), 30, 0.03, 8), m.chrome, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.065, 0.075, 0.38, 20), m.chrome, -0.64, 0.52, 0.19, 0, 0, Math.PI / 2 + 0.38);
  if (fairing) {   // carénage sportif
    const f = add(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), m.paint, top.x + 0.02, top.y - 0.12, 0, 0, 0, -Math.PI / 2 - 0.5);
    f.scale.set(0.24, 0.42, 0.2);
    const side = add(new THREE.SphereGeometry(1, 32, 16), m.paint, 0.22, 0.6, 0, 0, 0, 0.2);
    side.scale.set(0.42, 0.22, 0.2);
  }
  if (adventure) {   // bulle haute, sabot et valises
    add(new THREE.BoxGeometry(0.03, 0.34, 0.3), m.screen, top.x - 0.02, top.y + 0.14, 0, 0, 0, 0.42);
    add(new THREE.BoxGeometry(0.44, 0.06, 0.26), m.chrome, 0.04, 0.24);
    for (const z of [-0.29, 0.29]) add(new THREE.BoxGeometry(0.46, 0.36, 0.16), m.case, -0.7, 0.72, z);
    add(new THREE.BoxGeometry(0.06, 0.04, 0.36), m.accent, 0.12, 1.06);
  }
  bike.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return bike;
}

function podium(m, radius = 1.45) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.04, 0.09, 64), m.podium);
  base.position.y = 0.045; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.01, 0.008, 6, 96), m.ledWarm);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.075; g.add(ring);
  return g;
}

export function buildShowroom({ font = '"Archivo", sans-serif', mobile = false } = {}) {
  const room = new THREE.Group();
  const glow = [];     // éléments lumineux reflétés dans le sol
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const m = {
    wall: std({ color: 0x1b1d22, roughness: 0.85 }),
    wallPanel: std({ color: 0x111317, roughness: 0.6, metalness: 0.2 }),
    rubber: std({ color: 0x0a0a0b, roughness: 0.85 }),
    rim: std({ color: 0x15171a, roughness: 0.35, metalness: 0.8 }),
    chrome: std({ color: 0xb9bec6, roughness: 0.34, metalness: 1 }),
    dark: std({ color: 0x0d0e10, roughness: 0.45, metalness: 0.5 }),
    frame: std({ color: 0x1a1c20, roughness: 0.4, metalness: 0.7 }),
    engine: std({ color: 0x3a3d43, roughness: 0.35, metalness: 0.9 }),
    seat: std({ color: 0x0c0c0d, roughness: 0.8 }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeaf2ff).multiplyScalar(0.25), toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(1.6), toneMapped: false }),
    screen: phys({ color: 0x111820, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }),
    case: std({ color: 0x2a2c30, roughness: 0.4, metalness: 0.85 }),
    podium: std({ color: 0x0e0f12, roughness: 0.3, metalness: 0.6 }),
    ledWarm: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe8c8).multiplyScalar(2.4), toneMapped: false }),
    ledCool: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe8ff).multiplyScalar(2.2), toneMapped: false }),
    shelf: std({ color: 0x24262b, roughness: 0.3, metalness: 0.7 }),
    mullion: std({ color: 0x0b0c0e, roughness: 0.5, metalness: 0.6 }),
  };

  /* sol */
  const ft = floorTextures();
  const floorMat = std({ map: ft.map, roughnessMap: ft.rough, color: 0x9aa0a8, roughness: 0.55, metalness: 0.15, transparent: true, opacity: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -4; floor.renderOrder = -1;
  room.add(floor);

  /* murs */
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.right - ROOM.left, ROOM.h), m.wall);
  back.position.set(0, ROOM.h / 2, ROOM.back); room.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(20, ROOM.h), m.wall);
    side.rotation.y = -s * Math.PI / 2; side.position.set(s * ROOM.right, ROOM.h / 2, ROOM.back + 10); room.add(side);
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(ROOM.right - ROOM.left, 0.08, 0.02), m.wallPanel);
  plinth.position.set(0, 0.04, ROOM.back + 0.02); room.add(plinth);

  /* mur de casques */
  const cols = 11, rows = 4, cw = 0.95, rh = 0.68, x0 = -6.1, y0 = 0.5;
  const wallW = cols * cw, wallH = rows * rh;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(wallW + 0.3, wallH + 0.3, 0.12), m.wallPanel);
  panel.position.set(x0 + wallW / 2, y0 + wallH / 2 - 0.1, ROOM.back + 0.06); room.add(panel);
  const nicheMat = new THREE.MeshBasicMaterial({ map: nicheTexture(cols, rows), color: new THREE.Color(0.8, 0.78, 0.74), toneMapped: false });
  const niches = new THREE.Mesh(new THREE.PlaneGeometry(wallW, wallH), nicheMat);
  niches.position.set(x0 + wallW / 2, y0 + wallH / 2 - 0.1, ROOM.back + 0.125); room.add(niches); glow.push(niches);
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * rh - 0.08;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.025, 0.34), m.shelf);
    shelf.position.set(x0 + wallW / 2, y, ROOM.back + 0.3); room.add(shelf);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.008, 0.008), m.ledWarm);
    strip.position.set(x0 + wallW / 2, y + 0.014, ROOM.back + 0.47); room.add(strip);
  }
  // casques sur les étagères (instanciés : un seul appel de dessin par pièce)
  const hg = helmetLiteGeometries(mobile ? 20 : 28);
  const n = cols * rows;
  const shellMat = phys({ color: 0xffffff, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 });
  const visorMat = phys({ color: 0x090c12, roughness: 0.05, metalness: 0.9, clearcoat: 1 });
  const shellsA = new THREE.InstancedMesh(hg.adventure, shellMat, n), shellsF = new THREE.InstancedMesh(hg.full, shellMat, n);
  const visors = new THREE.InstancedMesh(hg.visor, visorMat, n);
  const palette = [0xf2f2ef, 0x101215, 0xb5121b, 0xf2f2ef, 0x2b3a55, 0xe8d21d, 0x8c9198, 0x101215, 0xd9561c, 0x2f6bff, 0x4b5a3a];
  const R = rng(11), dummy = new THREE.Object3D(), col = new THREE.Color();
  let ia = 0, ifull = 0;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const i = r * cols + k;
    dummy.position.set(x0 + (k + 0.5) * cw, y0 + r * rh + 0.08, ROOM.back + 0.3);
    dummy.rotation.set(0, (R() - 0.5) * 0.9 + (k < cols / 2 ? 0.25 : -0.25), 0);
    dummy.scale.setScalar(0.15);
    dummy.updateMatrix();
    const color = col.setHex(palette[Math.floor(R() * palette.length)]);
    if (R() < 0.4) { shellsA.setMatrixAt(ia, dummy.matrix); shellsA.setColorAt(ia, color); ia++; }
    else { shellsF.setMatrixAt(ifull, dummy.matrix); shellsF.setColorAt(ifull, color); ifull++; }
    visors.setMatrixAt(i, dummy.matrix);
  }
  shellsA.count = ia; shellsF.count = ifull;
  room.add(shellsA, shellsF, visors);

  /* enseigne néon au-dessus du mur */
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.49), new THREE.MeshBasicMaterial({ map: neonTexture("CASQUES", font), transparent: true, color: new THREE.Color(1.8, 1.8, 1.8), toneMapped: false, depthWrite: false }));
  neon.position.set(1.3, y0 + wallH + 0.14, ROOM.back + 0.14); room.add(neon); glow.push(neon);

  /* vitrine sur la rue, à gauche */
  const winW = 4.4, winH = 3.6, winX = -8.6;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: windowTexture(), toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.95) }));
  win.position.set(winX, winH / 2 + 0.2, ROOM.back + 0.01); room.add(win); glow.push(win);
  for (let k = 0; k <= 3; k++) {
    const mu = new THREE.Mesh(new THREE.BoxGeometry(0.07, winH, 0.1), m.mullion);
    mu.position.set(winX - winW / 2 + (k * winW) / 3, winH / 2 + 0.2, ROOM.back + 0.05); room.add(mu);
  }
  const transom = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.07, 0.1), m.mullion);
  transom.position.set(winX, 2.75, ROOM.back + 0.05); room.add(transom);

  /* motos exposées */
  const bikeMats = (paint, paint2, accent) => ({ ...m, paint: phys({ color: paint, roughness: 0.22, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05 }), paint2: std({ color: paint2, roughness: 0.5 }), accent: std({ color: accent, roughness: 0.4, metalness: 0.3 }) });
  const bikes = [
    { pos: [-1.75, -3.3], ry: 0.85, mats: bikeMats(0xb3121c, 0x111111, 0xd8d8d8), opt: { fairing: true }, pod: true },
    { pos: [2.7, -3.6], ry: -0.75, mats: bikeMats(0x3d4148, 0xd9561c, 0xd9561c), opt: { adventure: true, accent: true }, pod: false },
    { pos: [-5.2, -4.6], ry: 0.4, mats: bikeMats(0x0f1114, 0x0f1114, 0x2f6bff), opt: {}, pod: true },
  ];
  const spots = [];
  for (const b of bikes) {
    const grp = new THREE.Group();
    const bike = buildMotorcycle(b.mats, b.opt);
    bike.rotation.x = -0.07;             // posée sur la béquille
    grp.add(bike);
    if (b.pod) { const p = podium(m); grp.add(p); bike.position.y = 0.09; glow.push(p.children[1]); }
    grp.position.set(b.pos[0], 0, b.pos[1]); grp.rotation.y = b.ry;
    room.add(grp);
    spots.push(new THREE.Vector3(b.pos[0], 0.6, b.pos[1]));
  }

  /* éclairage de la concession */
  const lights = new THREE.Group();
  const wallSpot = new THREE.SpotLight(0xfff1de, 35, 14, 0.75, 0.8, 1.4);
  wallSpot.position.set(-0.8, 4.4, -3.4); wallSpot.target.position.set(-0.8, 1.6, ROOM.back); lights.add(wallSpot, wallSpot.target);
  spots.forEach((p, i) => {
    const s = new THREE.SpotLight(i === 0 ? 0xffffff : 0xfff0dc, 32, 9, 0.42, 0.7, 1.4);
    s.position.set(p.x + 0.4, 4.4, p.z + 0.8); s.target.position.copy(p); lights.add(s, s.target);
  });
  room.add(lights);

  /* reflets dans le sol ciré : copies inversées des éléments lumineux, vues à travers le sol translucide */
  if (!mobile) {
    const refl = new THREE.Group();
    room.updateMatrixWorld(true);
    for (const g of glow) {
      const c = g.clone();
      c.matrixAutoUpdate = false; c.renderOrder = -2;   // dessinés avant le sol
      c.material = g.material.clone(); c.material.color.multiplyScalar(0.45);
      c.matrix.copy(g.matrixWorld).premultiply(new THREE.Matrix4().makeScale(1, -1, 1));
      refl.add(c);
    }
    room.add(refl);
  }

  return { room, floor };
}
