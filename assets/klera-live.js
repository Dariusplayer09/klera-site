/* Klera, alive on the page.

   One orchestrated moment on load (the pen writes "klera" along the app's own wordmark path, then
   turns back into the bulb beside it, the way the app says hello), and after that every motion
   answers the visitor: Klera's eyes follow the pointer, it thinks when clicked, and each demo
   below drives it the way the app does (pen to write, highlighter for a mistake, rays for a hint).

   Needs klera-character.js first. Every piece checks prefers-reduced-motion and shows its
   finished state instead of animating. */
(() => {
  "use strict";
  const doc = document;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  // Held still until the frames exported from the app's own Swift engine replace this copy.
  const reduce = () => true;
  const Klera = window.Klera;
  if (!Klera) return;
  const smootherstep = (x) => { const t = Math.min(Math.max(x, 0), 1); return t * t * t * (t * (t * 6 - 15) + 10); };
  const easeInOutQuad = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* Every live Klera on the page follows the pointer with its eyes. */
  const all = [];
  let lastPointer = null;
  doc.addEventListener("pointermove", (e) => {
    lastPointer = [e.clientX, e.clientY];
    all.forEach((k) => { if (!k.noFollow) k.lookAt(e.clientX, e.clientY); });
  }, { passive: true });
  const make = (host, opts) => { const k = new Klera(host, opts); all.push(k); return k; };

  /* ------------------------------------------------------------------ the logo, written live
     The wordmark path is the app's KleraWordmarkStroke.json (traced centreline, pen times per
     point), drawn exactly as KleraWelcomeView does: eased over three seconds, stroke 13.5 in
     the 989 x 189 space, an amber-to-gold sweep that settles into flat Klera yellow. */
  const logo = doc.querySelector("[data-live-logo]");
  let heroKlera = null;
  if (logo) {
    const bulbHost = logo.querySelector(".logo-bulb");
    const svg = logo.querySelector(".logo-word");
    heroKlera = make(bulbHost, { label: "Klera" });
    bulbHost.addEventListener("click", () => heroKlera.ponder(3.4));
    bulbHost.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); heroKlera.ponder(3.4); } });

    const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    const strokes = [...svg.querySelectorAll(".wm-stroke")];
    const flats = [...svg.querySelectorAll(".wm-flat")];

    fetch(logo.dataset.liveLogo).then((r) => r.json()).then(async (data) => {
      const full = data.strokes.map((s) => s.x.map((x, i) => [x, s.y[i]]));
      flats.forEach((el, i) => el.setAttribute("d", path(full[i])));
      if (reduce()) { logo.classList.add("is-inked"); return; }

      /* Where a wordmark point lands on screen, relative to the bulb host's resting box. */
      /* The bulb's resting box, read before any transform moves it. */
      const rest = bulbHost.getBoundingClientRect();
      const place = (x, y) => {
        const sr = svg.getBoundingClientRect(), br = rest;
        const px = sr.left + (x / 989) * sr.width, py = sr.top + (y / 189) * sr.height;
        const [tx, ty] = Klera.penTip;
        return [px - (br.left + tx * br.width), py - (br.top + ty * br.height)];
      };
      const written = (time, s) => {
        const local = time - s.start, last = s.t[s.t.length - 1];
        if (local <= 0) return null;
        if (local >= last) return { i: s.t.length - 1, f: 0 };
        let lo = 0, hi = s.t.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s.t[m] <= local) lo = m; else hi = m; }
        return { i: lo, f: (local - s.t[lo]) / (s.t[hi] - s.t[lo]) };
      };

      logo.classList.add("is-writing");
      heroKlera.noFollow = true;
      heroKlera.pen = heroKlera.penFrom = heroKlera.penTo = 1;
      heroKlera.penShape = "pen";
      const start0 = place(full[0][0][0], full[0][0][1]);
      bulbHost.style.transform = `translate(${start0[0]}px, ${start0[1]}px) scale(.62)`;
      await sleep(250);

      const DURATION = 3000;
      const t0 = performance.now();
      await new Promise((done) => {
        const step = (now) => {
          const u = Math.min((now - t0) / DURATION, 1);
          const time = easeInOutQuad(u) * data.total;
          let tip = null;
          data.strokes.forEach((s, k) => {
            const w = written(time, s);
            if (!w) { strokes[k].setAttribute("d", ""); return; }
            const pts = full[k].slice(0, w.i + 1);
            const n = full[k][w.i + 1];
            if (w.f > 0 && n) { const a = full[k][w.i]; pts.push([a[0] + (n[0] - a[0]) * w.f, a[1] + (n[1] - a[1]) * w.f]); }
            strokes[k].setAttribute("d", path(pts));
            if (w.i < full[k].length - 1 || k === data.strokes.length - 1) tip = pts[pts.length - 1];
          });
          if (tip) { const d = place(tip[0], tip[1]); bulbHost.style.transform = `translate(${d[0]}px, ${d[1]}px) scale(.62)`; }
          if (u < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });

      // The ink settles into Klera yellow while the pen flies home and becomes the bulb.
      logo.classList.add("is-inked");
      await sleep(150);
      bulbHost.classList.add("is-flying");
      bulbHost.style.transform = "";
      heroKlera.becomeBulb();
      await sleep(800);
      bulbHost.classList.remove("is-flying");
      logo.classList.remove("is-writing");
      heroKlera.noFollow = false;
      if (lastPointer) heroKlera.lookAt(...lastPointer);
      doc.dispatchEvent(new CustomEvent("klera:hello"));
    }).catch(() => logo.classList.add("is-inked", "is-static"));
  }

  /* ------------------------------------------------------------------ the companion
     In the app Klera lives top-right and watches the board. Here it lives top-right and watches
     the page: it appears once the hero logo scrolls away, and reacts as each section arrives. */
  const companionHost = doc.querySelector("[data-companion]");
  if (companionHost) {
    const k = make(companionHost, { label: "Klera" });
    const btn = companionHost;
    btn.addEventListener("click", () => k.ponder(3.4));
    const show = (on) => btn.classList.toggle("is-shown", on);
    const anchor = doc.querySelector(".hero-live") || doc.querySelector("main > section");
    if (anchor && "IntersectionObserver" in window) {
      new IntersectionObserver((es) => show(!es[0].isIntersecting), { threshold: 0 }).observe(anchor);
    } else { show(true); }

    /* data-klera on a section: think | pen | highlighter | hint. Fires once per entry. */
    if ("IntersectionObserver" in window) {
      let timer = 0;
      const act = (mode) => {
        clearTimeout(timer);
        if (mode === "think") k.ponder(1.7);
        else if (mode === "hint") k.flash();
        else if (mode === "pen" || mode === "highlighter") { k.becomePen(mode); timer = setTimeout(() => k.becomeBulb(), 1600); }
      };
      const seen = new WeakSet();
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && !seen.has(e.target)) { seen.add(e.target); if (btn.classList.contains("is-shown")) act(e.target.dataset.klera); }
        else if (!e.isIntersecting) seen.delete(e.target);
      }), { rootMargin: "-35% 0px -45% 0px" });
      doc.querySelectorAll("[data-klera]").forEach((el) => io.observe(el));
    }
    window.kleraCompanion = k;
  }

  /* ------------------------------------------------------------------ try it: the watching pad
     The visitor writes; Klera watches the way the app does with the pen it can see here: how long
     you stop, and whether you rub out. It cannot read what you wrote, and says so. */
  const pad = doc.querySelector("[data-pad]");
  if (pad) {
    const canvas = pad.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const status = pad.querySelector("[data-pad-status]");
    const k = make(pad.querySelector(".pad-klera"), { label: "Klera, watching the pad" });
    const toolBtns = [...pad.querySelectorAll("[data-tool]")];
    let tool = "pen", drawing = false, last = null, inkCount = 0, lastStroke = 0, erasedSinceInk = false, erases = [];
    let pauseTimer = 0, said = "";

    const say = (text) => { if (text !== said) { said = text; status.textContent = text; } };
    const fit = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const img = inkCount ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = ctx.lineJoin = "round";
      if (img) ctx.putImageData(img, 0, 0);
    };
    fit();
    new ResizeObserver(fit).observe(canvas);

    const setTool = (t) => {
      tool = t;
      toolBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
      canvas.classList.toggle("is-erasing", t === "erase");
    };
    toolBtns.forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.tool === "clear") {
        ctx.clearRect(0, 0, canvas.width, canvas.height); inkCount = 0; pad.classList.remove("has-ink"); erases = []; erasedSinceInk = false;
        k.clearFlash(); k.becomeBulb(); clearTimeout(pauseTimer);
        say("Clean page. Write anything: a sum, a word, a doodle.");
        return;
      }
      setTool(b.dataset.tool);
    }));

    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      drawing = true; last = pos(e);
      clearTimeout(pauseTimer); k.clearFlash();
      if (e.button === 5 || e.buttons === 32) setTool("erase");   // Pencil and stylus erasers
      const gap = (performance.now() - lastStroke) / 1000;
      if (tool === "erase") {
        erases.push(performance.now()); erases = erases.filter((t) => performance.now() - t < 12000);
        erasedSinceInk = true;
      } else if (inkCount && erasedSinceInk) {
        erasedSinceInk = false;
        if (erases.length >= 3) { say("A lot of rubbing out in a short time. This is where Klera checks in, before stuck turns into fed up."); k.ponder(1.7); }
        else { say("You rubbed something out and kept going. Klera leaves that alone: fixing it yourself is the good kind of stuck."); k.ponder(1.7); }
      } else if (inkCount && gap > 1.2 && gap < 4) {
        say("Watching. You're moving, so Klera stays quiet.");
      } else if (!inkCount) {
        say("Watching. Keep going.");
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      const p = pos(e);
      const pressure = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
      ctx.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = "#1B1A17";
      ctx.lineWidth = tool === "erase" ? 26 : 1.6 + pressure * 2.6;
      ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      if (tool !== "erase") { inkCount++; pad.classList.add("has-ink"); }
      last = p;
    });
    const end = () => {
      if (!drawing) return;
      drawing = false; lastStroke = performance.now();
      clearTimeout(pauseTimer);
      if (!inkCount) return;
      pauseTimer = setTimeout(() => {
        k.flash();
        say("You stopped for three seconds. In the app this is where Klera would offer a hint, a small one, about where you stopped.");
      }, 3000);
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    setTool("pen");
  }

  /* ------------------------------------------------------------------ the help hub
     A tab list of the help ladder. Each rung sends the panel's Klera into what it does in the app. */
  const hub = doc.querySelector("[data-hub]");
  if (hub) {
    const tabs = [...hub.querySelectorAll('[role="tab"]')];
    const panels = [...hub.querySelectorAll('[role="tabpanel"]')];
    const k = make(hub.querySelector(".hub-klera"), { label: "Klera" });
    let timer = 0;
    const act = (mode) => {
      clearTimeout(timer); k.clearFlash(); k.talk(false);
      if (mode === "hint") { k.becomeBulb(); k.flash(); }
      else if (mode === "pen" || mode === "highlighter") k.becomePen(mode);
      else if (mode === "talk") { k.becomeBulb(); k.talk(true); k.ponder(1.7); timer = setTimeout(() => k.talk(false), 2600); }
      else { k.becomeBulb(); k.ponder(1.7); }
    };
    const select = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
      if (focus) tab.focus();
      hub.classList.toggle("has-own", tab.hasAttribute("data-own-klera"));
      act(tab.dataset.mode);
      hub.style.setProperty("--rung", tabs.indexOf(tab));
      doc.dispatchEvent(new CustomEvent("klera:panel", { detail: tab.getAttribute("aria-controls") }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
    hub.style.setProperty("--rungs", tabs.length);
    hub.style.setProperty("--rung", 0);
  }

  /* ------------------------------------------------------------------ find my mistake
     Klera turns into its highlighter, travels to the wrong line and sweeps red across it, the
     way KleraMistakeMark does: soft wash, firmer underline, eased pass, length-scaled duration. */
  doc.querySelectorAll("[data-mistake]").forEach((box) => {
    const lines = [...box.querySelectorAll(".work-line")];
    const wrong = box.querySelector(".work-line.is-wrong");
    const mark = wrong.querySelector(".mark");
    const note = box.querySelector("[data-mistake-note]");
    const go = box.querySelector("[data-mistake-go]");
    const reset = box.querySelector("[data-mistake-reset]");
    const penHost = box.querySelector(".mistake-klera");
    const k = make(penHost, { label: "Klera's highlighter" });
    k.noFollow = true;
    let busy = false;

    const tipTo = (x, y) => {
      /* offsetLeft/Top are the untransformed resting spot inside the box. */
      const br = box.getBoundingClientRect(), size = penHost.offsetWidth;
      const [tx, ty] = Klera.penTip;
      penHost.style.transform = `translate(${x - br.left - penHost.offsetLeft - tx * size}px, ${y - br.top - penHost.offsetTop - ty * size}px)`;
    };
    const run = async (guess) => {
      if (busy) return;
      busy = true;
      lines.forEach((l) => l.classList.remove("is-guess-right", "is-guess-off"));
      if (guess) guess.classList.add(guess === wrong ? "is-guess-right" : "is-guess-off");
      const r = mark.getBoundingClientRect();
      const y = r.bottom - 2;
      if (reduce()) { box.classList.add("is-marked"); mark.style.setProperty("--p", 1); note.hidden = false; busy = false; return; }
      penHost.classList.add("is-on");
      k.becomePen("highlighter");
      penHost.classList.add("is-flying"); tipTo(r.left, y);
      await sleep(850);
      penHost.classList.remove("is-flying");
      box.classList.add("is-marked");
      const dur = Math.min(900, Math.max(350, r.width / 520 * 1000));
      const t0 = performance.now();
      await new Promise((done) => {
        const step = (now) => {
          const u = Math.min((now - t0) / dur, 1), p = easeInOutQuad(u);
          mark.style.setProperty("--p", p.toFixed(3));
          tipTo(r.left + r.width * p, y);
          if (u < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      note.hidden = false;
      await sleep(500);
      k.becomeBulb();
      penHost.classList.add("is-flying"); penHost.style.transform = "";
      await sleep(700);
      penHost.classList.remove("is-flying", "is-on");
      busy = false;
    };
    lines.forEach((l) => {
      l.addEventListener("click", () => run(l));
      l.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); run(l); } });
    });
    go.addEventListener("click", () => run(null));
    reset.addEventListener("click", () => {
      box.classList.remove("is-marked"); mark.style.setProperty("--p", 0); note.hidden = true;
      lines.forEach((l) => l.classList.remove("is-guess-right", "is-guess-off"));
    });
  });

  /* ------------------------------------------------------------------ teach me why
     A short lesson in the shape the app's lessons take: spoken lines, a point you drag, and a
     guess. f(x) = x^2 - 6x + 5, the same problem as the screenshots on this page. */
  doc.querySelectorAll("[data-lesson]").forEach((root) => {
    const svg = root.querySelector("svg");
    const NS = "http://www.w3.org/2000/svg";
    const W = 560, H = 380, X0 = -0.6, X1 = 6.6, Y0 = -5.5, Y1 = 12;
    const sx = (x) => ((x - X0) / (X1 - X0)) * W, sy = (y) => H - ((y - Y0) / (Y1 - Y0)) * H;
    const f = (x) => x * x - 6 * x + 5, fp = (x) => 2 * x - 6;
    const el = (tag, a, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); parent.appendChild(e); return e; };
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    for (let gx = 0; gx <= 6; gx++) el("line", { x1: sx(gx), x2: sx(gx), y1: 0, y2: H, class: "g-grid" });
    for (let gy = -4; gy <= 12; gy += 2) el("line", { x1: 0, x2: W, y1: sy(gy), y2: sy(gy), class: "g-grid" });
    el("line", { x1: 0, x2: W, y1: sy(0), y2: sy(0), class: "g-axis" });
    el("line", { x1: sx(0), x2: sx(0), y1: 0, y2: H, class: "g-axis" });
    for (let gx = 1; gx <= 6; gx++) { const t = el("text", { x: sx(gx), y: sy(0) + 18, class: "g-tick" }); t.textContent = gx; }
    let d = "";
    for (let i = 0; i <= 160; i++) { const x = X0 + (X1 - X0) * i / 160; d += `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`; }
    el("path", { d, class: "g-curve" });
    const tangent = el("line", { class: "g-tangent" });
    const point = el("circle", { r: 9, class: "g-point", tabindex: 0, role: "slider", "aria-label": "Point on the curve. Use arrow keys to move it.", "aria-valuemin": 0, "aria-valuemax": 6 });
    const read = root.querySelector("[data-lesson-read]");
    const line = root.querySelector("[data-lesson-line]");
    const guesses = root.querySelector("[data-lesson-guess]");
    const nextBtn = root.querySelector("[data-lesson-next]");
    const k = make(root.querySelector(".lesson-klera"), { label: "Klera, teaching" });
    let x = 1, stage = 0, dragged = 0, typing = 0;

    const fmt = (v) => (Math.abs(v) < 0.005 ? "0" : v.toFixed(2)).replace("-", "−");
    const draw = () => {
      const y = f(x), m = fp(x), span = 1.4;
      point.setAttribute("cx", sx(x)); point.setAttribute("cy", sy(y));
      tangent.setAttribute("x1", sx(x - span)); tangent.setAttribute("y1", sy(y - m * span));
      tangent.setAttribute("x2", sx(x + span)); tangent.setAttribute("y2", sy(y + m * span));
      point.setAttribute("aria-valuenow", x.toFixed(2));
      point.setAttribute("aria-valuetext", `x = ${fmt(x)}, slope ${fmt(m)}`);
      read.innerHTML = `x = ${fmt(x)} &nbsp; f(x) = ${fmt(y)} &nbsp; slope = 2x − 6 = <b class="${m < -0.005 ? "neg" : m > 0.005 ? "pos" : "zero"}">${fmt(m)}</b>`;
    };

    /* Klera "says" each line: the text writes out at reading pace while the mouth moves. */
    const speak = (text) => {
      clearInterval(typing);
      if (reduce()) { line.textContent = text; return; }
      k.talk(true);
      let i = 0;
      line.textContent = "";
      typing = setInterval(() => {
        i += 2; line.textContent = text.slice(0, i);
        if (i >= text.length) { clearInterval(typing); k.talk(false); }
      }, 28);
    };
    const STAGES = [
      () => { speak("This is f(x) = x² − 6x + 5. Drag the gold point along the curve and watch the line touching it."); nextBtn.hidden = true; guesses.hidden = true; },
      () => { speak("That line is the tangent. Its slope is f′(x). Left of the bottom the curve goes down, so the slope is negative. Right of it, positive."); nextBtn.hidden = false; nextBtn.textContent = "Got it"; },
      () => { speak("Your turn. At the very bottom of the curve, what is the slope?"); nextBtn.hidden = true; guesses.hidden = false; k.flash(); },
      () => { speak("Right, zero. The tangent is flat. That's why you solve f′(x) = 0 to find a minimum: 2x − 6 = 0, so x = 3. Drag the point to x = 3 and check."); guesses.hidden = true; k.clearFlash(); },
      () => { speak("f(3) = −4. That's the minimum, and now you know why it's there, not just where."); nextBtn.hidden = false; nextBtn.textContent = "Start again"; k.ponder(1.7); },
    ];
    const goTo = (s) => { stage = s; STAGES[s](); };

    const setX = (nx) => {
      x = Math.min(Math.max(nx, 0), 6);
      if (stage === 3 && Math.abs(x - 3) < 0.12) { x = 3; draw(); goTo(4); return; }
      draw();
      dragged += 1;
      if (stage === 0 && dragged > 25) goTo(1);
    };
    const toX = (e) => { const r = svg.getBoundingClientRect(); return X0 + ((e.clientX - r.left) / r.width) * (X1 - X0); };
    let dragging = false;
    point.addEventListener("pointerdown", (e) => { dragging = true; try { point.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    svg.addEventListener("pointerdown", (e) => { if (e.target !== point) { dragging = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} setX(toX(e)); } });
    svg.addEventListener("pointermove", (e) => { if (dragging) setX(toX(e)); });
    const stop = () => { dragging = false; };
    svg.addEventListener("pointerup", stop);
    svg.addEventListener("pointercancel", stop);
    point.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : 0;
      if (d) { e.preventDefault(); dragged += 10; setX(Math.round((x + d) * 10) / 10); }
    });
    guesses.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.answer === "zero") goTo(3);
      else { speak(`Not quite. ${b.dataset.answer === "neg" ? "Negative" : "Positive"} is what you'd see on one side of the bottom. Drag the point right to the bottom and look at the tangent, then try again.`); }
    }));
    nextBtn.addEventListener("click", () => { if (stage === 4) { x = 1; dragged = 0; draw(); goTo(0); } else goTo(stage + 1); });
    draw();
    /* Start talking when the lesson is first seen, not on page load. */
    let started = false;
    const begin = () => { if (!started) { started = true; goTo(0); } };
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { if (es[0].isIntersecting) begin(); }, { threshold: 0.4 }).observe(root);
    else begin();
    doc.addEventListener("klera:panel", (e) => { if (root.closest(`#${e.detail}`)) begin(); });
  });

  /* ------------------------------------------------------------------ morph buttons (join page)
     The character's one line, reshaped on request. */
  doc.querySelectorAll("[data-morph-demo]").forEach((root) => {
    const k = make(root.querySelector(".morph-klera"), { label: "Klera" });
    root.querySelectorAll("[data-morph]").forEach((b) => b.addEventListener("click", () => {
      const m = b.dataset.morph;
      k.clearFlash();
      if (m === "think") { k.becomeBulb(); k.ponder(6.8); }
      else if (m === "pen" || m === "highlighter") k.becomePen(m);
      else if (m === "hint") { k.becomeBulb(); k.flash(); }
      else { k.stopThinking(); k.becomeBulb(); }
    }));
  });
})();
