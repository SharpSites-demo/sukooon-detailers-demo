/* Sukooon Detailers — page logic
   Canvas UI (canvasui.dev) Droplets vanilla WebGL effect + GSAP motion */
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
          intensity: 0.42,      /* a steady drizzle, not a downpour */
          scale: 0.55,          /* finer beads */
          dropWidth: 0.9,
          dropLength: 1.1,
          refraction: 0.16,     /* subtle lensing — text stays readable */
          blur: 0,              /* keep the car crisp behind the rain */
          fallSpeed: 0.85,
          wiggle: 0.8,
          staticDrops: 0.3,
          interactive: true,
          interactionRadius: 0.22,
          interactionStrength: 0.75,
          interactionDistortion: 2.2,
          tint: [0.373, 0.89, 0.784],  /* brand aqua #5fe3c8 */
          tintStrength: 0.12
        }
      );
      if (!instance) stage.classList.add("no-webgl");
    } catch (e) {
      stage.classList.add("no-webgl");
    }
  }

  /* ---------- Before / After slider ---------- */
  function initBA() {
    var ba = document.getElementById("baSlider");
    if (!ba) return;
    var input = ba.querySelector("input");
    var handle = ba.querySelector(".ba-handle");
    var after = ba.querySelector(".ba-after");
    function setPos(v) {
      ba.style.setProperty("--pos", v + "%");
      if (handle) handle.style.left = v + "%";
      if (after) after.style.clipPath = "inset(0 0 0 " + v + "%)";
    }
    if (input) {
      input.addEventListener("input", function () { setPos(input.value); }, { passive: true });
      setPos(input.value);
    }
  }

  /* ---------- Sticky mobile bar ---------- */
  function initMbar() {
    var bar = document.getElementById("mbar");
    if (!bar) return;
    var show = function () {
      if (window.scrollY > 420) bar.classList.add("show");
      else bar.classList.remove("show");
    };
    window.addEventListener("scroll", show, { passive: true });
    show();
  }

  /* ---------- Marquee + GSAP reveals ---------- */
  function initMotion() {
    if (reduced || !window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    /* marquee */
    var track = document.getElementById("bandTrack");
    if (track) {
      var count = track.children.length;
      for (var i = 0; i < count; i++) {
        track.appendChild(track.children[i].cloneNode(true));
      }
      gsap.to(track, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
    }

    /* section reveals */
    gsap.utils.toArray(".reveal").forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true }
      });
    });

    /* hero entrance */
    gsap.from(".hero h1", { y: 34, opacity: 0, duration: 1, ease: "power3.out", delay: 0.1 });
    gsap.from(".hero .lede", { y: 22, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.28 });
    gsap.from(".hero .cta-row", { y: 18, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.42 });
    gsap.from(".stage", { y: 30, opacity: 0, duration: 1.05, ease: "power3.out", delay: 0.3 });

    /* stat counters */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      var obj = { v: el.textContent === String(end) ? 0 : end };
      if (el.textContent !== String(end)) { el.textContent = "0"; obj.v = 0; }
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        snap: { v: 1 },
        onUpdate: function () { el.textContent = Math.round(obj.v); },
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
  }

  function boot() {
    initBA();
    initMbar();
    initMotion();
    initDroplets();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
