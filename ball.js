'use strict';

// Procedural ball types: the ball changes every level (fruit, sports balls, eye, planet, donut, play / like / bell icons, bomb for bosses).
// Each builder returns { obj, spin, trail }: spin > 0 rolls the ball, spin = 0 gently wobbles a face-on object.
(function () {
  const TAU = Math.PI * 2;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function tex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ roughness: 0.28, metalness: 0.04, clearcoat: 0.7, clearcoatRoughness: 0.18 }, o));
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.4, metalness: 0.05 }, o));
  const part = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  const sphere = (r, mat) => part(new THREE.SphereGeometry(r, 40, 28), mat);

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function rrShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function strawberry(R) {
    const g = new THREE.Group();
    const map = tex(512, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#ff4a5c');
      gr.addColorStop(1, '#c4112c');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffe58a';
      for (let i = 0; i < 90; i++) { c.beginPath(); c.ellipse(rnd() * w, h * 0.1 + rnd() * h * 0.82, 4, 7, 0, 0, TAU); c.fill(); }
    });
    const body = sphere(R, phys({ map }));
    body.scale.set(1, 1.12, 1);
    g.add(body);
    const leafMat = std({ color: 0x2fa84f });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const leaf = part(new THREE.ConeGeometry(R * 0.16, R * 0.5, 6), leafMat);
      leaf.position.set(Math.sin(a) * R * 0.32, R * 1.08, Math.cos(a) * R * 0.32);
      leaf.rotation.set(Math.cos(a) * 1.15, 0, -Math.sin(a) * 1.15);
      g.add(leaf);
    }
    return { obj: g, spin: 1.2, trail: 0xff4a5c };
  }

  function watermelon(R) {
    const map = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#43c452';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d7a30';
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x0 = (i / n) * w;
        c.beginPath();
        for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y * 0.08 + i) * 8; if (y === 0) c.moveTo(x, y); else c.lineTo(x, y); }
        for (let y = h; y >= 0; y -= 8) c.lineTo(x0 + Math.sin(y * 0.08 + i) * 8 + (w / n) * 0.5, y);
        c.closePath();
        c.fill();
      }
    });
    return { obj: sphere(R, phys({ map })), spin: 1.4, trail: 0x43c452 };
  }

  function orange(R) {
    const g = new THREE.Group();
    const map = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#ff8a1c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e27300';
      for (let i = 0; i < 420; i++) { c.beginPath(); c.arc(rnd() * w, rnd() * h, 2.4, 0, TAU); c.fill(); }
    });
    g.add(sphere(R, phys({ map, roughness: 0.5, clearcoat: 0.3 })));
    const leaf = sphere(R * 0.3, std({ color: 0x2fa84f }));
    leaf.scale.set(1.5, 0.35, 0.8);
    leaf.position.set(R * 0.22, R * 0.98, 0);
    leaf.rotation.z = 0.35;
    g.add(leaf);
    return { obj: g, spin: 1.3, trail: 0xff9a2e };
  }

  function basketball(R) {
    const map = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#e9782b';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 9;
      c.beginPath();
      c.moveTo(0, h / 2); c.lineTo(w, h / 2);
      c.moveTo(0, 0); c.lineTo(0, h);
      c.moveTo(w / 2, 0); c.lineTo(w / 2, h);
      c.moveTo(w * 0.25, 0); c.bezierCurveTo(w * 0.25 - 50, h * 0.3, w * 0.25 + 50, h * 0.7, w * 0.25, h);
      c.moveTo(w * 0.75, 0); c.bezierCurveTo(w * 0.75 + 50, h * 0.3, w * 0.75 - 50, h * 0.7, w * 0.75, h);
      c.stroke();
    });
    return { obj: sphere(R, phys({ map, roughness: 0.6, clearcoat: 0.15 })), spin: 1.5, trail: 0xff8a3a };
  }

  function tennis(R) {
    const map = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#cfe83a';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 15;
      for (let k = 0; k < 2; k++) {
        c.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = h * 0.5 + Math.sin((x / w) * TAU + k * Math.PI) * h * 0.3;
          if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
    });
    return { obj: sphere(R, phys({ map, roughness: 0.8, clearcoat: 0 })), spin: 1.6, trail: 0xcfe83a };
  }

  function eyeball(R) {
    const g = new THREE.Group();
    const map = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#fbfbfb';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(220,60,60,0.35)';
      c.lineWidth = 2;
      for (let i = 0; i < 40; i++) { c.beginPath(); const x = rnd() * w; const y = rnd() * h; c.moveTo(x, y); c.quadraticCurveTo(x + 20 * (rnd() - 0.5), y + 30, x + 40 * (rnd() - 0.5), y + 60); c.stroke(); }
    });
    g.add(sphere(R, phys({ map, clearcoat: 1, clearcoatRoughness: 0.05 })));
    const cap = (r, th, mat) => { const m = part(new THREE.SphereGeometry(r, 40, 14, 0, TAU, 0, th), mat); m.rotation.x = Math.PI / 2; return m; };
    g.add(cap(R * 1.004, 0.66, std({ color: 0x2a86e0, roughness: 0.3 })));
    g.add(cap(R * 1.008, 0.3, std({ color: 0x050505, roughness: 0.2 })));
    const hl = sphere(R * 0.1, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(R * 0.2, R * 0.22, R * 0.93);
    g.add(hl);
    return { obj: g, spin: 0, trail: 0x6bb6ff };
  }

  function planet(R) {
    const g = new THREE.Group();
    const map = tex(512, 256, (c, w, h) => {
      const cols = ['#e8c28a', '#c99a5b', '#f0d7a8', '#b98048', '#e8c28a'];
      const bh = h / cols.length;
      cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * bh, w, bh + 1); });
    });
    g.add(sphere(R * 0.82, phys({ map, clearcoat: 0.2 })));
    const ring = part(new THREE.RingGeometry(R * 1.1, R * 1.55, 64), std({ color: 0xd9b98a, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    ring.rotation.set(Math.PI / 2 - 0.45, 0, 0.25);
    g.add(ring);
    return { obj: g, spin: 0, trail: 0xe8c28a };
  }

  function donut(R) {
    const g = new THREE.Group();
    const dough = part(new THREE.TorusGeometry(R * 0.66, R * 0.36, 24, 48), phys({ color: 0xc98b4a, roughness: 0.6, clearcoat: 0.1 }));
    const icing = part(new THREE.TorusGeometry(R * 0.66, R * 0.37, 24, 48), phys({ color: 0xff7fb0, roughness: 0.25, clearcoat: 1 }));
    icing.scale.z = 0.62;
    icing.position.z = R * 0.1;
    g.add(dough, icing);
    const cols = [0xffffff, 0xffe14a, 0x4ad0ff, 0x7dff6a];
    for (let i = 0; i < 16; i++) {
      const a = rnd() * TAU;
      const rr = R * (0.66 + (rnd() - 0.5) * 0.36);
      const s = part(new THREE.BoxGeometry(R * 0.2, R * 0.06, R * 0.06), std({ color: cols[i % cols.length] }));
      s.position.set(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.38);
      s.rotation.z = rnd() * TAU;
      g.add(s);
    }
    g.rotation.x = -0.35;
    return { obj: g, spin: 0, trail: 0xff7fb0 };
  }

  function playButton(R) {
    const g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(rrShape(R * 2.2, R * 1.55, R * 0.5), {
      depth: R * 0.35, bevelEnabled: true, bevelThickness: R * 0.08, bevelSize: R * 0.08, bevelSegments: 3, curveSegments: 10,
    });
    geo.translate(0, 0, -R * 0.175);
    g.add(part(geo, phys({ color: 0xff1f1f, roughness: 0.25, clearcoat: 1 })));
    const tri = new THREE.Shape();
    tri.moveTo(-R * 0.28, -R * 0.4);
    tri.lineTo(R * 0.5, 0);
    tri.lineTo(-R * 0.28, R * 0.4);
    tri.closePath();
    const t = part(new THREE.ExtrudeGeometry(tri, { depth: R * 0.06, bevelEnabled: false }), std({ color: 0xffffff, roughness: 0.3 }));
    t.position.z = R * 0.26;
    g.add(t);
    return { obj: g, spin: 0, trail: 0xff4040 };
  }

  function likeButton(R) {
    const g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(rrShape(R * 1.7, R * 1.7, R * 0.4), {
      depth: R * 0.35, bevelEnabled: true, bevelThickness: R * 0.08, bevelSize: R * 0.08, bevelSegments: 3, curveSegments: 10,
    });
    geo.translate(0, 0, -R * 0.175);
    g.add(part(geo, phys({ color: 0x2f7bff, roughness: 0.25, clearcoat: 1 })));
    const map = tex(256, 256, (c) => {
      c.fillStyle = '#fff';
      roundRect(c, 28, 118, 50, 110, 8); c.fill();
      roundRect(c, 88, 104, 140, 124, 18); c.fill();
      roundRect(c, 96, 36, 38, 86, 16); c.fill();
      c.strokeStyle = '#2f7bff';
      c.lineWidth = 6;
      c.beginPath();
      [136, 162, 188].forEach((y) => { c.moveTo(150, y); c.lineTo(222, y); });
      c.stroke();
    });
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.25, R * 1.25), new THREE.MeshBasicMaterial({ map, transparent: true }));
    icon.position.z = R * 0.275;
    g.add(icon);
    return { obj: g, spin: 0, trail: 0x4a9bff };
  }

  function bell(R) {
    const g = new THREE.Group();
    const pts = [[0.001, 0.95], [0.18, 0.92], [0.34, 0.8], [0.46, 0.5], [0.55, 0.1], [0.7, -0.05], [0.72, -0.12], [0.001, -0.12]]
      .map((p) => new THREE.Vector2(p[0] * R * 1.05, p[1] * R * 1.05));
    const body = part(new THREE.LatheGeometry(pts, 40), phys({ color: 0xffc83a, metalness: 0.85, roughness: 0.25, clearcoat: 0.3, side: THREE.DoubleSide }));
    body.position.y = -R * 0.3;
    g.add(body);
    const clap = sphere(R * 0.2, phys({ color: 0xffc83a, metalness: 0.85, roughness: 0.25 }));
    clap.position.y = -R * 0.5;
    g.add(clap);
    const top = part(new THREE.TorusGeometry(R * 0.14, R * 0.045, 8, 20), phys({ color: 0xffc83a, metalness: 0.85, roughness: 0.25 }));
    top.position.y = R * 0.76;
    g.add(top);
    const dot = sphere(R * 0.3, std({ color: 0xff2a2a, emissive: 0x801010, roughness: 0.3 }));
    dot.position.set(R * 0.62, R * 0.55, R * 0.3);
    g.add(dot);
    return { obj: g, spin: 0, trail: 0xffc83a };
  }

  function smiley(R) {
    const g = new THREE.Group();
    g.add(sphere(R, phys({ color: 0xffd23a, clearcoat: 1 })));
    const eyeMat = std({ color: 0x1a1a1a });
    [-1, 1].forEach((s) => {
      const e = sphere(R * 0.11, eyeMat);
      e.scale.y = 1.5;
      e.position.set(s * R * 0.3, R * 0.25, R * 0.9);
      g.add(e);
    });
    const smile = part(new THREE.TorusGeometry(R * 0.46, R * 0.06, 10, 28, Math.PI), eyeMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -R * 0.05, R * 0.88);
    g.add(smile);
    return { obj: g, spin: 0, trail: 0xffd23a };
  }

  function bomb(R) {
    const g = new THREE.Group();
    g.add(sphere(R, phys({ color: 0x1b1b22, metalness: 0.6, roughness: 0.3, clearcoat: 1 })));
    const cap = part(new THREE.CylinderGeometry(R * 0.28, R * 0.34, R * 0.26, 18), std({ color: 0x8a8f98, metalness: 0.8, roughness: 0.35 }));
    cap.position.y = R * 1.0;
    g.add(cap);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, R * 1.12, 0), new THREE.Vector3(R * 0.15, R * 1.4, 0), new THREE.Vector3(R * 0.38, R * 1.5, R * 0.05)]);
    g.add(part(new THREE.TubeGeometry(curve, 12, R * 0.045, 6), std({ color: 0x8a5a2a })));
    const spark = sphere(R * 0.13, new THREE.MeshBasicMaterial({ color: 0xffa000 }));
    spark.position.set(R * 0.4, R * 1.52, R * 0.05);
    g.add(spark);
    return { obj: g, spin: 0, trail: 0xff7a1a };
  }

  const TYPES = [
    { name: 'strawberry', nameHi: 'स्ट्रॉबेरी', build: strawberry },
    { name: 'basketball', nameHi: 'बास्केटबॉल', build: basketball },
    { name: 'watermelon', nameHi: 'तरबूज़', build: watermelon },
    { name: 'eyeball', nameHi: 'आँख', build: eyeball },
    { name: 'donut', nameHi: 'डोनट', build: donut },
    { name: 'orange', nameHi: 'संतरा', build: orange },
    { name: 'play', nameHi: 'प्ले बटन', build: playButton },
    { name: 'tennis', nameHi: 'टेनिस बॉल', build: tennis },
    { name: 'planet', nameHi: 'ग्रह', build: planet },
    { name: 'like', nameHi: 'लाइक बटन', build: likeButton },
    { name: 'smiley', nameHi: 'स्माइली', build: smiley },
    { name: 'bell', nameHi: 'सब्सक्राइब वाली घंटी', build: bell },
  ];
  const BOMB = { name: 'bomb', nameHi: 'बम', build: bomb };

  window.BALL_TYPES = TYPES;
  window.ballTypeFor = (level) => (level % 5 === 0 ? BOMB : TYPES[(level - 1) % TYPES.length]);
  window.collectBallMats = (obj) => {
    const set = new Set();
    obj.traverse((o) => { if (o.material) set.add(o.material); });
    const arr = [...set];
    arr.forEach((m) => {
      m.userData.baseColor = m.color ? m.color.clone() : null;
      m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
    });
    return arr;
  };
  window.disposeObj = (obj) => obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
  });
})();
