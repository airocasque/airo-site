// Décor de la scène 3D : la photo de la concession, remise en relief grâce à sa carte de profondeur
// (assets/scene/depth16.png, calculée hors ligne). La caméra peut s'y déplacer avec une vraie parallaxe ;
// la borne 3D est posée sur le socle central. Repère : sol y = 0, socle centré en x = z = 0,
// point de vue d'origine de la photo sur +z (voir assets/scene/scene.json).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

// fichiers embarqués (aperçu autonome) sinon chemin normal
const url = (f) => (window.__AIRO_FILES && window.__AIRO_FILES[f]) || f;

/* ---------- modèles 3D (casques des casiers) ---------- */
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/* Charge un modèle une seule fois et le ramène à l'échelle réelle : posé au sol, centré, avant vers +z. */
export function loadModel(name, { scale = 1, yaw = 0, height = null } = {}) {
  if (!cache.has(name)) {
    cache.set(name, loader.loadAsync(url("assets/showroom/" + name + ".glb")).then((g) => {
      const root = g.scene;
      root.traverse((m) => {
        if (!m.isMesh) return;
        const mat = m.material;
        // exports Sketchfab : matériaux souvent marqués « transparents » sans raison
        if (mat.transparent && mat.opacity >= 0.99 && !/glass|visor|screen|lens|verre/i.test(mat.name + m.name)) {
          mat.transparent = false; mat.depthWrite = true;
        }
        if (mat.map) mat.map.anisotropy = 8;
      });
      return root;
    }));
  }
  return cache.get(name).then((src) => {
    const inner = cloneSkinned(src);
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

/* ---------- concession en relief ---------- */
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// Relief d'un calque : grille déformée par la carte de profondeur (mm sur 16 bits : rouge = octet fort,
// vert = octet faible). Au-delà du cadre (marges MX, MY), le relief se prolonge avec les couleurs du bord
// qui s'assombrissent, pour que les mouvements de caméra ne révèlent jamais de vide.
function reliefGeometry(depthImg, info, seg, { margin = true } = {}) {
  const dc = document.createElement("canvas"); dc.width = depthImg.width; dc.height = depthImg.height;
  const dg = dc.getContext("2d", { willReadFrequently: true }); dg.drawImage(depthImg, 0, 0);
  const px = dg.getImageData(0, 0, dc.width, dc.height).data, DW = dc.width, DH = dc.height;
  const zAt = (x, y) => { const o = (y * DW + x) * 4; return (px[o] * 256 + px[o + 1]) / 1000; };
  const sample = (u, v) => {   // bilinéaire
    const x = u * (DW - 1), y = v * (DH - 1), x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(DW - 1, x0 + 1), y1 = Math.min(DH - 1, y0 + 1), fx = x - x0, fy = y - y0;
    return (zAt(x0, y0) * (1 - fx) + zAt(x1, y0) * fx) * (1 - fy) + (zAt(x0, y1) * (1 - fx) + zAt(x1, y1) * fx) * fy;
  };
  const MX = margin ? 0.35 : 0, MY = margin ? 0.22 : 0;
  const SX = seg, SY = Math.round(SX / info.aspect * (1 + 2 * MY) / (1 + 2 * MX));
  const tx = Math.tan(THREE.MathUtils.degToRad(info.hfov) / 2), ty = tx / info.aspect;
  const geo = new THREE.PlaneGeometry(1, 1, SX, SY);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const col = new Float32Array(pos.count * 3);
  const cl = (x) => Math.min(1, Math.max(0, x));
  for (let i = 0; i < pos.count; i++) {
    const u = -MX + uv.getX(i) * (1 + 2 * MX), v = -MY + (1 - uv.getY(i)) * (1 + 2 * MY);
    const uc = cl(u), vc = cl(v);
    const z = sample(uc, vc);
    pos.setXYZ(i, (u * 2 - 1) * tx * z, (1 - v * 2) * ty * z, -z);
    uv.setXY(i, uc, 1 - vc);
    const out = margin ? Math.max(Math.abs(u - uc) / MX, Math.abs(v - vc) / MY) : 0;   // 0 dans la photo → 1 au bord
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1 - Math.min(1, out * 4) * 0.97;   // s'éteint vite hors cadre
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.applyMatrix4(new THREE.Matrix4().fromArray(info.matrix));
  geo.computeBoundingSphere();
  return geo;
}

/* Deux calques, comme une « photo 3D » : le fond (motos effacées puis reconstituées) et les motos
   découpées au premier plan. Quand la caméra bouge, les motos glissent devant le décor au lieu de s'étirer. */
export async function buildConcession({ renderer, mobile = false } = {}) {
  const info = await fetch(url("assets/scene/scene.json")).then((r) => r.json());
  const res = !mobile && renderer.capabilities.maxTextureSize >= 4096 ? "4k" : "2k";
  const tl = new THREE.TextureLoader();
  const [dBg, dFg, tBg, tFg] = await Promise.all([
    loadImage(url("assets/scene/depth-bg16.png")),
    loadImage(url("assets/scene/depth-fg16.png")),
    tl.loadAsync(url(`assets/scene/shop-bg-${res}.webp`)),
    tl.loadAsync(url(`assets/scene/shop-fg-${res}.webp`)),
  ]);
  for (const t of [tBg, tFg]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
  const seg = mobile ? 300 : 600;
  const bg = new THREE.Mesh(reliefGeometry(dBg, info, seg), new THREE.MeshBasicMaterial({ map: tBg, vertexColors: true, toneMapped: false }));
  const fg = new THREE.Mesh(reliefGeometry(dFg, info, seg, { margin: false }), new THREE.MeshBasicMaterial({ map: tFg, transparent: true, toneMapped: false }));
  bg.frustumCulled = fg.frustumCulled = false;

  const group = new THREE.Group(); group.add(bg, fg);
  const v = (a) => new THREE.Vector3().fromArray(a);
  const targets = Object.fromEntries(Object.entries(info.targets).map(([k, a]) => [k, v(a)]));
  return { group, fg, podiumTop: info.podiumTop, origin: v(info.camera), targets };
}
