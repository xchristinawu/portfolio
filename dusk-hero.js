import * as THREE from "three";

const canvas = document.getElementById("hero-canvas");
if (canvas) initHub(canvas);

function initHub(canvas) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;

  /* nodes map to sections (playground cut) */
  const NODES = [
    { id: "about",   n: "01", t: "About",   blurb: "My story." },
    { id: "work",    n: "02", t: "Work",    blurb: "Selected projects." },
    { id: "skills",  n: "03", t: "Stack",   blurb: "What I build with." },
    { id: "resume",  n: "04", t: "Résumé",  blurb: "The journey." },
    { id: "contact", n: "05", t: "Contact", blurb: "Let's build something." },
  ];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 6.3);

  const COL_RING  = new THREE.Color("#4d483e");
  const COL_ORBIT = new THREE.Color("#766a4f");
  const COL_NODE  = new THREE.Color("#d6c498");
  const COL_LIGHT = new THREE.Color("#ece7dd");

  /* groups */
  const hub = new THREE.Group();     // parallax
  const tilt = new THREE.Group();    // fixed plane tilt
  const orbit = new THREE.Group();   // slow spin
  tilt.rotation.x = -0.34;
  hub.add(tilt);
  tilt.add(orbit);
  scene.add(hub);

  /* faint concentric core rings — the calmed 'system' */
  const coreRadii = [0.6, 1.02, 1.5];
  coreRadii.forEach((r, i) => {
    const g = new THREE.RingGeometry(r - 0.0035, r + 0.0035, 180);
    const m = new THREE.MeshBasicMaterial({ color: COL_RING, transparent: true, opacity: 0.34 - i * 0.06, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(g, m);
    ring.rotation.x = Math.PI / 2;
    tilt.add(ring);
  });
  // tiny centre point
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 16, 16),
    new THREE.MeshBasicMaterial({ color: COL_NODE, transparent: true, opacity: 0.6 })
  );
  tilt.add(center);

  /* main orbit path */
  const R = 1.85;
  const orbitRing = new THREE.Mesh(
    new THREE.RingGeometry(R - 0.004, R + 0.004, 220),
    new THREE.MeshBasicMaterial({ color: COL_ORBIT, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  orbitRing.rotation.x = Math.PI / 2;
  tilt.add(orbitRing);

  /* nodes — position-only groups; the visible dot lives in the HTML label so
     the whole node (dot + text) is one hit target. */
  const nodeMeshes = [];
  NODES.forEach((nd, i) => {
    const a = ((i + 0.5) / NODES.length) * Math.PI * 2 - Math.PI / 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
    orbit.add(g);
    nodeMeshes.push(g);
  });

  /* connector centre -> active node (world space) */
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const lineMat = new THREE.LineBasicMaterial({ color: COL_NODE, transparent: true, opacity: 0 });
  const link = new THREE.Line(lineGeo, lineMat);
  scene.add(link);

  /* drifting motes — very subtle */
  const pCount = 42;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const r = 3.1 + Math.random() * 2.6, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    pPos[i*3] = r*Math.sin(ph)*Math.cos(th); pPos[i*3+1] = r*Math.sin(ph)*Math.sin(th); pPos[i*3+2] = r*Math.cos(ph);
  }
  const motes = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pPos, 3)),
    new THREE.PointsMaterial({ size: 0.011, color: COL_LIGHT, transparent: true, opacity: 0.28 })
  );
  scene.add(motes);

  /* HTML labels */
  const labelLayer = document.getElementById("hub-labels");
  const blurbEl = document.getElementById("hub-blurb");
  const defaultBlurb = blurbEl ? blurbEl.textContent : "";
  const labels = NODES.map((nd, i) => {
    const b = document.createElement("button");
    b.className = "hub-label";
    b.type = "button";
    b.dataset.target = nd.id;
    b.innerHTML = `<span class="hl-dot"></span><span class="hl-lead"></span><span class="hl-n">${nd.n}</span><span class="hl-t">${nd.t}</span>`;
    b.addEventListener("pointerenter", () => setActive(i));
    b.addEventListener("pointerleave", () => setActive(null));
    b.addEventListener("focus", () => setActive(i));
    b.addEventListener("blur", () => setActive(null));
    b.addEventListener("click", () => goTo(nd.id));
    labelLayer && labelLayer.appendChild(b);
    return b;
  });

  let activeIndex = null;
  function setActive(i) {
    activeIndex = i;
    labels.forEach((l, k) => l.classList.toggle("is-active", k === i));
    if (blurbEl) blurbEl.textContent = i == null ? defaultBlurb : NODES[i].blurb;
  }
  function goTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 30;
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  /* parallax */
  const targetRot = new THREE.Vector2(0, 0);
  const curRot = new THREE.Vector2(0, 0);
  window.addEventListener("pointermove", (e) => {
    targetRot.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetRot.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  /* resize */
  let W = 0, H = 0;
  function syncSize() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch || (cw === W && ch === H)) return;
    W = cw; H = ch;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
  
    const zByWidth = W <= 760 ? 9.5 : W >= 1350 ? 6.3 : 9.5 - ((W - 760) / (1350 - 760)) * 3.2;
    const aspect = W / H;
    const zByAspect = aspect < 1 ? zByWidth + (1 - aspect) * 5 : zByWidth;
  
    camera.position.z = zByAspect;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", syncSize);
  if (window.ResizeObserver) new ResizeObserver(syncSize).observe(canvas);
  syncSize();

  /* loop */
  const proj = new THREE.Vector3();
  const wp = new THREE.Vector3();
  const clock = new THREE.Clock();
  const introStart = performance.now();
  let frame = 0;

  function render() {
    syncSize();
    if (!W || !H) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const introT = reduce ? 1 : Math.min(1, Math.max(0, (performance.now() - introStart - 300) / 1500));

    // parallax tilt
    curRot.x += (targetRot.x - curRot.x) * 0.035;
    curRot.y += (targetRot.y - curRot.y) * 0.035;
    hub.rotation.y = curRot.x * 0.32;
    hub.rotation.x = curRot.y * 0.16;

    // calm, static constellation — parallax + hover give it life (no auto-spin,
    // so labels never drift off-screen). Motes keep a whisper of motion.
    motes.rotation.y -= dt * 0.015;

    // label projection — the HTML dot is anchored at the node point
    nodeMeshes.forEach((g, i) => {
      g.getWorldPosition(wp);
      const front = THREE.MathUtils.clamp((wp.z + R) / (2 * R), 0, 1);
      proj.copy(wp).project(camera);
      const x = (proj.x * 0.5 + 0.5) * W;
      const y = (-proj.y * 0.5 + 0.5) * H;
      const lab = labels[i];
      const onLeft = x < W / 2;
      lab.classList.toggle("flip", onLeft);
      const depthScale = 0.82 + front * 0.26;
      lab.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${onLeft ? "-100%" : "0"}, -50%) scale(${depthScale.toFixed(3)})`;
      lab.style.opacity = (0.45 + front * 0.55).toFixed(3);
      lab.style.zIndex = String(5 + Math.round(front * 14));
    });

    // connector
    const lp = link.geometry.attributes.position;
    if (activeIndex != null) {
      nodeMeshes[activeIndex].getWorldPosition(wp);
      lp.setXYZ(0, 0, 0, 0); lp.setXYZ(1, wp.x, wp.y, wp.z); lp.needsUpdate = true;
    }
    lineMat.opacity += (((activeIndex != null) ? 0.5 : 0) - lineMat.opacity) * 0.15;

    hub.scale.setScalar(0.9 + introT * 0.1);

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  function tick() { requestAnimationFrame(tick); render(); }
  window.__heroRender = render;
  tick();
  // Fallback for rAF-throttled contexts (backgrounded iframes): nudge a few
  // projection passes so labels land correctly even without animation frames.
  [60, 160, 320, 600, 1000, 1600].forEach((t) => setTimeout(render, t));
}
