/* Klera on the page: wires the app's exported motion (klera-engine.js) into the site.

   Every Klera pose, every stroke of handwriting and every highlighter pass shown here was produced
   by the app's own Swift code and exported frame by frame. This file only decides WHEN a piece
   plays: on load, on scroll into view, on a tab or a button. Reduced motion shows finished states. */
(() => {
  "use strict";
  const E = window.KleraEngine;
  if (!E) return;
  const doc = document;
  const base = (doc.querySelector("script[src*='klera-live.js']")?.getAttribute("src") || "assets/klera-live.js")
    .replace(/klera-live\.js.*$/, "");
  const data = (name) => E.load(`${base}data/engine/${name}.json`);
  const clips = data("klera-clips");

  /* ------------------------------------------------------------------ hero: the welcome wordmark
     KleraWelcomeView: the word writes itself in a warm sweep, turns Klera yellow and settles.
     The bulb joins it once the word has settled. */
  const logo = doc.querySelector("[data-welcome]");
  if (logo) {
    const bulbHost = logo.querySelector(".logo-bulb");
    const wordHost = logo.querySelector(".logo-word-host");
    Promise.all([data("klera-welcome"), clips]).then(async ([w, c]) => {
      const staticWord = wordHost.querySelector("svg");
      const word = new E.Welcome(wordHost, w);
      if (staticWord) staticWord.remove();
      const bulb = new E.Clip(bulbHost, c);
      bulbHost.addEventListener("click", () => bulb.play("think"));
      await word.play();
      logo.classList.add("has-bulb");
    }).catch(() => logo.classList.add("is-static", "has-bulb"));
  }

  /* ------------------------------------------------------------------ whiteboard scenes
     data-board="<scene>": plays once when it first scrolls into view (or when its tab opens),
     again from the replay button. */
  const boards = new Map();
  doc.querySelectorAll("[data-board]").forEach((host) => {
    const ready = Promise.all([data(host.dataset.board), clips]).then(([d, c]) => {
      const b = new E.Board(host, d, c);
      boards.set(host, b);
      return b;
    });
    const replay = host.parentElement.querySelector("[data-board-replay]");
    if (replay) replay.addEventListener("click", () => ready.then((b) => b.play()));
    let played = false;
    host._play = () => { if (!played) { played = true; ready.then((b) => b.play()); } };
    const panel = host.closest("[role='tabpanel']");
    if ((!panel || !panel.hidden) && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        if (es[0].isIntersecting) { io.disconnect(); host._play(); }
      }, { threshold: 0.5 });
      io.observe(host);
    }
  });

  /* ------------------------------------------------------------------ help hub: ARIA tabs */
  const hub = doc.querySelector("[data-hub]");
  if (hub) {
    const tabs = [...hub.querySelectorAll('[role="tab"]')];
    const panels = [...hub.querySelectorAll('[role="tabpanel"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
      if (focus) tab.focus();
      hub.style.setProperty("--rung", tabs.indexOf(tab));
      const panel = doc.getElementById(tab.getAttribute("aria-controls"));
      const board = panel && panel.querySelector("[data-board]");
      if (board) {
        const b = boards.get(board);
        if (b) { b.resize(); b.play(); } else board._play();
      }
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

  /* ------------------------------------------------------------------ try it: the watching pad
     The visitor writes; Klera watches with what the page can see: how long you stop, and whether
     you rub out. It cannot read what you wrote, and says so. Its reactions are the app's own clips
     (rays for a hint, thinking when it checks in). */
  const pad = doc.querySelector("[data-pad]");
  if (pad) {
    const canvas = pad.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const status = pad.querySelector("[data-pad-status]");
    let k = null;
    clips.then((c) => { k = new E.Clip(pad.querySelector(".pad-klera"), c); }).catch(() => {});
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
        if (k) k.play("idle"); clearTimeout(pauseTimer);
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
      clearTimeout(pauseTimer);
      if (e.button === 5 || e.buttons === 32) setTool("erase");   // Pencil and stylus erasers
      const gap = (performance.now() - lastStroke) / 1000;
      if (tool === "erase") {
        erases.push(performance.now()); erases = erases.filter((t) => performance.now() - t < 12000);
        erasedSinceInk = true;
      } else if (inkCount && erasedSinceInk) {
        erasedSinceInk = false;
        if (k) k.play("think");
        if (erases.length >= 3) say("A lot of rubbing out in a short time. This is where Klera checks in, before stuck turns into fed up.");
        else say("You rubbed something out and kept going. Klera leaves that alone: fixing it yourself is the good kind of stuck.");
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
      ctx.strokeStyle = "#1C1C1E";
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
        if (k) k.play("hint", null);
        say("You stopped for three seconds. In the app this is where Klera would offer a hint, a small one, about where you stopped.");
      }, 3000);
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    setTool("pen");
  }

  /* ------------------------------------------------------------------ the one line (join page)
     The app's own clips, on request. */
  doc.querySelectorAll("[data-morph-demo]").forEach((root) => {
    clips.then((c) => {
      const k = new E.Clip(root.querySelector(".morph-klera"), c);
      root.querySelectorAll("[data-morph]").forEach((b) => b.addEventListener("click", () => {
        const m = b.dataset.morph;
        k.play(m === "home" ? "idle" : m, m === "hint" ? null : "idle");
      }));
    }).catch(() => {});
  });
})();
