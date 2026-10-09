/* footy1x.store extras: the React Bits-style pieces, in plain JS (React Bits itself needs React; this site is static HTML).
 * Loaded after motion.js; uses GSAP when it's there and degrades to still text when it isn't. Hooks in the HTML:
 *   data-threads        ease curves on a graph-editor grid drift behind the element, keyframes riding them (Threads)
 *   data-rotate="a|b"   the words take turns, letter by letter (RotatingText)
 *   data-scroll-words   each word lights up as you scroll past it (ScrollReveal)
 *   data-count-from/-to counts when scrolled to (CountUp)
 *   data-spotlight      a soft orange light follows the pointer inside it (SpotlightCard)
 *   data-scramble       its letters scramble, then settle, on hover (DecryptedText)
 *   .btn-star, .shiny   a light runs round the border / a shine sweeps the text (StarBorder, ShinyText: CSS only)
 *   page-wide           click sparks (ClickSpark), a springy cursor ring (mouse only), film grain
 * "Reduce motion" on: threads drawn once, words don't rotate, no sparks, no cursor ring, still grain. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mouse = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var g = window.gsap, ST = window.ScrollTrigger;
  var motion = g && !reduce;
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  each("[data-threads]", threads);
  each("[data-rotate]", rotate);
  each("[data-scroll-words]", scrollWords);
  each("[data-count-to]", countUp);
  each("[data-spotlight]", spotlight);
  each("[data-scramble]", scramble);
  grain();
  if (!reduce) sparks();
  if (mouse && !reduce) cursorRing();

  // ---------------------------------------------------------------------------------------------- threads
  function threads(host) {
    var c = document.createElement("canvas");
    c.className = "threads";
    c.setAttribute("aria-hidden", "true");
    host.insertBefore(c, host.firstChild);
    var ctx = c.getContext("2d"), w = 0, h = 0, dpr = 1, seen = true, raf = 0;
    var px = 0.5, py = 0.5, tx = 0.5, ty = 0.5, LINES = 7, STEP = 48;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      if (reduce) draw(0);
    }
    if (window.ResizeObserver) new ResizeObserver(size).observe(c); else addEventListener("resize", size);
    size();
    if (mouse) addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height;
    }, { passive: true });

    function bez(a, b, cc, d, u) { var v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * cc + u * u * u * d; }
    function diamond(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); }
    function draw(time) {
      var t = time / 1000;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();                        // the graph editor's grid
      for (var x = ((w / 2) % STEP) + 0.5; x < w; x += STEP) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (var y = ((h / 2) % STEP) + 0.5; y < h; y += STEP) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.strokeStyle = "rgba(255,255,255,0.028)";
      ctx.lineWidth = 1;
      ctx.stroke();
      for (var i = 0; i < LINES; i++) {       // ease curves from low-left to high-right, each easing a bit differently
        var f = i / (LINES - 1), ph = i * 1.7, top = i === LINES - 1;
        var x0 = top ? w * 0.04 : -w * 0.02, x3 = top ? w * 0.96 : w * 1.02;
        var y0 = h * (0.84 - 0.1 * f + 0.04 * Math.sin(t * 0.31 + ph));
        var y3 = h * (0.2 + 0.08 * f + 0.04 * Math.cos(t * 0.27 + ph));
        var e1 = 0.3 + 0.3 * f + 0.06 * Math.sin(t * 0.43 + ph) + (px - 0.5) * 0.12;
        var e2 = 0.3 + 0.24 * (1 - f) + 0.06 * Math.cos(t * 0.37 + ph) - (px - 0.5) * 0.12;
        var bend = (py - 0.5) * h * 0.22 * (0.4 + f);
        var x1 = x0 + (x3 - x0) * e1, y1 = y0 + bend, x2 = x3 - (x3 - x0) * e2, y2 = y3 + bend;
        var grad = ctx.createLinearGradient(x0, 0, x3, 0), a = top ? 0.34 : 0.05 + 0.13 * f;
        grad.addColorStop(0, "rgba(255,122,61," + (top ? a : 0) + ")");
        grad.addColorStop(0.5, "rgba(255,122,61," + a + ")");
        grad.addColorStop(1, "rgba(255,122,61," + (top ? a : 0) + ")");
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        ctx.strokeStyle = grad;
        ctx.lineWidth = top ? 2 : 1.25;
        ctx.stroke();
        if (top) {                            // the "lifted" curve gets AE's handles and keyframes
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.moveTo(x3, y3); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath(); ctx.arc(x1, y1, 3, 0, 7); ctx.arc(x2, y2, 3, 0, 7); ctx.fill();
          ctx.fillStyle = "rgba(255,122,61,0.75)";
          diamond(x0, y0, 9); diamond(x3, y3, 9);
        } else {                              // a keyframe riding each curve
          var u = (t * 0.06 + i * 0.137) % 1;
          ctx.fillStyle = "rgba(255,122,61," + (0.1 + 0.3 * f) * Math.sin(Math.PI * u) + ")";
          diamond(bez(x0, x1, x2, x3, u), bez(y0, y1, y2, y3, u), 6);
        }
      }
    }
    function loop(time) { draw(time); raf = seen ? requestAnimationFrame(loop) : 0; }
    if (reduce) return;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
      seen = es[0].isIntersecting;
      if (seen && !raf) raf = requestAnimationFrame(loop);
    }).observe(c);
    raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------------------------------- rotating words
  function rotate(el) {
    var words = el.getAttribute("data-rotate").split("|");
    el.textContent = "";
    el.classList.add("rot");
    var sizer = document.createElement("span");
    sizer.className = "rot-sizer";
    sizer.textContent = words[0];
    el.appendChild(sizer);
    var sets = words.map(function (w) {
      var s = document.createElement("span");
      s.className = "rot-word";
      w.split("").forEach(function (ch) {
        var cs = document.createElement("span");
        cs.className = "rot-ch";
        cs.textContent = ch === " " ? " " : ch;
        s.appendChild(cs);
      });
      el.appendChild(s);
      return s;
    });
    function width(i) { return sets[i].getBoundingClientRect().width; }
    var cur = 0;
    sets.forEach(function (s, i) { if (i) s.style.visibility = "hidden"; });
    el.style.width = width(0) + "px";
    addEventListener("resize", function () { el.style.width = width(cur) + "px"; });
    if (!motion) return;
    g.from(sets[0].children, { yPercent: 110, duration: 0.8, ease: "back.out(1.7)", stagger: 0.03, delay: 0.35 });
    setInterval(function () {
      if (document.hidden) return;
      var next = (cur + 1) % sets.length, out = sets[cur], inn = sets[next];
      g.to(out.children, { yPercent: -110, autoAlpha: 0, duration: 0.38, ease: "power3.in", stagger: 0.016,
        onComplete: function () { out.style.visibility = "hidden"; } });
      inn.style.visibility = "visible";
      g.fromTo(inn.children, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.7)", stagger: 0.022, delay: 0.16 });
      g.to(el, { width: width(next), duration: 0.7, ease: "expo.inOut" });
      cur = next;
    }, 2800);
  }

  // ---------------------------------------------------------------------------------------------- scroll-lit words
  function wrapWords(node) {
    var out = [];
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement("span");
          s.className = "sw";
          s.textContent = part;
          frag.appendChild(s);
          out.push(s);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) out = out.concat(wrapWords(n));
    });
    return out;
  }
  function scrollWords(el) {
    if (!motion || !ST) return;
    var words = wrapWords(el);
    g.fromTo(words, { opacity: 0.14 }, { opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } });
  }

  // ---------------------------------------------------------------------------------------------- count up
  function countUp(el) {
    var from = +el.getAttribute("data-count-from") || 0, to = +el.getAttribute("data-count-to");
    if (!motion || !ST) { el.textContent = to; return; }
    var o = { v: from };
    el.textContent = from;
    g.to(o, { v: to, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true },
      onUpdate: function () { el.textContent = Math.round(o.v); } });
  }

  // ---------------------------------------------------------------------------------------------- spotlight
  function spotlight(el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }

  // ---------------------------------------------------------------------------------------------- scramble
  function scramble(el) {
    var text = el.textContent, pool = text.replace(/\s/g, ""), raf = 0;
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", text);
    if (reduce) return;
    el.addEventListener("pointerenter", function () {
      var start = performance.now();
      cancelAnimationFrame(raf);
      (function tick(now) {
        var p = Math.min(1, (now - start) / 450), shown = Math.floor(p * text.length), s = "";
        for (var i = 0; i < text.length; i++) s += i < shown || text[i] === " " ? text[i] : pool[(Math.random() * pool.length) | 0];
        el.textContent = s;
        if (p < 1) raf = requestAnimationFrame(tick);
      })(start);
    });
  }

  // ---------------------------------------------------------------------------------------------- grain
  function grain() {
    var c = document.createElement("canvas"), n = 140;
    c.width = c.height = n;
    var x = c.getContext("2d"), img = x.createImageData(n, n);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    var d = document.createElement("div");
    d.className = "grain";
    d.setAttribute("aria-hidden", "true");
    d.style.backgroundImage = "url(" + c.toDataURL() + ")";
    document.body.appendChild(d);
  }

  // ---------------------------------------------------------------------------------------------- click sparks
  function sparks() {
    var c = document.createElement("canvas");
    c.className = "sparks";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var ctx = c.getContext("2d"), list = [], raf = 0, dpr = 1, LIFE = 450;
    function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    addEventListener("resize", size);
    size();
    addEventListener("pointerdown", function (e) {
      var now = performance.now();
      for (var i = 0; i < 8; i++) list.push({ x: e.clientX, y: e.clientY, a: i * Math.PI / 4 + Math.PI / 8, t: now });
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    function tick(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      list = list.filter(function (s) { return now - s.t < LIFE; });
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      list.forEach(function (s) {
        var p = (now - s.t) / LIFE, e = 1 - Math.pow(1 - p, 3), r = 7 + 22 * e, len = 10 * (1 - p);
        ctx.strokeStyle = "rgba(255,122,61," + (1 - p) + ")";
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(s.a) * r, s.y + Math.sin(s.a) * r);
        ctx.lineTo(s.x + Math.cos(s.a) * (r + len), s.y + Math.sin(s.a) * (r + len));
        ctx.stroke();
      });
      raf = list.length ? requestAnimationFrame(tick) : 0;
    }
  }

  // ---------------------------------------------------------------------------------------------- cursor ring
  function cursorRing() {
    var ring = document.createElement("div"), label = document.createElement("span");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    ring.appendChild(label);
    document.body.appendChild(ring);
    var x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, on = false, last = performance.now();
    addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      if (!on) { x = tx; y = ty; on = true; ring.classList.add("on"); }
      var t = e.target && e.target.closest ? e.target : null;
      var key = t && t.closest("[data-keyframe] canvas") && t.style.cursor && t.style.cursor !== "";
      ring.classList.toggle("hot", !!(t && t.closest("a, button, .btn")) || !!key);
      ring.classList.toggle("drag", !!key);
      label.textContent = key ? "drag" : "";
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { on = false; ring.classList.remove("on"); });
    (function tick(now) {
      var dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      vx += ((tx - x) * 420 - vx * 30) * dt; x += vx * dt;    // a spring, a touch under critical: it lands with a tiny overshoot
      vy += ((ty - y) * 420 - vy * 30) * dt; y += vy * dt;
      ring.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      requestAnimationFrame(tick);
    })(last);
  }
})();
