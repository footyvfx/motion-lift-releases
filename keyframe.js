/* footy1x.store: the 3D keyframe on the store front. An After Effects keyframe made with three.js, glossy and springy:
 * pull it and it snaps back with a wobble, tap it to switch Linear (diamond) <-> Auto Bezier (circle) like Cmd-clicking a
 * keyframe in AE, pick an AE label colour, scroll and it squashes. Every wobble is a damped spring, the kind of motion
 * Motion Lift copies. Loaded as a module (index.html's import map points "three" at jsDelivr). No WebGL: the box gets
 * .no-webgl and CSS draws a flat diamond. Scene: bob (float + squash) > tilt (follows the pointer) > spin > keyframe.
 * The canvas is transparent so the page's background threads show behind it. */
import * as THREE from "three";

const LABELS = {                              // AE label colours (Orange = Motion Lift's): body, inner light, glow
  orange:  { color: 0xff6a24, deep: 0xff9a55, glow: 0xff5a10 },
  cyan:    { color: 0x2fc4cc, deep: 0x7fe8ee, glow: 0x12a0aa },
  fuchsia: { color: 0xf050cf, deep: 0xff9be9, glow: 0xd02ab0 },
};

const GLSL = /* glsl */ `
uniform float uTime, uWobble, uRadius, uRound;
uniform vec3 uGrab, uPull;
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {                        // Ashima / Stefan Gustavson simplex noise (MIT)
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 g0 = vec3(a0.xy, h.x), g1 = vec3(a0.zw, h.y), g2 = vec3(a1.xy, h.z), g3 = vec3(a1.zw, h.w);
  vec4 nrm = taylorInvSqrt(vec4(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3)));
  g0 *= nrm.x; g1 *= nrm.y; g2 *= nrm.z; g3 *= nrm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(g0, x0), dot(g1, x1), dot(g2, x2), dot(g3, x3)));
}
// The keyframe: a slab whose outline is a superellipse |x|^a + |y|^a = 1 (a = 1.08: AE's diamond, a = 2: the Auto Bezier
// circle) and whose edge is rounded (exponent 6 front to back: a flat face), 0.36 deep. uRound springs a between the two.
vec3 keyframe(vec3 d) {
  float a = mix(1.08, 2.0, uRound);
  vec3 q = abs(d);
  float xy = pow(pow(q.x, a) + pow(q.y, a), 6.0 / a);
  float r = pow(xy + pow(q.z / 0.36, 6.0), 1.0 / 6.0);
  return d / r * 1.18;
}
vec3 keyPos(vec3 d) {
  vec3 p = keyframe(d);
  p += d * snoise(d * 1.35 + vec3(0.0, uTime * 0.35, uTime * 0.21)) * uWobble;
  float k = distance(d, uGrab);
  return p + uPull * exp(-(k * k) / (uRadius * uRadius));
}
`;

const box = document.querySelector("[data-keyframe]");
if (box) {
  try { start(box); }
  catch (e) { console.warn("keyframe:", e); box.classList.add("no-webgl"); }
}

function start(box) {
  const canvas = box.querySelector("canvas");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.02).texture;   // a dark studio with soft boxes: clean product highlights
  scene.environmentIntensity = 1.35;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const CAM = new THREE.Vector3(0, 0.28, 5.9);   // 12% closer than 6.6: a bigger keyframe that still fits when squashed
  camera.position.copy(CAM);
  camera.lookAt(0, 0, 0);

  const glowSprite = new THREE.Mesh(new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ color: LABELS.orange.color, map: softTexture([[0, "rgba(255,255,255,0.30)"], [0.28, "rgba(255,255,255,0.08)"], [0.62, "rgba(255,255,255,0)"]]),
      transparent: true, depthWrite: false, toneMapped: false }));
  glowSprite.position.set(0, 0, -2.4);
  scene.add(glowSprite);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({ map: softTexture([[0, "rgba(0,0,0,0.6)"], [0.45, "rgba(0,0,0,0.22)"], [1, "rgba(0,0,0,0)"]]),
      transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.45;
  scene.add(shadow);

  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(3, 4.5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc4a0, 1.2); rim.position.set(-4, 1.5, -3); scene.add(rim);

  const U = {
    uTime: { value: 0 }, uWobble: { value: 0.03 }, uRadius: { value: 0.62 }, uRound: { value: 0 },
    uGrab: { value: new THREE.Vector3(0, 1, 0) }, uPull: { value: new THREE.Vector3() },
    uGlow: { value: new THREE.Color(LABELS.orange.glow) },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color: LABELS.orange.color, roughness: 0.07, metalness: 0, transmission: 0.45, thickness: 0.8, ior: 1.4,
    attenuationColor: new THREE.Color(LABELS.orange.deep), attenuationDistance: 2.4,
    clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1,
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\n" + GLSL)
      .replace("#include <beginnormal_vertex>", `
        vec3 kd = normalize(position);
        vec3 kp = keyPos(kd);
        vec3 ka = normalize(cross(kd, abs(kd.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 kb = cross(kd, ka);
        vec3 objectNormal = normalize(cross(keyPos(normalize(kd + ka * 0.008)) - kp, keyPos(normalize(kd + kb * 0.008)) - kp));`)
      .replace("#include <begin_vertex>", "vec3 transformed = kp;");
    // fake light scattering inside: a warm glow where the surface faces you, fading to the glossy rim
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uGlow;")
      .replace("#include <opaque_fragment>", `
        float kf = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        outgoingLight += uGlow * (0.05 + 0.62 * pow(kf, 3.2));
        #include <opaque_fragment>`);
  };

  const bob = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group();
  scene.add(bob); bob.add(tilt); tilt.add(spin);
  const light = matchMedia("(pointer: coarse)").matches || innerWidth < 700;    // phones: a lighter mesh, still smooth
  const mesh = new THREE.Mesh(welded(new THREE.IcosahedronGeometry(1, light ? 40 : 64)), mat);
  mesh.frustumCulled = false;                   // the vertex shader moves it outside its unit-sphere bounds
  // the grab area: an invisible sphere much wider than the diamond (1.62 vs its 1.18 corners), so a press anywhere on or
  // around it catches it; the pull starts from the surface point in that direction
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(1.62, 1.62, 1.1);
  spin.add(mesh, proxy);

  // ------------------------------------------------------------------------------------------------ springs
  const pull = U.uPull.value, pullV = new THREE.Vector3(), pullT = new THREE.Vector3();
  let squash = 0, squashV = 0, excite = 0, round = 0, roundV = 0, roundT = 0;
  let grabbing = false, down = null;
  const colour = new THREE.Color(LABELS.orange.color), deep = new THREE.Color(LABELS.orange.deep), glow = new THREE.Color(LABELS.orange.glow);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane();
  const hitW = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const hint = box.querySelector(".kf-hint"), typeLabel = box.querySelector("[data-kf-type]");

  function toNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function overKey(e) { toNdc(e); ray.setFromCamera(ndc, camera); return ray.intersectObject(proxy, false)[0]; }
  function used() { if (hint) hint.classList.add("gone"); }

  canvas.addEventListener("pointerdown", (e) => {
    const hit = overKey(e);
    if (!hit) return;
    used();
    hitW.copy(hit.point);
    U.uGrab.value.copy(mesh.worldToLocal(tmp.copy(hit.point))).normalize();
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(tmp2).negate(), hitW);
    grabbing = true;
    down = { x: e.clientX, y: e.clientY };
    squashV -= 0.9;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!grabbing) {
      if (e.pointerType === "mouse") canvas.style.cursor = overKey(e) ? "grab" : "";
      return;
    }
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, tmp)) return;
    const a = mesh.worldToLocal(tmp2.copy(hitW)), b = mesh.worldToLocal(tmp.clone());
    pullT.copy(b).sub(a);
    const len = pullT.length(), max = 1.05;    // rubber band: the further you pull, the harder it resists
    if (len > 0) pullT.setLength(max * Math.tanh(len / max));
  });
  function release(e) {
    if (!grabbing) return;
    grabbing = false;
    canvas.style.cursor = "grab";
    const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 99;
    if (moved < 6) {                           // a tap: Cmd-click in AE, Linear <-> Auto Bezier
      roundT = roundT ? 0 : 1;
      if (typeLabel) typeLabel.textContent = roundT ? "Auto Bezier" : "Linear";
      pullV.addScaledVector(U.uGrab.value, -4);
      squashV += 2.2;
      excite += 0.04;
    } else {
      squashV += pull.length() * 1.6;
      excite += 0.03;
    }
    pullT.set(0, 0, 0);
    down = null;
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      look.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.8)));
      look.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.8)));
    }, { passive: true });
  }

  box.querySelectorAll("[data-label]").forEach((b) => {
    b.addEventListener("click", () => {
      const f = LABELS[b.dataset.label];
      if (!f) return;
      colour.set(f.color); deep.set(f.deep); glow.set(f.glow);
      box.querySelectorAll("[data-label]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      squashV += 2.2; excite += 0.035; used();
    });
  });

  // ------------------------------------------------------------------------------------------------ size + loop
  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.copy(CAM).multiplyScalar(Math.max(1, 0.95 / camera.aspect)); // narrow: step back so it fits across
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(box);
  resize();

  let lastY = window.scrollY, t = 0, idle = 0, then = performance.now(), running = false;
  function frame() {
    const now = performance.now(), dt = Math.min((now - then) / 1000, 1 / 30);
    then = now;
    t += dt;
    if (!grabbing) idle += dt;                 // the sway's clock pauses while it's held: no jump when you let go
    const y = window.scrollY, v = (y - lastY) / Math.max(dt, 1e-3);
    lastY = y;

    // the pull: stiff and a little laggy while held, loose and bouncy once let go (2 half-steps keep it stable)
    const k = grabbing ? 260 : 140, c = grabbing ? 24 : 4.6;
    for (let i = 0; i < 2; i++) {
      const h = dt / 2;
      pullV.x += (-(pull.x - pullT.x) * k - pullV.x * c) * h;
      pullV.y += (-(pull.y - pullT.y) * k - pullV.y * c) * h;
      pullV.z += (-(pull.z - pullT.z) * k - pullV.z * c) * h;
      pull.addScaledVector(pullV, h);
      squashV += (-squash * 95 - squashV * 5.2 + Math.max(-2500, Math.min(2500, v)) * 0.0035) * h;
      squash += squashV * h;
      roundV += (-(round - roundT) * 120 - roundV * 8) * h;   // the shape change overshoots a little, like a spring
      round += roundV * h;
    }
    squash = Math.max(-0.32, Math.min(0.32, squash));
    U.uRound.value = Math.max(-0.06, Math.min(1.25, round));
    excite *= Math.exp(-dt * 1.7);
    U.uWobble.value = (reduce ? 0.006 : 0.012) + excite;
    U.uTime.value += dt * (1 + excite * 14);

    bob.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
    if (!reduce) {
      bob.position.y = Math.sin(t * 1.15) * 0.07;
      if (!grabbing) spin.rotation.set(0.1 + Math.sin(idle * 0.37) * 0.08, Math.sin(idle * 0.5) * 0.42, Math.sin(idle * 0.29) * 0.04);
    }
    look.x += (look.tx - look.x) * Math.min(1, dt * 4);
    look.y += (look.ty - look.y) * Math.min(1, dt * 4);
    tilt.rotation.set(look.y * 0.3, look.x * 0.45, 0);
    shadow.scale.setScalar(1 + squash * 0.4 - bob.position.y * 0.6);

    const ease = 1 - Math.exp(-dt * 6);
    mat.color.lerp(colour, ease);
    mat.attenuationColor.lerp(deep, ease);
    U.uGlow.value.lerp(glow, ease);
    glowSprite.material.color.lerp(colour, ease);
    renderer.render(scene, camera);
  }
  function run(on) {
    if (on === running) return;
    running = on;
    if (on) then = performance.now();
    renderer.setAnimationLoop(on ? frame : null);
  }
  let inView = true;
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; run(inView && !document.hidden); }).observe(box);
  document.addEventListener("visibilitychange", () => run(inView && !document.hidden));
  run(true);
  box.classList.add("ready");
}

function welded(geo) {                         // three's icosphere repeats every corner (6 copies): share them, ~6x less shading
  const pos = geo.getAttribute("position"), seen = new Map(), verts = [], index = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = Math.round(x * 1e5) + "," + Math.round(y * 1e5) + "," + Math.round(z * 1e5);
    let j = seen.get(key);
    if (j === undefined) { j = verts.length / 3; seen.set(key, j); verts.push(x, y, z); }
    index.push(j);
  }
  geo.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(verts.slice(), 3));   // the shader makes its own normals
  out.setIndex(index);
  return out;
}

function studio() {                            // the environment it reflects: soft boxes in a dark room
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x0d0d0d);
  const panel = (w, h, x, y, z, hex, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(5, 3, 3.5, 3.5, 4, 0xffffff, 4);       // key: top right, in front
  panel(1.4, 6, -5, 0.8, 1.5, 0xffd2b0, 2.2);  // warm strip on the left
  panel(6, 1.2, 0, 5, -2, 0xffffff, 1.4);      // overhead
  panel(8, 3, 0, -4, 2, 0x5a3420, 0.6);        // warm bounce from below
  return env;
}

function softTexture(stops) {                  // a radial gradient (glow, contact shadow) as a texture
  const s = 256, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([at, col]) => r.addColorStop(at, col));
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
