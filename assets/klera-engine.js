/* Klera, played from the app's own engine.

   Nothing here decides how Klera or the handwriting moves. Every frame was produced by the app's
   Swift code (KleraPose, KleraDirector, Handwriting2 and its animator, MistakeMark,
   KleraWordmarkStroke) and exported to assets/data/engine/*.json by
   NeuraBoardTests/SiteExport/KleraSiteExportTests.swift. This file only draws those frames:

   - Figure  draws one pose the way KleraRenderer.draw does (same marks, widths, halo, dot).
   - Clip    plays Klera on its own: idle, think, hint, pen, highlighter.
   - Board   plays a whiteboard scene: the student's ink, the tutor's ink as the animator painted
             it, the mistake highlight, and Klera flying out as the pen and home again.
   - Welcome plays the onboarding wordmark, as KleraWelcomeView does.

   Encoding (see the exporter): Klera's unit box x10000, stage points x10, times in ms, 0..1 x1000,
   degrees x100. Reduced motion shows each finished state and never animates. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reduceMQ.matches;
  const cache = new Map();
  const load = (url) => {
    if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); }));
    return cache.get(url);
  };
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const f2 = (x) => Math.round(x * 100) / 100;
  /* Index of the last frame at or before t (frames sorted by their first value, ms). */
  const at = (frames, t) => {
    let lo = 0, hi = frames.length - 1;
    if (!frames.length || t < frames[0][0]) return 0;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (frames[m][0] <= t) lo = m; else hi = m - 1; }
    return lo;
  };

  /* ------------------------------------------------------------------ one pose, as KleraRenderer.draw */
  class Figure {
    /* host: an element to fill. glyph: the exporter's glyph constants. */
    constructor(host, glyph) {
      this.g = glyph;
      const U = (v) => v / 10000;
      this.eyes = [glyph.eyeLeft, glyph.eyeRight].map((a) => [[U(a[0]), U(a[1])], [U(a[2]), U(a[3])]]);
      this.mouth = []; for (let i = 0; i < glyph.mouth.length; i += 2) this.mouth.push([U(glyph.mouth[i]), U(glyph.mouth[i + 1])]);
      const ys = this.mouth.map((p) => p[1]);
      this.mouthMid = (Math.min(...ys) + Math.max(...ys)) / 2;
      this.rays = glyph.rays.map((a) => [[U(a[0]), U(a[1])], [U(a[2]), U(a[3])]]);
      this.penEyes = glyph.penEyes.map((a) => [[U(a[0]), U(a[1])], [U(a[2]), U(a[3])]]);
      this.dot = [U(glyph.dot[0]), U(glyph.dot[1]), U(glyph.dot[2])];
      this.lw = U(glyph.lineWidth); this.rw = U(glyph.rayWidth); this.mw = U(glyph.mouthWidth);

      const svg = this.svg = el("svg", { viewBox: "0 0 100 100", class: "kf", "aria-hidden": "true", focusable: "false" });
      svg.style.overflow = "visible";
      const ink = glyph.ink, glow = glyph.glow;
      const stroke = (w, color) => ({ fill: "none", stroke: color || ink, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" });
      this.line = el("path", stroke(1), svg);
      this.penG = el("g", {}, svg);
      this.penPaths = this.penEyes.map(() => el("path", stroke(1), this.penG));
      this.face = el("g", {}, svg);
      this.eyePaths = this.eyes.map(() => el("path", stroke(1), this.face));
      this.mouthPath = el("path", stroke(1), this.face);
      this.rayEls = this.rays.map(() => ({
        halos: glyph.halo.map(() => el("path", { ...stroke(1, glow) }, this.face)),
        ray: el("path", stroke(1), this.face),
      }));
      this.dotEl = el("circle", { fill: ink }, this.face);
      host.appendChild(svg);
    }

    /* p: a pose frame. line: its morphable line (flat ints). lift: hover, body points. size: body points. */
    draw(p, line, lift = 0, size = 100) {
      const [, , face, edx, edy, blink, mouth, r0, r1, r2, sc, penEyes] = p;
      const s = sc / 10000, side = 100, oy = (lift / size) * side;
      const ax = this.dot[0], ay = this.dot[1];
      const map = (x, y) => [f2((ax + (x - ax) * s) * side), f2((ay + (y - ay) * s) * side + oy)];
      const lw = this.lw * side * s;

      // The line: quadratic curves through segment midpoints (KleraRenderer.smoothPath).
      const pts = []; for (let i = 0; i < line.length; i += 2) pts.push(map(line[i] / 10000, line[i + 1] / 10000));
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = f2((pts[i][0] + pts[i + 1][0]) / 2), my = f2((pts[i][1] + pts[i + 1][1]) / 2);
        d += `Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
      }
      d += `L${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
      this.line.setAttribute("d", d);
      this.line.setAttribute("stroke-width", f2(lw));

      // The pen's two small eyes.
      const pe = penEyes / 1000;
      this.penG.style.display = pe > 0.01 ? "" : "none";
      if (pe > 0.01) {
        this.penG.setAttribute("opacity", pe);
        const open = Math.max(1 - blink / 1000, this.g.penEyeMin / 1000);
        this.penEyes.forEach((e, k) => {
          const my = (e[0][1] + e[1][1]) / 2;
          const a = map(e[0][0], my + (e[0][1] - my) * open), b = map(e[1][0], my + (e[1][1] - my) * open);
          this.penPaths[k].setAttribute("d", `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
          this.penPaths[k].setAttribute("stroke-width", f2(lw));
        });
      }

      const fo = face / 1000;
      this.face.style.display = fo > 0.01 ? "" : "none";
      if (fo <= 0.01) return;
      this.face.setAttribute("opacity", fo);

      // Eyes: blink squashes each toward its midpoint.
      const es = Math.max(1 - blink / 1000, this.g.eyeMin / 1000);
      const dx = edx / 10000, dy = edy / 10000;
      this.eyes.forEach((e, k) => {
        const my = (e[0][1] + e[1][1]) / 2;
        const q = e.map((pt) => map(pt[0] + dx, my + (pt[1] - my) * es + dy));
        this.eyePaths[k].setAttribute("d", `M${q[0][0]} ${q[0][1]}L${q[1][0]} ${q[1][1]}`);
        this.eyePaths[k].setAttribute("stroke-width", f2(lw));
      });

      // Mouth: amplitude about its centreline, straight segments.
      const amp = mouth / 1000;
      this.mouthPath.setAttribute("d", this.mouth.map((pt, i) => {
        const q = map(pt[0], this.mouthMid + (pt[1] - this.mouthMid) * amp);
        return `${i ? "L" : "M"}${q[0]} ${q[1]}`;
      }).join(""));
      this.mouthPath.setAttribute("stroke-width", f2(this.mw * side * s));

      // Rays: a flash lengthens each and lays a halo under it.
      [r0, r1, r2].forEach((gi, k) => {
        const g = gi / 1000, ray = this.rays[k], st = 1 + (this.g.rayStretch / 1000) * g;
        const a = map(ray[0][0], ray[0][1]);
        const b = map(ray[0][0] + (ray[1][0] - ray[0][0]) * st, ray[0][1] + (ray[1][1] - ray[0][1]) * st);
        const dd = `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
        const re = this.rayEls[k];
        re.halos.forEach((h, j) => {
          if (g > 0.01) {
            h.style.display = "";
            h.setAttribute("d", dd);
            h.setAttribute("stroke-width", f2(this.rw * side * s * this.g.halo[j][0] / 1000));
            h.setAttribute("stroke-opacity", f2((this.g.halo[j][1] / 1000) * g));
          } else h.style.display = "none";
        });
        re.ray.setAttribute("d", dd);
        re.ray.setAttribute("stroke-width", f2(this.rw * side * s));
      });

      const c = map(this.dot[0], this.dot[1]);
      this.dotEl.setAttribute("cx", c[0]); this.dotEl.setAttribute("cy", c[1]);
      this.dotEl.setAttribute("r", f2(this.dot[2] * side * s));
    }
  }

  /* ------------------------------------------------------------------ a shared frame loop */
  const players = new Set();
  let raf = 0;
  const tick = (now) => {
    raf = 0;
    players.forEach((p) => p.frame(now));
    if (players.size) raf = requestAnimationFrame(tick);
  };
  const run = (p) => { players.add(p); if (!raf) raf = requestAnimationFrame(tick); };
  const halt = (p) => players.delete(p);

  /* Only animate what is on screen and while the tab is visible. */
  const watchVisible = (node, player) => {
    let onScreen = false;
    const sync = () => { if (onScreen && !document.hidden && player.wantsFrames()) run(player); else halt(player); };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; sync(); }).observe(node);
    } else onScreen = true;
    document.addEventListener("visibilitychange", sync);
    return sync;
  };

  /* ------------------------------------------------------------------ Klera on its own */
  class Clip {
    constructor(host, data) {
      this.data = data;
      this.figure = new Figure(host, data.glyph);
      this.name = "idle";
      this.start = performance.now();
      this.queue = null;
      this.sync = watchVisible(host, this);
      this.show(this.data.clips.idle.frames[0]);
      this.sync();
    }
    wantsFrames() { return !reduced(); }
    show(f) { this.figure.draw(f, this.data.lines[f[1]]); }
    /* Play a clip; when it ends, `then` (default idle, looping). Under reduced motion, show its
       most telling frame instead. */
    play(name, then = "idle") {
      const c = this.data.clips[name];
      if (!c) return;
      if (reduced()) {
        const fr = c.frames;
        this.show(name === "think" ? fr[Math.floor(fr.length * 0.45)] : name === "idle" ? fr[0] : fr[Math.floor(fr.length * 0.6)]);
        return;
      }
      this.name = name; this.queue = then; this.start = performance.now();
      this.sync();
    }
    frame(now) {
      const c = this.data.clips[this.name];
      let t = now - this.start;
      if (t > c.duration) {
        if (c.loop) { t %= c.duration; }
        else if (this.queue) { this.name = this.queue; this.queue = null; this.start = now; t = 0; }
        else t = c.duration;
      }
      const fr = this.data.clips[this.name].frames;
      this.show(fr[at(fr, t)]);
    }
  }

  /* ------------------------------------------------------------------ a whiteboard scene */
  const drawStroke = (ctx, pts, color) => {
    // PencilKit's own interpolation of the stroke, 1 pt apart: [x, y, width, force, opacity].
    if (pts.length < 10) return;
    ctx.strokeStyle = color;
    ctx.lineCap = ctx.lineJoin = "round";
    for (let i = 5; i < pts.length; i += 5) {
      ctx.globalAlpha = pts[i + 4] / 100;
      ctx.lineWidth = (pts[i - 3] + pts[i + 2]) / 200;
      ctx.beginPath();
      ctx.moveTo(pts[i - 5] / 10, pts[i - 4] / 10);
      ctx.lineTo(pts[i] / 10, pts[i + 1] / 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  class Board {
    /* host: an element; data: a board-*.json scene; clips: klera-clips.json for idle after the scene. */
    constructor(host, data, clips) {
      this.d = data; this.clips = clips;
      const [W, H] = data.stage;
      this.W = W; this.H = H;
      host.classList.add("engine-board");
      host.style.setProperty("--board", data.board);
      host.style.aspectRatio = `${W} / ${H}`;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "engine-ink";
      host.appendChild(this.canvas);
      if (data.markRect) {
        this.mark = document.createElement("div");
        this.mark.className = "engine-mark";
        this.mark.style.setProperty("--mark", data.markColor);
        host.appendChild(this.mark);
      }
      const dock = document.createElement("div");
      dock.className = "engine-dock";
      const [dx, dy, dd] = data.dock.map((v) => v / 10);
      Object.assign(dock.style, { left: `${((dx - dd / 2) / W) * 100}%`, top: `${((dy - dd / 2) / H) * 100}%`, width: `${(dd / W) * 100}%` });
      host.appendChild(dock);
      this.body = document.createElement("div");
      this.body.className = "engine-klera";
      this.size = data.bodySize / 10;
      this.body.style.width = `${(this.size / W) * 100}%`;
      host.appendChild(this.body);
      this.figure = new Figure(this.body, data.glyph);
      this.penTip = data.glyph.penTip.map((v) => v / 100);

      this.t = 0; this.playing = false; this.start = 0; this.after = 0;
      this.committed = -1;
      this.sync = watchVisible(host, this);
      new ResizeObserver(() => this.resize()).observe(host);
      this.host = host;
      this.resize();
      this.render(reduced() ? this.d.duration : 0);
    }
    wantsFrames() { return !reduced(); }
    resize() {
      const r = this.host.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.k = r.width / this.W;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round((r.width * this.H / this.W) * dpr);
      this.scale = this.k * dpr;
      this.base = null; this.committed = -1;
      this.render(this.t);
    }
    play() {
      if (reduced()) { this.render(this.d.duration); return; }
      this.playing = true; this.start = performance.now(); this.base = null; this.committed = -1;
      this.sync();
    }
    frame(now) {
      if (this.playing) {
        const t = now - this.start;
        this.render(Math.min(t, this.d.duration));
        if (t >= this.d.duration) { this.playing = false; this.after = now; }
      } else if (this.clips) {
        // After the scene: Klera at home, breathing and blinking (the app's idle clip).
        this.idle(now - this.after);
      }
    }
    /* The finished strokes, drawn once into an offscreen layer as they complete. */
    layer(count) {
      if (this.base && this.committed === count) return this.base;
      const c = this.base || document.createElement("canvas");
      c.width = this.canvas.width; c.height = this.canvas.height;
      const ctx = c.getContext("2d");
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      (this.d.studentStrokes || []).forEach((s) => drawStroke(ctx, s, this.d.studentInk));
      const tutor = this.d.tutorStrokes || [];
      for (let i = 0; i < Math.min(count, tutor.length); i++) drawStroke(ctx, tutor[i], this.d.tutorInk);
      this.base = c; this.committed = count;
      return c;
    }
    render(t) {
      this.t = t;
      const d = this.d, ctx = this.canvas.getContext("2d");
      if (!this.scale) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Ink: the strokes the animator had finished by t, and the one it was drawing.
      let done = 0, partial = null;
      if (d.inkFrames && d.inkFrames.length) {
        if (t >= d.inkFrames[0][0]) {
          const f = d.inkFrames[at(d.inkFrames, t)];
          done = f[1];
          if (f[2]) partial = d.partials[`${f[1]}:${f[2]}`];
        }
        if (t >= d.duration) { done = d.tutorStrokes.length; partial = null; }
      }
      ctx.drawImage(this.layer(done), 0, 0);
      if (partial) {
        ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        drawStroke(ctx, partial, d.tutorInk);
      }

      // The mistake highlight (KleraMistakeMarkLayer.highlight).
      if (this.mark) {
        let p = 0;
        if (d.markFrames.length && t >= d.markFrames[0][0]) p = d.markFrames[at(d.markFrames, t)][1] / 1000;
        if (t >= d.duration) p = 1;
        const [x, y, w, h] = d.markRect.map((v) => v / 10);
        Object.assign(this.mark.style, {
          left: `${(x / this.W) * 100}%`, top: `${(y / this.H) * 100}%`,
          width: `${((w * p) / this.W) * 100}%`, height: `${(h / this.H) * 100}%`,
          borderRadius: `${(d.markCorner / 10) * this.k}px`,
        });
        this.mark.style.setProperty("--uh", `${Math.max((d.markUnderline / 10) * this.k, 1.5)}px`);
      }

      // Klera on the stage (KleraStage.character).
      const kf = d.klera[at(d.klera, t)];
      if (kf) this.place(kf, kf);
    }
    place(kf, pose) {
      const n = kf.length, cx = kf[n - 5] / 10, cy = kf[n - 4] / 10, rot = kf[n - 3] / 100, nib = kf[n - 2], hover = kf[n - 1] / 100;
      const s = this.size;
      Object.assign(this.body.style, {
        left: `${((cx - s / 2) / this.W) * 100}%`, top: `${((cy - s / 2) / this.H) * 100}%`,
        transform: rot ? `rotate(${rot}deg)` : "",
        transformOrigin: nib ? `${this.penTip[0]}% ${this.penTip[1]}%` : "50% 50%",
      });
      this.figure.draw(pose, this.d.lines[pose[1]], hover, s);
    }
    idle(t) {
      const c = this.clips.clips.idle;
      const f = c.frames[at(c.frames, t % c.duration)];
      const last = this.d.klera[this.d.klera.length - 1];
      // Idle frames come from the clips' own line pool.
      const n = last.length, s = this.size;
      Object.assign(this.body.style, {
        left: `${((last[n - 5] / 10 - s / 2) / this.W) * 100}%`, top: `${((last[n - 4] / 10 - s / 2) / this.H) * 100}%`,
        transform: "", transformOrigin: "50% 50%",
      });
      this.figure.draw(f, this.clips.lines[f[1]], 0, s);
    }
  }

  /* ------------------------------------------------------------------ the welcome wordmark */
  class Welcome {
    /* host: an element holding nothing; data: klera-welcome.json. Resolves when settled. */
    constructor(host, data) {
      this.d = data; this.host = host;
      const [W, H] = data.size;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "engine-word", role: "img", "aria-label": "Klera" });
      const defs = el("defs", {}, svg);
      const id = `kw${Math.random().toString(36).slice(2, 8)}`;
      this.grad = el("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: -700, y1: 0, x2: -700 + W, y2: 0 }, defs);
      data.sweep.forEach(([c, o]) => el("stop", { offset: o / 1000, "stop-color": c }, this.grad));
      const style = (color) => ({ fill: "none", stroke: color, "stroke-width": data.lineWidth / 10, "stroke-linecap": "round", "stroke-linejoin": "round" });
      this.sweepG = el("g", {}, svg);
      this.flatG = el("g", { class: "engine-word-flat" }, svg);
      this.pts = data.strokes.map((s) => s.x.map((x, i) => [x / 10, s.y[i] / 10]));
      this.sweepPaths = this.pts.map(() => el("path", style(`url(#${id})`), this.sweepG));
      this.flatPaths = this.pts.map((p) => el("path", { ...style(data.yellow), d: this.path(p, p.length - 1, 0) }, this.flatG));
      host.appendChild(svg);
      this.svg = svg;
    }
    path(p, index, fraction) {
      let d = `M${f2(p[0][0])} ${f2(p[0][1])}`;
      for (let i = 1; i <= index; i++) d += `L${f2(p[i][0])} ${f2(p[i][1])}`;
      const n = p[index + 1];
      if (fraction > 0 && n) d += `L${f2(p[index][0] + (n[0] - p[index][0]) * fraction)} ${f2(p[index][1] + (n[1] - p[index][1]) * fraction)}`;
      return d;
    }
    finish() { this.host.classList.add("is-inked", "is-settled"); }
    play() {
      if (reduced()) { this.finish(); return Promise.resolve(); }
      this.host.classList.add("is-writing");
      return new Promise((resolve) => {
        const d = this.d;
        setTimeout(() => {
          const t0 = performance.now();
          const step = (now) => {
            const t = Math.min(now - t0, d.writeMs);
            const f = d.frames[at(d.frames, t)];
            this.pts.forEach((p, k) => {
              const index = f[1 + k * 2], fraction = f[2 + k * 2] / 1000;
              this.sweepPaths[k].setAttribute("d", index > 0 || fraction > 0 ? this.path(p, index, fraction) : "");
            });
            const x1 = d.sweepShift[0] + (t / d.writeMs) * d.sweepShift[1];
            this.grad.setAttribute("x1", x1); this.grad.setAttribute("x2", x1 + d.size[0]);
            if (t < d.writeMs) { requestAnimationFrame(step); return; }
            this.host.classList.add("is-inked");
            setTimeout(() => {
              this.host.classList.add("is-settled");
              setTimeout(() => { this.host.classList.remove("is-writing"); resolve(); }, d.settleMs);
            }, d.settleDelayMs);
          };
          requestAnimationFrame(step);
        }, d.delayMs);
      });
    }
  }

  window.KleraEngine = { load, Figure, Clip, Board, Welcome, reduced };
})();
