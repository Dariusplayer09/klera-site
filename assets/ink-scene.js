/* Hero scene: the app's handwriting demo, "2x + 5 = 13", written in 3D ink on a floating
   glass slab that tilts toward the pointer.

   Performance contract: one renderer, one raycaster, pointer coordinates stored on move
   and consumed once per frame, pixel ratio capped, loop stopped when the stage is off
   screen, the tab is hidden, or the visitor pauses it. Reduced motion renders a single
   finished frame and never starts the loop. No WebGL leaves the SVG fallback visible. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* The same stroke paths as the 2D demo, in its 460 x 120 coordinate space. */
const STROKES = [
  "M42,44 C46,30 72,28 74,44 C76,58 52,66 40,82 L78,82",
  "M102,52 L134,82",
  "M134,52 L102,82",
  "M158,67 L192,67",
  "M175,50 L175,84",
  "M246,42 L216,42 L213,60 C232,54 252,60 250,70 C248,82 226,88 212,80",
  "M272,60 L310,60",
  "M272,74 L310,74",
  "M336,50 L346,42 L346,84",
  "M372,44 C380,32 402,34 400,48 C398,58 386,60 380,60 C392,58 404,62 402,74 C400,86 378,88 370,80",
];

/* Samples absolute M / L / C path data into points. Only those commands appear above. */
function samplePath(d) {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+/g);
  const out = [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  const num = () => parseFloat(tokens[i++]);
  const push = (px, py) => {
    const last = out[out.length - 1];
    if (!last || Math.hypot(px - last[0], py - last[1]) > 0.6) out.push([px, py]);
  };
  while (i < tokens.length) {
    if (/[MLC]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "M") {
      x = num(); y = num(); push(x, y);
    } else if (cmd === "L") {
      const nx = num();
      const ny = num();
      const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / 5));
      for (let k = 1; k <= n; k++) push(x + ((nx - x) * k) / n, y + ((ny - y) * k) / n);
      x = nx; y = ny;
    } else if (cmd === "C") {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), ex = num(), ey = num();
      for (let k = 1; k <= 20; k++) {
        const s = k / 20;
        const u = 1 - s;
        push(
          u * u * u * x + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * ex,
          u * u * u * y + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * ey,
        );
      }
      x = ex; y = ey;
    } else {
      i++;
    }
  }
  return out;
}

function boot(canvas) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = canvas.parentElement;
  const pauseBtn = document.getElementById("scene-pause");
  const replayBtn = document.getElementById("scene-replay");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 5000);
  camera.position.set(0, 0, 1320);

  scene.add(new THREE.AmbientLight(0x8db0ff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(-360, 520, 700);
  scene.add(key);
  const rim = new THREE.PointLight(0x8db0ff, 3.2, 2200, 1.4);
  rim.position.set(460, -220, 420);
  scene.add(rim);

  const rig = new THREE.Group();
  scene.add(rig);
  /* Resting pose: tipped back and turned, so the slab reads as a 3D object at rest. Pointer
     tilt and idle sway are added on top of this, never instead of it. */
  const REST_X = -0.2;
  const REST_Y = -0.34;

  /* The board: a glass slab with a lit edge. */
  const SLAB_W = 660;
  const SLAB_H = 390;
  const slabGeo = new THREE.BoxGeometry(SLAB_W, SLAB_H, 12);
  const slab = new THREE.Mesh(
    slabGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0x1a2442, emissive: 0x0f1830, emissiveIntensity: 0.9,
      metalness: 0.15, roughness: 0.3,
      transparent: true, opacity: 0.84, clearcoat: 0.8, clearcoatRoughness: 0.38,
    }),
  );
  rig.add(slab);
  rig.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(slabGeo),
    new THREE.LineBasicMaterial({ color: 0x8db0ff, transparent: true, opacity: 0.62 }),
  ));

  /* Ink. Each stroke is a tube whose visible length is animated with setDrawRange. */
  const RADIAL = 10;
  const SCALE = 1.5;
  const inkMat = new THREE.MeshStandardMaterial({
    color: 0xeceae4, emissive: 0x8db0ff, emissiveIntensity: 0.3, roughness: 0.38, metalness: 0.05,
  });
  const tubes = STROKES.map((d) => {
    const pts = samplePath(d).map(([px, py]) => new THREE.Vector3((px - 222) * SCALE, -(py - 62) * SCALE, 11));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const segments = Math.max(12, Math.round(curve.getLength() / 2.5));
    const geo = new THREE.TubeGeometry(curve, segments, 3.4, RADIAL, false);
    const mesh = new THREE.Mesh(geo, inkMat);
    rig.add(mesh);
    return { mesh, geo, curve, segments, length: curve.getLength() };
  });

  /* The pencil tip that rides the writing head. */
  const pen = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 150, 24),
    new THREE.MeshStandardMaterial({ color: 0xeceae4, roughness: 0.35, metalness: 0.1 }),
  );
  body.position.y = 92;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(9, 26, 24),
    new THREE.MeshStandardMaterial({ color: 0x9ba3b4, roughness: 0.5 }),
  );
  tip.rotation.x = Math.PI;
  tip.position.y = 4;
  pen.add(body, tip);
  pen.rotation.set(-0.35, 0, -0.42);
  pen.visible = false;
  rig.add(pen);

  /* A sparse field of motes for depth, kept faint. */
  const MOTES = 240;
  const motePos = new Float32Array(MOTES * 3);
  for (let m = 0; m < MOTES; m++) {
    motePos[m * 3] = (Math.random() - 0.5) * 1900;
    motePos[m * 3 + 1] = (Math.random() - 0.5) * 1100;
    motePos[m * 3 + 2] = -300 - Math.random() * 900;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ color: 0x8db0ff, size: 3, sizeAttenuation: true, transparent: true, opacity: 0.35 }),
  );
  scene.add(motes);

  /* ---------------------------------------------------------- writing timeline */
  const PEN_LIFT = 0.16;
  const SPEED = 340; // scene units per second
  const schedule = [];
  let cursor = 0.35;
  tubes.forEach((t) => {
    const dur = Math.max(0.18, t.length / SPEED);
    schedule.push({ start: cursor, end: cursor + dur });
    cursor += dur + PEN_LIFT;
  });
  const TOTAL = cursor;
  let writeClock = reduce ? TOTAL : 0;

  function applyWriting(time) {
    let head = null;
    tubes.forEach((t, idx) => {
      const { start, end } = schedule[idx];
      const p = THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
      const shown = Math.round(p * t.segments) * RADIAL * 6;
      t.geo.setDrawRange(0, shown);
      if (p > 0 && p < 1) head = t.curve.getPointAt(p);
    });
    if (head) {
      pen.visible = true;
      pen.position.set(head.x + 30, head.y + 14, head.z + 34);
    } else {
      pen.visible = false;
    }
  }
  applyWriting(writeClock);

  /* ---------------------------------------------------------- pointer */
  const pointer = new THREE.Vector2(0, 0);
  const aim = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  let pointerInside = false;

  stage.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    pointerInside = true;
  });
  stage.addEventListener("pointerleave", () => {
    pointerInside = false;
    canvas.style.cursor = "";
  });
  canvas.addEventListener("click", () => {
    if (!reduce && hoveringSlab) replay();
  });

  /* ---------------------------------------------------------- sizing */
  let baseX = 0;
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    /* Constant, not width-based: the stage keeps a fixed aspect ratio, so the camera frustum
       already scales with it. Scaling by width as well shrank the slab twice on phones. */
    const fit = 1.22;
    rig.scale.setScalar(fit);
    baseX = 0;
    if (!running) render();
  }
  new ResizeObserver(resize).observe(stage);

  /* ---------------------------------------------------------- loop */
  let running = false;
  let paused = false;
  let visible = true;
  let hoveringSlab = false;
  let last = performance.now();
  let raf = 0;

  function render() {
    renderer.render(scene, camera);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (writeClock < TOTAL) {
      writeClock = Math.min(TOTAL, writeClock + dt);
      applyWriting(writeClock);
    }

    const tx = pointerInside ? pointer.x * 0.32 : Math.sin(now / 2600) * 0.08;
    const ty = pointerInside ? pointer.y * 0.2 : Math.cos(now / 3100) * 0.05;
    aim.x += (tx - aim.x) * 0.07;
    aim.y += (ty - aim.y) * 0.07;
    rig.rotation.y = REST_Y + aim.x;
    rig.rotation.x = REST_X - aim.y;
    rig.position.x = baseX;
    motes.position.x = -aim.x * 90;
    motes.position.y = aim.y * 60;
    motes.rotation.z += dt * 0.01;

    if (pointerInside) {
      raycaster.setFromCamera(pointer, camera);
      hoveringSlab = raycaster.intersectObject(slab, false).length > 0;
      canvas.style.cursor = hoveringSlab ? "pointer" : "";
    }

    render();
    schedule_();
  }

  function schedule_() {
    if (!running || raf) return;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || paused || !visible || document.hidden) return;
    if (running) return;
    running = true;
    last = performance.now();
    schedule_();
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function replay() {
    writeClock = 0;
    applyWriting(0);
    if (paused) setPaused(false);
    start();
  }

  function setPaused(next) {
    paused = next;
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", String(paused));
      pauseBtn.textContent = paused ? "Play animation" : "Pause animation";
    }
    if (paused) stop();
    else start();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }, { threshold: 0.05 }).observe(stage);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  replayBtn?.addEventListener("click", replay);
  pauseBtn?.addEventListener("click", () => setPaused(!paused));

  if (reduce) {
    rig.rotation.set(REST_X, REST_Y, 0);
    if (pauseBtn) pauseBtn.hidden = true;
    if (replayBtn) replayBtn.hidden = true;
  }

  if (!reduce) rig.rotation.set(REST_X, REST_Y, 0);
  document.documentElement.classList.add("has-webgl");
  resize();
  render();
  start();
}

/* Entry point. Deliberately last: boot() reads module-level constants such as STROKES, and a
   `const` is not initialised until its declaration runs. Calling boot() from the top of the file
   threw "Cannot access 'STROKES' before initialization" and left every visitor on the fallback. */
const sceneCanvas = document.getElementById("scene");
if (sceneCanvas && hasWebGL()) boot(sceneCanvas);
