/* Homepage hero: the learner-profile measurements as a 3D space you can move around.

   Every mark here is a real measurement from device calibration runs 004 and 005. Axes are
   three detector scores on a 0 to 1 scale. Each student's calm range is a translucent box
   whose extents are the measured min and max of their calm attempts. Each orb is one genuine
   struggle attempt at its measured coordinates. Nothing is sampled, smoothed or invented;
   if a value is not in the findings documents, it is not drawn.

   Performance contract: one renderer, one raycaster, pointer stored on move and consumed once
   per frame, pixel ratio capped, loop stopped offscreen, in hidden tabs and when paused.
   Reduced motion renders on demand with no drift or pulse. No WebGL leaves the readout and
   the attempt buttons fully usable. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

/* ------------------------------------------------------------------ data */
const CALM = [
  { id: "a-calm", student: "Student A", strain: [0.03, 0.24], dysf: [0.03, 0.34], unprod: [0.0, 0.25] },
  { id: "b-calm", student: "Student B", strain: [0.05, 0.12], dysf: [0.13, 0.57], unprod: [0.25, 0.25] },
];

const STRUGGLE = [
  {
    id: "a-1", student: "Student A", strain: 0.56, dysf: 0.3, unprod: 0.6,
    title: "Student A, genuinely stuck",
    detail: "Three erases, 183 strokes, three minutes. Pressure strain 0.56 against a calm range of 0.03 to 0.24. Unproductive struggle reached 0.60 and fired. Handwriting stayed smooth.",
  },
  {
    id: "b-22", student: "Student B", strain: 0.06, dysf: 0.26, unprod: 0.5,
    title: "Student B, stuck for six minutes",
    detail: "Pressure 0.06, inside his calm range. Nothing on this chart separates it. Pause before strokes read −0.36 standard deviations.",
  },
  {
    id: "b-23", student: "Student B",
    strain: 0.11, dysf: 0.56, unprod: 0.5,
    title: "Student B, stuck",
    detail: "Dysfluency 0.56, but a calm, solved attempt of his read 0.57. On this channel, stuck and confident look the same for him. Pause read +1.21 standard deviations.",
  },
  {
    id: "b-25", student: "Student B", strain: 0.12, dysf: 0.39, unprod: 0.5,
    title: "Student B, the hardest problem",
    detail: "Pressure flat at 0.12. The signal was elsewhere: pause before strokes read +7.32 standard deviations, against a calm range of −0.51 to +0.65.",
  },
];

/* Where each detector fires. Drawn as faint planes so "never reached the line" is visible. */
const FIRES = { strain: 0.6, dysf: 0.7, unprod: 0.6 };

/* ------------------------------------------------------------------ helpers */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const SIZE = 560;                       // scene units for a 0 to 1 axis
const toX = (v) => (v - 0.5) * SIZE;    // pressure strain
const toY = (v) => (v - 0.5) * SIZE;    // dysfluency
const toZ = (v) => (0.5 - v) * SIZE;    // unproductive struggle, toward the viewer as it rises

function readout(el, item) {
  if (!el) return;
  if (!item) {
    el.innerHTML = "<strong>Hover or choose an attempt</strong><span>Each orb is one real struggle attempt. Each box is a student&rsquo;s calm range.</span>";
    return;
  }
  el.innerHTML = "";
  const t = document.createElement("strong");
  t.textContent = item.title;
  const d = document.createElement("span");
  d.textContent = item.detail;
  el.append(t, d);
}

/* ------------------------------------------------------------------ scene */
function boot(canvas) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = canvas.parentElement;
  const labelLayer = stage.querySelector(".scene-labels");
  const tip = stage.querySelector(".orb-tip");
  const detail = document.getElementById("scene-detail");
  const pauseBtn = document.getElementById("scene-pause");
  const attemptBtns = [...document.querySelectorAll("[data-attempt]")];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 10, 6000);
  camera.position.set(0, 0, 1500);

  scene.add(new THREE.AmbientLight(0xbfd0ff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(-500, 700, 900);
  scene.add(key);
  const glow = new THREE.PointLight(0xc47a24, 2.4, 1400, 1.6);
  glow.position.set(toX(0.56), toY(0.3), toZ(0.6) + 120);
  scene.add(glow);

  const rig = new THREE.Group();
  scene.add(rig);
  const REST_X = 0.34;
  const REST_Y = -0.62;

  /* Frame: the three axes along the back edges of the unit cube, plus faint cube edges. */
  const frameMat = new THREE.LineBasicMaterial({ color: 0x9ba3b4, transparent: true, opacity: 0.22 });
  rig.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE)), frameMat));
  const axisMat = new THREE.LineBasicMaterial({ color: 0xeceae4, transparent: true, opacity: 0.55 });
  const origin = new THREE.Vector3(toX(0), toY(0), toZ(0));
  [[toX(1), toY(0), toZ(0)], [toX(0), toY(1), toZ(0)], [toX(0), toY(0), toZ(1)]].forEach(([x, y, z]) => {
    rig.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(x, y, z)]), axisMat));
  });

  /* Firing planes. */
  const planeMat = new THREE.MeshBasicMaterial({ color: 0xeceae4, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false });
  const planeEdge = new THREE.LineBasicMaterial({ color: 0xeceae4, transparent: true, opacity: 0.16 });
  const addPlane = (geo, pos, rot) => {
    const m = new THREE.Mesh(geo, planeMat);
    m.position.copy(pos);
    m.rotation.set(...rot);
    rig.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), planeEdge);
    e.position.copy(pos);
    e.rotation.set(...rot);
    rig.add(e);
  };
  const plane = new THREE.PlaneGeometry(SIZE, SIZE);
  addPlane(plane, new THREE.Vector3(toX(FIRES.strain), 0, 0), [0, Math.PI / 2, 0]);
  addPlane(plane, new THREE.Vector3(0, 0, toZ(FIRES.unprod)), [0, 0, 0]);

  /* Calm ranges as boxes. A range with zero width gets a hairline thickness so it stays visible. */
  const calmMeshes = CALM.map((c) => {
    const w = Math.max(6, (c.strain[1] - c.strain[0]) * SIZE);
    const h = Math.max(6, (c.dysf[1] - c.dysf[0]) * SIZE);
    const d = Math.max(6, (c.unprod[1] - c.unprod[0]) * SIZE);
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x3987e5, emissive: 0x1d4f9c, emissiveIntensity: 0.55,
      transparent: true, opacity: 0.26, roughness: 0.4, depthWrite: false,
    }));
    mesh.position.set(
      toX((c.strain[0] + c.strain[1]) / 2),
      toY((c.dysf[0] + c.dysf[1]) / 2),
      toZ((c.unprod[0] + c.unprod[1]) / 2),
    );
    rig.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x6aa6ff, transparent: true, opacity: 0.8 }));
    edges.position.copy(mesh.position);
    rig.add(edges);
    return { data: c, mesh };
  });

  /* Struggle attempts as orbs, each with a drop line to the floor so depth is readable. */
  const orbGeo = new THREE.SphereGeometry(15, 32, 32);
  const dropMat = new THREE.LineDashedMaterial({ color: 0xc47a24, transparent: true, opacity: 0.45, dashSize: 8, gapSize: 8 });
  const orbs = STRUGGLE.map((s) => {
    const mesh = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial({
      color: 0xc47a24, emissive: 0xc47a24, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.1,
    }));
    mesh.position.set(toX(s.strain), toY(s.dysf), toZ(s.unprod));
    mesh.userData = s;
    rig.add(mesh);
    const drop = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([mesh.position.clone(), new THREE.Vector3(mesh.position.x, toY(0), mesh.position.z)]),
      dropMat,
    );
    drop.computeLineDistances();
    rig.add(drop);
    return mesh;
  });

  /* HTML labels pinned to 3D points; positions are projected once per rendered frame. */
  const labels = [];
  const addLabel = (text, point, cls) => {
    const span = document.createElement("span");
    span.className = `scene-label ${cls || ""}`;
    span.textContent = text;
    labelLayer.appendChild(span);
    labels.push({ span, point });
  };
  addLabel("Pressure strain", new THREE.Vector3(toX(1.1), toY(0) - 24, toZ(0)), "axis");
  addLabel("Dysfluency", new THREE.Vector3(toX(0), toY(1.08), toZ(0)), "axis");
  addLabel("Unproductive struggle", new THREE.Vector3(toX(0) - 20, toY(0) - 34, toZ(1.2)), "axis");
  addLabel("Student A calm", new THREE.Vector3(toX(0.13), toY(0.34) + 60, toZ(0.12)), "calm");
  addLabel("Student B calm", new THREE.Vector3(toX(0.085), toY(0.57) + 60, toZ(0.25)), "calm");
  addLabel("Fires", new THREE.Vector3(toX(0.6), toY(1.06), toZ(0)), "fires");

  const projected = new THREE.Vector3();
  function placeLabels() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    rig.updateMatrixWorld();
    /* Labels are clamped inside the stage so a rotated axis never pushes one off the edge. */
    const clampX = (v) => Math.min(w - 64, Math.max(64, v));
    const clampY = (v) => Math.min(h - 16, Math.max(16, v));
    labels.forEach(({ span, point }) => {
      projected.copy(point).applyMatrix4(rig.matrixWorld).project(camera);
      const x = clampX(((projected.x + 1) / 2) * w);
      const y = clampY(((1 - projected.y) / 2) * h);
      span.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
    if (activeOrb) {
      projected.copy(activeOrb.position).applyMatrix4(rig.matrixWorld).project(camera);
      tip.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, calc(-100% - 22px))`;
    }
  }

  /* ---------------------------------------------------------------- selection */
  let activeOrb = null;
  let pinned = null;
  function setActive(orb, source) {
    if (orb === activeOrb) return;
    orbs.forEach((o) => {
      o.material.emissiveIntensity = o === orb ? 1.25 : 0.55;
      o.scale.setScalar(o === orb ? 1.35 : 1);
    });
    activeOrb = orb;
    attemptBtns.forEach((b) => b.setAttribute("aria-pressed", String(Boolean(orb) && b.dataset.attempt === orb.userData.id)));
    if (orb) {
      tip.textContent = orb.userData.title;
      tip.hidden = false;
      readout(detail, orb.userData);
    } else {
      tip.hidden = true;
      readout(detail, null);
    }
    if (source !== "loop") requestRender();
  }

  attemptBtns.forEach((btn) => {
    const orb = orbs.find((o) => o.userData.id === btn.dataset.attempt);
    const choose = () => { pinned = orb; setActive(orb); };
    btn.addEventListener("click", () => {
      if (pinned === orb) { pinned = null; setActive(null); } else choose();
    });
    btn.addEventListener("focus", choose);
  });

  /* ---------------------------------------------------------------- pointer */
  const pointer = new THREE.Vector2(0, 0);
  const aim = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  let pointerInside = false;
  let pointerDirty = false;

  stage.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    pointerInside = true;
    pointerDirty = true;
    if (reduce) requestRender();
  });
  stage.addEventListener("pointerleave", () => {
    pointerInside = false;
    canvas.style.cursor = "";
    if (!pinned) setActive(null);
  });
  canvas.addEventListener("click", () => {
    if (!hovered) { pinned = null; setActive(null); return; }
    pinned = pinned === hovered ? null : hovered;
    setActive(pinned || hovered);
  });

  let hovered = null;
  function pick() {
    if (!pointerInside || !pointerDirty) return;
    pointerDirty = false;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(orbs, false)[0];
    hovered = hit ? hit.object : null;
    canvas.style.cursor = hovered ? "pointer" : "";
    if (!pinned) setActive(hovered, "loop");
  }

  /* ---------------------------------------------------------------- sizing */
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* Pull the camera back on narrow stages so the whole cube stays in frame. */
    camera.position.z = w / h < 1.1 ? 2400 : 1600;
    camera.updateProjectionMatrix();
    requestRender();
  }
  new ResizeObserver(resize).observe(stage);

  /* ---------------------------------------------------------------- loop */
  let running = false;
  let paused = false;
  let visible = true;
  let raf = 0;
  let pendingStatic = false;

  function draw(now) {
    if (!reduce) {
      const idleX = Math.sin(now / 5200) * 0.1;
      const idleY = Math.sin(now / 7300) * 0.22;
      const tx = pointerInside ? pointer.x * 0.55 : idleY;
      const ty = pointerInside ? pointer.y * 0.28 : idleX;
      aim.x += (tx - aim.x) * 0.06;
      aim.y += (ty - aim.y) * 0.06;
      rig.rotation.set(REST_X - aim.y, REST_Y + aim.x, 0);
      const pulse = 1 + Math.sin(now / 620) * 0.06;
      orbs.forEach((o) => { if (o !== activeOrb) o.scale.setScalar(pulse); });
    }
    pick();
    placeLabels();
    renderer.render(scene, camera);
  }

  function frame(now) {
    raf = 0;
    draw(now);
    if (running) raf = requestAnimationFrame(frame);
  }

  function requestRender() {
    if (running || pendingStatic) return;
    pendingStatic = true;
    requestAnimationFrame((now) => { pendingStatic = false; draw(now); });
  }

  function start() {
    if (reduce || paused || !visible || document.hidden || running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function setPaused(next) {
    paused = next;
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", String(paused));
      pauseBtn.textContent = paused ? "Resume motion" : "Pause motion";
    }
    if (paused) stop();
    else start();
  }
  pauseBtn?.addEventListener("click", () => setPaused(!paused));

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }, { threshold: 0.05 }).observe(stage);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if (reduce && pauseBtn) pauseBtn.hidden = true;

  rig.rotation.set(REST_X, REST_Y, 0);
  document.documentElement.classList.add("has-webgl");
  resize();
  draw(performance.now());
  start();
}

/* Entry point. Deliberately last: boot() reads the module-level constants above, and a const
   is not initialised until its declaration runs. The first hero on this site shipped calling
   boot() from the top of its module and threw before it ever drew. */
const sceneCanvas = document.getElementById("signal-scene");
const sceneDetail = document.getElementById("scene-detail");
readout(sceneDetail, null);
if (sceneCanvas && hasWebGL()) {
  boot(sceneCanvas);
} else if (sceneDetail) {
  /* Without WebGL the attempt buttons still work: they fill the readout directly. */
  document.querySelectorAll("[data-attempt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = STRUGGLE.find((s) => s.id === btn.dataset.attempt);
      readout(sceneDetail, item);
      document.querySelectorAll("[data-attempt]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    });
  });
}
