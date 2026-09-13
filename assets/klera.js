/* Klera site interaction layer. Every effect here answers the pointer or a click;
   nothing moves on its own. Transform, opacity and custom properties only. */
(() => {
  const doc = document;
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mqFine = matchMedia("(hover: hover) and (pointer: fine)");
  let reduce = mqReduce.matches;
  let fine = mqFine.matches;
  mqReduce.addEventListener("change", (e) => { reduce = e.matches; });
  mqFine.addEventListener("change", (e) => { fine = e.matches; });

  /* ---------------------------------------------------------- pointer spotlight + tilt
     The element's rect is read once on pointerenter, not on every move, so moving the
     pointer never forces layout. Updates are batched to one per animation frame. */
  const MAX_TILT = 5;
  doc.querySelectorAll(".panel, [data-tilt]").forEach((el) => {
    let rect = null;
    let frame = 0;
    let px = 0.5;
    let py = 0.5;
    const tilts = el.hasAttribute("data-tilt");

    const paint = () => {
      frame = 0;
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      if (tilts && !reduce) {
        el.style.setProperty("--ry", `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - py) * 2 * MAX_TILT).toFixed(2)}deg`);
      }
    };

    el.addEventListener("pointerenter", () => {
      if (!fine) return;
      rect = el.getBoundingClientRect();
      el.classList.add("is-hot");
    });
    el.addEventListener("pointermove", (e) => {
      if (!fine || !rect) return;
      px = (e.clientX - rect.left) / rect.width;
      py = (e.clientY - rect.top) / rect.height;
      if (!frame) frame = requestAnimationFrame(paint);
    });
    el.addEventListener("pointerleave", () => {
      rect = null;
      el.classList.remove("is-hot");
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });

  /* ---------------------------------------------------------- magnetic buttons */
  const PULL = 6;
  doc.querySelectorAll("[data-magnetic]").forEach((el) => {
    let rect = null;
    let frame = 0;
    let dx = 0;
    let dy = 0;
    const paint = () => {
      frame = 0;
      el.style.setProperty("--tx", `${dx.toFixed(1)}px`);
      el.style.setProperty("--ty", `${dy.toFixed(1)}px`);
    };
    el.addEventListener("pointerenter", () => { if (fine && !reduce) rect = el.getBoundingClientRect(); });
    el.addEventListener("pointermove", (e) => {
      if (!rect) return;
      dx = ((e.clientX - rect.left) / rect.width - 0.5) * 2 * PULL;
      dy = ((e.clientY - rect.top) / rect.height - 0.5) * 2 * PULL;
      if (!frame) frame = requestAnimationFrame(paint);
    });
    el.addEventListener("pointerleave", () => {
      rect = null;
      dx = 0;
      dy = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    });
  });

  /* ---------------------------------------------------------- pop-up sheets
     Native <dialog>: focus is trapped and Esc closes for free. Clicking the backdrop
     closes it, and focus goes back to whatever opened it. */
  doc.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-sheet]");
    if (opener) {
      const dialog = doc.getElementById(opener.dataset.sheet);
      if (dialog && !dialog.open) {
        dialog.klOpener = opener;
        dialog.showModal();
      }
      return;
    }
    const closer = e.target.closest("[data-sheet-close]");
    if (closer) closer.closest("dialog")?.close();
  });
  doc.querySelectorAll("dialog.sheet").forEach((dialog) => {
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => dialog.klOpener?.focus());
  });

  /* ---------------------------------------------------------- 2D ink writing
     Each path is measured and drawn in order with a pen-lift pause between strokes,
     because stroke order and rhythm are what make a hand read as a hand. */
  const write = (svg) => {
    if (!svg) return;
    const paths = [...svg.querySelectorAll("path")];
    if (reduce) {
      svg.classList.remove("writing");
      return;
    }
    svg.classList.remove("writing");
    void svg.getBBox();
    let t = 0.15;
    paths.forEach((p) => {
      const len = p.getTotalLength();
      const dur = Math.max(0.16, len / 280);
      p.style.setProperty("--len", len.toFixed(1));
      p.style.setProperty("--dur", `${dur.toFixed(3)}s`);
      p.style.setProperty("--delay", `${t.toFixed(3)}s`);
      t += dur + 0.12;
    });
    requestAnimationFrame(() => svg.classList.add("writing"));
  };

  const inkObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      write(entry.target);
      inkObserver.unobserve(entry.target);
    });
  }, { threshold: 0.35 });
  doc.querySelectorAll("svg[data-ink]").forEach((svg) => inkObserver.observe(svg));

  doc.querySelectorAll("[data-ink-replay]").forEach((btn) => {
    btn.addEventListener("click", () => write(doc.getElementById(btn.dataset.inkReplay)));
  });

  window.Klera = { write, reducedMotion: () => reduce };
})();
