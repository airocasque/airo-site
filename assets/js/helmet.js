// Casque AIRO « aventure » : d'après le fichier AIRO_helmet_3D fourni (coque anthracite,
// casquette carbone, pivots métal, visière fumée, mousses), remodélisé en haute définition.
import * as THREE from "three";

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* Coque : sphère déformée. Avant = +z, haut = +y. */
function shellShape(geo, { beak = true } = {}) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    // ouverture du cou, plus basse devant
    const cut = -0.5 - 0.18 * z;
    const k = smooth(cut + 0.08, cut - 0.3, y);
    if (k > 0) { y = lerp(y, cut + (y - cut) * 0.1, k); x *= 1 - 0.08 * k; z *= 1 - 0.05 * k; }
    // mentonnière « bec » : avancée en pointe, typique des casques aventure
    if (beak && z > 0.1 && y < 0.0) {
      const f = smooth(0.0, -0.55, y) * smooth(0.1, 0.9, z);
      const narrow = Math.max(0, 1 - Math.pow(Math.abs(x) / 0.62, 2));
      z += 0.36 * f * narrow;
      y -= 0.06 * f * narrow;
    }
    // cadre de visière en léger retrait
    if (z > 0.55 && y > -0.12 && y < 0.36 && Math.abs(x) < 0.68) z -= 0.03;
    // crâne un peu plus haut et plus long vers l'arrière
    if (z < 0) z *= 1.06;
    p.setXYZ(i, x * 0.86, y * 0.98, z * 1.04);
  }
  geo.computeVertexNormals();
  return geo;
}

/* Texture carbone tissée (canvas). */
function carbonTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#0d0f12"; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const horiz = (x + y) % 2 === 0;
    const grd = horiz ? g.createLinearGradient(x * 16, 0, x * 16 + 16, 0) : g.createLinearGradient(0, y * 16, 0, y * 16 + 16);
    grd.addColorStop(0, "#15181d"); grd.addColorStop(0.5, "#2a2f37"); grd.addColorStop(1, "#15181d");
    g.fillStyle = grd; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* Logo AIRO pour les flancs. */
function decalTexture(font) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 160;
  const g = c.getContext("2d");
  if ("fontStretch" in g) g.fontStretch = "ultra-condensed";
  g.font = `italic 900 120px ${font}`; g.fillStyle = "#e9ecf1"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("AIRO", 256, 76);
  g.fillStyle = "#2f6bff"; g.fillRect(96, 134, 320, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function helmetMaterials(font = '"Archivo", sans-serif') {
  const carbon = carbonTexture();
  return {
    shell: new THREE.MeshPhysicalMaterial({ color: 0x1d232a, metalness: 0.55, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 }),
    carbon: new THREE.MeshPhysicalMaterial({ map: carbon, color: 0xffffff, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, metalness: 0.2, roughness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc3c9d2, metalness: 1, roughness: 0.22 }),
    padding: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.95 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x0b1530, metalness: 0.9, roughness: 0.05, clearcoat: 1, iridescence: 0.9, iridescenceIOR: 1.7, iridescenceThicknessRange: [300, 800], envMapIntensity: 1.1, side: THREE.DoubleSide }),
    stripe: new THREE.MeshStandardMaterial({ color: 0x2f6bff, emissive: 0x2f6bff, emissiveIntensity: 0.45, roughness: 0.4 }),
    decal: new THREE.MeshStandardMaterial({ map: decalTexture(font), transparent: true, metalness: 0.3, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
}

/* Retourne un groupe à l'échelle 1 (≈ 2 unités de haut). Mettre à l'échelle selon la scène. */
export function buildAdventureHelmet(mats, seg = 128) {
  const h = new THREE.Group();
  const sphere = (w, hh, ps, pl, ts, tl) => new THREE.SphereGeometry(1, w, hh, ps, pl, ts, tl);

  // coque
  h.add(new THREE.Mesh(shellShape(sphere(seg, Math.round(seg * 0.62))), mats.shell));
  // mousses visibles au cou
  const pad = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 16, 64), mats.padding);
  pad.rotation.x = Math.PI / 2 + 0.18; pad.position.set(0, -0.5, -0.05); pad.scale.set(1.08, 1.12, 1); h.add(pad);

  // visière + joint
  const vis = () => shellShape(sphere(80, 30, Math.PI / 2 - 0.92, 1.84, Math.PI * 0.34, Math.PI * 0.22), { beak: false });
  const gasket = new THREE.Mesh(vis(), mats.black); gasket.scale.set(1.02, 1.07, 1.02); h.add(gasket);
  const visor = new THREE.Mesh(vis(), mats.visor); visor.scale.setScalar(1.035); h.add(visor);

  // pivots métal de visière et de casquette
  for (const sx of [1, -1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.05, 40), mats.black);
    pod.rotation.z = Math.PI / 2; pod.position.set(sx * 0.84, 0.04, 0.3); pod.scale.set(1, 1, 1.2); h.add(pod);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 6), mats.metal);
    screw.rotation.z = Math.PI / 2; screw.position.set(sx * 0.875, 0.04, 0.3); h.add(screw);
  }

  // casquette carbone : plaque galbée qui épouse le crâne puis s'avance au-dessus de la visière
  const peakShape = new THREE.Shape();
  peakShape.moveTo(-0.7, 0); peakShape.quadraticCurveTo(-0.78, 0.55, -0.42, 0.98);
  peakShape.quadraticCurveTo(0, 1.12, 0.42, 0.98); peakShape.quadraticCurveTo(0.78, 0.55, 0.7, 0);
  peakShape.quadraticCurveTo(0, -0.12, -0.7, 0);
  const peakGeo = new THREE.ExtrudeGeometry(peakShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
  peakGeo.rotateX(-Math.PI / 2); // plaque à plat : x largeur, z longueur (vers l'avant = -z de la forme)
  const pp = peakGeo.attributes.position, pv = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) {
    pv.fromBufferAttribute(pp, i);
    const fwd = -pv.z;                                   // 0 à la fixation → ~1.1 à la pointe
    const curveX = 0.2 * pv.x * pv.x;                    // galbe transversal, épouse le front
    const rise = 0.03 * fwd * fwd;                       // léger relevé vers l'avant
    pp.setXYZ(i, pv.x, pv.y - curveX + rise, fwd * 0.66);
  }
  peakGeo.computeVertexNormals();
  const peak = new THREE.Mesh(peakGeo, mats.carbon);
  peak.position.set(0, 0.86, 0.36); peak.rotation.x = 0.1; h.add(peak);
  // vis de fixation de la casquette
  for (const sx of [0.5, -0.5]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), mats.metal);
    s.position.set(sx * 0.9, 0.8, 0.5); h.add(s);
  }

  // grille de bec et aérations
  const beakVent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), mats.black);
  beakVent.position.set(0, -0.36, 1.27); beakVent.rotation.x = -0.45; h.add(beakVent);
  for (let k = -2; k <= 2; k++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.02), mats.metal);
    slot.position.set(k * 0.05, -0.36, 1.305); slot.rotation.x = -0.45; h.add(slot);
  }

  // logos AIRO et liseré bleu
  for (const side of [1, -1]) {
    const phi = side > 0 ? Math.PI + 0.42 : -0.42;
    const d = new THREE.Mesh(shellShape(sphere(32, 12, phi - 0.55, 1.1, Math.PI * 0.43, Math.PI * 0.15), { beak: false }), mats.decal);
    d.scale.setScalar(1.006); h.add(d);
  }
  const stripe = new THREE.Mesh(shellShape(sphere(64, 4, Math.PI / 2 - 1.5, 3.0, Math.PI * 0.585, Math.PI * 0.012), { beak: false }), mats.stripe);
  stripe.scale.setScalar(1.004); h.add(stripe);

  return h;
}

/* Version allégée pour les présentoirs : coque « aventure », coque intégrale et visière, en géométries seules. */
export function helmetLiteGeometries(seg = 28) {
  const sphere = (w, hh, ps, pl, ts, tl) => new THREE.SphereGeometry(1, w, hh, ps, pl, ts, tl);
  const rows = Math.round(seg * 0.62);
  const visor = shellShape(sphere(seg, Math.max(8, Math.round(seg * 0.4)), Math.PI / 2 - 0.92, 1.84, Math.PI * 0.34, Math.PI * 0.22), { beak: false });
  visor.scale(1.035, 1.035, 1.035);
  return {
    adventure: shellShape(sphere(seg, rows)),
    full: shellShape(sphere(seg, rows), { beak: false }),
    visor,
  };
}
