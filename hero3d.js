// Page-wide 3D backdrop: fixed behind every section. The camera flies toward
// a building frame while the user scrolls through the hero, then holds and keeps
// idling for the rest of the page. Progressive enhancement only — falls back
// to the static blueprint-grid background (.hero-static, hero section only)
// when WebGL or `three` is unavailable.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('hero-canvas');
const track = document.querySelector('.hero-track');

if (!reduceMotion && canvas && track && supportsWebGL()) {
  init();
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

async function init() {
  let THREE;
  try {
    THREE = await import('three');
  } catch (e) {
    return; // module load failed — keep the static fallback, fail silently
  }

  // `ready` on the canvas and `canvas-ready` on <html> always flip together
  // (see setReady below) so .hero-static can crossfade against the canvas's
  // own 1.1s opacity transition in real time — see the html.canvas-ready
  // rule in styles.css for why that section specifically needs a synced
  // crossfade rather than an instant swap.
  function setReady(on) {
    canvas.classList.toggle('ready', on);
    document.documentElement.classList.toggle('canvas-ready', on);
  }

  // Only toggle the opaque fallback (.no-3d) — which gates every *other*
  // section's glass background — once the canvas's own opacity transition
  // actually finishes, never at the instant setReady() is called. Flipping
  // it early would translucent-ify those sections before the canvas behind
  // them has visually caught up. (.hero-static doesn't depend on .no-3d
  // any more; it crossfades directly off `canvas-ready`, see above.)
  canvas.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'opacity') {
      document.documentElement.classList.toggle('no-3d', !canvas.classList.contains('ready'));
    }
  });

  const isNarrow = window.innerWidth < 768;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1a2d, 8, 34);

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, isNarrow ? 1 : 1.5);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: pixelRatio < 1.5, alpha: false });
  renderer.setClearColor(0x0b1a2d, 1);
  renderer.setPixelRatio(pixelRatio);

  // Context loss now degrades the whole page's backdrop, not just the hero,
  // so fall all the way back to the opaque static styling while it's lost
  // rather than leaving every section's glass background over nothing.
  let contextLost = false;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextLost = true;
    setReady(false); // fades out; transitionend above restores .no-3d
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    setReady(true); // fades back in; transitionend above drops .no-3d
    // Doesn't manually re-upload geometry/materials on restore — verified
    // safe for this scene: everything here is procedural BufferGeometry +
    // solid-color MeshBasicMaterial (no textures), which this vendored
    // three.js build re-uploads on its own. Confirmed via WEBGL_lose_context
    // (lose -> restore -> screenshot matched the pre-loss render, no errors).
  });

  // ===== Blueprint ground grid =====
  const grid = new THREE.GridHelper(70, 56, 0xdd8e1f, 0x15293f);
  grid.position.y = -3;
  grid.material.transparent = true;
  grid.material.opacity = 0.32;
  scene.add(grid);

  // ===== Building frame: floor slabs, beams, columns =====
  const building = new THREE.Group();
  const half = 4;
  const levels = [-3, -0.5, 2, 4.5];
  const gridPts = [-half, 0, half];
  const seg = [];
  const line = (x1, y1, z1, x2, y2, z2) => seg.push(x1, y1, z1, x2, y2, z2);
  levels.forEach((y, li) => {
    gridPts.forEach((g) => {
      line(-half, y, g, half, y, g);
      line(g, y, -half, g, y, half);
    });
    if (li > 0) {
      gridPts.forEach((gx) => gridPts.forEach((gz) => line(gx, levels[li - 1], gz, gx, y, gz)));
    }
  });
  const frameGeo = new THREE.BufferGeometry();
  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  building.add(new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: 0xf2c066, transparent: true, opacity: 1, fog: false })));

  const slabGeo = new THREE.PlaneGeometry(half * 2, half * 2);
  const slabMat = new THREE.MeshBasicMaterial({ color: 0xdd8e1f, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
  levels.forEach((y) => {
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.rotation.x = Math.PI / 2;
    slab.position.y = y;
    building.add(slab);
  });

  building.position.set(0, 0, -9);
  scene.add(building);

  const bottom = levels[0];
  const span = levels[levels.length - 1] - bottom;
  const scanGeo = new THREE.PlaneGeometry(half * 2.4, half * 2.4);
  const scanMat = new THREE.MeshBasicMaterial({ color: 0xf2c066, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  const scanPlane = new THREE.Mesh(scanGeo, scanMat);
  scanPlane.rotation.x = Math.PI / 2;
  building.add(scanPlane);

  // ===== Ambient particles =====
  const particleCount = isNarrow ? 90 : 220;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 8 - 2;
    positions[i * 3 + 2] = -Math.random() * 30;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0xdd8e1f, size: 0.05, transparent: true, opacity: 0.5 });
  scene.add(new THREE.Points(particleGeo, particleMat));

  // ===== Camera path: pulled-back/high -> inside the frame =====
  const camStart = new THREE.Vector3(2.2, 3.2, 15);
  const camEnd = new THREE.Vector3(0.6, 0.6, -6.2);
  const lookStart = new THREE.Vector3(0, 1, -9);
  const lookEnd = new THREE.Vector3(0, 0.6, -14);
  const camPos = new THREE.Vector3();
  const lookPos = new THREE.Vector3();

  let lastRender = 0;
  let lastProgress = -1;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    lastProgress = -1;
  }
  resize();
  window.addEventListener('resize', resize);

  let trackTop = 0;
  let trackHeight = 0;
  function measureTrack() {
    const rect = track.getBoundingClientRect();
    trackTop = rect.top + window.scrollY;
    trackHeight = rect.height;
  }
  measureTrack();
  window.addEventListener('load', measureTrack);
  new ResizeObserver(measureTrack).observe(track);

  function getProgress() {
    const total = trackHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, (window.scrollY - trackTop) / total));
  }

  let ready = false;
  const startTime = performance.now();
  const HERO_IDLE_MS = 1000 / 30;
  const PAGE_IDLE_MS = 1000 / 12;

  function tick(now) {
    requestAnimationFrame(tick);
    if (contextLost || document.hidden) return;

    const p = getProgress();
    const inHero = window.scrollY < trackTop + trackHeight;
    const scrubbing = p !== lastProgress;
    const idleMs = inHero ? HERO_IDLE_MS : PAGE_IDLE_MS;
    if (!scrubbing && now - lastRender < idleMs) return;
    lastRender = now;
    lastProgress = p;

    const t = (now - startTime) / 1000;
    const eased = p * p * (3 - 2 * p);

    camPos.lerpVectors(camStart, camEnd, eased);
    lookPos.lerpVectors(lookStart, lookEnd, eased);
    camera.position.copy(camPos);
    camera.lookAt(lookPos);

    building.rotation.y = t * 0.06;
    scanPlane.position.y = bottom + ((Math.sin(t * 0.6) + 1) / 2) * span;

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      setReady(true);
    }
  }
  requestAnimationFrame(tick);
}
