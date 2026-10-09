/* footy1x.store motion (index.html and motion-lift.html). Lenis = smooth scroll, GSAP ScrollTrigger = scroll-driven
 * animation, SplitText = headings that rise in word by word; plus a scroll-speed marquee, magnetic buttons, a tilting
 * panel shot and Motion Lift's "lift" chart (240 tracked keys collapse into 5 eased ones as you scroll).
 * Everything is optional: no GSAP (CDN blocked) or "reduce motion" on = the page exactly as written, and the head script
 * shows the hero again after 2.5 s if this file never runs. Hooks in the HTML:
 *   data-split    heading rises in word by word (data-split="hero" = on load, otherwise when scrolled to)
 *   data-hero     fades up on load, after the heading      data-reveal  fades up when scrolled to
 *   data-stagger  its children fade up one after another   data-parallax  drifts against the scroll (wide screens)
 *   data-marquee  rows of .mq-track that slide, faster and skewed while you scroll
 *   data-tilt     tilts towards the pointer                 .btn  magnetic (mouse only)
 *   data-lift     the chart's <svg> (inside figure.lift-fig[hidden]) */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mouse = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var g = window.gsap;
  var lift = buildLift();                      // drawn in its final state; animated below when GSAP is here

  function ready() { root.classList.remove("js-motion"); window.__motionReady = true; }
  if (!g || reduce) { ready(); return; }
  var ST = window.ScrollTrigger, Split = window.SplitText;
  g.registerPlugin.apply(g, [ST, Split].filter(Boolean));

  // ---------------------------------------------------------------------------------------------- smooth scroll
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, anchors: { offset: -12 } });
    window.lenis = lenis;
    if (ST) lenis.on("scroll", ST.update);
    g.ticker.add(function (time) { lenis.raf(time * 1000); });
    g.ticker.lagSmoothing(0);
  }
  function scrollSpeed() { return lenis ? lenis.velocity : (ST ? ST.getVelocity() / 60 : 0); }   // px per frame
  function onScroll(el) { return ST ? { trigger: el, start: "top 88%", once: true } : undefined; }

  // ---------------------------------------------------------------------------------------------- reveals
  var heroDelay = 0.15;
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var hero = el.getAttribute("data-split") === "hero";
    var vars = { yPercent: 118, rotate: 3, duration: 1.15, ease: "expo.out", stagger: 0.06,
                 delay: hero ? heroDelay : 0, scrollTrigger: hero ? undefined : onScroll(el) };
    if (!Split) { g.from(el, { y: 30, autoAlpha: 0, duration: 1, ease: "power3.out", delay: vars.delay, scrollTrigger: vars.scrollTrigger }); return; }
    Split.create(el, { type: "lines,words", mask: "lines", linesClass: "sl", autoSplit: true,
      onSplit: function (self) { return g.from(self.words, vars); } });
  });
  var afterSplit = document.querySelector('[data-split="hero"]') ? 0.45 : 0;  // wait for a split hero heading, if there is one
  g.from("[data-hero]", { y: 24, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.09, delay: heroDelay + afterSplit });
  g.utils.toArray("[data-reveal]").forEach(function (el) {
    g.from(el, { y: 40, autoAlpha: 0, duration: 1.05, ease: "power3.out", scrollTrigger: onScroll(el) });
  });
  g.utils.toArray("[data-stagger]").forEach(function (el) {
    g.from(el.children, { y: 32, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, scrollTrigger: onScroll(el) });
  });
  g.utils.toArray(".card.featured").forEach(function (el) {
    g.fromTo(el, { clipPath: "inset(9% 5% 9% 5% round 28px)", autoAlpha: 0 },
      { clipPath: "inset(0% 0% 0% 0% round 16px)", autoAlpha: 1, duration: 1.3, ease: "expo.out", clearProps: "clipPath",
        scrollTrigger: onScroll(el) });
  });
  if (ST) {
    g.matchMedia().add("(min-width: 860px)", function () {
      g.utils.toArray("[data-parallax]").forEach(function (el) {
        g.fromTo(el, { yPercent: -5 }, { yPercent: 5, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
  }

  // ---------------------------------------------------------------------------------------------- marquee
  document.querySelectorAll("[data-marquee]").forEach(function (box) {
    var seen = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(box);
    box.querySelectorAll(".mq-track").forEach(function (track, i) {
      var dir = i % 2 ? 1 : -1, x = 0, skew = g.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
      g.ticker.add(function (time, dt) {
        if (!seen) return;
        var v = scrollSpeed(), half = track.scrollWidth / 2;
        x += dir * (55 + v * 9) * dt / 1000;   // drifts on its own; scrolling pushes it (and backwards when you scroll up)
        if (half) x = ((x % half) - half) % half;
        g.set(track, { x: x });
        skew(Math.max(-14, Math.min(14, -v * 0.7 * dir)));
      });
    });
  });

  // ---------------------------------------------------------------------------------------------- pointer toys
  if (mouse) {
    document.querySelectorAll(".btn").forEach(function (b) {
      if (b.classList.contains("btn-soon")) return;
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        g.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.38,
                  duration: 0.45, ease: "power3.out", overwrite: true });
      });
      b.addEventListener("pointerleave", function () { g.to(b, { x: 0, y: 0, duration: 1.1, ease: "elastic.out(1, 0.32)", overwrite: true }); });
    });
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var area = el.parentElement;
      g.set(el, { transformPerspective: 900 });
      area.addEventListener("pointermove", function (e) {
        var r = area.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        g.to(el, { rotateY: nx * 14, rotateX: -ny * 10, duration: 0.6, ease: "power3.out", overwrite: true });
      });
      area.addEventListener("pointerleave", function () { g.to(el, { rotateY: 0, rotateX: 0, duration: 1.2, ease: "elastic.out(1, 0.35)", overwrite: true }); });
    });
  }

  // ---------------------------------------------------------------------------------------------- the lift chart
  if (lift && ST) {
    var st = { p: 0 };
    lift.draw(0);
    g.matchMedia().add({ wide: "(min-width: 860px)", narrow: "(max-width: 859px)" }, function (ctx) {
      var wide = ctx.conditions.wide;
      g.to(st, { p: 1, ease: "none", onUpdate: function () { lift.draw(st.p); },
        scrollTrigger: wide
          ? { trigger: lift.fig, start: "center center", end: "+=1000", pin: true, scrub: 0.8 }   // the figure fits any laptop screen
          : { trigger: lift.fig, start: "top 80%", end: "bottom 30%", scrub: 0.8 } });
    });
  }

  ready();

  // ---------------------------------------------------------------------------------------------- chart builder
  function buildLift() {
    var svg = document.querySelector("[data-lift]");
    if (!svg) return null;
    var NS = "http://www.w3.org/2000/svg", N = 240, X0 = 40, X1 = 960, Y0 = 290, H = 220, SY = 338;
    var fig = svg.closest(".lift-fig"), section = svg.closest("section");
    var count = fig.querySelector("[data-lift-count]"), tag = fig.querySelector("[data-lift-tag]");
    // A tracked move: rise fast and land soft, settle back, hold, then glide down. 5 keys, an ease between each pair.
    var KEYS = [[0, 0.06], [0.3, 0.88], [0.42, 0.77], [0.66, 0.77], [1, 0.16]];
    var EASES = [function (u) { return 1 - Math.pow(1 - u, 3.4); },
                 function (u) { return 0.5 - Math.cos(Math.PI * u) / 2; },
                 function () { return 0; },
                 function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }];
    function smooth(t) {
      for (var i = 0; i < KEYS.length - 1; i++) {
        var a = KEYS[i], b = KEYS[i + 1];
        if (t <= b[0]) return a[1] + (b[1] - a[1]) * EASES[i]((t - a[0]) / (b[0] - a[0]));
      }
      return KEYS[KEYS.length - 1][1];
    }
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; }
    function el(name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }
    function px(t) { return X0 + (X1 - X0) * t; }
    function py(v) { return Y0 - v * H; }

    for (var gy = 0; gy <= 4; gy++) el("line", { x1: X0, x2: X1, y1: py(gy / 4), y2: py(gy / 4), class: "lift-grid" });
    el("text", { x: X0, y: SY - 16, class: "lift-label" }).textContent = "ML Shake";
    var curve = "", shake = "", dots = [], noise = [];
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var n = 0.045 * Math.sin(t * 97) + 0.03 * Math.sin(t * 41 + 1.3) + 0.06 * rnd();   // handheld wobble + tracker noise
      noise.push(n);
      curve += (i ? "L" : "M") + px(t).toFixed(1) + " " + py(smooth(t)).toFixed(1);
      shake += (i ? "L" : "M") + px(t).toFixed(1) + " " + (SY + n * 90).toFixed(1);
    }
    var shakePath = el("path", { d: shake, class: "lift-shake" });
    var path = el("path", { d: curve, class: "lift-curve" });
    var dotLayer = el("g", { class: "lift-dots" });
    for (i = 0; i < N; i++) dots.push(el("circle", { cx: px(i / (N - 1)).toFixed(1), cy: 0, r: 2.3 }, dotLayer));
    var keys = KEYS.map(function (k) { return el("rect", { width: 14, height: 14, rx: 2, class: "lift-key" }); });
    var len = path.getTotalLength(), slen = shakePath.getTotalLength();
    path.style.strokeDasharray = len;
    shakePath.style.strokeDasharray = slen;
    fig.hidden = false;

    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function inOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    function backOut(x) { var c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
    var lastC = -1;
    function draw(p) {
      var c = inOut(clamp(p / 0.45));                       // the shake leaves the dots...
      if (Math.abs(c - lastC) > 1e-4) {
        for (var i = 0; i < N; i++) dots[i].setAttribute("cy", py(smooth(i / (N - 1)) + noise[i] * (1 - c)).toFixed(1));
        lastC = c;
      }
      shakePath.style.strokeDashoffset = slen * (1 - c);    // ...and lands on its own control
      path.style.strokeDashoffset = len * (1 - inOut(clamp((p - 0.35) / 0.35)));
      dotLayer.style.opacity = 1 - 0.82 * clamp((p - 0.55) / 0.2);
      keys.forEach(function (k, j) {
        var s = clamp((p - 0.66 - j * 0.045) / 0.12), b = s ? backOut(s) : 0;
        k.setAttribute("transform", "translate(" + px(KEYS[j][0]) + " " + py(KEYS[j][1]) + ") rotate(45) scale(" + b.toFixed(3) + ") translate(-7 -7)");
      });
      if (count) count.textContent = Math.round(240 - 235 * inOut(clamp((p - 0.6) / 0.3)));
      if (tag) tag.textContent = p > 0.75 ? "Lifted: 5 keys, exact eases" : "Tracked: a key on every frame";
    }
    draw(1);
    return { draw: draw, fig: fig, section: section };
  }
})();
