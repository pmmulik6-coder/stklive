'use strict';

// ======================================================================
//  Stack Ball 3D - 9:16 live/Shorts edition
//  URL options:  ?auto=0  (manual play)   ?clean=1  (hide badge)
//                ?music=0 (no music)      ?cta=Line one|Line two  (custom on-screen prompts)
// ======================================================================

// ---------- constants ----------
const TAU = Math.PI * 2;
const SEGMENTS = 8;
const SECTOR = TAU / SEGMENTS;
const OUTER_R = 2.1;
const INNER_R = 0.5;
const POLE_R = 0.62;
const PLATE_H = 0.4;
const BEVEL_T = 0.05;
const BEVEL_S = 0.04;
const SPACING = 0.5;
const BALL_R = 0.27;
const BALL_Z = 1.4;
const GRAVITY = 32;
const BOUNCE_V = 10.5;
const SMASH_V = 9;
const BLACK = 0x161616;
const BASE_FOV = 50;

const THEMES = [
  { bg: 0xe8602a, plate: 0xf5c518, pole: 0xffffff, ball: 0x2f6bff, base: 0xffffff },
  { bg: 0x2b2d5c, plate: 0xffc93c, pole: 0xffe39a, ball: 0xff7b54, base: 0xffffff },
  { bg: 0xf2c9b5, plate: 0x3d84f5, pole: 0x9cc1ff, ball: 0x3d84f5, base: 0xffffff },
  { bg: 0x1f3b2d, plate: 0x4cd964, pole: 0xa8f0b5, ball: 0xffffff, base: 0xffffff },
  { bg: 0xf7d774, plate: 0xff6b35, pole: 0xffb08a, ball: 0x8f2d56, base: 0xffffff },
  { bg: 0x3a1c5c, plate: 0xb15cff, pole: 0xdcb0ff, ball: 0x00e5ff, base: 0xffffff },
  { bg: 0x0f3b4a, plate: 0x2de2e6, pole: 0xa4f7f9, ball: 0xff2a6d, base: 0xffffff },
  { bg: 0xf4b6c2, plate: 0x7b2cbf, pole: 0xc9a0f0, ball: 0xffd23f, base: 0xffffff },
  { bg: 0x1d2b53, plate: 0xff77a8, pole: 0xffc2d9, ball: 0xffec27, base: 0xffffff },
  { bg: 0xcfe8a9, plate: 0x1b7f5c, pole: 0x88d4b4, ball: 0xff6b35, base: 0xffffff },
];
const BOSS_THEME = { bg: 0x2a0a0a, plate: 0xd62828, pole: 0xff8a8a, ball: 0xffd23f, base: 0xffb4b4 };

const SKINS = [
  { name: 'CLASSIC', color: null, trail: 0xffa21f, cost: 0 },
  { name: 'GOLD', color: 0xffc83a, emissive: 0x3a2600, metal: 0.85, rough: 0.22, trail: 0xffd34d, cost: 10 },
  { name: 'ICE', color: 0x8fe3ff, emissive: 0x0a3a55, metal: 0.2, rough: 0.1, trail: 0x8fe3ff, cost: 25 },
  { name: 'LAVA', color: 0xff4d1a, emissive: 0x7a1a00, metal: 0.1, rough: 0.35, trail: 0xff7a1a, cost: 45 },
  { name: 'NEON', color: 0x39ff14, emissive: 0x0b5a00, metal: 0.1, rough: 0.2, trail: 0x7dff5c, cost: 70 },
  { name: 'GALAXY', color: 0x7a3cff, emissive: 0x240a66, metal: 0.6, rough: 0.2, trail: 0xb48cff, cost: 100 },
  { name: 'ROSE', color: 0xff6fb5, emissive: 0x5a1138, metal: 0.4, rough: 0.2, trail: 0xff9ccd, cost: 140 },
  { name: 'DIAMOND', color: 0xffffff, emissive: 0x2a3a5a, metal: 0.05, rough: 0.05, trail: 0xbfe9ff, cost: 190 },
];

const TAGS = ['WARM UP', 'WATCH THE BLACK', 'GETTING FASTER', "DON'T BLINK", 'SPINNERS INCOMING',
  'STAY SHARP', 'NO MERCY', 'PURE CHAOS', 'ALMOST THERE', 'LEGEND MODE'];

const COMBO_CALLS = [
  { at: 5, text: 'NICE!' }, { at: 10, text: 'GREAT!' }, { at: 20, text: 'AMAZING!' },
  { at: 30, text: 'UNREAL!' }, { at: 40, text: 'GODLIKE!' }, { at: 50, text: 'LEGENDARY!' },
];

const MILESTONES = [
  { key: 'smashed', at: [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000], text: (n) => `${n.toLocaleString()} PLATES SMASHED` },
  { key: 'levels', at: [3, 5, 10, 15, 20, 30, 50, 75, 100], text: (n) => `${n} LEVELS CLEARED` },
  { key: 'gems', at: [25, 50, 100, 250, 500, 1000], text: (n) => `${n} GEMS COLLECTED` },
  { key: 'fire', at: [10, 25, 50, 100, 250], text: (n) => `FIREBALL LIT ${n} TIMES` },
  { key: 'deaths', at: [10, 25, 50, 100], text: (n) => `${n} FAILS - STILL GOING!` },
];

// ---------- params ----------
const params = new URLSearchParams(location.search);
// Live layout (host video on top, game in the middle, blank strip at the bottom for the chat UI) is the default on the live server.
const live = params.get('live') !== '0';
const BLANK_PCT = params.get('blank') === null ? 15 : Number(params.get('blank')) || 0;
const TOP_FRAC = 0.32; // live top band (video + receipt column) height = 32% of the stage width; must match live.css
if (live) document.getElementById('stage').classList.add('live');
document.getElementById('stage').style.setProperty('--blank', BLANK_PCT + '%');
let auto = params.get('auto') !== '0';
if (params.get('clean') === '1') document.getElementById('badge').classList.add('hidden');
const customCta = (params.get('cta') || '').split('|').map((s) => s.trim()).filter(Boolean);
const musicWanted = params.get('music') !== '0';
// ?reset=1 clears saved progress (level, best, stats) so a stream starts fresh from level 1
if (params.get('reset') === '1') {
  try { ['sb_level', 'sb_best', 'sb_stats2', 'sb_skin'].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
}

// ---------- storage ----------
function load(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : Number(v) || def;
  } catch (e) {
    return def;
  }
}
function save(key, v) {
  try { localStorage.setItem(key, String(v)); } catch (e) { /* storage unavailable */ }
}
function loadJSON(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? Object.assign({}, def, JSON.parse(v)) : def;
  } catch (e) {
    return def;
  }
}

// Seeded RNG so a level has the same layout every retry.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  stage: $('stage'), canvas: $('c'),
  cur: $('lvl-cur'), next: $('lvl-next'), barFill: $('bar-fill'), score: $('score'),
  gems: $('gems'), gemCount: $('gem-count'), skinNext: $('skin-next'),
  mission: $('mission'), missionText: $('mission-text'), missionFill: $('mission-fill'),
  missionReward: $('mission-reward'), missionCount: $('mission-count'),
  fireMeter: $('fire-meter'), fireFill: $('fire-fill'),
  toast: $('toast'), toastTitle: $('toast-title'), toastSub: $('toast-sub'),
  center: $('center-msg'), sub: $('sub-msg'),
  combo: $('combo'), comboNum: $('combo-num'), comboLabel: $('combo-label'),
  countdown: $('countdown'), bottom: $('bottom-msg'), cta: $('cta'), stats: $('stats'),
  badge: $('badge'), flash: $('flash'), fade: $('fade'), speed: $('speed'),
};

const POP = [{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }];
function retrigger(node, cls) {
  // Web Animations avoid the forced reflow of the class-toggle trick (this runs on every smash).
  if (cls === 'pop') { node.animate(POP, { duration: 170, easing: 'ease-out' }); return; }
  if (cls === 'pulse') { el.comboNum.animate(POP, { duration: 150, easing: 'ease-out' }); return; }
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

// ---------- procedural textures ----------
function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#' + top.getHexString());
  grad.addColorStop(1, '#' + bottom.getHexString());
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  return new THREE.CanvasTexture(c);
}

function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const softTex = softTexture();

// ---------- three.js setup ----------
// ?lite=1: for machines without a GPU (cloud stream runner): no bloom, no shadows, no MSAA from the first frame.
const LITE = params.get('lite') === '1';
const renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: !LITE });
// ?pr=2 renders at 2x resolution (supersampled, sharper HD / 4K capture) on a strong GPU; the auto-quality guard still protects slow ones.
renderer.setPixelRatio(Number(params.get('pr')) || Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = !LITE;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, 9 / 16, 0.1, 200);

// Procedural studio environment (soft boxes on a gradient sky) so glossy plates and balls get real reflections.
function makeEnvironment() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y * 0.5 + 0.5; vec3 top = vec3(0.85, 0.92, 1.0); vec3 mid = vec3(1.0, 0.86, 0.72); vec3 bot = vec3(0.18, 0.16, 0.22); vec3 c = h > 0.5 ? mix(mid, top, (h - 0.5) * 2.0) : mix(bot, mid, h * 2.0); gl_FragColor = vec4(c, 1.0); }',
  })));
  const softbox = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  softbox(14, 8, 12, 14, 12, 1);
  softbox(10, 6, -14, 6, 8, 0.8);
  softbox(20, 3, 0, 18, -10, 0.9);
  // Plain 8-bit cube map (no float/PMREM targets), so it renders the same on every GPU.
  const rt = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  new THREE.CubeCamera(0.1, 100, rt).update(renderer, env);
  return rt.texture;
}
scene.environment = makeEnvironment();

scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.5));

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(4, 10, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.bias = -0.0006;
sun.shadow.radius = 3;
const sc = sun.shadow.camera;
sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 40;
scene.add(sun);
scene.add(sun.target);

const rim = new THREE.DirectionalLight(0xffffff, 0.35);
rim.position.set(-6, 4, -6);
scene.add(rim);

const tower = new THREE.Group();
scene.add(tower);

// Beveled wedge per segment slot, shared by every plate (bevels leave a thin groove between segments).
const segGeos = [];
for (let i = 0; i < SEGMENTS; i++) {
  const a0 = i * SECTOR;
  const a1 = (i + 1) * SECTOR;
  const p = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];
  const shape = new THREE.Shape();
  shape.moveTo(...p(INNER_R, a0));
  shape.lineTo(...p(OUTER_R, a0));
  shape.lineTo(...p(OUTER_R, a1));
  shape.lineTo(...p(INNER_R, a1));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: PLATE_H - 2 * BEVEL_T,
    bevelEnabled: true,
    bevelThickness: BEVEL_T,
    bevelSize: BEVEL_S,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, BEVEL_T, 0);
  segGeos.push(g);
}

const decalGeo = new THREE.CircleGeometry(0.26, 12);
decalGeo.rotateX(-Math.PI / 2);

const gemGeo = new THREE.OctahedronGeometry(0.2);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x4de1ff, emissive: 0x1a9fd0, roughness: 0.15, metalness: 0.3 });
const gemGlowMat = new THREE.SpriteMaterial({
  map: softTex, color: 0x66e6ff, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
});

// The ball is a group whose body is rebuilt every level (see ball.js): strawberry, basketball, bell, ...
const ball = { mesh: new THREE.Group(), body: null, mats: [], type: null, trail: 0xffa21f, vy: 0, squash: 0, color: 0xe8336d };
scene.add(ball.mesh);

function setBallType(lvl) {
  const t = ballTypeFor(lvl);
  if (ball.body) { ball.mesh.remove(ball.body); disposeObj(ball.body); }
  const b = t.build(BALL_R);
  ball.body = b.obj;
  ball.mats = collectBallMats(b.obj);
  ball.type = Object.assign({ spin: b.spin }, t);
  ball.trail = b.trail;
  ball.body.rotation.set(0, 0, 0);
  ball.mesh.add(ball.body);
  setBallLook();
}

const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: softTex, color: 0xff7a00, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
glow.visible = false;
scene.add(glow);

const trailGeo = new THREE.SphereGeometry(BALL_R * 0.8, 10, 8);
const trail = Array.from({ length: 36 }, () => {
  const mesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
    color: 0xffa21f, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, life: 0 };
});
let trailIdx = 0;
let trailTimer = 0;

// ---------- background bokeh + ball light streak ----------
const bokehMat = new THREE.SpriteMaterial({ map: softTex, color: 0xff5533, transparent: true, opacity: 0.35, depthWrite: false, fog: false });
const bokeh = [];
for (let i = 0; i < 16; i++) {
  const s = new THREE.Sprite(bokehMat);
  const size = 1.2 + Math.random() * 3;
  s.scale.set(size, size, 1);
  s.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 22, -4 - Math.random() * 6);
  s.userData.speed = 0.15 + Math.random() * 0.3;
  scene.add(s);
  bokeh.push(s);
}
function updateBokeh(dt) {
  for (const s of bokeh) {
    s.position.y += s.userData.speed * dt;
    if (s.position.y > camY + 12) s.position.y -= 24;
    else if (s.position.y < camY - 12) s.position.y += 24;
  }
}

const streakGeo = new THREE.ConeGeometry(0.2, 2.4, 16, 1, true);
streakGeo.translate(0, 1.2, 0);
const streak = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({
  color: 0x66aaff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
  depthWrite: false, fog: false, side: THREE.DoubleSide,
}));
streak.visible = false;
scene.add(streak);
let streakOp = 0;
function updateStreak(dt) {
  const on = holding && state === 'playing';
  streakOp += ((on ? 0.55 : 0) - streakOp) * Math.min(1, dt * 14);
  streak.visible = streakOp > 0.02;
  if (!streak.visible) return;
  streak.position.copy(ball.mesh.position);
  streak.material.opacity = streakOp;
  streak.material.color.setHex(fire.active ? 0xff8a1f : ball.trail);
}

// ---------- post-processing (bloom) with graceful fallback ----------
let composer = null;
let bloomPass = null;
function initComposer(w, h) {
  try {
    if (!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) || !renderer.capabilities.isWebGL2) return;
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLMultisampleRenderTarget(w * pr, h * pr, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
    });
    composer = new THREE.EffectComposer(renderer, rt);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w * pr, h * pr), 0.4, 0.55, 0.93);
    composer.addPass(bloomPass);
  } catch (e) {
    composer = null;
    bloomPass = null;
  }
}

// ---------- particles: sparks ----------
const SPARKS = 260;
const sparkPos = new Float32Array(SPARKS * 3);
const sparkCol = new Float32Array(SPARKS * 3);
const sparkBase = new Float32Array(SPARKS * 3);
const sparkVel = new Float32Array(SPARKS * 3);
const sparkLife = new Float32Array(SPARKS);
const sparkMax = new Float32Array(SPARKS).fill(1);
for (let i = 0; i < SPARKS; i++) sparkPos[i * 3 + 1] = -999;
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
  size: 0.3, map: softTex, vertexColors: true, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
sparks.frustumCulled = false;
scene.add(sparks);
let sparkIdx = 0;

function burst(x, y, z, count, color, speed, up) {
  const c = new THREE.Color(color);
  for (let n = 0; n < count; n++) {
    const i = sparkIdx;
    sparkIdx = (sparkIdx + 1) % SPARKS;
    const a = Math.random() * TAU;
    const sp = speed * (0.4 + Math.random() * 0.8);
    sparkPos[i * 3] = x;
    sparkPos[i * 3 + 1] = y;
    sparkPos[i * 3 + 2] = z;
    sparkVel[i * 3] = Math.cos(a) * sp;
    sparkVel[i * 3 + 1] = up * (0.4 + Math.random());
    sparkVel[i * 3 + 2] = Math.sin(a) * sp;
    sparkBase[i * 3] = c.r;
    sparkBase[i * 3 + 1] = c.g;
    sparkBase[i * 3 + 2] = c.b;
    sparkLife[i] = sparkMax[i] = 0.4 + Math.random() * 0.5;
  }
}

function updateSparks(dt) {
  for (let i = 0; i < SPARKS; i++) {
    if (sparkLife[i] <= 0) continue;
    sparkLife[i] -= dt;
    if (sparkLife[i] <= 0) {
      sparkPos[i * 3 + 1] = -999;
      sparkCol[i * 3] = sparkCol[i * 3 + 1] = sparkCol[i * 3 + 2] = 0;
      continue;
    }
    sparkVel[i * 3 + 1] -= 14 * dt;
    sparkPos[i * 3] += sparkVel[i * 3] * dt;
    sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
    sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
    const k = sparkLife[i] / sparkMax[i];
    sparkCol[i * 3] = sparkBase[i * 3] * k;
    sparkCol[i * 3 + 1] = sparkBase[i * 3 + 1] * k;
    sparkCol[i * 3 + 2] = sparkBase[i * 3 + 2] * k;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
}

// ---------- particles: floating dust ----------
const DUST = 70;
const dustPos = new Float32Array(DUST * 3);
const dustSpeed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) {
  const a = Math.random() * TAU;
  const r = 2.8 + Math.random() * 7;
  dustPos[i * 3] = Math.cos(a) * r;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
  dustPos[i * 3 + 2] = Math.sin(a) * r - 1;
  dustSpeed[i] = 0.25 + Math.random() * 0.5;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  size: 0.16, map: softTex, color: 0xffffff, transparent: true, opacity: 0.5,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
dust.frustumCulled = false;
scene.add(dust);

function updateDust(dt) {
  for (let i = 0; i < DUST; i++) {
    let y = dustPos[i * 3 + 1] + dustSpeed[i] * dt;
    if (y > camY + 9) y -= 18;
    else if (y < camY - 9) y += 18;
    dustPos[i * 3 + 1] = y;
  }
  dustGeo.attributes.position.needsUpdate = true;
}

// ---------- shockwave rings ----------
const rings = [];
const ringGeo = new THREE.RingGeometry(0.35, 0.42, 40);
ringGeo.rotateX(-Math.PI / 2);

function spawnRing(x, y, z, color) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, fog: false,
  }));
  m.position.set(x, y, z);
  scene.add(m);
  rings.push({ m, t: 0 });
}

function updateRings(dt) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    const k = r.t / 0.45;
    if (k >= 1) {
      scene.remove(r.m);
      r.m.material.dispose();
      rings.splice(i, 1);
      continue;
    }
    r.m.scale.setScalar(1 + k * 3.2);
    r.m.material.opacity = 0.8 * (1 - k);
  }
}

// ---------- persistent stats ----------
const stats = loadJSON('sb_stats2', { smashed: 0, gems: 0, levels: 0, fire: 0, deaths: 0, bestLevel: 1, ach: {}, mi: 0, mp: 0 });
stats.ach = stats.ach || {};
let skinIdx = Math.min(load('sb_skin', 0), SKINS.length - 1);

function saveStats() {
  try { localStorage.setItem('sb_stats2', JSON.stringify(stats)); } catch (e) { /* storage unavailable */ }
  save('sb_skin', skinIdx);
}
setInterval(saveStats, 5000);
window.addEventListener('beforeunload', saveStats);

// ---------- game state ----------
let level = load('sb_level', 1);
let best = load('sb_best', 0);
let score = 0;
let levelStartScore = 0;
let attempt = 1;
let state = 'menu'; // menu | playing | dead | complete
let holding = false;
let plates = [];
let plateMats = [];
let debris = [];
let totalPlates = 0;
let broken = 0;
let combo = 0;
let mats = null;
let base = null;
let pole = null;
let ground = null;
let baseTop = 0;
let rotSpeed = 1;
let camY = 0;
let camDist = 12.9;
let shake = 0;
let lockedUntil = 0;
let clock = 0;
let themePlate = 0xe8336d;
let themeColors = [0xffffff];
let introT = 0;
let quickIntro = false;
let shownCount = 0;
let stateT = 0;
let timeScale = 1;
let slowT = 0;
let freezeT = 0;
let bloomBoost = 0;
let speedOp = 0;
let gemChain = 0;
let gemChainT = 0;
let checkpoints = 0;
let comboOutTimer = 0;
let stallT = 0;
const SCORE_MARKS = [100, 250, 500, 1000, 1500, 2000, 3000, 5000, 7500, 10000];
let scoreMarkIdx = 0;
let quality = LITE ? 2 : 0;
let perfAvg = 16.7;
let perfFrames = 0;
const fire = { charge: 0, active: false };

const isBoss = (l) => l % 5 === 0;
const levelTag = (l) => (isBoss(l) ? 'BOSS FIGHT - SURVIVE THE BLACK!' : TAGS[(l - 1) % TAGS.length]);

// ---------- helpers: effects ----------
function flashScreen() { retrigger(el.flash, 'go'); }

// Game -> live host (listened to by live.js, which forwards it to the commentary server).
function emit(type, extra) {
  window.dispatchEvent(new CustomEvent('game', {
    detail: Object.assign({ type, level, attempt, score, bestLevel: stats.bestLevel, gems: stats.gems }, extra),
  }));
}
function slowMo(scale, dur) { timeScale = scale; slowT = dur; }
function hitStop(d) { freezeT = Math.max(freezeT, d); }

let fadeBusy = false;
function fadeThen(fn) {
  if (fadeBusy) return;
  fadeBusy = true;
  el.fade.classList.add('on');
  setTimeout(() => {
    fn();
    el.fade.classList.remove('on');
    fadeBusy = false;
  }, 300);
}

// ---------- toasts ----------
const toastQ = [];
let toastBusy = false;
function toast(title, sub = '', kind = '') {
  toastQ.push({ title, sub, kind });
  if (toastQ.length > 5) toastQ.shift();
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = toastQ.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  el.toastTitle.textContent = t.title;
  el.toastSub.textContent = t.sub;
  el.toast.className = 'show t ' + t.kind;
  setTimeout(() => {
    el.toast.className = 't ' + t.kind;
    setTimeout(nextToast, 240);
  }, t.kind === 'small' ? 1000 : 2000);
}

// ---------- missions & milestones ----------
function makeMission(i) {
  const kinds = ['smash', 'combo', 'gems', 'fire', 'levels', 'score', 'clean'];
  const kind = kinds[i % kinds.length];
  const tier = Math.floor(i / kinds.length);
  const target = {
    smash: 40 + tier * 60, combo: 10 + tier * 6, gems: 6 + tier * 4, fire: 2 + tier,
    levels: 1 + tier, score: 60 + tier * 80, clean: 1 + Math.floor(tier / 2),
  }[kind];
  const s = (n) => (n > 1 ? 's' : '');
  const text = {
    smash: `Smash ${target} plates`,
    combo: `Reach a x${target} combo`,
    gems: `Collect ${target} gems`,
    fire: `Ignite the fireball ${target}x`,
    levels: `Clear ${target} level${s(target)}`,
    score: `Score ${target} in one run`,
    clean: `Clear ${target} level${s(target)} first try`,
  }[kind];
  return { kind, target, text, progress: 0, reward: 3 + tier * 2, done: false };
}

let mission = makeMission(stats.mi);
mission.progress = Math.min(stats.mp || 0, mission.target - 1);

function updateMissionHud(flash) {
  el.missionText.textContent = mission.text;
  el.missionReward.textContent = '+' + mission.reward;
  el.missionCount.textContent = Math.min(mission.progress, mission.target) + '/' + mission.target;
  el.missionFill.style.width = Math.min(100, (mission.progress / mission.target) * 100) + '%';
  if (flash) retrigger(el.mission, 'flash');
}

function missionChanged() {
  stats.mp = mission.progress;
  updateMissionHud(false);
  if (!mission.done && mission.progress >= mission.target) completeMission();
}
function missionAdd(kind, n = 1) {
  if (mission.kind !== kind || mission.done) return;
  mission.progress += n;
  missionChanged();
}
function missionMax(kind, v) {
  if (mission.kind !== kind || mission.done || v <= mission.progress) return;
  mission.progress = v;
  missionChanged();
}

function completeMission() {
  mission.done = true;
  SFX.mission();
  flashScreen();
  toast('MISSION COMPLETE!', `${mission.text}  +${mission.reward} GEMS`, 'mission');
  addGems(mission.reward, false);
  burst(0, camY + 1, BALL_Z, 40, 0x6bffb8, 5, 8);
  setTimeout(() => {
    stats.mi++;
    stats.mp = 0;
    mission = makeMission(stats.mi);
    updateMissionHud(true);
    saveStats();
  }, 1600);
}

function checkMilestones() {
  for (const m of MILESTONES) {
    const done = stats.ach[m.key] || 0;
    if (done < m.at.length && stats[m.key] >= m.at[done]) {
      stats.ach[m.key] = done + 1;
      toast('MILESTONE!', m.text(m.at[done]), '');
      SFX.milestone(done);
      flashScreen();
      burst(0, camY + 1, BALL_Z, 30, 0xffd23f, 5, 8);
    }
  }
}

function nextSkinInfo() {
  const n = SKINS.find((s) => s.cost > stats.gems);
  return n || null;
}

function addGems(n, fromPickup) {
  stats.gems += n;
  el.gemCount.textContent = stats.gems;
  retrigger(el.gems, 'pop');
  if (fromPickup) missionAdd('gems', n);
  checkSkins();
  checkMilestones();
  updateSkinHud();
}

function checkSkins() {
  return; // the ball now changes every level (ball.js), so gem-unlocked skins are retired
  let newest = skinIdx;
  SKINS.forEach((s, i) => { if (s.cost <= stats.gems && i > newest) newest = i; });
  if (newest !== skinIdx) {
    skinIdx = newest;
    setBallLook();
    emit('skin', { name: SKINS[skinIdx].name });
    toast('NEW SKIN UNLOCKED!', SKINS[skinIdx].name + ' BALL', 'skin');
    SFX.unlock();
    flashScreen();
    saveStats();
  }
}

function updateSkinHud() {
  const n = nextSkinInfo();
  el.skinNext.textContent = n ? `NEXT SKIN: ${n.name}  ${stats.gems}/${n.cost}` : 'ALL SKINS UNLOCKED';
}

// ---------- level building ----------
function clearLevel() {
  for (const p of plates) tower.remove(p.group);
  for (const d of debris) scene.remove(d.pivot);
  for (const r of rings) { scene.remove(r.m); r.m.material.dispose(); }
  plates = [];
  debris = [];
  rings.length = 0;
  if (base) { scene.remove(base); base.geometry.dispose(); }
  if (pole) { scene.remove(pole); pole.geometry.dispose(); }
  if (ground) { scene.remove(ground); ground.geometry.dispose(); }
  if (mats) Object.values(mats).forEach((m) => m.dispose());
  plateMats.forEach((m) => m.dispose());
  plateMats = [];
  if (scene.background && scene.background.isTexture) scene.background.dispose();
  for (const t of trail) { t.life = 0; t.mesh.visible = false; }
  for (let i = 0; i < SPARKS; i++) {
    sparkLife[i] = 0;
    sparkPos[i * 3 + 1] = -999;
    sparkCol[i * 3] = sparkCol[i * 3 + 1] = sparkCol[i * 3 + 2] = 0;
  }
}

function addPlate(index, rotY, blackPattern, spin, plateMat, gemSeg) {
  const group = new THREE.Group();
  group.position.y = -index * SPACING;
  group.rotation.y = rotY;
  for (let s = 0; s < SEGMENTS; s++) {
    const mesh = new THREE.Mesh(segGeos[s], blackPattern[s] ? mats.black : plateMat);
    mesh.userData.seg = s;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const plate = { group, black: blackPattern, spin, decals: 0, gem: null, baseY: group.position.y, dip: 0 };
  if (gemSeg >= 0) {
    const a = (gemSeg + 0.5) * SECTOR;
    const gm = new THREE.Mesh(gemGeo, gemMat);
    gm.position.set(Math.sin(a) * 1.35, PLATE_H + 0.28, Math.cos(a) * 1.35);
    gm.userData.loose = true;
    gm.castShadow = true;
    const gl = new THREE.Sprite(gemGlowMat);
    gl.scale.setScalar(0.9);
    gl.position.copy(gm.position);
    gl.userData.loose = true;
    group.add(gm);
    group.add(gl);
    plate.gem = { mesh: gm, glow: gl, seg: gemSeg };
  }
  tower.add(group);
  plates.push(plate);
}

function buildLevel() {
  clearLevel();
  botState.plate = null;
  botState.blunder = false;
  const boss = isBoss(level);
  const theme = boss ? BOSS_THEME : THEMES[(level - 1) % THEMES.length];
  const rand = mulberry32(level * 7919 + 13);

  const bg = new THREE.Color(theme.bg);
  const plateColor = new THREE.Color(theme.plate);
  const hsl = {};
  plateColor.getHSL(hsl);

  mats = {
    black: new THREE.MeshStandardMaterial({ color: BLACK, roughness: 0.28, metalness: 0.35 }),
    pole: new THREE.MeshStandardMaterial({ color: theme.pole, roughness: 0.4, metalness: 0.05 }),
    base: new THREE.MeshStandardMaterial({ color: theme.base, roughness: 0.5 }),
    ground: new THREE.MeshStandardMaterial({ color: bg.clone().multiplyScalar(0.82), roughness: 1 }),
    decal: new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.ball).multiplyScalar(0.6),
      transparent: true,
      opacity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  };
  ball.color = theme.ball;
  setBallType(level);
  bokehMat.color.copy(bg).offsetHSL(-0.03, 0.15, 0.1);
  themePlate = plateColor.clone().offsetHSL(0, 0, 0.12).getHex();
  themeColors = [theme.plate, theme.ball, theme.pole, 0xffffff];

  scene.background = gradientTexture(bg.clone().offsetHSL(0.02, 0, 0.1), bg.clone().offsetHSL(-0.02, 0, -0.1));
  scene.fog = new THREE.Fog(bg.getHex(), camDist + 6, camDist + 26);
  document.body.style.background = '#07070d';
  el.stage.style.background = '#' + bg.getHexString();
  document.documentElement.style.setProperty('--accent', '#' + new THREE.Color(theme.ball).getHexString());

  // Difficulty curve
  const count = Math.min(Math.floor((28 + level * 3) * (boss ? 1.25 : 1)), 130);
  const blackChance = boss ? 0.95 : Math.min(0.3 + level * 0.06, 0.92);
  const maxBlack = Math.min(boss ? 3 + Math.floor(level / 5) : 1 + Math.floor(level / 3), 5);
  const spinChance = boss ? 0.45 : level >= 5 ? Math.min(0.1 + level * 0.02, 0.4) : 0;
  rotSpeed = (level % 2 ? 1 : -1) * (boss ? 2.1 : Math.min(0.9 + level * 0.05, 2.0));

  const plateMatFor = (i) => {
    const l = THREE.MathUtils.clamp(hsl.l - (i / count) * 0.14 + (i % 2 ? 0.012 : 0), 0.12, 0.9);
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL((hsl.h - (i / count) * 0.05 + 1) % 1, hsl.s, l), roughness: 0.3, metalness: 0.08, envMapIntensity: 0.9,
    });
    plateMats.push(m);
    return m;
  };

  let i = 0;
  let angle = rand() * TAU;
  const twists = [0, 0.12, -0.12, 0.25, -0.25];
  while (i < count) {
    const len = 4 + Math.floor(rand() * 6);
    const nBlack = rand() < blackChance ? 1 + Math.floor(rand() * maxBlack) : 0;
    const spaced = rand() < 0.4;
    const start = Math.floor(rand() * SEGMENTS);
    const pattern = new Array(SEGMENTS).fill(false);
    for (let k = 0; k < nBlack; k++) {
      const idx = spaced ? (start + k * Math.floor(SEGMENTS / nBlack)) % SEGMENTS : (start + k) % SEGMENTS;
      pattern[idx] = true;
    }
    const twist = twists[Math.floor(rand() * twists.length)];
    const spin = rand() < spinChance ? (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.8) : 0;
    for (let j = 0; j < len && i < count; j++, i++) {
      const safe = i < 3 || i === count - 1;
      const pat = safe ? new Array(SEGMENTS).fill(false) : pattern;
      let gemSeg = -1;
      if (i >= 3 && i < count - 1 && rand() < 0.15) {
        const open = [];
        for (let s = 0; s < SEGMENTS; s++) if (!pat[s]) open.push(s);
        gemSeg = open[Math.floor(rand() * open.length)];
      }
      addPlate(i, angle, pat, spin, plateMatFor(i), gemSeg);
      angle += twist;
    }
  }

  baseTop = -count * SPACING + PLATE_H;
  base = new THREE.Mesh(new THREE.CylinderGeometry(OUTER_R + 0.25, OUTER_R + 0.25, 0.6, 48), mats.base);
  base.position.y = baseTop - 0.3;
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = baseTop - 0.6;
  scene.add(ground);

  const poleTop = 9;
  const poleBottom = baseTop - 0.6;
  pole = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R, POLE_R, poleTop - poleBottom, 48), mats.pole);
  pole.position.y = (poleTop + poleBottom) / 2;
  pole.castShadow = true;
  pole.receiveShadow = true;
  scene.add(pole);

  tower.rotation.y = 0;
  totalPlates = count;
  broken = 0;
  resetRunUi();
  checkpoints = 0;
  fire.charge = 0;
  fire.active = false;
  SFX.fire(false);
  setBallLook();
  ball.mesh.position.set(0, PLATE_H + 2, BALL_Z);
  ball.vy = 0;
  camY = PLATE_H;
  for (let d = 0; d < DUST; d++) dustPos[d * 3 + 1] = camY + (Math.random() - 0.5) * 18;
  levelStartScore = score;
  SFX.setKey(level);
  updateHud();
}

// ---------- helpers ----------
function topSurfaceY() {
  return plates.length ? plates[0].group.position.y + PLATE_H : baseTop;
}

function localAngle(plate) {
  const phi = tower.rotation.y + plate.group.rotation.y;
  let a = (-phi) % TAU;
  if (a < 0) a += TAU;
  return a;
}

function segmentUnderBall(plate) {
  return Math.floor(localAngle(plate) / SECTOR) % SEGMENTS;
}

function setBallLook() {
  for (const m of ball.mats) {
    const base = m.userData.baseColor;
    if (!base) continue;
    if (fire.active) {
      m.color.setHex(0xff9050);
      if (m.emissive) m.emissive.setHex(0xa03000);
    } else {
      m.color.copy(base);
      if (m.emissive && m.userData.baseEmissive) m.emissive.copy(m.userData.baseEmissive);
    }
  }
}

let shownScore = -1;
function updateHud() {
  el.cur.textContent = level;
  el.next.textContent = level + 1;
  el.barFill.style.width = (totalPlates ? (broken / totalPlates) * 100 : 0) + '%';
  el.score.textContent = score;
  if (score !== shownScore) {
    shownScore = score;
    retrigger(el.score, 'pop');
  }
  el.gemCount.textContent = stats.gems;
  updateStats();
}

function updateStats() {
  el.stats.textContent = `ATTEMPT ${attempt}  -  BEST LV ${stats.bestLevel}  -  SMASHED ${stats.smashed.toLocaleString()}`;
}

function setMsg(center, sub, bottom, boss) {
  el.center.textContent = center;
  el.center.classList.toggle('bossmsg', !!boss);
  el.sub.textContent = sub;
  el.bottom.textContent = bottom;
}

function saveBest() {
  if (score > best) {
    best = score;
    save('sb_best', best);
  }
}

// ---------- on-screen engagement prompts ----------
let ctaIdx = 0;
function ctaMessages() {
  if (customCta.length) return customCta;
  const list = [
    'COMMENT 1-10: HOW FAR WILL IT GO?',
    'LIKE TO POWER THE FIREBALL!',
    'FOLLOW FOR NEW SKINS',
    `CAN IT BEAT LEVEL ${stats.bestLevel + 1}?`,
    'SEND THIS TO A FRIEND!',
  ];
  const n = nextSkinInfo();
  if (n) list.push(`${n.cost - stats.gems} MORE GEMS = ${n.name} BALL`);
  if (isBoss(level)) list.push('BOSS LEVEL! WILL IT SURVIVE?');
  return list;
}
function rotateCta() {
  const list = ctaMessages();
  ctaIdx = (ctaIdx + 1) % list.length;
  el.cta.style.opacity = 0;
  setTimeout(() => { el.cta.textContent = list[ctaIdx]; el.cta.style.opacity = 1; }, 400);
}
setInterval(rotateCta, 6500);

// ---------- combo display ----------
function showCombo() {
  if (combo < 3) return;
  clearTimeout(comboOutTimer);
  el.comboNum.textContent = 'x' + combo;
  el.combo.classList.add('on');
  retrigger(el.combo, 'pulse');
  const call = COMBO_CALLS.find((c) => c.at === combo);
  if (call) {
    emit('combo', { n: combo });
    el.comboLabel.textContent = call.text;
    retrigger(el.combo, 'label');
    SFX.milestone(COMBO_CALLS.indexOf(call));
    flashScreen();
    bloomBoost = 0.5;
    shake = Math.max(shake, 0.12);
  }
}

function hideCombo(delay) {
  clearTimeout(comboOutTimer);
  const hide = () => { el.combo.classList.remove('on'); el.comboLabel.textContent = ''; };
  if (delay > 0) comboOutTimer = setTimeout(hide, delay);
  else hide();
}

function setHold(v) {
  if (v === holding) return;
  holding = v;
  if (!v) {
    hideCombo(combo >= 3 ? 700 : 0);
    combo = 0;
  }
}

function resetRunUi() {
  hideCombo(0);
  combo = 0;
  el.countdown.textContent = '';
}

// ---------- gameplay ----------
function addDecal(plate) {
  if (plate.decals >= 3) return;
  plate.decals++;
  tower.updateMatrixWorld(true);
  const p = new THREE.Vector3(0, plate.group.position.y + PLATE_H + 0.01, BALL_Z);
  plate.group.worldToLocal(p);
  const d = new THREE.Mesh(decalGeo, mats.decal);
  d.position.copy(p);
  d.rotation.y = Math.random() * TAU;
  d.scale.setScalar(0.8 + Math.random() * 0.5);
  d.userData.loose = true;
  plate.group.add(d);
}

function doBounce(plate) {
  ball.vy = BOUNCE_V;
  ball.squash = 1;
  const top = topSurfaceY();
  if (plate) { addDecal(plate); plate.dip = 1; }
  spawnRing(0, top + 0.03, BALL_Z, fire.active ? 0xff8a00 : themePlate);
  burst(0, top + 0.05, BALL_Z, 8, themePlate, 2.2, 3.5);
  SFX.bounce();
}

// A plate breaks into exactly two solid halves (left / right of the camera) that fly apart.
// No material cloning: pieces share the plate materials and shrink away instead of fading.
function shatter(plate) {
  const g = plate.group;
  const rotY = tower.rotation.y + g.rotation.y;
  const sides = [[], []];
  for (const child of g.children.slice()) {
    const a = child.userData.seg !== undefined ? (child.userData.seg + 0.5) * SECTOR : Math.atan2(child.position.x, child.position.z);
    sides[Math.sin(a + rotY) < 0 ? 0 : 1].push({ child, a });
  }
  tower.remove(g);
  sides.forEach((list, i) => {
    if (!list.length) return;
    let cx = 0;
    let cz = 0;
    for (const { a } of list) { cx += Math.sin(a + rotY); cz += Math.cos(a + rotY); }
    cx = (cx / list.length) * 1.3;
    cz = (cz / list.length) * 1.3;
    const pivot = new THREE.Group();
    pivot.position.set(cx, g.position.y, cz);
    const inner = new THREE.Group();
    inner.position.set(-cx, 0, -cz);
    inner.rotation.y = rotY;
    for (const { child } of list) { child.castShadow = false; inner.add(child); }
    pivot.add(inner);
    scene.add(pivot);
    const dir = i === 0 ? -1 : 1;
    debris.push({
      pivot,
      t: 0,
      vel: new THREE.Vector3(dir * (3.5 + Math.random() * 1.5), 3 + Math.random() * 2, 1 + Math.random() * 2.5),
      spin: new THREE.Vector3((Math.random() - 0.5) * 5, dir * (1 + Math.random() * 2), -dir * (2 + Math.random() * 3)),
    });
  });
}

function collectGem(plate) {
  const g = plate.gem;
  if (!g) return;
  let d = Math.abs(g.seg - segmentUnderBall(plate));
  d = Math.min(d, SEGMENTS - d);
  if (d > 1) return;
  plate.group.remove(g.mesh);
  plate.group.remove(g.glow);
  plate.gem = null;
  gemChainT = 1.6;
  SFX.gem(gemChain++);
  burst(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 14, 0x66e6ff, 3.5, 5);
  addGems(1, true);
}

function ignite() {
  fire.active = true;
  setBallLook();
  stats.fire++;
  emit('fireball');
  missionAdd('fire');
  checkMilestones();
  SFX.ignite();
  SFX.fire(true);
  flashScreen();
  bloomBoost = 0.7;
  toast('FIREBALL!', '', 'small');
  burst(ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z, 34, 0xff7a00, 5, 5);
}

function extinguish() {
  fire.active = false;
  setBallLook();
  SFX.fire(false);
  SFX.extinguish();
}

function smashPlate() {
  const plate = plates.shift();
  broken++;
  combo++;
  stats.smashed++;
  stallT = 0;
  score += (fire.active ? 2 : 1) * (1 + Math.floor(combo / 10));
  collectGem(plate);
  if (!fire.active) {
    fire.charge = Math.min(1, fire.charge + 0.065);
    if (fire.charge >= 1) ignite();
  }
  const bp = ball.mesh.position;
  burst(bp.x, bp.y, bp.z, fire.active ? 7 : 4, fire.active ? 0xff8a00 : themePlate, 1.6, 1.8);
  shatter(plate);
  SFX.smash(combo, fire.active);
  showCombo();
  missionAdd('smash');
  missionMax('combo', combo);
  missionMax('score', score);
  if (score >= SCORE_MARKS[scoreMarkIdx]) {
    emit('score_mark', { mark: SCORE_MARKS[scoreMarkIdx] });
    scoreMarkIdx = Math.min(scoreMarkIdx + 1, SCORE_MARKS.length - 1);
    if (scoreMarkIdx === SCORE_MARKS.length - 1) SCORE_MARKS[scoreMarkIdx] = score + 5000;
  }
  if (stats.smashed % 10 === 0) checkMilestones();

  const pct = broken / totalPlates;
  if (checkpoints < 3 && pct >= 0.25 * (checkpoints + 1)) {
    checkpoints++;
    toast(['25% DONE', 'HALFWAY!', '75% - ALMOST!'][checkpoints - 1], '', 'small');
    emit('checkpoint', { pct: checkpoints * 25 });
  }
  updateHud();
}

function die() {
  state = 'dead';
  stateT = 0;
  setHold(false);
  resetRunUi();
  shake = 0.4;
  lockedUntil = performance.now() + 500;
  stats.deaths++;
  emit('died');
  checkMilestones();
  const bp = ball.mesh.position;
  burst(bp.x, bp.y, bp.z, 44, 0xff3b3b, 6, 7);
  SFX.die();
  SFX.fire(false);
  slowMo(0.3, 0.9);
  saveBest();
  saveStats();
  el.speed.style.opacity = 0;
  setMsg('OOPS!', auto ? `ATTEMPT ${attempt + 1} INCOMING...` : 'TAP TO RETRY', '', false);
  updateHud();
}

function levelComplete() {
  state = 'complete';
  stateT = 0;
  const finalCombo = combo;
  setHold(false);
  el.countdown.textContent = '';
  hideCombo(finalCombo >= 3 ? 1200 : 0);
  if (fire.active) extinguish();
  fire.charge = 0;
  lockedUntil = performance.now() + 500;
  const boss = isBoss(level);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    burst(Math.cos(a) * 1.4, baseTop + 0.4, Math.sin(a) * 1.4 + 0.4, 18, themeColors[i % themeColors.length], 5, 10);
  }
  spawnRing(0, baseTop + 0.03, BALL_Z, 0xffffff);
  SFX.levelComplete();
  flashScreen();
  bloomBoost = 0.9;

  stats.levels++;
  emit('level_clear', { first: attempt === 1 });
  stats.bestLevel = Math.max(stats.bestLevel, level + 1);
  const bonus = boss ? 10 : 2;
  addGems(bonus, false);
  missionAdd('levels');
  if (attempt === 1) missionAdd('clean');
  checkMilestones();
  saveBest();
  save('sb_level', level + 1);
  saveStats();
  setMsg(boss ? 'BOSS DEFEATED!' : `LEVEL ${level} CLEAR!`,
    `+${bonus} GEMS${attempt === 1 ? '  -  FIRST TRY!' : ''}`, auto ? '' : 'TAP TO CONTINUE', false);
  updateHud();
}

function updateBall(dt) {
  const smashing = holding && state === 'playing';
  if (smashing) ball.vy = -SMASH_V;
  else ball.vy -= GRAVITY * dt;

  let y = ball.mesh.position.y + ball.vy * dt;
  while (ball.vy < 0 && y - BALL_R <= topSurfaceY()) {
    const top = topSurfaceY();
    if (plates.length === 0) {
      y = top + BALL_R;
      doBounce(null);
      if (state === 'playing') levelComplete();
      break;
    }
    if (smashing) {
      const plate = plates[0];
      if (plate.black[segmentUnderBall(plate)] && !fire.active) {
        y = top + BALL_R;
        die();
        break;
      }
      smashPlate();
    } else {
      y = top + BALL_R;
      doBounce(plates[0]);
      break;
    }
  }
  ball.mesh.position.y = y;

  ball.squash = Math.max(0, ball.squash - dt * 6);
  const s = ball.squash;
  if (smashing) ball.mesh.scale.set(0.85, 1.2, 0.85);
  else ball.mesh.scale.set(1 + 0.3 * s, 1 - 0.35 * s, 1 + 0.3 * s);
}

function animateBall(dt) {
  if (!ball.body || !ball.type) return;
  const smashing = holding && state === 'playing';
  if (ball.type.spin) {
    ball.body.rotation.x += dt * ball.type.spin * (smashing ? 5 : 2);
    ball.body.rotation.y += dt * ball.type.spin * 0.6;
  } else {
    ball.body.rotation.y = Math.sin(clock * 3.2) * 0.4;
    ball.body.rotation.x = Math.sin(clock * 2.3) * 0.15 + (smashing ? 0.25 : 0);
  }
}

function updateGlow() {
  const on = fire.active && state === 'playing';
  glow.visible = on;
  if (on) {
    glow.position.copy(ball.mesh.position);
    glow.scale.setScalar(2.6 + Math.sin(clock * 18) * 0.25);
  }
}

function updateFire(dt) {
  if (fire.active) {
    fire.charge -= dt * 0.3;
    if (fire.charge <= 0) {
      fire.charge = 0;
      extinguish();
    }
  } else if (!holding || state !== 'playing') {
    fire.charge = Math.max(0, fire.charge - dt * 0.45);
  }
  el.fireFill.style.height = fire.charge * 100 + '%';
  el.fireMeter.classList.toggle('active', fire.active);
}

function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.t += dt;
    d.vel.y -= GRAVITY * 0.5 * dt;
    d.pivot.position.addScaledVector(d.vel, dt);
    d.pivot.rotation.x += d.spin.x * dt;
    d.pivot.rotation.y += d.spin.y * dt;
    d.pivot.rotation.z += d.spin.z * dt;
    if (d.t > 0.7) d.pivot.scale.setScalar(Math.max(0.001, 1 - (d.t - 0.7) / 0.4));
    if (d.t > 1.1) {
      scene.remove(d.pivot);
      debris.splice(i, 1);
    }
  }
}

function updateTrail(dt) {
  const streak = state === 'playing' && (fire.active || (holding && combo >= 4));
  if (streak) {
    trailTimer += dt;
    const col = fire.active ? 0xffa21f : ball.trail;
    while (trailTimer > 0.016) {
      trailTimer -= 0.016;
      const t = trail[trailIdx];
      trailIdx = (trailIdx + 1) % trail.length;
      t.life = 0.35;
      t.mesh.material.color.setHex(col);
      t.mesh.position.set(
        ball.mesh.position.x + (Math.random() - 0.5) * 0.15,
        ball.mesh.position.y + 0.1,
        ball.mesh.position.z + (Math.random() - 0.5) * 0.15
      );
    }
  }
  for (const t of trail) {
    if (t.life <= 0) { t.mesh.visible = false; continue; }
    t.life -= dt;
    const k = Math.max(0, t.life / 0.35);
    t.mesh.visible = k > 0;
    t.mesh.scale.setScalar(k);
    t.mesh.material.opacity = k;
    t.mesh.position.y += dt * 1.5;
  }
}

function updateCamera(dt, rdt) {
  camY += (topSurfaceY() - camY) * Math.min(1, rdt * 5);
  let sx = 0;
  let sy = 0;
  if (shake > 0) {
    shake -= rdt;
    sx = (Math.random() - 0.5) * 0.3;
    sy = (Math.random() - 0.5) * 0.3;
  }
  const sway = Math.sin(clock * 0.7) * 0.35;
  camera.position.set(sway + sx, camY + 4.8 + sy, camDist);
  camera.lookAt(0, camY - 0.7, 0);

  const targetFov = BASE_FOV + (holding && state === 'playing' ? (fire.active ? 9 : 5) : 0);
  camera.fov += (targetFov - camera.fov) * Math.min(1, rdt * 6);
  camera.updateProjectionMatrix();

  sun.position.set(4, camY + 10, 7);
  sun.target.position.set(0, camY, 0);
}

// ---------- autoplay bot ----------
const botState = { plate: null, blunder: false };

function blackAtAngle(plate, a) {
  a %= TAU;
  if (a < 0) a += TAU;
  return plate.black[Math.floor(a / SECTOR) % SEGMENTS];
}

// Chance per dangerous plate that the bot blunders and smashes straight into black (0 on the first levels).
function blunderChance() {
  return Math.min(0.035, Math.max(0, (level - 3) * 0.006)) + (isBoss(level) ? 0.01 : 0);
}

// Starts a smash only while the ball is falling (never mid-rise, which looked like stutter), and only when
// the next 3 plates will be safe at the moment the ball actually reaches each of them.
function botWantsHold() {
  if (fire.active) return true;
  if (!plates.length) return false;
  const canStart = holding || ball.vy <= 0.5;
  const gap = Math.max(0, ball.mesh.position.y - BALL_R - topSurfaceY());
  const stalled = stallT > 3;
  const K = Math.min(stalled ? 1 : 3, plates.length);
  const margin = stalled ? 0.06 : 0.14;
  let danger = false;
  let direct = false;
  for (let j = 0; j < K; j++) {
    const p = plates[j];
    const t = gap / SMASH_V + j * (SPACING / SMASH_V) + 0.02;
    const a = localAngle(p) - (rotSpeed + p.spin) * t;
    if (blackAtAngle(p, a)) direct = true;
    if (blackAtAngle(p, a - margin) || blackAtAngle(p, a + margin)) danger = true;
  }
  if (!danger && !direct) {
    botState.plate = null;
    return canStart;
  }
  if (botState.plate !== plates[0]) {
    botState.plate = plates[0];
    botState.blunder = Math.random() < blunderChance();
  }
  return canStart && direct && botState.blunder;
}

// ---------- flow ----------
function enterMenu(quick) {
  state = 'menu';
  stateT = 0;
  introT = 0;
  quickIntro = quick;
  shownCount = 0;
  el.countdown.textContent = '';
  const boss = isBoss(level);
  setMsg(boss ? `BOSS LEVEL ${level}` : `LEVEL ${level}`,
    quick ? `ATTEMPT ${attempt}  -  ${levelTag(level)}` : levelTag(level),
    auto ? '' : 'TAP TO PLAY', boss);
  if (boss && !quick) {
    SFX.boss();
    shake = 0.5;
    toast('BOSS LEVEL!', 'DENSE BLACK - FAST SPIN', 'boss');
  }
  emit('level_start', { boss, quick, ball: ball.type ? ball.type.nameHi : '' });
  updateHud();
  rotateCta();
}

function startRun() {
  state = 'playing';
  stateT = 0;
  setMsg('', '', '', false);
  showCountdown('SMASH!');
  setTimeout(() => { if (state === 'playing') el.countdown.textContent = ''; }, 800);
  SFX.countdown(0);
  SFX.resume();
}

function showCountdown(text) {
  el.countdown.textContent = text;
  retrigger(el.countdown, 'go');
}

function advanceLevel() {
  if (fadeBusy) return;
  level++;
  attempt = 1;
  fadeThen(() => {
    buildLevel();
    enterMenu(false);
  });
}

function retryLevel() {
  attempt++;
  score = levelStartScore;
  buildLevel();
  enterMenu(true);
}

function updateFlow(rdt) {
  if (state === 'menu') {
    if (!auto) return;
    introT += rdt;
    const startAt = quickIntro ? 2.0 : 3.4;
    const left = startAt - introT;
    if (left <= 0) { startRun(); return; }
    const n = left <= 1.8 ? Math.ceil(left / 0.6) : 0;
    if (n > 0 && n !== shownCount) {
      shownCount = n;
      showCountdown(String(n));
      SFX.countdown(n);
    }
  } else if (state === 'dead') {
    stateT += rdt;
    if (auto && stateT > 1.8) retryLevel();
  } else if (state === 'complete') {
    stateT += rdt;
    if (auto && stateT > 3.6) advanceLevel();
  }
}

// ---------- input ----------
function press() {
  SFX.resume();
  if (auto) return;
  if (state === 'menu') {
    startRun();
    setHold(true);
    return;
  }
  if (state === 'playing') {
    setHold(true);
    return;
  }
  if (performance.now() < lockedUntil) return;
  if (state === 'dead') retryLevel();
  else if (state === 'complete') advanceLevel();
}

function release() {
  if (!auto) setHold(false);
}

function toggleAuto() {
  auto = !auto;
  el.badge.textContent = auto ? 'AUTO' : 'MANUAL';
  setHold(false);
  if (state === 'menu') {
    el.bottom.textContent = auto ? '' : 'TAP TO PLAY';
    if (!auto) { el.countdown.textContent = ''; introT = 0; shownCount = 0; }
  }
}

el.stage.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
window.addEventListener('blur', release);
window.addEventListener('contextmenu', (e) => e.preventDefault());
el.badge.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); SFX.resume(); toggleAuto(); });
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); press(); }
  else if (e.code === 'KeyA') { SFX.resume(); toggleAuto(); }
  else if (e.code === 'KeyM') { SFX.resume(); SFX.toggleMusic(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') release();
});

// ---------- loop ----------
function resize() {
  const w = el.stage.clientWidth || 360;
  const stageH = el.stage.clientHeight || 640;
  const h = stageH - (live ? w * TOP_FRAC + (stageH * BLANK_PCT) / 100 : 0); // live: top band + bottom feed are cut off the game
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const halfV = THREE.MathUtils.degToRad(BASE_FOV / 2);
  camDist = Math.max(8.5, 3.4 / (Math.tan(halfV) * camera.aspect));
  if (scene.fog) {
    scene.fog.near = camDist + 6;
    scene.fog.far = camDist + 26;
  }
  if (!composer && quality === 0) initComposer(w, h);
  if (composer) composer.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}
window.addEventListener('resize', resize);

// Automatic quality drop on slower GPUs: 1 = no bloom + 1x pixels, 2 = also no shadows.
function setQuality(q) {
  quality = q;
  perfFrames = 0;
  perfAvg = 16.7;
  if (q >= 1) {
    composer = null;
    bloomPass = null;
    renderer.setPixelRatio(1);
    resize();
  }
  if (q >= 2) sun.castShadow = false;
}

let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const rawMs = Math.min(now - last, 100);
  const rdt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  clock += rdt;
  perfAvg += (rawMs - perfAvg) * 0.04;
  if (++perfFrames > 150 && perfAvg > 27 && quality < 2) setQuality(quality + 1);

  if (slowT > 0) {
    slowT -= rdt;
    if (slowT <= 0) timeScale = 1;
  }
  let dt = rdt * timeScale;
  if (freezeT > 0) {
    freezeT -= rdt;
    dt = 0;
  }

  updateFlow(rdt);
  if (state === 'playing') stallT += rdt;
  if (auto && state === 'playing') setHold(botWantsHold());
  if (gemChainT > 0) { gemChainT -= rdt; if (gemChainT <= 0) gemChain = 0; }

  tower.rotation.y += rotSpeed * dt;
  for (const p of plates) if (p.spin) p.group.rotation.y += p.spin * dt;
  for (let i = 0; i < 3 && i < plates.length; i++) {
    const p = plates[i];
    if (p.dip > 0) {
      p.dip = Math.max(0, p.dip - rdt * 4);
      p.group.position.y = p.baseY - Math.sin(p.dip * Math.PI) * 0.06;
    }
  }
  for (let i = 0; i < plates.length && i < 26; i++) {
    const g = plates[i].gem;
    if (g) g.mesh.rotation.y += rdt * 2.2;
  }

  if (state !== 'dead') updateBall(dt);
  animateBall(rdt);
  updateFire(dt);
  updateDebris(dt);
  updateTrail(dt);
  updateSparks(dt);
  updateRings(dt);
  updateCamera(dt, rdt);
  updateDust(rdt);
  updateGlow();
  updateBokeh(rdt);
  updateStreak(rdt);

  bloomBoost = Math.max(0, bloomBoost - rdt * 1.4);
  if (bloomPass) bloomPass.strength = 0.4 + bloomBoost + (fire.active ? 0.25 : 0);
  SFX.setIntensity(fire.active ? 1 : Math.min(1, combo / 25));

  if (composer) composer.render(rdt);
  else renderer.render(scene, camera);
}

// A supporter's name is on screen: celebrate in the game world too (confetti + chime).
window.addEventListener('live-fx', (e) => {
  const tier = (e.detail && e.detail.tier) || 1;
  SFX.mission();
  flashScreen();
  bloomBoost = 0.5 + tier * 0.1;
  for (let i = 0; i < 2 + tier * 2; i++) {
    const a = Math.random() * TAU;
    burst(Math.cos(a) * 1.8, camY + 1.2, Math.sin(a) * 1.8 + 0.4, 16, themeColors[i % themeColors.length], 5, 9);
  }
});

// Live commentary feed: what is happening right now, every 4s (level, plates left, combo, fireball, ball).
setInterval(() => {
  if (!live) return;
  emit('status', { state, progress: totalPlates ? broken / totalPlates : 0, left: plates.length, combo, fire: fire.active, ball: ball.type ? ball.type.nameHi : '', fps: Math.round(1000 / perfAvg), quality });
}, 4000);

// ---------- boot ----------
['pointerdown', 'keydown', 'touchstart', 'click'].forEach((ev) =>
  window.addEventListener(ev, () => SFX.resume(), { passive: true }));
SFX.init();
if (live) SFX.setMaster(0.45); // the host's voice must stay clearly on top of the game
if (!musicWanted) SFX.setMusic(false);
el.badge.textContent = auto ? 'AUTO' : 'MANUAL';
resize();
buildLevel();
updateMissionHud(false);
updateSkinHud();
rotateCta();
enterMenu(false);
requestAnimationFrame(tick);
