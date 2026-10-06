import * as THREE from 'three';

// Dunia 3D low-poly: Arjuna & Bima di malam sakura. Semua dibuat dari bentuk dasar (tanpa file model).
const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};
const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);

const GOLD = 0xe9b949;
const GOLD_D = 0xb98424;

// ---------- manusia dasar ----------
function buildBody(c) {
  const root = new THREE.Group();
  const skin = mat(c.skin);
  const w = c.w;
  const a = c.arm;

  // kaki + sepatu
  for (const sx of [-1, 1]) {
    const leg = add(root, cyl(0.085 * w, 0.06 * w, 0.9, 7), skin, sx * 0.11 * w, 0.45, 0);
    leg.userData.keep = true;
    add(root, new THREE.BoxGeometry(0.13 * w, 0.07, 0.27), mat(0x2a1b3d), sx * 0.11 * w, 0.035, 0.05);
    add(root, new THREE.TorusGeometry(0.072 * w, 0.014, 5, 8), mat(GOLD), sx * 0.11 * w, 0.2, 0).rotation.x = Math.PI / 2;
  }
  // kain bawah (kain / sarung)
  const skirt = add(root, cyl(0.24 * w, 0.31 * w, 0.62, 10), c.skirtMat, 0, 0.62, 0);
  add(root, cyl(0.315 * w, 0.315 * w, 0.045, 10), mat(GOLD), 0, 0.33, 0);
  // sabuk
  add(root, cyl(0.235 * w, 0.235 * w, 0.09, 10), mat(GOLD_D), 0, 0.97, 0);
  add(root, ico(0.04, 0), mat(0xff4fa3), 0, 0.97, 0.235 * w);

  // badan
  const torso = new THREE.Group();
  torso.position.set(0, 1.22, 0);
  root.add(torso);
  add(torso, cyl(0.27 * w, 0.215 * w, 0.62, 8), skin, 0, 0, 0);
  // kalung + selempang
  add(torso, new THREE.TorusGeometry(0.2 * w, 0.02, 5, 10), mat(GOLD), 0, 0.22, 0.02).rotation.x = Math.PI / 2.6;
  if (c.sash) {
    const sh = add(torso, new THREE.BoxGeometry(0.09, 0.78, 0.03), c.sash, 0.02, 0.0, 0.215 * w);
    sh.rotation.z = -0.55;
  }

  // leher + kepala
  add(root, cyl(0.06 * w, 0.065 * w, 0.12, 6), skin, 0, 1.58, 0);
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0);
  root.add(head);
  const hs = c.head;
  const skull = add(head, ico(0.16 * hs, 1), skin);
  skull.scale.set(1, 1.12, 1.02);
  // mata, alis, hidung
  for (const sx of [-1, 1]) {
    add(head, new THREE.BoxGeometry(0.04 * hs, 0.022 * hs, 0.012), mat(0x140c1c), sx * 0.062 * hs, 0.015 * hs, 0.152 * hs);
    const br = add(head, new THREE.BoxGeometry(0.06 * hs, 0.014 * hs, 0.012), mat(0x140c1c), sx * 0.064 * hs, 0.05 * hs, 0.152 * hs);
    br.rotation.z = sx * (c.angry ? -0.38 : 0.12);
  }
  add(head, cone(0.02 * hs, 0.05 * hs, 4), skin, 0, -0.012 * hs, 0.17 * hs).rotation.x = Math.PI / 2;
  add(head, new THREE.BoxGeometry(0.045 * hs, 0.012 * hs, 0.01), mat(0x8a3a3a), 0, -0.07 * hs, 0.148 * hs);
  // telinga + anting
  for (const sx of [-1, 1]) {
    add(head, ico(0.03 * hs, 0), skin, sx * 0.155 * hs, 0, 0);
    add(head, ico(0.018, 0), mat(GOLD), sx * 0.158 * hs, -0.045 * hs, 0.005);
  }

  // lengan (pivot di bahu)
  const arms = {};
  for (const [name, sx] of [['L', 1], ['R', -1]]) {
    const sh = new THREE.Group();
    sh.position.set(sx * 0.3 * w, 1.46, 0);
    root.add(sh);
    add(sh, ico(0.095 * a, 0), c.shoulderMat || skin);
    add(sh, cyl(0.062 * a, 0.052 * a, 0.3, 7), skin, 0, -0.16, 0);
    add(sh, new THREE.TorusGeometry(0.062 * a, 0.014, 5, 8), mat(GOLD), 0, -0.1, 0).rotation.x = Math.PI / 2;
    const el = new THREE.Group();
    el.position.set(0, -0.32, 0);
    sh.add(el);
    add(el, ico(0.052 * a, 0), skin);
    add(el, cyl(0.05 * a, 0.04 * a, 0.28, 7), skin, 0, -0.15, 0);
    add(el, new THREE.TorusGeometry(0.045 * a, 0.012, 5, 8), mat(GOLD), 0, -0.07, 0).rotation.x = Math.PI / 2;
    const hand = add(el, ico(0.05 * a, 0), skin, 0, -0.31, 0);
    arms[name] = { sh, el, hand };
  }
  return { root, torso, head, arms, skin, w, hs };
}

function makePoleng() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4efe6';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#17131f';
  g.fillRect(0, 0, 32, 32);
  g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 1.6);
  t.magFilter = THREE.NearestFilter;
  return t;
}

// ---------- ARJUNA ----------
function buildArjuna() {
  const b = buildBody({ skin: 0xe0a67e, w: 0.92, arm: 0.9, head: 1, skirtMat: mat(0x3347a8), sash: mat(0xf2ecff) });
  const { root, head } = b;
  // rambut panjang + gelung
  const hair = mat(0x150f24);
  add(head, ico(0.175, 1), hair, 0, 0.035, -0.045).scale.set(1, 1.1, 1);
  add(head, cyl(0.08, 0.04, 0.34, 6), hair, 0, -0.2, -0.115);
  add(head, ico(0.07, 1), hair, 0, 0.2, -0.05);
  // mahkota (makuta)
  const crown = new THREE.Group();
  crown.position.set(0, 0.105, 0.01);
  head.add(crown);
  add(crown, cyl(0.172, 0.178, 0.05, 10), mat(GOLD), 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const an = -Math.PI * 0.85 + (i / 6) * Math.PI * 1.7;
    add(crown, cone(0.026, i === 3 ? 0.22 : 0.12, 5), mat(GOLD), Math.sin(an) * 0.165, 0.09 + (i === 3 ? 0.06 : 0), Math.cos(an) * 0.165);
  }
  add(crown, ico(0.036, 0), mat(0xff4fa3, { emissive: 0x7a1642 }), 0, 0.01, 0.185);
  // busur (gendewa)
  const bow = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const th = -1.2 + (i / 12) * 2.4;
    pts.push(new THREE.Vector3(0, 0.62 * Math.sin(th), -0.62 * (1 - Math.cos(th))));
  }
  add(bow, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.022, 5), mat(0x6a3b22));
  add(bow, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.filter((_, i) => i % 3 === 0 || i === 12)), 8, 0.026, 5), mat(GOLD), 0, 0, 0).scale.set(1, 1, 1);
  const tip = pts[0];
  const tipZ = tip.z;
  const tipY = Math.abs(tip.y);
  const stringA = add(bow, cyl(0.005, 0.005, 1, 3), mat(0xf4efe6));
  const stringB = add(bow, cyl(0.005, 0.005, 1, 3), mat(0xf4efe6));
  add(bow, ico(0.04, 0), mat(0xff4fa3, { emissive: 0x7a1642 }), 0, 0, 0.01);
  bow.userData = { stringA, stringB, tipY, tipZ };
  root.add(bow);
  // panah (terlihat saat menarik busur)
  const arrow = new THREE.Group();
  add(arrow, cyl(0.011, 0.011, 0.95, 5), mat(0xf4efe6)).rotation.x = Math.PI / 2;
  add(arrow, cone(0.032, 0.11, 4), mat(0xdfe6ff), 0, 0, 0.53).rotation.x = Math.PI / 2;
  for (const an of [0, 2.1, 4.2]) {
    const f = add(arrow, new THREE.BoxGeometry(0.004, 0.06, 0.15), mat(0xff4fa3), 0, 0, -0.4);
    f.rotation.z = an;
    f.position.set(Math.sin(an) * 0.03, Math.cos(an) * 0.03, -0.4);
  }
  arrow.visible = false;
  bow.add(arrow);
  // tabung anak panah di punggung
  const q = new THREE.Group();
  q.position.set(-0.12, 1.28, -0.23);
  q.rotation.z = 0.35;
  root.add(q);
  add(q, cyl(0.07, 0.06, 0.62, 7), mat(0x5a2c2a));
  for (let i = 0; i < 3; i++) add(q, cyl(0.01, 0.01, 0.25, 4), mat(0xf4efe6), (i - 1) * 0.03, 0.4, 0);
  for (let i = 0; i < 3; i++) add(q, cone(0.022, 0.06, 4), mat(0xff4fa3), (i - 1) * 0.03, 0.54, 0);
  // kain selempang di bahu
  add(root, new THREE.TorusGeometry(0.265, 0.04, 5, 12), mat(0xff7eb6), 0, 1.5, 0).rotation.x = Math.PI / 2;
  return { ...b, bow, arrow, kind: 'arjuna', H: 2.05 };
}

// ---------- BIMA ----------
function buildBima() {
  const b = buildBody({
    skin: 0xb77a52, w: 1.42, arm: 1.55, head: 1.32, angry: true,
    skirtMat: new THREE.MeshLambertMaterial({ map: makePoleng(), flatShading: true }),
    shoulderMat: mat(0xc23a4a),
  });
  const { root, head } = b;
  const hair = mat(0x120c18);
  add(head, ico(0.19, 1), hair, 0, 0.05, -0.04).scale.set(1, 1.0, 1);
  add(head, ico(0.115, 1), hair, 0, 0.27, -0.03); // gelung
  add(head, new THREE.TorusGeometry(0.17, 0.022, 5, 12), mat(GOLD), 0, 0.12, 0).rotation.x = Math.PI / 2;
  add(head, ico(0.032, 0), mat(0xff4fa3, { emissive: 0x7a1642 }), 0, 0.12, 0.178);
  // kumis
  for (const sx of [-1, 1]) {
    const m = add(head, new THREE.BoxGeometry(0.095, 0.022, 0.02), hair, sx * 0.05, -0.052, 0.178);
    m.rotation.z = sx * -0.25;
  }
  // kain merah di bahu + dada
  add(root, new THREE.BoxGeometry(0.86, 0.09, 0.4), mat(0xc23a4a), 0, 1.56, 0);
  add(root, new THREE.BoxGeometry(0.5, 0.2, 0.05), mat(GOLD_D), 0, 1.3, 0.3).rotation.z = 0.04;
  // gada
  const mace = new THREE.Group();
  add(mace, cyl(0.045, 0.055, 1.25, 6), mat(0x4a2a1c), 0, 0.2, 0);
  add(mace, ico(0.24, 1), mat(0x8e8aa6), 0, 0.98, 0);
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2;
    const sp = add(mace, cone(0.05, 0.16, 4), mat(0xcfd0e6), Math.cos(an) * 0.24, 0.98 + ((i % 2) - 0.5) * 0.18, Math.sin(an) * 0.24);
    sp.rotation.z = -Math.cos(an) * 1.2;
    sp.rotation.x = Math.sin(an) * 1.2;
  }
  add(mace, new THREE.TorusGeometry(0.058, 0.014, 5, 8), mat(GOLD), 0, 0.5, 0).rotation.x = Math.PI / 2;
  b.arms.R.el.add(mace);
  mace.position.set(0, -0.3, 0.05);
  mace.rotation.x = Math.PI; // kepala gada ada di depan kepalan tangan
  return { ...b, mace, kind: 'bima', H: 2.45 };
}

// ---------- pohon sakura ----------
function sakura(x, z, s = 1, seed = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  const bark = mat(0x3a2236);
  add(g, cyl(0.2, 0.34, 2.6, 6), bark, 0, 1.3, 0);
  const br = [[-0.7, 2.6, 0.2, 0.9], [0.8, 2.8, -0.1, -0.8], [0.1, 3.1, 0.5, 0.2]];
  for (const [bx, by, bz, rz] of br) {
    const b = add(g, cyl(0.07, 0.13, 1.5, 5), bark, bx * 0.5, by - 0.3, bz * 0.5);
    b.rotation.z = rz;
  }
  const cols = [0xff9ec6, 0xffb7d5, 0xff7eb0, 0xffc9de];
  let k = seed * 7;
  const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i++) {
    const r = 0.9 + rnd() * 1.0;
    add(g, ico(r, 1), mat(cols[i % 4], { emissive: 0x4a1030 }), (rnd() - 0.5) * 3.6, 3.4 + rnd() * 1.5, (rnd() - 0.5) * 2.2);
  }
  return g;
}

// ---------- shot kamera (satuan = tinggi karakter) ----------
const SHOTS = {
  wide: { look: [0, 0.5, 0], pos: [0, 0.62, 2.5], side: 0 },
  med: { look: [0, 0.52, 0], pos: [0.12, 0.58, 1.05], side: 0.26 },
  perf: { look: [0.02, 0.86, 0], pos: [0.28, 0.9, 0.66], side: 0.27 },
  focus: { look: [0.12, 0.6, 0.2], pos: [0.55, 0.62, 1.05], side: -0.27 },
  stores: { look: [0, 0.64, 0], pos: [-0.28, 0.66, 0.78], side: 0.27 },
  pareto: { look: [0.3, 0.46, 0.14], pos: [0.78, 0.5, 0.72], side: -0.27 },
  sales: { look: [0, 0.2, 0], pos: [0.32, 0.24, 0.95], side: 0.27 },
  chart: { look: [0.02, 0.87, 0.05], pos: [0.1, 0.885, 0.42], side: 0 },
  dap: { look: [0.2, 0.56, 0.14], pos: [0.62, 0.6, 0.92], side: -0.27 },
  snap: { look: [0, 0.74, 0], pos: [0.14, 0.78, 0.98], side: 0 },
};
const BIMA_FOCUS = { look: [-0.2, 0.8, 0.1], pos: [-0.55, 0.85, 0.95], side: 0.27 };

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createWorld(canvas, opts = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.mobile, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  const mobile = !!opts.mobile;
  const reduce = !!opts.reduce;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x2b1556, 0.028);
  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.1, 200);

  // langit
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color('#0b0722') }, mid: { value: new THREE.Color('#34195f') }, bot: { value: new THREE.Color('#e8639f') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y*1.5+0.12,0.,1.); vec3 c = h<0.4 ? mix(bot,mid,h/0.4) : mix(mid,top,(h-0.4)/0.6); gl_FragColor = vec4(c,1.); }',
    })
  );
  scene.add(sky);
  // bulan + cahaya
  const moon = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshBasicMaterial({ color: 0xfff1de, fog: false }));
  moon.position.set(-13, 11, -42);
  scene.add(moon);
  const gc = document.createElement('canvas');
  gc.width = gc.height = 128;
  const gx = gc.getContext('2d');
  const gr = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,230,240,.85)');
  gr.addColorStop(1, 'rgba(255,230,240,0)');
  gx.fillStyle = gr;
  gx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, fog: false }));
  glow.scale.set(22, 22, 1);
  glow.position.copy(moon.position);
  scene.add(glow);
  // bintang
  const sp = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = 0.25 + Math.random() * 1.1;
    sp[i * 3] = Math.cos(a) * Math.cos(e) * 80;
    sp[i * 3 + 1] = Math.sin(e) * 80 + 4;
    sp[i * 3 + 2] = -Math.abs(Math.sin(a) * Math.cos(e) * 80) - 10;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff4f8, size: 0.35, sizeAttenuation: true, fog: false })));

  // cahaya
  scene.add(new THREE.HemisphereLight(0xffcbe3, 0x2a1850, 1.05));
  const key = new THREE.DirectionalLight(0xffe0ee, 1.25);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb2ff, 0.7);
  rim.position.set(5, 4, -6);
  scene.add(rim);

  // tanah
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 28), mat(0x2c1d52));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const path = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), mat(0x4a2f6e));
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  path.scale.set(1.5, 1, 0.7);
  scene.add(path);

  // pohon sakura
  [[-6, -7, 1.25, 1], [6.5, -8, 1.35, 2], [-12, -13, 1.5, 3], [11, -14, 1.5, 4], [0, -18, 1.8, 5], [-3, -10, 1.1, 6], [3.5, -11, 1.1, 7]].forEach(([x, z, s, sd]) => scene.add(sakura(x, z, s, sd)));
  if (!mobile) [[-9, 1, 1.1, 8], [9.5, 0, 1.15, 9]].forEach(([x, z, s, sd]) => scene.add(sakura(x, z, s, sd)));

  // kelopak berguguran
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, -0.07);
  petalShape.bezierCurveTo(0.09, -0.05, 0.09, 0.06, 0.02, 0.085);
  petalShape.lineTo(0, 0.06);
  petalShape.lineTo(-0.02, 0.085);
  petalShape.bezierCurveTo(-0.09, 0.06, -0.09, -0.05, 0, -0.07);
  const petalGeo = new THREE.ShapeGeometry(petalShape);
  const N = reduce ? 40 : mobile ? 90 : 230;
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.93, depthWrite: false }), N);
  const pcols = ['#ffd6e6', '#ffb7d3', '#ff9ec6', '#ffe4ee'].map((c) => new THREE.Color(c));
  const P = [];
  const rr = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < N; i++) {
    P.push({ x: rr(-14, 14), y: rr(0, 12), z: rr(-12, 8), vy: rr(0.45, 1.0), sw: rr(0.4, 1.2), ph: rr(0, 6.28), rx: rr(0, 6.28), ry: rr(0, 6.28), rz: rr(0, 6.28), sx: rr(0.8, 2.2), sc: rr(0.9, 1.9) });
    petals.setColorAt(i, pcols[i % 4]);
  }
  petals.frustumCulled = false;
  scene.add(petals);
  // karpet kelopak di tanah
  const carpet = new THREE.InstancedMesh(petalGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), mobile ? 90 : 190);
  const d = new THREE.Object3D();
  for (let i = 0; i < carpet.count; i++) {
    d.position.set(rr(-7, 7), 0.02 + Math.random() * 0.01, rr(-5, 4));
    d.rotation.set(-Math.PI / 2, 0, rr(0, 6.28));
    d.scale.setScalar(rr(1.1, 1.8));
    d.updateMatrix();
    carpet.setMatrixAt(i, d.matrix);
    carpet.setColorAt(i, pcols[i % 4]);
  }
  scene.add(carpet);

  // karakter
  const chars = { arjuna: buildArjuna(), bima: buildBima() };
  chars.arjuna.root.position.set(-1.55, 0, 0);
  chars.arjuna.root.rotation.y = 0.28;
  chars.bima.root.scale.setScalar(1.18);
  chars.bima.root.position.set(1.7, 0, -0.1);
  chars.bima.root.rotation.y = -0.3;
  scene.add(chars.arjuna.root, chars.bima.root);
  const world = { sc: { arjuna: 1, bima: 1.18 } };

  // pose
  const poses = {
    arjuna: {
      idle: { L: { sx: -0.1, sz: 0.1, ex: -0.3 }, R: { sx: 0.05, sz: -0.08, ex: -0.3 } },
      draw: { L: { sx: -1.5, sz: -0.12, ex: -0.05 }, R: { sx: -1.05, sz: 0.1, ex: -1.95 } },
    },
    bima: {
      idle: { L: { sx: 0.1, sz: 0.12, ex: -0.4 }, R: { sx: -0.35, sz: -0.2, ex: -1.9 } },
      raise: { L: { sx: -0.5, sz: 0.2, ex: -0.8 }, R: { sx: -2.9, sz: -0.1, ex: -0.2 } },
      slam: { L: { sx: -0.7, sz: 0.2, ex: -0.8 }, R: { sx: -0.95, sz: -0.08, ex: -0.12 } },
    },
  };
  const cur = {};
  for (const k of ['arjuna', 'bima']) cur[k] = { pose: 'idle', t: 0, L: { ...poses[k].idle.L }, R: { ...poses[k].idle.R } };
  function actNow(k) {
    cur[k].t = k === 'arjuna' ? 1.5 : 1.2;
  }
  const poseOf = (k, t) => {
    if (t <= 0) return 'idle';
    if (k === 'arjuna') return 'draw';
    return t > 0.6 ? 'raise' : 'slam';
  };

  // kamera
  const cam = { pos: new THREE.Vector3(0, 1.4, 6.5), look: new THREE.Vector3(0, 1.0, 0), side: 0 };
  let tween = null;
  let focus = { char: 'both', shot: 'wide' };
  const W = { w: 1, h: 1 };

  function target(charKey, shot) {
    if (charKey === 'both') {
      const wide = { pos: new THREE.Vector3(0, 1.5, 7.2), look: new THREE.Vector3(0.1, 1.05, 0), side: 0 };
      return wide;
    }
    const ch = chars[charKey];
    const s = world.sc[charKey];
    const H = ch.H * s;
    let sh = SHOTS[shot] || SHOTS.med;
    if (charKey === 'bima' && shot === 'focus') sh = BIMA_FOCUS;
    const o = ch.root.position;
    const rotY = ch.root.rotation.y;
    const rot = (v) => {
      const x = v[0] * H, z = v[2] * H;
      return new THREE.Vector3(o.x + x * Math.cos(rotY) + z * Math.sin(rotY), v[1] * H, o.z - x * Math.sin(rotY) + z * Math.cos(rotY));
    };
    return { pos: rot(sh.pos), look: rot(sh.look), side: mobile ? 0 : charKey === 'bima' ? -sh.side : sh.side };
  }

  function go(charKey, shot, { act = true, instant = false } = {}) {
    const t = target(charKey, shot);
    const changed = focus.char !== charKey || focus.shot !== shot;
    focus = { char: charKey, shot };
    if (instant || reduce) {
      cam.pos.copy(t.pos);
      cam.look.copy(t.look);
      cam.side = t.side;
      tween = null;
    } else {
      tween = { t: 0, dur: 1.15, fp: cam.pos.clone(), fl: cam.look.clone(), fs: cam.side, to: t };
    }
    if (act && changed && charKey !== 'both') actNow(charKey);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    W.w = w; W.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const tmpV = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  let last = performance.now();
  let acc = 0;
  let time = 0;
  let raf = 0;
  let running = true;

  function applyArm(arm, p, dt) {
    const k = 1 - Math.exp(-9 * dt);
    arm.sh.rotation.x += (p.sx - arm.sh.rotation.x) * k;
    arm.sh.rotation.z += (p.sz - arm.sh.rotation.z) * k;
    arm.el.rotation.x += (p.ex - arm.el.rotation.x) * k;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running || document.hidden) { last = now; return; }
    let dt = (now - last) / 1000;
    last = now;
    if (mobile) { acc += dt; if (acc < 1 / 30) return; dt = acc; acc = 0; }
    dt = Math.min(dt, 0.05);
    time += dt;

    // kamera
    if (tween) {
      tween.t += dt / tween.dur;
      const e = ease(Math.min(1, tween.t));
      cam.pos.lerpVectors(tween.fp, tween.to.pos, e);
      cam.look.lerpVectors(tween.fl, tween.to.look, e);
      cam.side = tween.fs + (tween.to.side - tween.fs) * e;
      if (tween.t >= 1) tween = null;
    }
    // sedikit goyang kamera biar hidup
    const bob = reduce ? 0 : Math.sin(time * 0.6) * 0.03;
    camera.position.set(cam.pos.x + bob, cam.pos.y + bob * 0.4, cam.pos.z);
    camera.lookAt(cam.look);
    if (Math.abs(cam.side) > 0.001) camera.setViewOffset(W.w, W.h, -cam.side * W.w, 0, W.w, W.h);
    else camera.clearViewOffset();

    // karakter
    for (const k of ['arjuna', 'bima']) {
      const c = cur[k];
      const ch = chars[k];
      if (c.t > 0) c.t = Math.max(0, c.t - dt);
      const pose = poses[k][poseOf(k, c.t)];
      applyArm(ch.arms.L, pose.L, dt);
      applyArm(ch.arms.R, pose.R, dt);
      const br = reduce ? 0 : Math.sin(time * 1.7 + (k === 'bima' ? 1 : 0));
      ch.torso.scale.set(1 + br * 0.012, 1 + br * 0.018, 1);
      ch.head.rotation.y = reduce ? 0 : Math.sin(time * 0.5 + (k === 'bima' ? 2 : 0)) * 0.12;
      ch.head.rotation.x = Math.sin(time * 0.8) * 0.02;
      if (k === 'arjuna') {
        // busur selalu menempel di tangan kiri
        ch.root.updateMatrixWorld(true);
        ch.arms.L.hand.getWorldPosition(tmpV);
        ch.root.worldToLocal(tmpV);
        ch.bow.position.copy(tmpV);
        const drawing = c.t > 0.3;
        ch.bow.rotation.set(0, drawing ? 0 : 0.2, drawing ? 0 : 0.16);
        const u = ch.bow.userData;
        const nock = drawing ? -0.52 : u.tipZ;
        for (const [seg, sy] of [[u.stringA, 1], [u.stringB, -1]]) {
          const a = new THREE.Vector3(0, sy * u.tipY, u.tipZ);
          const b2 = new THREE.Vector3(0, 0, nock);
          const dir = b2.clone().sub(a);
          const len = dir.length();
          seg.position.copy(a).addScaledVector(dir, 0.5);
          seg.scale.set(1, len, 1);
          seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        }
        const flying = c.t > 0 && c.t <= 0.3;
        ch.arrow.visible = c.t > 0;
        ch.arrow.position.z = flying ? (0.3 - c.t) * 40 : drawing ? -0.02 : 0;
      }
    }

    // kelopak
    for (let i = 0; i < N; i++) {
      const p = P[i];
      p.y -= p.vy * dt * (reduce ? 0.5 : 1);
      p.x += Math.sin(time * p.sw + p.ph) * dt * 0.55 + dt * 0.18;
      p.z += Math.cos(time * p.sw * 0.7 + p.ph) * dt * 0.3;
      p.rx += dt * p.sx; p.ry += dt * p.sx * 0.7; p.rz += dt * 0.6;
      if (p.y < 0.03) { p.y = rr(9, 12); p.x = rr(-14, 14); p.z = rr(-12, 8); }
      if (p.x > 15) p.x = -15;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.sc);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize();
  go('both', 'wide', { instant: true, act: false });
  raf = requestAnimationFrame(frame);

  return {
    go,
    act: (k) => actNow(k),
    pause: (v) => { running = !v; },
    // gambar satu frame sebagai spanduk 1160x480 (tokoh dari kepala sampai pinggang) untuk screenshot
    snapshot(charKey) {
      const k = charKey === 'bima' || charKey === 'arjuna' ? charKey : 'arjuna';
      const t = target(k, 'snap');
      renderer.setSize(1160, 480, false);
      camera.aspect = 1160 / 480;
      camera.updateProjectionMatrix();
      camera.clearViewOffset();
      camera.position.copy(t.pos);
      camera.lookAt(t.look);
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/jpeg', 0.92);
      renderer.setSize(W.w, W.h, false);
      camera.aspect = W.w / W.h;
      camera.updateProjectionMatrix();
      return url;
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    },
  };
}
