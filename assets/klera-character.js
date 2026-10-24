/* Klera, the character, for the web.

   A direct port of the app's character (NeuraBoard/Views/Whiteboard/Klera/KleraGlyph.swift,
   KleraGlyph+Pen.swift, KleraPose.swift, KleraRenderer.swift, KleraPersonality.scholar).
   The logo is ONE traced line. It breathes, blinks, watches, reshapes itself into ∫ Σ √ π while
   it thinks, and becomes a pen or a highlighter when it works on the page. The point data below
   is copied verbatim from the app; if the logo changes there, copy the arrays again rather than
   editing points by hand.

   Everything lives in a unit box (0..1, y down) that is drawn into a 100 x 100 SVG viewBox.

   Usage:
     const k = new Klera(containerEl, { label: "Klera" });
     k.think(); k.stopThinking(); k.flash(); k.becomePen("pen" | "highlighter"); k.becomeBulb();
     k.lookAt(clientX, clientY); k.lookAway(); k.talk(true);
*/
(() => {
  "use strict";

  /* ------------------------------------------------------------------ geometry */
  const N = 128;                                  // points per morphable line
  const X0 = (1 - 392 / 538) / 2;                 // centres the 392-wide logo in the 538 box
  const P = (x, y) => [x + X0, y];

  const BULB = [
    P(0.3513, 0.8643), P(0.3309, 0.8773), P(0.2881, 0.8866), P(0.2454, 0.8829), P(0.2230, 0.8736),
    P(0.2156, 0.8662), P(0.2119, 0.8550), P(0.2156, 0.8401), P(0.2416, 0.8253), P(0.2732, 0.8178),
    P(0.3587, 0.8178), P(0.3885, 0.8067), P(0.4126, 0.7844), P(0.4164, 0.7732), P(0.4145, 0.7565),
    P(0.4089, 0.7491), P(0.3959, 0.7435), P(0.3420, 0.7416), P(0.3030, 0.7491), P(0.2138, 0.7770),
    P(0.1840, 0.7732), P(0.1784, 0.7546), P(0.1803, 0.7305), P(0.1766, 0.7249), P(0.1859, 0.7119),
    P(0.1914, 0.6803), P(0.1989, 0.6636), P(0.2007, 0.6506), P(0.1970, 0.6375), P(0.1859, 0.6283),
    P(0.1171, 0.5929), P(0.0985, 0.5781), P(0.0688, 0.5446), P(0.0502, 0.5130), P(0.0353, 0.4758),
    P(0.0260, 0.4219), P(0.0279, 0.3792), P(0.0390, 0.3364), P(0.0520, 0.3086), P(0.0855, 0.2584),
    P(0.1171, 0.2268), P(0.1413, 0.2082), P(0.1580, 0.1970), P(0.2082, 0.1747), P(0.2546, 0.1636),
    P(0.3383, 0.1636), P(0.3792, 0.1729), P(0.4145, 0.1877), P(0.4591, 0.2193), P(0.4870, 0.2472),
    P(0.5149, 0.2881), P(0.5279, 0.3160), P(0.5409, 0.3569), P(0.5446, 0.3866), P(0.5428, 0.4442),
    P(0.5409, 0.4572), P(0.5204, 0.5112), P(0.5037, 0.5372), P(0.4703, 0.5725), P(0.4480, 0.5874),
    P(0.4033, 0.6078), P(0.3922, 0.6208), P(0.3996, 0.6301), P(0.4089, 0.6580), P(0.4071, 0.6691),
    P(0.3364, 0.6729), P(0.2881, 0.6822), P(0.2398, 0.6989), P(0.2193, 0.7100), P(0.1859, 0.7156),
    P(0.1822, 0.7193),
  ];
  const EYES = [[P(0.2509, 0.3773), P(0.2509, 0.4033)], [P(0.3346, 0.3773), P(0.3346, 0.4033)]];
  const MOUTH = [
    P(0.1617, 0.4963), P(0.1822, 0.5204), P(0.1914, 0.5242), P(0.2063, 0.5204), P(0.2268, 0.4944),
    P(0.2379, 0.4907), P(0.2528, 0.4944), P(0.2677, 0.5167), P(0.2788, 0.5242), P(0.2974, 0.5204),
    P(0.3234, 0.4907), P(0.3346, 0.4870), P(0.3476, 0.4926), P(0.3606, 0.5167), P(0.3717, 0.5242),
    P(0.3922, 0.5204), P(0.4164, 0.4963),
  ];
  const RAYS = [
    [P(0.4740, 0.1022), P(0.5000, 0.0353)],
    [P(0.5706, 0.1729), P(0.6357, 0.1171)],
    [P(0.6264, 0.2807), P(0.6914, 0.2565)],
  ];
  const DOT = P(0.2890, 0.9534), DOT_R = 0.0381;
  const LINE_W = 0.0372, RAY_W = 0.0470, MOUTH_W = 0.0342;

  const SYMBOLS = {
    integral: [[0.285, 0.790], [0.300, 0.838], [0.338, 0.858], [0.380, 0.836], [0.404, 0.772], [0.418, 0.640],
      [0.430, 0.500], [0.442, 0.360], [0.458, 0.240], [0.490, 0.182], [0.535, 0.170], [0.570, 0.195], [0.580, 0.230]],
    sigma: [[0.640, 0.290], [0.632, 0.225], [0.622, 0.215], [0.270, 0.215], [0.262, 0.222], [0.468, 0.505],
      [0.468, 0.520], [0.262, 0.800], [0.272, 0.810], [0.628, 0.810], [0.636, 0.800], [0.648, 0.742]],
    root: [[0.215, 0.575], [0.262, 0.540], [0.275, 0.548], [0.345, 0.812], [0.356, 0.812], [0.470, 0.215],
      [0.482, 0.205], [0.740, 0.205], [0.752, 0.215], [0.758, 0.250]],
    pi: [[0.300, 0.800], [0.322, 0.770], [0.345, 0.660], [0.362, 0.460], [0.370, 0.345], [0.362, 0.338],
      [0.300, 0.345], [0.255, 0.372], [0.262, 0.352], [0.320, 0.330], [0.500, 0.322], [0.690, 0.312],
      [0.700, 0.318], [0.600, 0.322], [0.590, 0.332], [0.586, 0.520], [0.596, 0.700], [0.622, 0.790],
      [0.662, 0.808], [0.700, 0.786]],
  };
  const CYCLE = ["integral", "sigma", "root", "pi"];

  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const smootherstep = (x) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };

  function chaikin(pts, iterations) {
    if (pts.length <= 2) return pts;
    let p = pts;
    for (let k = 0; k < iterations; k++) {
      const next = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
        next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
      }
      next.push(p[p.length - 1]);
      p = next;
    }
    return p;
  }

  function resample(pts, count) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    const total = cum[cum.length - 1];
    const out = [];
    let seg = 0;
    for (let k = 0; k < count; k++) {
      const target = total * k / (count - 1);
      while (seg < pts.length - 2 && cum[seg + 1] < target) seg++;
      const span = cum[seg + 1] - cum[seg];
      out.push(lerp(pts[seg], pts[seg + 1], span > 0 ? (target - cum[seg]) / span : 0));
    }
    return out;
  }

  function morphCost(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const dx = a[i][0] - b[i][0], dy = a[i][1] - b[i][1]; s += dx * dx + dy * dy; }
    return s / a.length;
  }
  const orient = (prev, line) => {
    const back = line.slice().reverse();
    return morphCost(prev, back) < morphCost(prev, line) ? back : line;
  };

  /* Stagger makes the change travel ALONG the line, so it reads as one line being pulled into
     a new shape rather than two outlines cross-fading. */
  function morph(from, to, t, stagger) {
    const tt = clamp01(t), s = Math.min(Math.max(stagger || 0, 0), 0.9), n = from.length, out = new Array(n);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const local = s > 0 ? clamp01((tt - s * f) / (1 - s)) : tt;
      const e = smootherstep(local);
      out[i] = e >= 1 ? to[i] : e <= 0 ? from[i] : lerp(from[i], to[i], e);
    }
    return out;
  }

  const BULB_LINE = resample(chaikin(BULB, 2), N);
  const SYMBOL_LINES = (() => {
    const r = {};
    let prev = BULB_LINE;
    for (const name of CYCLE) { r[name] = orient(prev, resample(chaikin(SYMBOLS[name], 2), N)); prev = r[name]; }
    return r;
  })();

  /* The stylus and the highlighter: same axis and nib, so they sit and rock identically. */
  const PEN_TIP = [0.27, 0.92], PEN_TOP = [0.70, 0.13], PEN_HALF = 0.065;
  const AXIS = (() => {
    const dx = PEN_TOP[0] - PEN_TIP[0], dy = PEN_TOP[1] - PEN_TIP[1], len = Math.hypot(dx, dy);
    const a = [dx / len, dy / len];
    return { a, n: [-a[1], a[0]], len };
  })();
  const at = (k, across) => [PEN_TIP[0] + AXIS.a[0] * k + AXIS.n[0] * across, PEN_TIP[1] + AXIS.a[1] * k + AXIS.n[1] * across];
  const PEN_LINE = (() => {
    const L = AXIS.len, w = PEN_HALF;
    const pts = [PEN_TIP, at(0.15, w), at(L * 0.55, w), at(L, w)];
    for (let i = 1; i < 8; i++) {
      const ang = Math.PI * i / 8;
      pts.push([PEN_TOP[0] + AXIS.n[0] * w * Math.cos(ang) + AXIS.a[0] * w * Math.sin(ang),
        PEN_TOP[1] + AXIS.n[1] * w * Math.cos(ang) + AXIS.a[1] * w * Math.sin(ang)]);
    }
    pts.push(at(L, -w), at(L * 0.55, -w), at(0.15, -w), [PEN_TIP[0] + AXIS.a[0] * 0.02, PEN_TIP[1] + AXIS.a[1] * 0.02]);
    return orient(BULB_LINE, resample(chaikin(pts, 1), N));
  })();
  const HIGHLIGHTER_LINE = (() => {
    const L = AXIS.len, nib = 0.035, neck = 0.06, barrel = 0.095;
    const pts = [at(0, nib), at(0.10, neck), at(0.17, neck), at(0.19, barrel), at(L * 0.55, barrel), at(L - 0.035, barrel),
      at(L - 0.005, barrel * 0.75), at(L, barrel * 0.5), at(L, -barrel * 0.5), at(L - 0.005, -barrel * 0.75),
      at(L - 0.035, -barrel), at(L * 0.55, -barrel), at(0.19, -barrel), at(0.17, -neck), at(0.10, -neck),
      at(0.045, -nib), at(0.005, nib * 0.85)];
    return orient(BULB_LINE, resample(chaikin(pts, 1), N));
  })();
  const PEN_EYES = [-1, 1].map((side) => {
    const mid = [PEN_TOP[0] - AXIS.a[0] * 0.17 + AXIS.n[0] * 0.028 * side, PEN_TOP[1] - AXIS.a[1] * 0.17 + AXIS.n[1] * 0.028 * side];
    return [[mid[0], mid[1] - 0.014], [mid[0], mid[1] + 0.014]];
  });

  /* KleraPersonality.scholar */
  const SCHOLAR = { breathAmp: 0.012, breathPeriod: 4.8, blinkEvery: 5.5, morphDur: 0.95, hold: 0.75, stagger: 0.35, rayFlashes: 2 };

  /* ------------------------------------------------------------------ pose helpers */
  const fract = (x) => x - Math.floor(x);
  function blinkAmount(time, every) {
    const cycle = Math.floor(time / every);
    const blinkAt = (cycle + fract(Math.sin(cycle * 12.9898) * 43758.5453) * 0.6 + 0.2) * every;
    const d = Math.abs(time - blinkAt);
    return d < 0.075 ? 1 - d / 0.075 : 0;
  }
  function rayGlow(elapsed, flashes) {
    const period = 0.9, settle = 0.35;
    return [0, 1, 2].map((i) => {
      const t = elapsed - i * 0.11;
      if (t < 0) return 0;
      if (t < period * flashes) {
        const local = (t % period) / period;
        return Math.max(Math.sin(local * Math.PI), t > period * flashes - period ? settle * local : 0);
      }
      return settle;
    });
  }
  function lineWhileThinking(elapsed) {
    const seg = SCHOLAR.morphDur + SCHOLAR.hold;
    const index = Math.floor(elapsed / seg), local = elapsed - index * seg;
    const to = SYMBOL_LINES[CYCLE[index % 4]];
    const from = index === 0 ? BULB_LINE : SYMBOL_LINES[CYCLE[(index - 1) % 4]];
    const t = Math.min(local / SCHOLAR.morphDur, 1);
    return { line: morph(from, to, t, SCHOLAR.stagger), away: index === 0 ? smootherstep(t) : 1 };
  }

  /* ------------------------------------------------------------------ rendering */
  const SVGNS = "http://www.w3.org/2000/svg";
  const f2 = (v) => (v * 100).toFixed(2);
  function smoothD(pts) {
    let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
      d += `Q${f2(pts[i][0])} ${f2(pts[i][1])} ${f2(m[0])} ${f2(m[1])}`;
    }
    const l = pts[pts.length - 1];
    return d + `L${f2(l[0])} ${f2(l[1])}`;
  }
  const sharpD = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${f2(p[0])} ${f2(p[1])}`).join("");

  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

  class Klera {
    constructor(host, opts = {}) {
      this.host = host;
      this.opts = opts;
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("class", "klera-svg");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", opts.label || "Klera, the tutor");
      svg.style.overflow = "visible";
      const mk = (tag, attrs) => { const el = document.createElementNS(SVGNS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };
      const ink = "var(--klera-ink, #171307)", glow = "var(--klera-glow, #E9B11E)";
      const stroke = (w) => ({ fill: "none", stroke: ink, "stroke-width": (w * 100).toFixed(2), "stroke-linecap": "round", "stroke-linejoin": "round" });
      this.g = mk("g", {});
      this.halo = RAYS.map(() => [mk("path", { fill: "none", stroke: glow, "stroke-linecap": "round", "stroke-width": (RAY_W * 320).toFixed(2), opacity: 0 }),
        mk("path", { fill: "none", stroke: glow, "stroke-linecap": "round", "stroke-width": (RAY_W * 210).toFixed(2), opacity: 0 })]);
      this.face = mk("g", {});
      this.halo.forEach(([a, b]) => { this.face.appendChild(a); this.face.appendChild(b); });
      this.rays = RAYS.map(() => mk("path", stroke(RAY_W)));
      this.eyes = EYES.map(() => mk("path", stroke(LINE_W)));
      this.mouth = mk("path", stroke(MOUTH_W));
      this.dot = mk("circle", { cx: f2(DOT[0]), cy: f2(DOT[1]), r: f2(DOT_R), fill: ink });
      [...this.rays, ...this.eyes, this.mouth, this.dot].forEach((el) => this.face.appendChild(el));
      this.line = mk("path", stroke(LINE_W));
      this.penEyesG = mk("g", { opacity: 0 });
      this.penEyeEls = PEN_EYES.map(() => mk("path", stroke(LINE_W)));
      this.penEyeEls.forEach((el) => this.penEyesG.appendChild(el));
      this.g.append(this.face, this.line, this.penEyesG);
      svg.appendChild(this.g);
      host.appendChild(svg);
      this.svg = svg;

      this.t0 = performance.now() / 1000;
      this.thinkStart = null; this.thinkEnd = null;
      this.flashStart = null;
      this.talking = false;
      this.pen = 0; this.penFrom = 0; this.penTo = 0; this.penAt = 0; this.penShape = "pen";
      this.eye = [0, 0]; this.eyeTarget = [0, 0];
      this.visible = true;
      this.last = this.now();

      if ("IntersectionObserver" in window) {
        new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; if (this.visible) this.kick(); }).observe(host);
      }
      document.addEventListener("visibilitychange", () => this.kick());
      reduceMQ.addEventListener("change", () => this.kick());
      this.frame = 0;
      this.kick();
    }

    now() { return performance.now() / 1000 - this.t0; }
    // Held still until the frames exported from the app's own Swift engine replace this copy.
    get reduce() { return true; }

    /* --- public API */
    think() { if (this.thinkStart != null && this.thinkEnd == null) return; this.thinkStart = this.now(); this.thinkEnd = null; this.kick(); }
    stopThinking() { if (this.thinkStart != null && this.thinkEnd == null) { this.thinkEnd = this.now(); this.kick(); } }
    get thinking() { return this.thinkStart != null && this.thinkEnd == null; }
    /* Think for one full symbol and come home: a short "hm" between topics. */
    ponder(seconds = 1.5) { this.think(); clearTimeout(this._ponder); this._ponder = setTimeout(() => this.stopThinking(), seconds * 1000); }
    flash() { this.flashStart = this.now(); this.kick(); }
    clearFlash() { this.flashStart = null; this.kick(); }
    talk(on) { this.talking = !!on; this.kick(); }
    becomePen(shape = "pen") { this.stopThinking(); this.penShape = shape; this.penTween(1); }
    becomeBulb() { this.penTween(0); }
    penTween(to) { this.penFrom = this.pen; this.penTo = to; this.penAt = this.now(); this.kick(); }
    /* Eyes follow a point on screen, within the character's small range. */
    lookAt(x, y) {
      const r = this.host.getBoundingClientRect();
      const cx = r.left + r.width * 0.36, cy = r.top + r.height * 0.4;
      const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1, reach = Math.min(len / 260, 1);
      this.eyeTarget = [dx / len * 0.022 * reach, dy / len * 0.016 * reach];
      this.kick();
    }
    lookAway() { this.eyeTarget = [0, 0]; this.kick(); }
    /* Where the nib is, in unit-box terms, so a caller can park it on a point. */
    static get penTip() { return PEN_TIP; }

    /* --- loop: runs while visible; idles (breath, blink) are why it keeps ticking */
    kick() { if (!this.frame) this.frame = requestAnimationFrame((t) => this.tick(t)); }
    tick() {
      this.frame = 0;
      this.render();
      const animating = !this.reduce || this.thinking || Math.abs(this.pen - this.penTo) > 0.001;
      if (this.visible && !document.hidden && animating) this.kick();
    }

    render() {
      const time = this.now();
      const dt = Math.min(time - this.last, 0.1); this.last = time;
      const reduce = this.reduce;

      // The line, from thinking.
      let line = BULB_LINE, away = 0;
      if (!reduce) {
        if (this.thinking) ({ line, away } = lineWhileThinking(time - this.thinkStart));
        else if (this.thinkStart != null && this.thinkEnd != null && time - this.thinkEnd < SCHOLAR.morphDur) {
          const from = lineWhileThinking(this.thinkEnd - this.thinkStart);
          const t = (time - this.thinkEnd) / SCHOLAR.morphDur;
          line = morph(from.line, BULB_LINE, t, SCHOLAR.stagger);
          away = from.away * (1 - smootherstep(t));
        }
      }
      let faceOpacity = 1 - away;

      // Becoming the pen.
      const pt = Math.min((time - this.penAt) / 0.6, 1);
      this.pen = this.penFrom + (this.penTo - this.penFrom) * smootherstep(pt);
      let penEyes = 0;
      if (this.pen > 0 && !reduce) {
        const tool = this.penShape === "highlighter" ? HIGHLIGHTER_LINE : PEN_LINE;
        line = morph(line, tool, this.pen, SCHOLAR.stagger);
        faceOpacity *= 1 - smootherstep(Math.min(this.pen * 1.6, 1));
        penEyes = smootherstep((this.pen - 0.6) / 0.4);
      }

      // Breath, blink, gaze, talk, rays.
      const scale = reduce ? 1 : 1 + SCHOLAR.breathAmp * Math.sin(time * 2 * Math.PI / SCHOLAR.breathPeriod);
      const blink = reduce ? 0 : blinkAmount(time, SCHOLAR.blinkEvery);
      const k = reduce ? 1 : 1 - Math.exp(-dt / 0.12);
      this.eye[0] += (this.eyeTarget[0] - this.eye[0]) * k;
      this.eye[1] += (this.eyeTarget[1] - this.eye[1]) * k;
      let mouthAmp = 1;
      if (this.talking && !reduce) mouthAmp = 1 + 0.45 * Math.abs(Math.sin(time * 2 * Math.PI * 3.1) * 0.5 + Math.sin(time * 2 * Math.PI * 4.7) * 0.5);
      let glow = [0, 0, 0];
      if (this.flashStart != null) glow = reduce ? [0.6, 0.6, 0.6] : rayGlow(time - this.flashStart, SCHOLAR.rayFlashes);

      // Draw. Breath scales about the filament dot so the bulb rises from its base.
      this.g.setAttribute("transform", `translate(${f2(DOT[0])} ${f2(DOT[1])}) scale(${scale.toFixed(4)}) translate(${f2(-DOT[0])} ${f2(-DOT[1])})`);
      this.line.setAttribute("d", smoothD(line));
      this.face.setAttribute("opacity", faceOpacity.toFixed(3));
      const open = Math.max(1 - blink, 0.08);
      EYES.forEach((eye, i) => {
        const mid = lerp(eye[0], eye[1], 0.5);
        const pts = eye.map((p) => [p[0] + this.eye[0], mid[1] + (p[1] - mid[1]) * open + this.eye[1]]);
        this.eyes[i].setAttribute("d", sharpD(pts));
      });
      const mMid = (Math.min(...MOUTH.map((p) => p[1])) + Math.max(...MOUTH.map((p) => p[1]))) / 2;
      this.mouth.setAttribute("d", sharpD(MOUTH.map((p) => [p[0], mMid + (p[1] - mMid) * mouthAmp])));
      RAYS.forEach((ray, i) => {
        const d = sharpD([ray[0], lerp(ray[0], ray[1], 1 + 0.28 * glow[i])]);
        this.rays[i].setAttribute("d", d);
        this.halo[i][0].setAttribute("d", d); this.halo[i][0].setAttribute("opacity", (0.10 * glow[i]).toFixed(3));
        this.halo[i][1].setAttribute("d", d); this.halo[i][1].setAttribute("opacity", (0.18 * glow[i]).toFixed(3));
      });
      this.penEyesG.setAttribute("opacity", penEyes.toFixed(3));
      const pOpen = Math.max(1 - blink, 0.1);
      PEN_EYES.forEach((eye, i) => {
        const mid = lerp(eye[0], eye[1], 0.5);
        this.penEyeEls[i].setAttribute("d", sharpD(eye.map((p) => [p[0], mid[1] + (p[1] - mid[1]) * pOpen])));
      });
    }
  }

  window.Klera = Klera;
})();
