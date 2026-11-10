/* Small page behaviours for the student site: nav shadow, feature tabs, screenshot gallery,
   scroll reveal. Everything works without it; JS only adds polish. */
(() => {
  "use strict";
  const doc = document;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* App Store links: Klera is only listed in European storefronts, and a region-less link sends
     everyone to the US store. Use the visitor's own store when their browser region is one we
     know Klera is in; otherwise keep the built-in UK link. */
  const EU = "at be bg ch cy cz de dk ee es fi fr gb gr hr hu ie is it li lt lu lv mt nl no pl pt ro se si sk".split(" ");
  const region = (navigator.languages || [navigator.language || ""])
    .map((l) => (l.split("-")[1] || "").toLowerCase()).find((r) => EU.includes(r));
  if (region) {
    doc.querySelectorAll("[data-store]").forEach((a) => {
      a.href = a.href.replace(/apps\.apple\.com\/[a-z]{2}\//, `apps.apple.com/${region}/`);
    });
  }

  /* Nav gets a hairline once the page scrolls. */
  const nav = doc.querySelector("[data-nav]");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Feature tour: ARIA tabs with arrow-key support. */
  doc.querySelectorAll("[data-tour]").forEach((tour) => {
    const tabs = [...tour.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        doc.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
      tab.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        else if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
        else if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
      });
    });
  });

  /* Gallery arrows scroll one screenshot at a time. */
  const gallery = doc.querySelector("[data-gallery]");
  if (gallery) {
    const by = (dir) => {
      const img = gallery.querySelector("img");
      const w = img ? img.getBoundingClientRect().width + 16 : 300;
      gallery.scrollBy({ left: dir * w, behavior: reduce ? "auto" : "smooth" });
    };
    doc.querySelector("[data-gallery-prev]")?.addEventListener("click", () => by(-1));
    doc.querySelector("[data-gallery-next]")?.addEventListener("click", () => by(1));
  }

  /* Reveal on scroll. */
  const items = doc.querySelectorAll("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }
})();

/* Visit counting: PostHog web analytics in the same EU project as the app. Memory-only
   persistence, so nothing is stored on the visitor's device (no cookies, no localStorage,
   no banner needed); each page load counts as its own anonymous visit. */
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init("phc_uv8cdYKR6kgUdsfa6PLBaxXtF83TcA2MPgnYj8TSNaYY", {
  api_host: "https://eu.i.posthog.com",
  persistence: "memory",
  person_profiles: "never",
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: true,
  capture_pageleave: true,
  ip: false,
  property_denylist: ["$ip"],
  loaded: (ph) => ph.register({ source: "website" }),
});
