// Concession AIRO entièrement en 3D : une seule salle continue que la caméra parcourt au défilement.
// Repère : dessus du socle y = 0, borne au centre (x = z = 0) face à +z ; sol à y = FLOOR.
// Zones : entrée (+z), mur de casques (gauche, x < 0), mur du fond avec l'enseigne et les écrans des
// programmes (-z), comptoir des professionnels (droite, +z), salon (droite, -z).
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { loadModel } from "./showroom.js";

const url = (f) => (window.__AIRO_FILES && window.__AIRO_FILES[f]) || f;
export const FLOOR = -0.15;
const X0 = -11, X1 = 11, Z0 = -9, Z1 = 15, CEIL = FLOOR + 4.6;

function canvasTex(w, h, draw, aniso = 8) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return t;
}

/* Sol réfléchissant : béton poli (texture) + reflet du décor, flouté et plus fort en lumière rasante. */
const floorShader = {
  name: "AiroFloor",
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    tFloor: { value: null }, tRough: { value: null }, repeat: { value: new THREE.Vector2(6, 6) },
    tint: { value: new THREE.Color(0.11, 0.11, 0.12) }, strength: { value: 0.55 }, texel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUv4; varying vec2 vUv; varying vec3 vWorld;
    void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vUv4 = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse, tFloor, tRough; uniform vec2 repeat, texel; uniform vec3 tint; uniform float strength;
    varying vec4 vUv4; varying vec2 vUv; varying vec3 vWorld;
    void main(){
      vec2 fuv = vUv * repeat;
      vec3 base = texture2D(tFloor, fuv).rgb * tint;
      float rough = texture2D(tRough, fuv).r;
      vec2 p = vUv4.xy / vUv4.w;
      float b = mix(1.5, 7.0, rough);                     // béton plus ou moins lisse : reflet plus ou moins net
      vec3 r = texture2D(tDiffuse, p).rgb * 0.28;
      r += texture2D(tDiffuse, p + vec2( b,  0.0) * texel).rgb * 0.18;
      r += texture2D(tDiffuse, p + vec2(-b,  0.0) * texel).rgb * 0.18;
      r += texture2D(tDiffuse, p + vec2( 0.0,  b) * texel).rgb * 0.18;
      r += texture2D(tDiffuse, p + vec2( 0.0, -b) * texel).rgb * 0.18;
      vec3 v = normalize(cameraPosition - vWorld);
      float fres = 0.35 + 0.65 * pow(1.0 - clamp(v.y, 0.0, 1.0), 3.0);
      gl_FragColor = vec4(base + r * strength * fres * (1.15 - rough * 0.5), 1.0);
    }`,
};

/* Un modèle répété N fois en une seule série d'appels de dessin (un InstancedMesh par maillage). */
function instanced(root, mats) {
  const g = new THREE.Group();
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (!m.isMesh) return;
    const im = new THREE.InstancedMesh(m.geometry, m.material, mats.length);
    mats.forEach((M, i) => im.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(M, m.matrixWorld)));
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
    g.add(im);
  });
  return g;
}

export async function buildWorld({ renderer, mobile = false, font = "sans-serif" } = {}) {
  const group = new THREE.Group();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tl = new THREE.TextureLoader();
  const tex = (n, rx = 1, ry = 1, srgb = false) => {
    const t = tl.load(url(`assets/world/${n}.webp`));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
  const box = (w, h, d, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); group.add(m); return m; };

  const warm = glow(3.2, 2.2, 1.35), warmSoft = glow(1.4, 0.95, 0.6), cool = glow(2.6, 2.8, 3.2), blue = glow(0.22, 0.5, 1.9);
  const walnut = std({ map: tex("smoked_walnut_veneer_diff", 1, 3, true), roughnessMap: tex("smoked_walnut_veneer_rough", 1, 3), normalMap: tex("smoked_walnut_veneer_nor", 1, 3), color: 0xb08a6e, roughness: 1, metalness: 0 });
  const walnutH = std({ map: tex("smoked_walnut_veneer_diff", 3, 1, true), roughnessMap: tex("smoked_walnut_veneer_rough", 3, 1), color: 0xb08a6e, roughness: 1 });
  const wall = std({ map: tex("concrete_wall_008_diff", 4, 1.2, true), normalMap: tex("concrete_wall_008_nor", 4, 1.2), color: 0x232326, roughness: 0.92 });
  const black = std({ color: 0x0b0c0f, roughness: 0.45, metalness: 0.3 });
  const satin = std({ color: 0x16181d, roughness: 0.3, metalness: 0.6 });
  const stone = std({ color: 0x8c8882, roughness: 0.32, metalness: 0 });
  const ceilMat = std({ color: 0x08090b, roughness: 0.9 });

  /* ---------- sol ---------- */
  const FW = X1 - X0, FD = Z1 - Z0, FZ = (Z0 + Z1) / 2;
  const diff = tex("smooth_concrete_floor_diff", 1, 1, true), rough = tex("smooth_concrete_floor_rough");
  let reflector = null;
  if (!mobile) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    reflector = new Reflector(new THREE.PlaneGeometry(FW, FD), {
      shader: floorShader, textureWidth: Math.round(size.x * 0.5), textureHeight: Math.round(size.y * 0.5), clipBias: 0.003, multisample: 0,
    });
    const u = reflector.material.uniforms;
    u.tFloor.value = diff; u.tRough.value = rough; u.repeat.value.set(FW / 3.5, FD / 3.5);
    u.texel.value.set(1 / (size.x * 0.5), 1 / (size.y * 0.5));
    reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, FLOOR, FZ);
    group.add(reflector);
  } else {
    for (const t of [diff, rough]) t.repeat.set(FW / 3.5, FD / 3.5);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), std({ map: diff, roughnessMap: rough, color: 0x2a2a2e, roughness: 0.55, metalness: 0.1, envMapIntensity: 1.4 }));
    f.rotation.x = -Math.PI / 2; f.position.set(0, FLOOR, FZ); group.add(f);
  }

  /* ---------- murs et plafond ---------- */
  const WH = CEIL - FLOOR, WY = FLOOR + WH / 2;
  plane(FW, WH, wall, 0, WY, Z0);                                   // fond
  plane(FD, WH, wall, X0, WY, FZ, Math.PI / 2);                     // gauche
  plane(FD, WH, wall, X1, WY, FZ, -Math.PI / 2);                    // droite
  plane(FW, WH, black, 0, WY, Z1, Math.PI);                         // entrée
  plane(FW, FD, ceilMat, 0, CEIL, FZ, 0, Math.PI / 2);              // plafond
  // plinthes lumineuses : la lumière qui « coule » au pied des murs
  box(FW, 0.02, 0.02, warmSoft, 0, FLOOR + 0.01, Z0 + 0.04);
  box(0.02, 0.02, FD, warmSoft, X0 + 0.04, FLOOR + 0.01, FZ);
  box(0.02, 0.02, FD, warmSoft, X1 - 0.04, FLOOR + 0.01, FZ);

  /* ---------- mur du fond : lattes de noyer, enseigne AIRO, écrans ---------- */
  const SL = mobile ? 40 : 58, slatGeo = new THREE.BoxGeometry(0.055, WH - 0.5, 0.06);
  const slats = new THREE.InstancedMesh(slatGeo, walnut, SL);
  for (let i = 0; i < SL; i++) slats.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-3.5 + (i + 0.5) * (7 / SL), WY, Z0 + 0.12));
  group.add(slats);
  box(7.2, WH - 0.5, 0.02, black, 0, WY, Z0 + 0.04);
  box(7.2, 0.03, 0.03, warm, 0, FLOOR + 0.27, Z0 + 0.06);          // éclairage indirect derrière les lattes
  box(7.2, 0.03, 0.03, warm, 0, CEIL - 0.27, Z0 + 0.06);
  // enseigne lumineuse
  const sign = canvasTex(1024, 300, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `italic 800 190px ${font}`; g.fillStyle = "#fff"; g.fillText("AIRO", w / 2, 128);
    g.font = `700 44px ${font}`; g.fillStyle = "#cfd8ff"; g.fillText("N E T T O Y A G E   C A S Q U E", w / 2, 258);
  }, aniso);
  const signMat = new THREE.MeshBasicMaterial({ map: sign, transparent: true, color: new THREE.Color(2.4, 2.4, 2.6), depthWrite: false });
  plane(3.4, 1.0, signMat, 0, FLOOR + 3.3, Z0 + 0.2);

  // écrans : programmes (gauche) et image de marque (droite)
  const screenTex = (draw) => canvasTex(1280, 720, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#0b1530"); bg.addColorStop(1, "#05070d");
    g.fillStyle = bg; g.fillRect(0, 0, w, h); draw(g, w, h);
  }, aniso);
  const progTex = screenTex((g, w) => {
    g.fillStyle = "#7f9cff"; g.font = `700 34px ${font}`; g.fillText("PROGRAMMES AIRO", 80, 110);
    [["10 min", "Nettoyage avancé"], ["7 min", "Nettoyage rapide"], ["3 min", "Séchage seul"]].forEach(([t, s], i) => {
      const x = 80 + i * 390;
      g.fillStyle = "#fff"; g.font = `800 120px ${font}`; g.fillText(t.split(" ")[0], x, 330);
      g.fillStyle = "#9fb3ff"; g.font = `700 40px ${font}`; g.fillText("min", x + (t.startsWith("10") ? 150 : 82), 330);
      g.fillStyle = "#c9d2ea"; g.font = `500 34px ${font}`; g.fillText(s, x, 400);
      g.fillStyle = "#2f6bff"; g.fillRect(x, 440, 260, 6);
    });
    g.fillStyle = "#c9d2ea"; g.font = `500 32px ${font}`; g.fillText("Vapeur sèche · désinfection · séchage", 80, 600);
  });
  const brandTex = screenTex((g, w, h) => {
    g.fillStyle = "#fff"; g.font = `italic 800 170px ${font}`; g.textAlign = "center"; g.fillText("AIRO", w / 2, 330);
    g.fillStyle = "#c9d2ea"; g.font = `500 44px ${font}`; g.fillText("Un casque propre, désinfecté et sec", w / 2, 450);
    g.fillText("en quelques minutes.", w / 2, 510);
    g.fillStyle = "#2f6bff"; g.fillRect(w / 2 - 140, 580, 280, 6);
  });
  const proTex = screenTex((g, w) => {
    g.fillStyle = "#7f9cff"; g.font = `700 34px ${font}`; g.fillText("ESPACE PROFESSIONNEL", 80, 110);
    g.fillStyle = "#fff"; g.font = `800 64px ${font}`; g.fillText("Un service en plus,", 80, 230); g.fillText("sans personnel.", 80, 310);
    ["Nouveau revenu, paiement par carte", "Installation, formation et SAV inclus", "Concessions · circuits · karting · équitation"].forEach((s, i) => {
      g.fillStyle = "#2f6bff"; g.fillRect(80, 398 + i * 78, 14, 14);
      g.fillStyle = "#c9d2ea"; g.font = `500 38px ${font}`; g.fillText(s, 116, 412 + i * 78);
    });
  });
  const screenMat = (map) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.15, 1.15, 1.15) });
  const screen = (map, w, x, y, z, ry) => {
    const h = w * 9 / 16, o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = ry; group.add(o);
    box(w + 0.08, h + 0.08, 0.06, satin, 0, 0, 0, o);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat(map)); s.position.z = 0.032; o.add(s);
    return o;
  };
  screen(progTex, 3.4, -6.2, FLOOR + 2.3, Z0 + 0.1, 0);
  screen(brandTex, 3.4, 6.2, FLOOR + 2.3, Z0 + 0.1, 0);

  /* ---------- socle de la borne ---------- */
  const PS = 2.3;
  box(PS, -FLOOR, PS, std({ color: 0x0a0b0d, roughness: 0.18, metalness: 0.5 }), 0, FLOOR / 2, 0);
  for (const [w, d, x, z] of [[PS, 0.02, 0, PS / 2], [PS, 0.02, 0, -PS / 2], [0.02, PS, PS / 2, 0], [0.02, PS, -PS / 2, 0]])
    box(w + 0.01, 0.025, d + 0.01, blue, x, -0.012, z);
  // anneau lumineux au plafond, au-dessus de la borne
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.035, 8, 96), cool);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, CEIL - 0.6, 0); group.add(ring);
  for (const a of [0, 2.1, 4.2]) {   // suspentes
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), satin); c.position.set(Math.cos(a) * 1.5, CEIL - 0.3, Math.sin(a) * 1.5); group.add(c);
  }

  /* ---------- lignes lumineuses au plafond ---------- */
  for (const x of [-6, 6]) box(0.06, 0.02, 14, warmSoft, x, CEIL - 0.02, 2);
  for (const z of [-5, 9]) box(10, 0.02, 0.06, warmSoft, 0, CEIL - 0.02, z);

  /* ---------- piliers ---------- */
  for (const [x, z] of [[-4.6, -3.2], [4.6, -3.2], [-4.6, 8], [4.6, 8]]) {
    box(0.55, WH, 0.55, black, x, WY, z);
    box(0.02, WH - 0.4, 0.02, warm, x + (x < 0 ? 0.28 : -0.28), WY, z + 0.28);
  }

  /* ---------- mur de casques (gauche) ---------- */
  const COLS = mobile ? 6 : 8, ROWS = mobile ? 3 : 4, cz0 = -6.2, cz1 = 5.2, cw = (cz1 - cz0) / COLS;
  const hw = new THREE.Group(); group.add(hw);
  box(0.06, WH - 0.4, cz1 - cz0 + 0.4, black, X0 + 0.05, WY, (cz0 + cz1) / 2, hw);
  const rowY = (r) => FLOOR + 0.75 + r * 0.72;
  const shelfGeo = new THREE.BoxGeometry(0.42, 0.035, cw - 0.12);
  const shelves = new THREE.InstancedMesh(shelfGeo, walnutH, COLS * ROWS);
  const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.015, 0.012, cw - 0.16), warm, COLS * ROWS);
  const backs = new THREE.InstancedMesh(new THREE.PlaneGeometry(cw - 0.14, 0.6), glow(0.045, 0.035, 0.028), COLS * ROWS);
  const helmetSpots = [];
  let k = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++, k++) {
    const z = cz0 + (c + 0.5) * cw, y = rowY(r);
    shelves.setMatrixAt(k, new THREE.Matrix4().makeTranslation(X0 + 0.29, y, z));
    strips.setMatrixAt(k, new THREE.Matrix4().makeTranslation(X0 + 0.46, y + 0.6, z));
    backs.setMatrixAt(k, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(X0 + 0.09, y + 0.31, z));
    helmetSpots.push(new THREE.Vector3(X0 + 0.3, y + 0.02, z));
  }
  hw.add(shelves, strips, backs);

  /* ---------- comptoir des professionnels (droite, devant) ---------- */
  const cx = 7.6, cz = 4.6, CL = 4.4;
  box(0.9, 1.0, CL, walnut, cx, FLOOR + 0.5, cz);
  box(1.05, 0.05, CL + 0.15, stone, cx - 0.05, FLOOR + 1.02, cz);
  box(0.02, 0.02, CL, warm, cx - 0.47, FLOOR + 0.04, cz);
  screen(proTex, 3.6, X1 - 0.08, FLOOR + 2.35, cz, -Math.PI / 2);

  /* ---------- salon (droite, fond) ---------- */
  const rug = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#1a1a1d"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = "#3a3630"; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44);
  }, aniso);
  const rugM = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4), std({ map: rug, roughness: 1 }));
  rugM.rotation.x = -Math.PI / 2; rugM.position.set(8.1, FLOOR + 0.006, -3.6); group.add(rugM);
  // panneau mural rétroéclairé derrière le canapé
  box(0.05, 2.2, 4.6, walnut, X1 - 0.06, FLOOR + 1.9, -3.6);
  box(0.02, 0.02, 4.6, warm, X1 - 0.1, FLOOR + 0.78, -3.6);
  // suspensions
  for (const z of [-4.3, -2.9]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 32, 1, true), std({ color: 0x1b1b1e, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }));
    s.position.set(8.1, FLOOR + 2.6, z); group.add(s);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.21, 32), warm); d.rotation.x = Math.PI / 2; d.position.set(8.1, FLOOR + 2.53, z); group.add(d);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, CEIL - FLOOR - 2.68, 4), satin); c.position.set(8.1, (CEIL + FLOOR + 2.68) / 2, z); group.add(c);
  }

  /* ---------- lumières du décor ---------- */
  const spot = (color, i, x, y, z, tx, ty, tz, angle = 0.6, dist = 14) => {
    const s = new THREE.SpotLight(color, i, dist, angle, 0.8, 1.6); s.position.set(x, y, z); s.target.position.set(tx, ty, tz); group.add(s, s.target); return s;
  };
  spot(0xffd2a6, 70, -7.5, CEIL - 0.1, -2.5, X0, FLOOR + 1.6, -3.5, 0.75);
  spot(0xffd2a6, 70, -7.5, CEIL - 0.1, 3.0, X0, FLOOR + 1.6, 2.8, 0.75);
  spot(0xffe2c4, 18, cx - 1.6, CEIL - 0.1, cz, cx + 0.6, FLOOR + 1, cz, 0.7);
  spot(0xffe2c4, 45, 0, CEIL - 0.1, Z0 + 2.5, 0, FLOOR + 1.5, Z0, 0.9);
  const lounge = new THREE.PointLight(0xffb070, 16, 7, 1.8); lounge.position.set(8.1, FLOOR + 2.2, -3.6); group.add(lounge);
  if (!mobile) { const l2 = new THREE.PointLight(0xffb070, 8, 6, 1.8); l2.position.set(X1 - 0.6, FLOOR + 1.0, -3.6); group.add(l2); }

  /* ---------- mobilier (modèles CC0 Poly Haven) et casques ---------- */
  const place = (name, x, z, yaw, opts = {}) => loadModel(name, { yaw, ...opts }).then((m) => { m.position.set(x, FLOOR, z); group.add(m); return m; }).catch(() => null);
  const furniture = Promise.all([
    place("sofa_02", 9.9, -3.6, -Math.PI / 2, { scale: 1.15 }),
    place("mid_century_lounge_chair", 6.7, -2.3, Math.PI / 2 + 0.45),
    place("modern_arm_chair_01", 6.6, -5.0, Math.PI / 2 - 0.35),
    place("modern_coffee_table_01", 8.2, -3.6, Math.PI / 2),
    place("pachira_aquatica_01", 10.2, -6.9, 0, { height: 2.1 }),
    place("calathea_orbifolia_01", 10.3, -0.5, 0, { height: 1.0 }),
    place("potted_plant_04", 8.2, -3.6, 0, { height: 0.32 }).then((m) => { if (m) m.position.y = FLOOR + 0.4; }),
    place("pachira_aquatica_01", -9.9, 7.3, 1, { height: 1.9 }),
    place("calathea_orbifolia_01", cx, cz + CL / 2 + 0.7, 0, { height: 1.1 }),
  ]);
  const helmets = Promise.all([loadModel("helmet-a", { height: 0.33 }), loadModel("helmet-b", { height: 0.33 })]).then(([a, b]) => {
    const ma = [], mb = [];
    helmetSpots.forEach((p, i) => {
      const yaw = Math.PI / 2 + (((i * 37) % 7) - 3) * 0.12;                 // tournés vers la salle, un peu variés
      (i % 3 === 1 ? mb : ma).push(new THREE.Matrix4().makeRotationY(yaw).setPosition(p));
    });
    hw.add(instanced(a, ma), instanced(b, mb));
  }).catch(() => null);
  await Promise.all([furniture, helmets]);
  group.traverse((m) => { if (m.isMesh && m !== reflector) { m.receiveShadow = false; m.castShadow = false; } });

  /* ---------- points de vue de chaque zone ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const targets = {
    helmets: V(X0, FLOOR + 1.6, -0.5), screenProg: V(-6.2, FLOOR + 2.2, Z0), sign: V(0, FLOOR + 3.2, Z0),
    counter: V(X1, FLOOR + 1.9, cz), lounge: V(8.6, FLOOR + 0.6, -3.6),
  };
  return { group, reflector, targets };
}
