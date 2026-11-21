/**
 * CapSpin: the blue "Analytics" dad cap as a slowly rotating, realistically shaded 3D object.
 * Modelled in code with three.js (loaded on demand from cdnjs): a six-panel crown with a taller
 * front, panel seams with stitching, eyelets, a covered button, raised satin-stitch embroidery,
 * a curved brim with thickness and stitch rows, a dark lining, and the back opening with its strap.
 * Cotton twill comes from a generated weave texture used as colour variation and bump.
 * Drag to spin. Pauses off screen; holds a still three-quarter view for reduced motion.
 */
const CAP_BLUE = '#3546BC';
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!window.__threeLoading) {
    window.__threeLoading = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = THREE_URL; s.async = true;
      s.onload = () => ok(window.THREE); s.onerror = no; document.head.appendChild(s);
    });
  }
  return window.__threeLoading;
}

// cotton twill: fine diagonal ribs plus a little noise; used as colour variation and as bump
function twill(THREE, repeatX, repeatY) {
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), id = g.createImageData(n, n), d = id.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const rib = Math.sin(((x + y) / 4) * Math.PI) * 0.5 + 0.5;          // diagonal rib, 8px period
    const cross = Math.sin(((x - y) / 2) * Math.PI) * 0.5 + 0.5;         // faint cross thread
    const v = 205 + rib * 34 + cross * 8 + (Math.random() - 0.5) * 14;
    const i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.anisotropy = 8;
  return t;
}

function buildCap(THREE, word) {
  const cap = new THREE.Group();
  const blue = new THREE.Color(CAP_BLUE).convertSRGBToLinear();
  const SZ = 1.08, FRONT = Math.PI / 2, BACK = (3 * Math.PI) / 2;
  const weave = twill(THREE, 26, 9), weaveBump = twill(THREE, 26, 9);
  weave.encoding = THREE.sRGBEncoding;
  const cloth = new THREE.MeshStandardMaterial({ color: blue, map: weave, bumpMap: weaveBump, bumpScale: 0.006, roughness: 0.94, metalness: 0, side: THREE.DoubleSide });
  const lining = new THREE.MeshStandardMaterial({ color: blue.clone().multiplyScalar(0.32), roughness: 1, side: THREE.DoubleSide });
  const thread = new THREE.LineDashedMaterial({ color: new THREE.Color('#6F7FE6').convertSRGBToLinear(), dashSize: 0.022, gapSize: 0.016 });
  const seamMat = new THREE.LineBasicMaterial({ color: blue.clone().multiplyScalar(0.55) });

  // crown surface: phi runs around (front = +z), th from the button (0) down to the base (PI/2)
  const P = (phi, th, k) => {
    const s = Math.sin(th), c = Math.cos(th), f = (1 + Math.sin(phi)) / 2;      // f: 1 at the front, 0 at the back
    const rad = Math.pow(s, 0.8 - 0.22 * f * s);                                // front panels stand more upright (fades out toward the button)
    const puff = 1 + 0.016 * Math.abs(Math.sin(3 * (phi - FRONT))) * s;          // panels belly out between seams
    const H = 0.845 + 0.065 * (2 * f - 1) * s;                                  // taller at the front; one height at the button
    const kk = k || 1;
    return new THREE.Vector3(-Math.cos(phi) * rad * puff * kk, Math.pow(c, 0.95) * H * kk, Math.sin(phi) * rad * puff * SZ * kk);
  };
  // back opening: an arch cut out of the two back panels
  const ARCH_W = 0.37, ARCH_H = 0.44;
  const inArch = (phi, th) => { let dd = phi - BACK; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; if (Math.abs(dd) >= ARCH_W) return false; return th > Math.PI / 2 - ARCH_H * Math.sqrt(1 - (dd / ARCH_W) * (dd / ARCH_W)); };

  const NU = 144, NV = 44, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const phi = (i / NU) * Math.PI * 2, th = (j / NV) * (Math.PI / 2), p = P(phi, th);
    pos.push(p.x, p.y, p.z); uv.push(i / NU, j / NV);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const phi = ((i + 0.5) / NU) * Math.PI * 2, th = ((j + 0.5) / NV) * (Math.PI / 2);
    if (inArch(phi, th)) continue;
    const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d2 = c + 1; idx.push(a, c, b, b, c, d2);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  cg.setIndex(idx); cg.computeVertexNormals();
  const crown = new THREE.Mesh(cg, cloth); crown.castShadow = true; cap.add(crown);
  const liner = new THREE.Mesh(cg, lining); liner.scale.setScalar(0.988); cap.add(liner);

  const line = (pts, mat) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); if (mat.isLineDashedMaterial) l.computeLineDistances(); cap.add(l); return l; };
  // six seams, each with a row of stitching either side
  for (let k = 0; k < 6; k++) {
    const phi = FRONT + (k * Math.PI) / 3;
    for (const [off, mat] of [[0, seamMat], [-0.034, thread], [0.034, thread]]) {
      const pts = [];
      for (let i = 2; i <= 40; i++) { const th = (i / 40) * (Math.PI / 2); if (inArch(phi + off, th)) break; pts.push(P(phi + off, th, 1.004)); }
      line(pts, mat);
    }
  }
  // eyelets: a stitched ring and a dark hole in the middle of each panel
  const ringMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5565D6').convertSRGBToLinear(), roughness: 0.8 });
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x0b0f2a });
  for (let k = 0; k < 6; k++) {
    const phi = FRONT + Math.PI / 6 + (k * Math.PI) / 3, p = P(phi, 0.6, 1.003), out = P(phi, 0.6, 2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 20), ringMat); ring.position.copy(p); ring.lookAt(out); cap.add(ring);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), holeMat); hole.position.copy(p); hole.lookAt(out); cap.add(hole);
  }
  // covered button
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 14), cloth); button.scale.y = 0.5; button.position.y = P(0, 0).y + 0.012; button.castShadow = true; cap.add(button);

  // back strap across the opening, and the binding around the arch
  const sp = [], si = [];
  for (let i = 0; i <= 24; i++) { const phi = BACK - ARCH_W - 0.06 + (i / 24) * (2 * ARCH_W + 0.12); for (const th of [Math.PI / 2 - 0.085, Math.PI / 2]) { const p = P(phi, th, 0.992); sp.push(p.x, p.y, p.z); } }
  for (let i = 0; i < 24; i++) { const a = i * 2; si.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sgeo.setIndex(si); sgeo.computeVertexNormals();
  cap.add(new THREE.Mesh(sgeo, new THREE.MeshStandardMaterial({ color: blue.clone().multiplyScalar(0.8), roughness: 0.9, side: THREE.DoubleSide })));
  const archPts = []; for (let i = 0; i <= 40; i++) { const dd = -ARCH_W + (i / 40) * 2 * ARCH_W; archPts.push(P(BACK + dd, Math.PI / 2 - ARCH_H * Math.sqrt(Math.max(0, 1 - (dd / ARCH_W) * (dd / ARCH_W))), 1.004)); }
  // bound edge around the opening (also hides the mesh's stepped cut)
  const binding = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 64, 0.02, 8, false), cloth); binding.castShadow = true; cap.add(binding);
  // small metal slider on the strap
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.012), new THREE.MeshStandardMaterial({ color: 0xb9b9b4, metalness: 0.9, roughness: 0.35 }));
  buckle.position.copy(P(BACK, Math.PI / 2 - 0.042, 1.0)); buckle.lookAt(P(BACK, Math.PI / 2 - 0.042, 2)); cap.add(buckle);

  // embroidered wordmark: satin-stitch texture + raised bump, wrapped on the front panels
  const TW = 1024, TH = 384, mk = () => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; };
  const tc = mk(), tg = tc.getContext('2d'), font = '600 188px Georgia, "Times New Roman", serif';
  tg.font = font; tg.textAlign = 'center'; tg.textBaseline = 'middle';
  tg.fillStyle = 'rgba(8,12,50,0.4)'; tg.fillText(word, 515, 199);            // thread shadow on the cloth
  tg.fillStyle = '#F4F2EC'; tg.fillText(word, 512, 192);
  tg.globalCompositeOperation = 'source-atop'; tg.lineWidth = 1.2;             // satin stitch: fine slanted threads
  for (let x = -TH; x < TW; x += 5) { tg.strokeStyle = (x / 5) % 2 ? 'rgba(120,120,135,0.33)' : 'rgba(255,255,255,0.5)'; tg.beginPath(); tg.moveTo(x, TH); tg.lineTo(x + TH * 0.35, 0); tg.stroke(); }
  const bc = mk(), bgx = bc.getContext('2d'); bgx.fillStyle = '#000'; bgx.fillRect(0, 0, TW, TH);
  bgx.filter = 'blur(3px)'; bgx.font = font; bgx.textAlign = 'center'; bgx.textBaseline = 'middle'; bgx.fillStyle = '#fff'; bgx.fillText(word, 512, 192);
  const ttex = new THREE.CanvasTexture(tc); ttex.anisotropy = 8; ttex.encoding = THREE.sRGBEncoding;
  const spread = 1.04, th0 = 0.93, th1 = 1.36, LU = 48, LV = 14, lp = [], lu = [], li = [];
  for (let j = 0; j <= LV; j++) for (let i = 0; i <= LU; i++) { const p = P(FRONT - spread / 2 + (i / LU) * spread, th0 + (j / LV) * (th1 - th0), 1.006); lp.push(p.x, p.y, p.z); lu.push(i / LU, 1 - j / LV); }
  for (let j = 0; j < LV; j++) for (let i = 0; i < LU; i++) { const a = j * (LU + 1) + i, b = a + 1, c = a + LU + 1, d2 = c + 1; li.push(a, c, b, b, c, d2); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(lu, 2)); lg.setIndex(li); lg.computeVertexNormals();
  cap.add(new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ map: ttex, bumpMap: new THREE.CanvasTexture(bc), bumpScale: 0.03, transparent: true, roughness: 0.55, depthWrite: false, side: THREE.DoubleSide })));

  // brim: curved, with thickness, an edge and four rows of stitching
  const A = 0.98, NA = 64, NR = 14, TK = 0.04;
  const B = (a, t, under) => { const sx = Math.sin(a), cz = Math.cos(a), reach = 0.64 * Math.pow(Math.cos((a / A) * (Math.PI / 2)), 0.5);
    return new THREE.Vector3(sx * (0.985 + reach * t), 0.035 - 0.11 * t - 0.13 * sx * sx * (0.35 + 0.65 * t) - (under ? TK : 0), cz * (0.985 * SZ + reach * t)); };
  const bp = [], bu = [], bi = [];
  const grid = (under) => { const base = bp.length / 3;
    for (let i = 0; i <= NA; i++) for (let j = 0; j <= NR; j++) { const p = B(-A + (2 * A * i) / NA, j / NR, under); bp.push(p.x, p.y, p.z); bu.push(p.x * 4, p.z * 4); }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) { const a = base + i * (NR + 1) + j, b = a + 1, c = a + NR + 1, d2 = c + 1; under ? bi.push(a, c, b, b, c, d2) : bi.push(a, b, c, b, d2, c); } };
  grid(false); grid(true);
  const eb = bp.length / 3;                                                       // front edge joining top and underside
  for (let i = 0; i <= NA; i++) { const a = -A + (2 * A * i) / NA; for (const u of [false, true]) { const p = B(a, 1, u); bp.push(p.x, p.y, p.z); bu.push(p.x * 4, p.z * 4); } }
  for (let i = 0; i < NA; i++) { const a = eb + i * 2; bi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const bgeo = new THREE.BufferGeometry(); bgeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bgeo.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bgeo.setIndex(bi); bgeo.computeVertexNormals();
  const brimWeave = twill(THREE, 1, 1), brimBump = twill(THREE, 1, 1); brimWeave.encoding = THREE.sRGBEncoding;
  const brim = new THREE.Mesh(bgeo, new THREE.MeshStandardMaterial({ color: blue, map: brimWeave, bumpMap: brimBump, bumpScale: 0.006, roughness: 0.94, side: THREE.DoubleSide }));
  brim.castShadow = true; cap.add(brim);
  for (const t of [0.3, 0.5, 0.7, 0.9]) { const pts = []; for (let i = 2; i <= NA - 2; i++) { const p = B(-A + (2 * A * i) / NA, t, false); p.y += 0.004; pts.push(p); } line(pts, thread); }

  return cap;
}

function CapSpin(props) {
  const host = React.useRef(null);
  const word = props.word || 'Analytics';
  React.useEffect(() => {
    const el = host.current; if (!el) return;
    let dead = false, cleanup = () => {};
    loadThree().then((THREE) => {
      if (dead) return;
      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const cvs = renderer.domElement;
      cvs.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;touch-action:pan-y;';
      el.appendChild(cvs);

      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
      cam.position.set(0, 2.25, 7.4); cam.lookAt(0, 0.2, 0);
      // studio-style light: soft sky/ground bounce (the yellow floor bounces warm), a key with soft shadow, a cool rim
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9c8a2e, 0.55));
      const key = new THREE.DirectionalLight(0xfff6e8, 0.85); key.position.set(2.6, 4.6, 3.4); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 7; key.shadow.bias = -0.0006;
      Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 14 });
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xdfe6ff, 0.38); rim.position.set(-3.2, 2.2, -3); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffffff, 0.16); fill.position.set(-2.5, 1.2, 3); scene.add(fill);

      const cap = buildCap(THREE, word);
      cap.rotation.y = -0.6; scene.add(cap);

      // the floor only shows the cap's shadow
      const FLOOR = -0.21;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: 0x3a2c00, opacity: 0.3 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; scene.add(floor);
      const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sg = sc.getContext('2d');
      const rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(58,44,0,0.3)'); rg.addColorStop(1, 'rgba(58,44,0,0)');
      sg.fillStyle = rg; sg.fillRect(0, 0, 256, 256);
      const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
      contact.rotation.x = -Math.PI / 2; contact.position.set(0, FLOOR + 0.002, 0.15); scene.add(contact);

      const fit = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); renderer.render(scene, cam); };
      const ro = new ResizeObserver(fit); ro.observe(el); fit();

      // spin: steady turn, or follow a drag and coast back to the steady turn
      const BASE = 0.5; let vel = BASE, dragging = false, lastX = 0, raf = 0, prev = 0, visible = true;
      const frame = (now) => {
        raf = 0; const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0; prev = now;
        if (!dragging) { vel += (BASE - vel) * Math.min(1, dt * 1.6); cap.rotation.y += vel * dt; }
        renderer.render(scene, cam);
        if (visible && !still) raf = requestAnimationFrame(frame);
      };
      const start = () => { if (!raf && !still) { prev = 0; raf = requestAnimationFrame(frame); } };
      const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.05 });
      io.observe(el);
      const down = (e) => { dragging = true; lastX = e.clientX; cvs.setPointerCapture(e.pointerId); cvs.style.cursor = 'grabbing'; };
      const move = (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; cap.rotation.y += dx * 0.012; vel = dx * 0.6; if (still) renderer.render(scene, cam); };
      const up = () => { dragging = false; cvs.style.cursor = 'grab'; };
      cvs.addEventListener('pointerdown', down); cvs.addEventListener('pointermove', move); cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);

      cleanup = () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); renderer.dispose(); cvs.remove(); };
    }).catch((e) => { console.error('CapSpin', e); });
    return () => { dead = true; cleanup(); };
  }, [word]);
  return <div ref={host} role="img" aria-label={props.label || 'A blue cap embroidered with the word Analytics, slowly rotating'} style={{ width: '100%', height: '100%', ...(props.style || {}) }}></div>;
}

module.exports = { CapSpin };
