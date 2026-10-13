/* footy1x.store: the 3D entrance (front page, once per visit), three.js r160 through the page's import map.
 * A studio scene of the hero's glass pitch. The orange field and its drifting shapes are flat, unlit meshes that read
 * the DOM stage's own CSS animation every frame, so they line up with the page. The pitch lines are opaque meshes on the
 * field, so the glass refracts them. The tiles are thick glass (MeshPhysicalMaterial transmission) with studio
 * reflections (RoomEnvironment), soft shadows and a warm rim light.
 * Timeline (s):
 *   0.0  camera low at pitch level (drifts with the pointer); "footy1x" (the DOM title, dark ink with an orange "1x")
 *   0.35 tiles fall in from above the camera, turning, and glide onto the field, the middle first
 *   1.6  the camera cranes up and round; 2.15 the tiles slide together and frost; 2.5 a light sweeps across
 *   3.2  overhead, framed exactly on the hero's stage; 3.3 the canvas fades and the page is there
 * play(o) is called by index.html's entrance with { stage, title, cols, rows, portrait, onHandoff, onDone } and returns
 * { skip } (a click, key, wheel or touch jumps to the overhead shot and fades out). */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const EASE = (x1, y1, x2, y2) => {                 // CSS cubic-bezier as a function of t
  const bx = (u) => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  const by = (u) => 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  return (t) => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    let lo = 0, hi = 1, u = t;
    for (let i = 0; i < 22; i++) { const x = bx(u); if (Math.abs(x - t) < 1e-5) break; if (x < t) lo = u; else hi = u; u = (lo + hi) / 2; }
    return by(u);
  };
};
const expoOut = EASE(.16, 1, .3, 1), inOut = EASE(.65, 0, .35, 1), softOut = EASE(.33, 0, .2, 1);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

export function play(o) {
  const { stage, title, cols, rows, portrait } = o;
  const vw = innerWidth, vh = innerHeight;
  const sr = stage.getBoundingClientRect();                   // the stage's place in the hero (no transform in 3D mode)
  const pad = parseFloat(getComputedStyle(stage).paddingLeft) || 0;
  const Fw = cols / (1 - 2 * pad / sr.width), k = Fw / sr.width, Fh = sr.height * k;   // field in world units; k = units per px
  const padU = pad * k;

  // ---------------------------------------------------------------------------------------------- renderer + scene
  const canvas = document.createElement("canvas");
  canvas.className = "intro3d";
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, vw < 700 ? 1.4 : 1.6));
  renderer.setSize(vw, vh, false);
  canvas.style.width = vw + "px"; canvas.style.height = vh + "px";   // the visible viewport (iOS: 100vh would include the space under Safari's bar)
  renderer.setClearColor(0xf5f5f7, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(34, vw / vh, 0.05, 200);

  // ---------------------------------------------------------------------------------------------- the field
  const flat = (hex) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), toneMapped: false });
  const toWorld = (x, y) => [-Fw / 2 + x * k, -Fh / 2 + y * k];      // stage px (from its top-left) -> world x, z
  // base: the stage's gradient, 140deg #ff9d5c -> #ff7a3d (46%) -> #ff5c38, on a slab with a little depth
  const gcv = document.createElement("canvas");
  gcv.width = 1024; gcv.height = Math.max(8, Math.round(1024 * Fh / Fw));
  const g2 = gcv.getContext("2d"), ang = 140 * Math.PI / 180, W = gcv.width, H = gcv.height;
  const L = Math.abs(W * Math.sin(ang)) + Math.abs(H * Math.cos(ang)), dx = Math.sin(ang) * L / 2, dy = -Math.cos(ang) * L / 2;
  const grad = g2.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  grad.addColorStop(0, "#ff9d5c"); grad.addColorStop(.46, "#ff7a3d"); grad.addColorStop(1, "#ff5c38");
  g2.fillStyle = grad; g2.fillRect(0, 0, W, H);
  const gtex = new THREE.CanvasTexture(gcv); gtex.colorSpace = THREE.SRGBColorSpace;
  const slabH = 0.18;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(Fw, slabH, Fh),
    [flat("#e8551f"), flat("#e8551f"), new THREE.MeshBasicMaterial({ map: gtex, toneMapped: false }), flat("#d94d18"), flat("#f06a2c"), flat("#e8551f")]);
  slab.position.y = -slabH / 2;
  scene.add(slab);
  // a soft contact shadow under the slab on the studio floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(Fw * 6, Fh * 6), new THREE.ShadowMaterial({ opacity: .16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -slabH - 0.001; floor.receiveShadow = true;
  scene.add(floor);

  // the drifting shapes: unit meshes driven by the DOM shapes' current CSS transforms
  const shapeMeshes = [];
  const unitRound = (w, h, r) => {                       // a rounded rect w x h (r = corner radius), centred
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return new THREE.ShapeGeometry(s, 24);
  };
  Array.prototype.forEach.call(stage.querySelectorAll(".m-field i"), (el, i) => {
    const cs = getComputedStyle(el), w = el.offsetWidth, h = el.offsetHeight;
    let geo, color = cs.backgroundColor;
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw > 0) {                                        // the ring
      color = cs.borderTopColor;
      geo = new THREE.RingGeometry(0.5 - bw / w, 0.5, 96);
    } else if (cs.borderTopLeftRadius.indexOf("%") >= 0 && parseFloat(cs.borderTopLeftRadius) >= 50) {
      geo = new THREE.CircleGeometry(0.5, 96);
    } else {
      const r = cs.borderTopLeftRadius.indexOf("%") >= 0 ? parseFloat(cs.borderTopLeftRadius) / 100 * Math.min(w, h) : Math.min(parseFloat(cs.borderTopLeftRadius) || 0, h / 2);
      geo = unitRound(1, h / w, Math.min(r / w, h / w / 2));
    }
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, flat(color));
    m.position.y = 0.002 + i * 0.0004;
    scene.add(m);
    shapeMeshes.push({ el, m, w, h, left: el.offsetLeft, top: el.offsetTop });
  });
  function syncShapes() {
    for (const s of shapeMeshes) {
      const t = getComputedStyle(s.el).transform;
      let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0;
      if (t && t !== "none") {                           // matrix(a, b, c, d, e, f) or matrix3d(16 values)
        const v = t.slice(t.indexOf("(") + 1, -1).split(",").map(Number);
        [a, b, c, d, e, f] = t.startsWith("matrix3d") ? [v[0], v[1], v[4], v[5], v[12], v[13]] : v;
      }
      const sc = Math.hypot(a, b), rot = Math.atan2(b, a);
      const [x, z] = toWorld(s.left + s.w / 2 + e, s.top + s.h / 2 + f);
      s.m.position.x = x; s.m.position.z = z;
      s.m.rotation.y = -rot;
      s.m.scale.set(s.w * k * sc, 1, s.w * k * sc);
    }
  }

  // the pitch lines: opaque white ribbons on the field (the same drawing as the page's pitch), so the glass refracts them
  const lineGeos = [], LW = (portrait ? 2 : 2.6) * k * 1.0, Y = 0.006;
  const S = 16, gw = cols * S, gh = rows * S, Lp = portrait ? 90 : 120, Wp = 60, mid = Wp / 2, half = Lp / 2;
  const ox = portrait ? (gw - Wp) / 2 : (gw - Lp) / 2, oy = portrait ? (gh - Lp) / 2 : (gh - Wp) / 2;
  const unitM = cols / gw;                                // world units per pitch metre (a tile = 16 m = 1 unit)
  const P = (u, v) => { const gx = portrait ? ox + v : ox + u, gz = portrait ? oy + u : oy + v; return [-cols / 2 + gx * unitM, -rows / 2 + gz * unitM]; };
  const strip = (u0, v0, u1, v1) => {
    const [x0, z0] = P(u0, v0), [x1, z1] = P(u1, v1), len = Math.hypot(x1 - x0, z1 - z0);
    const gm = new THREE.PlaneGeometry(len + LW, LW); gm.rotateX(-Math.PI / 2);
    gm.rotateY(-Math.atan2(z1 - z0, x1 - x0)); gm.translate((x0 + x1) / 2, Y, (z0 + z1) / 2);
    lineGeos.push(gm);
  };
  const rect = (u0, v0, u1, v1) => { strip(u0, v0, u1, v0); strip(u1, v0, u1, v1); strip(u1, v1, u0, v1); strip(u0, v1, u0, v0); };
  const arc = (cu, cv, r, a0, a1) => {                    // degrees, in pitch (u, v) space
    const [cx, cz] = P(cu, cv), rr = r * unitM;
    const deg = (a) => a * Math.PI / 180;
    // (u, v) -> world: landscape u -> x, v -> z ; portrait u -> z, v -> x (a mirror, so angles turn the other way)
    const t0 = portrait ? Math.PI / 2 - deg(a1) : deg(a0), len = deg(a1 - a0);
    const gm = new THREE.RingGeometry(rr - LW / 2, rr + LW / 2, 72, 1, t0, len); gm.rotateX(-Math.PI / 2);
    // RingGeometry's angle runs counter-clockwise in its xy plane; after rotateX(-90) +y becomes -z, so mirror z back
    gm.scale(1, 1, -1); gm.translate(cx, Y, cz);
    lineGeos.push(gm);
  };
  const spot = (u, v, r) => { const [x, z] = P(u, v); const gm = new THREE.CircleGeometry(r * unitM, 24); gm.rotateX(-Math.PI / 2); gm.translate(x, Y + 0.0005, z); lineGeos.push(gm); };
  rect(0, 0, Lp, Wp); strip(half, 0, half, Wp); arc(half, mid, 9.15, 0, 360);
  [0, 1].forEach((e) => {
    const fx = (u) => (e ? Lp - u : u);
    rect(fx(0), mid - 20.16, fx(16.5), mid + 20.16); rect(fx(0), mid - 9.16, fx(5.5), mid + 9.16); rect(fx(0), mid - 3.66, fx(-2), mid + 3.66);
    if (e) arc(Lp - 11, mid, 9.15, 126.87, 233.13); else arc(11, mid, 9.15, -53.13, 53.13);
  });
  arc(0, 0, 1.6, 0, 90); arc(Lp, 0, 1.6, 90, 180); arc(Lp, Wp, 1.6, 180, 270); arc(0, Wp, 1.6, 270, 360);
  spot(half, mid, .55); spot(11, mid, .5); spot(Lp - 11, mid, .5);
  const lines = new THREE.Mesh(mergeGeometries(lineGeos), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  scene.add(lines);
  const fieldShadow = new THREE.Mesh(new THREE.PlaneGeometry(Fw, Fh), new THREE.ShadowMaterial({ opacity: .22 }));
  fieldShadow.rotation.x = -Math.PI / 2; fieldShadow.position.y = 0.0035; fieldShadow.receiveShadow = true;
  scene.add(fieldShadow);
  slab.castShadow = true;

  // ---------------------------------------------------------------------------------------------- the glass tiles
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.1, transmission: 1, thickness: 0.4, ior: 1.46,
    attenuationColor: new THREE.Color("#fff1ea"), attenuationDistance: 2.2,
    clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1, envMapIntensity: 1.15,
  });
  const T = 0.2, tileGeo = new RoundedBoxGeometry(1, T, 1, 5, 0.09);
  const tiles = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const m = new THREE.Mesh(tileGeo, glass);
    m.castShadow = true;
    const hx = -cols / 2 + c + .5, hz = -rows / 2 + r + .5, d = Math.hypot(c + .5 - cols / 2, r + .5 - rows / 2);
    const rnd = (n) => (Math.sin((c + 1) * 12.9898 + (r + 1) * 78.233 + n * 37.719) * 43758.5453) % 1;   // stable per tile
    const tile = {
      m, home: new THREE.Vector3(hx, T / 2 + 0.008, hz),
      out: new THREE.Vector3(hx * 1.075, T / 2 + 0.008, hz * 1.075),
      from: new THREE.Vector3(hx * 2.3 + rnd(1) * 0.8, 3.2 + Math.abs(rnd(2)) * 2.2, hz * 2.3 + 1.6 + rnd(3) * 0.8),
      spin: new THREE.Euler(rnd(4) * 1.6, rnd(5) * 1.2, rnd(6) * 1.6),
      t0: 0.35 + d * 0.11 + Math.abs(rnd(7)) * 0.14,
    };
    tiles.push(tile);
    scene.add(m);
  }

  // ---------------------------------------------------------------------------------------------- light
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-Fw * 0.5, 7, Fh * 0.7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  const sc = key.shadow.camera, ext = Math.max(Fw, Fh) * 0.75;
  sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 0.5; sc.far = 30;
  scene.add(key);
  const rim = new THREE.PointLight(0xff8a50, 26, 30, 1.6); rim.position.set(Fw * 0.45, 2.6, -Fh * 0.55); scene.add(rim);
  const sweep = new THREE.PointLight(0xffffff, 0, 9, 1.4); scene.add(sweep);   // crosses the glass at 2.5 s
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // ---------------------------------------------------------------------------------------------- the camera move
  const tan = Math.tan(THREE.MathUtils.degToRad(22) / 2);
  const finalPos = new THREE.Vector3(-(sr.left + sr.width / 2 - vw / 2) * k, vh * k / (2 * tan), -(sr.top + sr.height / 2 - vh / 2) * k);
  const topQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, "YXZ"));
  const p0 = portrait ? new THREE.Vector3(Fw * 0.18, 0.75, Fh / 2 + 2.6) : new THREE.Vector3(-Fw * 0.38, 0.85, Fh / 2 + 2.3);
  const p1 = portrait ? new THREE.Vector3(-Fw * 0.1, 2.3, Fh / 2 + 2.2) : new THREE.Vector3(-Fw * 0.2, 2.3, Fh / 2 + 2.6);
  const look0 = portrait ? new THREE.Vector3(0, 0, -Fh * 0.12) : new THREE.Vector3(Fw * 0.06, 0, -Fh * 0.05), look1 = new THREE.Vector3(0, 0, 0);
  const tmpM = new THREE.Matrix4(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  const curve = new THREE.CatmullRomCurve3([p0, p1, new THREE.Vector3((p1.x + finalPos.x) / 2, (p1.y + finalPos.y) * 0.62, (p1.z + finalPos.z) / 2), finalPos], false, "centripetal");
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const onMove = (e) => { tmx = (e.clientX / vw - .5) * 2; tmy = (e.clientY / vh - .5) * 2; };
  addEventListener("pointermove", onMove);
  function placeCamera(t) {
    const u = t < 1.6 ? softOut(t / 1.6) * 0.34 : 0.34 + inOut(seg(t, 1.6, 3.2)) * 0.66;
    const pos = curve.getPoint(clamp01(u));
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    const par = 1 - inOut(seg(t, 1.4, 3.0));                // the pointer drift fades as the camera rises
    pos.x += mx * 0.35 * par; pos.y += -my * 0.18 * par;
    camera.position.copy(pos);
    const look = look0.clone().lerp(look1, softOut(seg(t, 0, 2.2)));
    tmpM.lookAt(pos, look, new THREE.Vector3(0, 1, 0)); q0.setFromRotationMatrix(tmpM);
    q1.copy(q0).slerp(topQ, inOut(seg(t, 1.7, 3.2)));
    camera.quaternion.copy(q1);
    camera.fov = 34 - 12 * inOut(seg(t, 1.6, 3.2));
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------------------------------- the tiles' move
  const e0 = new THREE.Euler(), tq = new THREE.Quaternion(), idQ = new THREE.Quaternion();
  function placeTiles(t) {
    const fuse = inOut(seg(t, 2.15, 3.0));
    for (const tl of tiles) {
      const a = expoOut(seg(t, tl.t0, tl.t0 + 1.15));
      const pos = tl.from.clone().lerp(tl.out, a).lerp(tl.home, fuse);
      tl.m.position.copy(pos);
      e0.set(tl.spin.x * (1 - a), tl.spin.y * (1 - a), tl.spin.z * (1 - a)); tq.setFromEuler(e0); tl.m.quaternion.copy(tq).slerp(idQ, 0);
      const s = (0.88 + (1 - a) * 0.22) * (1 - fuse) + 1.0 * fuse;
      tl.m.scale.set(s, 1, s);
      tl.m.visible = t >= tl.t0 - 0.02;
    }
    glass.roughness = 0.1 + 0.2 * fuse;
  }

  // ---------------------------------------------------------------------------------------------- the name (DOM)
  const anims = [];
  if (o.titleIn) anims.push(o.titleIn);                     // the page already brought the name up while three.js loaded
  if (title) {
    if (!o.titleIn) anims.push(title.animate([{ opacity: 0, letterSpacing: ".3em", filter: "blur(14px)" }, { opacity: 1, letterSpacing: "-.05em", filter: "blur(0px)" }],
      { duration: 1000, delay: 200, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }));
    anims.push(title.animate([{ opacity: 1, transform: "translateY(-50%) scale(1)", filter: "blur(0px)" }, { opacity: 0, transform: "translateY(-50%) scale(1.08)", filter: "blur(10px)" }],
      { duration: 520, delay: 1900, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" }));
  }

  // ---------------------------------------------------------------------------------------------- run
  let start = performance.now(), offset = 0, handed = false, fading = false, done = false, raf = 0;
  const END = 3.25;
  function frame(now) {
    const t = Math.min((now - start) / 1000 + offset, END);
    syncShapes(); placeCamera(t); placeTiles(t);
    const sw = seg(t, 2.45, 3.25);
    sweep.intensity = sw > 0 && sw < 1 ? Math.sin(sw * Math.PI) * 30 : 0;
    sweep.position.set(-Fw * 0.7 + sw * Fw * 1.4, 1.6, -Fh * 0.2 + sw * Fh * 0.3);
    renderer.render(scene, camera);
    if (t >= END - 0.05 && !handed) { handed = true; if (o.onHandoff) o.onHandoff(); }
    if (t >= END && !fading) fadeOut();
    if (!done) raf = requestAnimationFrame(frame);
  }
  function fadeOut() {
    fading = true;
    const a = canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: "ease-in-out", fill: "forwards" });
    a.onfinish = cleanup;
  }
  function cleanup() {
    if (done) return; done = true;
    cancelAnimationFrame(raf); removeEventListener("pointermove", onMove);
    anims.forEach((x) => { try { x.cancel(); } catch (e) { } });
    renderer.dispose(); pmrem.dispose(); tileGeo.dispose(); glass.dispose(); gtex.dispose();
    canvas.remove();
    if (o.onDone) o.onDone();
  }
  raf = requestAnimationFrame(frame);
  return {
    skip() {                                              // jump to the overhead shot, then fade
      if (fading || done) return;
      anims.forEach((x) => { try { x.cancel(); } catch (e) { } });
      if (title) title.style.opacity = "0";
      offset = END - (performance.now() - start) / 1000;
    },
  };
}
