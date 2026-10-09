// Chargement des modèles 3D (GLB) de la concession : casques, mobilier. Chaque modèle n'est téléchargé
// qu'une fois puis cloné.
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
