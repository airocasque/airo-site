// Décor de la scène 3D : une concession moto réaliste.
// Motos et casques : modèles 3D réels (licence CC BY, voir mentions légales), sol en béton ciré
// avec reflets miroir, mur de casques rétroéclairé, vitrine sur rue, éclairage de magasin.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const DIR = "assets/showroom/";
const BACK = -7.2;           // mur du fond
// fichiers embarqués (aperçu autonome) sinon chemin normal
const url = (f) => (window.__AIRO_FILES && window.__AIRO_FILES[DIR + f]) || DIR + f;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/* Charge un modèle une seule fois, nettoie ses matériaux et le ramène à l'échelle réelle :
   posé au sol (y = 0), centré, avant orienté vers +z. */
export function loadModel(name, { scale = 1, yaw = 0, height = null } = {}) {
  if (!cache.has(name)) {
    cache.set(name, loader.loadAsync(url(name + ".glb")).then((g) => {
      const root = g.scene;
      const drop = []; root.traverse((n) => { if (/floor|plane1/i.test(n.name)) drop.push(n); });
      drop.forEach((n) => n.removeFromParent());
      root.traverse((m) => {
        if (!m.isMesh) return;
        const mat = m.material;
        // exports Sketchfab : beaucoup de matériaux marqués « transparents » sans raison
        if (mat.transparent && mat.opacity >= 0.99 && !/glass|visor|screen|windshield|lens|verre/i.test(mat.name + m.name)) {
          mat.transparent = false; mat.depthWrite = true;
        }
        if (mat.map) mat.map.anisotropy = 8;
        if (mat.emissive && mat.emissiveIntensity > 0.4) mat.emissiveIntensity = 0.4;   // phares éteints en exposition
        m.castShadow = true; m.receiveShadow = true;
      });
      return root;
    }));
  }
  return cache.get(name).then((src) => {
    const inner = cloneSkinned(src);   // certains modèles sont « skinnés » : un clone simple perdrait leur squelette
    inner.rotation.y = yaw;
    const wrap = new THREE.Group(); wrap.add(inner);
    let s = scale;
    if (height) { const b = new THREE.Box3().setFromObject(inner, true); s = height / (b.max.y - b.min.y); }
    inner.scale.multiplyScalar(s);
    inner.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(inner, true), c = b.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -b.min.y, -c.z);
    return wrap;
  });
}

/* Duplique un modèle en instances (un appel de dessin par pièce, quel que soit le nombre de copies). */
function instanced(model, matrices, colors = null) {
  const out = new THREE.Group();
  model.updateMatrixWorld(true);
  model.traverse((m) => {
    if (!m.isMesh) return;
    const tint = colors && /shell|blinn1|paint|body/i.test(m.material.name + m.name);
    const mat = tint ? m.material.clone() : m.material;
    if (tint) mat.color.set(0xffffff);       // la teinte de chaque copie vient de sa couleur d'instance
    const im = new THREE.InstancedMesh(m.geometry, mat, matrices.length);
    const local = m.matrixWorld.clone();
    matrices.forEach((M, i) => { im.setMatrixAt(i, M.clone().multiply(local)); if (tint) im.setColorAt(i, colors[i]); });
    im.castShadow = false; im.receiveShadow = true;
    out.add(im);
  });
  return out;
}

function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* Enduit mural sombre, légèrement nuancé. */
function plasterTex() {
  const R = rng(5);
  return canvasTex(512, 512, (g) => {
    g.fillStyle = "#26282d"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) { const v = 30 + R() * 22; g.fillStyle = `rgba(${v},${v + 1},${v + 4},0.06)`; g.beginPath(); g.arc(R() * 512, R() * 512, 2 + R() * 14, 0, 7); g.fill(); }
  }, { repeat: [6, 2] });
}

/* Vitrine de nuit sur la rue. */
function streetTex() {
  const R = rng(3);
  return canvasTex(1024, 768, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#050912"); sky.addColorStop(0.5, "#0d1830"); sky.addColorStop(0.7, "#1b2440"); sky.addColorStop(0.72, "#0b0d12"); sky.addColorStop(1, "#16181d");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // immeubles d'en face
    for (let x = 0; x < w;) {
      const bw = 90 + R() * 160, bh = 200 + R() * 260; g.fillStyle = `rgb(${10 + R() * 8},${12 + R() * 8},${18 + R() * 10})`;
      g.fillRect(x, h * 0.72 - bh, bw, bh);
      for (let yy = h * 0.72 - bh + 16; yy < h * 0.7 - 20; yy += 26) for (let xx = x + 10; xx < x + bw - 16; xx += 22) {
        if (R() < 0.35) { g.fillStyle = R() < 0.7 ? "rgba(255,196,120,0.75)" : "rgba(170,200,255,0.6)"; g.fillRect(xx, yy, 10, 14); }
      }
      x += bw + 6;
    }
    // lampadaires et phares
    for (let i = 0; i < 40; i++) {
      const x = R() * w, y = h * 0.6 + R() * h * 0.14, r = 3 + R() * 12, warm = R() > 0.4;
      const c = warm ? "255,190,120" : "150,185,255";
      const rg = g.createRadialGradient(x, y, 0, x, y, r * 3); rg.addColorStop(0, `rgba(${c},0.9)`); rg.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill();
    }
  });
}

/* Enseigne néon. */
function neonTex(text, font) {
  return canvasTex(1024, 192, (g) => {
    if ("fontStretch" in g) g.fontStretch = "condensed";
    if ("letterSpacing" in g) g.letterSpacing = "18px";
    g.font = `800 132px ${font}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#2f6bff"; g.shadowBlur = 26; g.fillStyle = "#e8eeff"; g.fillText(text, 512, 100);
    g.shadowBlur = 6; g.fillText(text, 512, 100);
  });
}

/* Construit la pièce (synchrone) ; les modèles 3D arrivent ensuite via populate(). */
export function buildShowroom({ renderer, font = '"Archivo", sans-serif', mobile = false } = {}) {
  const room = new THREE.Group();
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const basic = (o) => new THREE.MeshBasicMaterial(o);
  const tl = new THREE.TextureLoader();
  const tex = (f, srgb = true) => { const t = tl.load(url(f)); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); t.anisotropy = 8; return t; };

  /* sol : béton ciré (texture réelle) + reflet miroir sur ordinateur */
  const floorMat = std({ map: tex("floor-color.webp"), normalMap: tex("floor-normal.webp", false), roughnessMap: tex("floor-rough.webp", false),
    color: 0x7d8189, roughness: 0.62, metalness: 0.0, normalScale: new THREE.Vector2(0.6, 0.6) });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -2; floor.receiveShadow = true;
  room.add(floor);
  let mirror = null;
  if (!mobile && renderer) {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    mirror = new Reflector(new THREE.PlaneGeometry(30, 22), { textureWidth: Math.round(innerWidth * dpr * 0.6), textureHeight: Math.round(innerHeight * dpr * 0.6), color: 0x9a9ea6 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, -0.001, -2);
    room.add(mirror);
    floorMat.transparent = true; floorMat.opacity = 0.84;   // le béton laisse voir ~16 % de reflet
  }

  /* murs et plafond */
  const plaster = std({ map: plasterTex(), roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 5), plaster); back.position.set(0, 2.5, BACK); back.receiveShadow = true; room.add(back);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(22, 5), plaster); w.rotation.y = -s * Math.PI / 2; w.position.set(s * 12, 2.5, BACK + 11); room.add(w); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), std({ color: 0x0c0d10, roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.6, -2); room.add(ceil);
  const ledMat = basic({ color: new THREE.Color(0xfff6ea).multiplyScalar(2.2), toneMapped: false });
  for (const z of [-5.6, -3.2, -0.8, 1.6]) { const strip = new THREE.Mesh(new THREE.BoxGeometry(14, 0.03, 0.12), ledMat); strip.position.set(-1.5, 4.57, z); room.add(strip); }
  const skirting = new THREE.Mesh(new THREE.BoxGeometry(26, 0.1, 0.02), std({ color: 0x0b0c0e, roughness: 0.4, metalness: 0.5 })); skirting.position.set(0, 0.05, BACK + 0.01); room.add(skirting);

  /* mur de casques : gondole noire, fond rétroéclairé, tablettes en verre */
  const cols = 18, rows = 5, cw = 0.55, rh = 0.47, x0 = -5.9, y0 = 0.42, wallW = cols * cw, wallH = rows * rh;
  const gondola = new THREE.Mesh(new THREE.BoxGeometry(wallW + 0.24, wallH + 0.5, 0.5), std({ color: 0x0d0e11, roughness: 0.45, metalness: 0.4 }));
  gondola.position.set(x0 + wallW / 2, y0 + wallH / 2 - 0.05, BACK + 0.25); room.add(gondola);
  const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(wallW, wallH), basic({ color: new THREE.Color(0xf1e6d4).multiplyScalar(0.34), toneMapped: false }));
  glowPanel.position.set(x0 + wallW / 2, y0 + wallH / 2 - 0.05, BACK + 0.505); room.add(glowPanel);
  const upright = std({ color: 0x0b0c0f, roughness: 0.4, metalness: 0.6 });
  for (let k = 0; k <= cols; k += 3) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallH + 0.1, 0.06), upright); u.position.set(x0 + k * cw, y0 + wallH / 2 - 0.05, BACK + 0.55); room.add(u); }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.35, metalness: 0 });
  const shelfY = [];
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * rh - 0.04; shelfY.push(y);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.012, 0.36), glass); sh.position.set(x0 + wallW / 2, y, BACK + 0.7); room.add(sh);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.006, 0.006), ledMat); lip.position.set(x0 + wallW / 2, y + 0.009, BACK + 0.88); room.add(lip);
  }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.49), basic({ map: neonTex("CASQUES", font), transparent: true, color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false, depthWrite: false }));
  neon.position.set(x0 + wallW / 2 + 1.2, y0 + wallH + 0.42, BACK + 0.52); room.add(neon);

  /* vitrine sur la rue, à gauche */
  const winW = 4.6, winH = 3.8, winX = -9.0;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), basic({ map: streetTex(), toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.9) }));
  win.position.set(winX, winH / 2 + 0.15, BACK + 0.02); room.add(win);
  const frame = std({ color: 0x0b0c0e, roughness: 0.35, metalness: 0.8 });
  for (let k = 0; k <= 3; k++) { const mu = new THREE.Mesh(new THREE.BoxGeometry(0.08, winH, 0.12), frame); mu.position.set(winX - winW / 2 + (k * winW) / 3, winH / 2 + 0.15, BACK + 0.06); room.add(mu); }
  const tr = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.08, 0.12), frame); tr.position.set(winX, 3.0, BACK + 0.06); room.add(tr);

  /* podium de la moto vedette */
  const podium = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.52, 0.1, 96), std({ color: 0x15161a, roughness: 0.25, metalness: 0.5 }));
  disc.position.y = 0.05; disc.receiveShadow = true; disc.castShadow = true; podium.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.515, 0.007, 6, 160), basic({ color: new THREE.Color(0xfff1dd).multiplyScalar(2), toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.085; podium.add(ring);
  podium.position.set(-2.1, 0, -3.1); room.add(podium);

  /* éclairage du magasin */
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight(0xe8eef8, 0x1a1b1f, 0.55));
  const wallWash = new THREE.SpotLight(0xfff3e4, 45, 12, 0.8, 0.9, 1.2);
  wallWash.position.set(-0.8, 4.4, -3.6); wallWash.target.position.set(-0.8, 1.4, BACK); lights.add(wallWash, wallWash.target);
  const bikeSpot = new THREE.SpotLight(0xffffff, 60, 9, 0.42, 0.6, 1.3);
  bikeSpot.position.set(-1.6, 4.4, -2.0); bikeSpot.target.position.set(-2.1, 0.4, -3.1); lights.add(bikeSpot, bikeSpot.target);
  const advSpot = new THREE.SpotLight(0xfff4e8, 40, 9, 0.45, 0.6, 1.3);
  advSpot.position.set(2.8, 4.4, -2.4); advSpot.target.position.set(2.7, 0.4, -3.4); lights.add(advSpot, advSpot.target);
  // lumière principale avec ombres portées (borne, motos)
  const key = new THREE.SpotLight(0xffffff, 120, 16, 0.7, 0.7, 1.2);
  key.position.set(1.8, 5.2, 3.2); key.target.position.set(-0.6, 0, -2.0);
  if (!mobile) {
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 2; key.shadow.camera.far = 14; key.shadow.radius = 4;
  }
  lights.add(key, key.target);
  room.add(lights);

  /* arrivée des modèles 3D réels */
  async function populate(scene) {
    const R = rng(21);
    // motos
    const bikes = [
      loadModel("bike-sport", { yaw: Math.PI }).then((b) => { b.position.set(-2.1, 0.1, -3.1); b.rotation.y = 0.95; room.add(b); }),
      loadModel("bike-adv", { yaw: -Math.PI / 2 }).then((b) => { b.position.set(2.75, 0, -3.5); b.rotation.y = -0.75; room.add(b); }),
    ];
    if (!mobile) bikes.push(loadModel("bike-cruiser", { scale: 0.01 }).then((b) => { b.position.set(-5.4, 0, -4.4); b.rotation.y = 1.15; room.add(b); }));
    // casques sur les tablettes
    const helmets = [loadModel("helmet-a-lod", { height: 0.3, yaw: Math.PI }), loadModel("helmet-b-lod", { height: 0.3 })];
    const [ha, hb] = await Promise.all(helmets);
    const palette = [0xf2f2f0, 0xf2f2f0, 0xb61b1b, 0x1d3f8f, 0xe8c51c, 0x5d636b, 0x151618, 0xd9561c, 0x151618, 0xb61b1b].map((c) => new THREE.Color(c));
    const cb = [];
    const ma = [], mb = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      if (R() < (mobile ? 0.45 : 0.1)) continue;                                     // quelques places vides, comme en magasin
      e.set(0, (R() - 0.5) * 0.7 + (k < cols / 2 ? 0.2 : -0.2), 0); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x0 + (k + 0.5) * cw, shelfY[r] + 0.007, BACK + 0.72), q, one);
      if (R() < 0.12) ma.push(m4.clone()); else { mb.push(m4.clone()); cb.push(palette[Math.floor(R() * palette.length)]); }
    }
    // les casques des étagères ne sont pas recalculés dans le reflet du sol (calque 1)
    for (const g of [instanced(ha, ma), instanced(hb, mb, cb)]) { g.traverse((o) => o.layers.set(1)); room.add(g); }
    await Promise.all(bikes);
  }

  return { room, floor, mirror, keyLight: key, populate };
}
