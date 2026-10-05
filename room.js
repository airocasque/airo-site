/* =========================================================
   AIRO — Salle 3D (Three.js, auto-hébergé)
   Caméra pilotée par le scroll à travers un showroom moto
   stylisé, avec la vraie photo de la machine en son centre.
   ========================================================= */
(() => {
  "use strict";
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("roomCanvas");
  const scroller = document.getElementById("roomScroller");
  if (!canvas || !scroller) return;

  const BG = 0x060911;

  /* ---------- Scene / camera / renderer ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 9, 22);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;

  /* ---------- Lumières ---------- */
  scene.add(new THREE.AmbientLight(0x1a2740, 0.65));

  const spot = new THREE.SpotLight(0xdfe9ff, 4.2, 18, 0.55, 0.6, 1.2);
  spot.position.set(0, 7.4, -2.2);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 1.6, -4);
  scene.add(spotTarget);
  spot.target = spotTarget;
  scene.add(spot);

  const rim = new THREE.PointLight(0x2f8cff, 1.2, 14, 2);
  rim.position.set(0, 3, 3);
  scene.add(rim);

  /* ---------- Sol ---------- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x0a0e18, roughness: 0.35, metalness: 0.4 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  /* ---------- Anneau de plafond ---------- */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.3, 0.055, 16, 72),
    new THREE.MeshBasicMaterial({ color: 0xeaf3ff })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 7.6, -4);
  scene.add(ring);
  scene.add(new THREE.PointLight(0xbfe0ff, 1.4, 10, 2).translateX(0).translateY(7.5).translateZ(-4));

  /* ---------- Piédestal + contour lumineux ---------- */
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.16, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.5, metalness: 0.5 })
  );
  pedestal.position.set(0, 0.08, -4);
  scene.add(pedestal);

  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.56, 0.02, 2.56));
  const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x2f8cff }));
  edgeLine.position.set(0, 0.165, -4);
  scene.add(edgeLine);

  /* ---------- Machine (vraie photo, plan 3D) ---------- */
  const loader = new THREE.TextureLoader();
  const machineTex = loader.load("machine-hero.jpg");
  if (machineTex.colorSpace !== undefined) machineTex.colorSpace = THREE.SRGBColorSpace;

  const machineBack = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 2.5, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.6 })
  );
  machineBack.position.set(0, 1.42, -4.08);
  scene.add(machineBack);

  const machinePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.66, 2.66),
    new THREE.MeshBasicMaterial({ map: machineTex })
  );
  machinePlane.position.set(0, 1.45, -3.95);
  scene.add(machinePlane);

  /* ---------- Logo sur le mur du fond ---------- */
  const logoTex = loader.load("logo-airo.png");
  const logoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.9 })
  );
  logoPlane.position.set(0, 5.4, -11.85);
  scene.add(logoPlane);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 9),
    new THREE.MeshStandardMaterial({ color: 0x090c14, roughness: 0.9 })
  );
  backWall.position.set(0, 4.5, -12);
  scene.add(backWall);

  /* ---------- Murs latéraux avec casques ---------- */
  const helmetMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x232a38, roughness: 0.3, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x2e3646, roughness: 0.35, metalness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0x3f6aa8, roughness: 0.3, metalness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0xc94a3a, roughness: 0.3, metalness: 0.5 }),
  ];
  const domeGeo = new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const visorGeo = new THREE.BoxGeometry(0.34, 0.16, 0.12);
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.15, metalness: 0.7 });

  function buildHelmet(x, y, z, facingRight) {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(domeGeo, helmetMaterials[(Math.random() * helmetMaterials.length) | 0]);
    dome.rotation.x = Math.PI;
    g.add(dome);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, -0.04, 0.24 * (facingRight ? 1 : -1));
    g.add(visor);
    g.position.set(x, y, z);
    g.rotation.y = facingRight ? Math.PI / 2 : -Math.PI / 2;
    return g;
  }

  function buildWall(xSide) {
    const facingRight = xSide < 0;
    const wallGroup = new THREE.Group();

    const wallPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8.4),
      new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.95 })
    );
    wallPanel.position.set(xSide, 4.2, -4);
    wallPanel.rotation.y = facingRight ? Math.PI / 2 : -Math.PI / 2;
    wallGroup.add(wallPanel);

    const rows = [1.35, 2.85, 4.35, 5.85];
    rows.forEach((y) => {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.09, 12.5),
        new THREE.MeshBasicMaterial({ color: 0xeaf3ff })
      );
      strip.position.set(xSide + (facingRight ? 0.44 : -0.44), y - 0.35, -4);
      wallGroup.add(strip);

      const rowLight = new THREE.PointLight(0xcfe4ff, 1.4, 3.2, 2);
      rowLight.position.set(xSide + (facingRight ? 0.7 : -0.7), y, -4);
      wallGroup.add(rowLight);

      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.04, 12.5),
        new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.6, metalness: 0.3 })
      );
      shelf.position.set(xSide + (facingRight ? 0.28 : -0.28), y - 0.38, -4);
      wallGroup.add(shelf);

      for (let z = -10.5; z <= -0.5; z += 1.9) {
        wallGroup.add(buildHelmet(xSide + (facingRight ? 0.32 : -0.32), y, z + (Math.random() * 0.3 - 0.15), facingRight));
      }
    });

    scene.add(wallGroup);
  }
  buildWall(-9.4);
  buildWall(9.4);

  /* ---------- Points de lumière d'ambiance le long du couloir ---------- */
  for (let z = -10; z <= 6; z += 4) {
    const p = new THREE.PointLight(0x2f5c9c, 0.8, 8, 2);
    p.position.set(0, 6.5, z);
    scene.add(p);
  }

  /* ---------- Trajectoire caméra (mots-clés) ---------- */
  const keyframes = [
    { pos: [0, 2.4, 8.6], look: [0, 1.6, -4] },
    { pos: [0.9, 1.75, 0.4], look: [0, 1.5, -3.6] },
    { pos: [3.4, 1.85, -3.1], look: [-8.5, 2.2, -5] },
    { pos: [-2.6, 2.05, -7.2], look: [0, 3.2, -11.6] },
  ];

  const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function cameraAt(progress) {
    const segments = keyframes.length - 1;
    const scaled = Math.min(0.999999, Math.max(0, progress)) * segments;
    const i = Math.floor(scaled);
    const t = easeInOut(scaled - i);
    const a = keyframes[i];
    const b = keyframes[Math.min(i + 1, segments)];
    const pos = v(a.pos).lerp(v(b.pos), t);
    const look = v(a.look).lerp(v(b.look), t);
    return { pos, look };
  }

  /* ---------- Panneaux HTML synchronisés ---------- */
  const panels = Array.from(document.querySelectorAll(".room__panel"));
  const progressBar = document.getElementById("roomProgressBar");
  let lastStop = -1;

  /* ---------- Boucle de rendu ---------- */
  let progress = 0;
  let ticking = false;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function updateProgress() {
    ticking = false;
    const rect = scroller.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const scrollable = rect.height - viewportH;
    let p = scrollable > 0 ? -rect.top / scrollable : 0;
    p = Math.min(1, Math.max(0, p));
    progress = p;

    if (progressBar) progressBar.style.width = `${p * 100}%`;

    const stopIndex = Math.min(panels.length - 1, Math.floor(p * panels.length));
    if (stopIndex !== lastStop) {
      lastStop = stopIndex;
      panels.forEach((panel, i) => panel.classList.toggle("is-active", i === stopIndex));
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  }

  const clock = new THREE.Clock();
  function render() {
    const t = clock.getElapsedTime();
    const { pos, look } = cameraAt(progress);
    camera.position.copy(pos);
    camera.position.y += Math.sin(t * 0.6) * 0.02;
    camera.lookAt(look);

    ring.rotation.z = t * 0.05;
    machinePlane.position.y = 1.45 + Math.sin(t * 0.8) * 0.01;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  resize();
  updateProgress();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  render();
})();
