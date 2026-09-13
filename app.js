/* Sukooon Detailers — final page logic
   Canvas UI (canvasui.dev) Droplets vanilla WebGL + restrained GSAP motion */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) document.documentElement.classList.add("reduced");

  /* ---------- Canvas UI Droplets (vanilla WebGL) ---------- */
  function initDroplets() {
    var stage = document.getElementById("stage");
    var source = document.getElementById("stageSource");
    var output = document.getElementById("stageOutput");
    var content = document.getElementById("stageContent");
    if (!stage || !source || !output || !content) return;

    var ok = false;
    try {
      ok = !!(window.CanvasUIDroplets && window.CanvasUIDroplets.supportsWebGL2());
    } catch (e) { ok = false; }

    if (!ok || reduced) {
      stage.classList.add("no-webgl");
      return;
    }

    try {
      var instance = window.CanvasUIDroplets.createDroplets(
        { source: source, content: content, output: output },
        {
          intensity: 0.38,      /* a steady drizzle, not a downpour */
          scale: 0.55,
          dropWidth: 0.9,
          dropLength: 1.1,
          refraction: 0.15,     /* subtle lensing — illustration stays readable */
          blur: 0,
          fallSpeed: 0.8,
          wiggle: 0.75,
          staticDrops: 0.3,
          interactive: true,
          interactionRadius: 0.22,
          interactionStrength: 0.75,
          interactionDistortion: 2.2,
          tint: [0.753, 0.541, 0.243],  /* brand brass #c08a3e */
          tintStrength: 0.14
        }
      );
      if (!instance) stage.classList.add("no-webgl");
    } catch (e) {
      stage.classList.add("no-webgl");
    }
  }

  /* ---------- Sticky mobile bar removed; FAB is the only fixed control ---------- */

  /* ---------- GSAP motion ---------- */
  function initMotion() {
    if (reduced || !window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    /* section reveals */
    gsap.utils.toArray(".reveal").forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.75, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });

    /* hero entrance */
    gsap.from(".hero h1", { y: 30, opacity: 0, duration: 0.95, ease: "power3.out", delay: 0.08 });
    gsap.from(".hero .lede", { y: 20, opacity: 0, duration: 0.85, ease: "power3.out", delay: 0.24 });
    gsap.from(".hero .cta-row", { y: 16, opacity: 0, duration: 0.85, ease: "power3.out", delay: 0.38 });
    gsap.from(".stage", { y: 26, opacity: 0, duration: 1, ease: "power3.out", delay: 0.28 });
    gsap.from(".trust li", { y: 12, opacity: 0, duration: 0.6, ease: "power2.out", delay: 0.5, stagger: 0.08 });

    /* counters for verified stats */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      var obj = { v: 0 };
      el.textContent = "0";
      gsap.to(obj, {
        v: end, duration: 1.5, ease: "power2.out",
        snap: { v: 1 },
        onUpdate: function () { el.textContent = Math.round(obj.v); },
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      });
    });
  }

  function boot() {
    initMotion();
    initDroplets();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
