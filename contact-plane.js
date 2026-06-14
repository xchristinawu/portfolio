import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const planeUrl = '/model/paper-airplane.glb';

const canvas = document.getElementById('contact-canvas');
if (canvas) initPlane(canvas);

function initPlane(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 3.5, 5.5);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.8);
  dirLight.position.set(3, 6, 4);
  scene.add(dirLight);

  const raycaster   = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  let targetX = 0, targetZ = 0;
  let posX = 0, posZ = 0;
  let heading = 0, bank = 0;
  let mouseActive = false;
  const clock = new THREE.Clock();

  const planeGroup = new THREE.Group();
  planeGroup.rotation.order = 'YXZ';
  scene.add(planeGroup);

  new GLTFLoader().load(
    planeUrl,
    (gltf) => {
      const model = gltf.scene;

      // Model geometry is offset far from its own origin, so center it first,
      // then scale the wrapper — order matters here
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.scale.setScalar(1.6 / maxDim);
      wrapper.add(model);

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          if (child.material.color) child.material.color.set('#d6c498');
          child.material.transparent = false;
          child.material.opacity = 1;
          child.material.side = THREE.DoubleSide;
        }
      });

      planeGroup.add(wrapper);
    },
    undefined,
    (err) => console.error('[plane] load error:', err),
  );

  const section = document.getElementById('contact');
  section.addEventListener('mousemove', (e) => {
    mouseActive = true;
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width)  * 2 - 1,
       -((e.clientY - r.top)  / r.height) * 2 + 1,
      ),
      camera,
    );
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      targetX = Math.max(-3.8, Math.min(3.8, hit.x));
      targetZ = Math.max(-2.5, Math.min(2.5, hit.z));
    }
  });
  section.addEventListener('mouseleave', () => { mouseActive = false; });

  let W = 0, H = 0;
  function resize() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw === W && ch === H) return;
    W = cw; H = ch;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    if (!mouseActive) {
      const span = Math.max(1.2, camera.aspect) * 1.8;
      targetX = Math.sin(t * 0.32) * span;
      targetZ = Math.sin(t * 0.64) * 0.7;
    }

    const px = posX, pz = posZ;
    posX += (targetX - posX) * (mouseActive ? 0.055 : 0.022);
    posZ += (targetZ - posZ) * (mouseActive ? 0.055 : 0.022);

    const vx = posX - px, vz = posZ - pz;
    const speed = Math.sqrt(vx * vx + vz * vz);

    if (speed > 0.00005) {
      const tgt = Math.atan2(-vz, vx);
      let d = tgt - heading;
      while (d >  Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      heading += d * 0.13;
      bank    += (-d * 2.2 - bank) * 0.09;
    } else {
      bank *= 0.94;
    }

    planeGroup.position.set(posX, Math.sin(t * 1.7) * 0.07, posZ);
    planeGroup.rotation.y = heading + Math.PI;
    planeGroup.rotation.x = 0.12 - bank * 0.1;
    planeGroup.rotation.z = bank * 0.35;

    renderer.render(scene, camera);
  }
  tick();
}
