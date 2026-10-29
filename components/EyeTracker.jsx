/* Eye tracker — from Bencho (MIT, bencho.dev/licence).
   Ported from EyeTracker.tsx to plain JSX: types removed, React read
   from the global, exported via module.exports so a DC mounts it with
   <x-import component="EyeTracker" from="./components/EyeTracker.jsx">.

   Site additions, kept small: this project has no stylesheet, so the
   .eyt CSS lives below as style objects, and Bencho's tokens are
   mapped onto the component's own root (see EYT_ROOT). The frame it
   watches inside defaults to the link or [data-eyes-frame] it sits in
   (a home-page work card). `@keyframes pet-caret` is the one rule
   that can't be inline; it lives in the host page's <helmet>. */

/* ══ Eye tracker ═══════════════════════════════════════════
   A ball with two eyes that watches your cursor, wherever it is
   on the page.

   ── THE EYES ARE ON THE BALL, NOT IN FRONT OF IT ───────────
   The easy version slides two shapes toward the pointer, and it
   reads as stickers on a disc. Here each eye is a point on the
   sphere's surface: looking left turns the ball, so an eye
   travels along the curve, and the one heading for the rim
   moves less and narrows as it turns away from you while the
   other swings wide. That foreshortening is the whole trick —
   it is what makes a flat circle read as something round.

   One turn (yaw and pitch) is the state, sprung toward where
   the pointer is; both eyes are read off it, so they can never
   disagree. It relaxes back to facing you when the pointer
   leaves the window, and it blinks on its own now and then.

   Written straight to the DOM every frame, never through state:
   a pointer move is not a render. */

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled. */

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const eytStillness = () =>
  typeof window !== "undefined" &&
  !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const EYT_R = 50; /* the ball's radius, in the 100-unit viewBox */

/* ── the eyes: a style, and where they rest ─────────────────
   Every style is two rounded rectangles, the same size as each
   other — the difference between styles is only their width,
   height and corner — so they all ride the same sphere and
   blink the same way. Any difference in SIZE between the two is
   depth, worked out from the turn, never drawn in.

   The face goes where you are: straight on, centred and level
   when you are on top of it, and it comes back to centre when
   the pointer leaves the window. */
const EYT_STYLES = {
  Slant: { w: 9, h: 15, r: 4.5 },
  Dots: { w: 11, h: 11, r: 5.5 },
  Squares: { w: 12, h: 12, r: 3.5 },
};
/* half the gap between the eyes, as a fraction of the radius */
const EYT_GAP = 0.19;
/* how far a look to a corner tilts the pair, in degrees at the
   rim — a glance up and right leans them back, like the logo */
const EYT_TILT = 64;

const eytClamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ── it talks back when you poke it ─────────────────────────
   A press on the toy (never on the mark) opens a little chat
   bubble off its lower right, types one short line into it a
   letter at a time, holds it to be read, and folds it away.
   Never the same line twice running. */
const EYT_LINES = [
  "Hey, I see you.",
  "Boop.",
  "That tickles.",
  "Hi there!",
  "Stop poking me.",
  "I'm watching you.",
  "Again? Okay.",
  "You found me.",
];
const EYT_TINTS = ["#3b5bff", "#179c52", "#e0307f"];
const EYT_KEY_MS = 38;
const EYT_HOLD_MS = 1500;

/* ── the body, in three shapes ──────────────────────────────
   The eyes are worked out on a sphere whatever the body is, so
   the turn reads the same on all three; the body is only the
   outline they are clipped to. The cube is a soft square, the
   pill lies on its side — both keep the eyes' resting spot
   inside them. */
const EYT_SHAPES = {
  Ball: "M50 0 A50 50 0 1 1 49.99 0 Z",
  /* a smaller circle, the same area as the hexagon, for the mark
     that changes between the two */
  Circle: "M50 7 A43 43 0 1 1 49.99 7 Z",
  Cube: "M30 6 H70 A24 24 0 0 1 94 30 V70 A24 24 0 0 1 70 94 H30 A24 24 0 0 1 6 70 V30 A24 24 0 0 1 30 6 Z",
  Pill: "M34 17 H66 A33 33 0 0 1 66 83 H34 A33 33 0 0 1 34 17 Z",
  /* six sides with softened corners: stood on a point, and lying
     on a flat side */
  Hexagon: "M59.53 8.50 L81.18 21.00 Q90.70 26.50 90.70 37.50 L90.70 62.50 Q90.70 73.50 81.18 79.00 L59.53 91.50 Q50.00 97.00 40.47 91.50 L18.82 79.00 Q9.30 73.50 9.30 62.50 L9.30 37.50 Q9.30 26.50 18.82 21.00 L40.47 8.50 Q50.00 3.00 59.53 8.50 Z",
  "Hex flat": "M91.50 59.53 L79.00 81.18 Q73.50 90.70 62.50 90.70 L37.50 90.70 Q26.50 90.70 21.00 81.18 L8.50 59.53 Q3.00 50.00 8.50 40.47 L21.00 18.82 Q26.50 9.30 37.50 9.30 L62.50 9.30 Q73.50 9.30 79.00 18.82 L91.50 40.47 Q97.00 50.00 91.50 59.53 Z",
};

/* ── morphing between shapes ────────────────────────────────
   The shapes are written as different kinds of path — arcs for
   the ball and the pill, lines and curves for the hexagon — so
   they cannot be tweened as they are. Each is read instead as
   its distance from the centre at a set of evenly spaced angles
   (they are all star-shaped about the centre, so a ray from the
   middle crosses each edge once), and a morph is those distances
   eased from one set to the other and drawn back out as a path.
   Measured once per shape, off the browser's own hit-testing,
   and kept. */
const EYT_RAYS = 120;
const eytRadii = new Map();

function eytMeasure(shape) {
  const hit = eytRadii.get(shape);
  if (hit) return hit;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", EYT_SHAPES[shape] || EYT_SHAPES.Ball);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const pt = svg.createSVGPoint();
  const out = [];
  for (let i = 0; i < EYT_RAYS; i++) {
    const a = (i / EYT_RAYS) * Math.PI * 2 - Math.PI / 2;
    let lo = 0, hi = 60;
    for (let k = 0; k < 16; k++) {
      const mid = (lo + hi) / 2;
      pt.x = 50 + Math.cos(a) * mid;
      pt.y = 50 + Math.sin(a) * mid;
      if (path.isPointInFill(pt)) lo = mid; else hi = mid;
    }
    out.push(lo);
  }
  svg.remove();
  eytRadii.set(shape, out);
  return out;
}

function eytOutline(r) {
  let d = "";
  r.forEach((v, i) => {
    const a = (i / r.length) * Math.PI * 2 - Math.PI / 2;
    d += `${i ? "L" : "M"}${(50 + Math.cos(a) * v).toFixed(2)} ${(50 + Math.sin(a) * v).toFixed(2)}`;
  });
  return d + "Z";
}

/* ══ the .eyt CSS, as style objects ═════════════════════════
   Bencho's tokens map on the component's own root so nothing
   leaks out:
     --fill-slab → #F7F3F1, the site's cream surface (the ball)
     --fill-on   → #131313, the site's ink (the eyes)
     --card      → #F7F3F1, cream again (the caret's fallback)
     --font-ui   → 'Inter', the site's UI face
     --ink, --bg → only read by Bencho's .logo-test overrides,
                   which this site has no use for, so left out. */
const EYT_ROOT = {
  "--fill-slab": "#F7F3F1",
  "--fill-on": "#131313",
  "--card": "#F7F3F1",
  "--font-ui": "'Inter', sans-serif",
  position: "relative",
  display: "grid",
  placeItems: "center",
};
const EYT_BALL = { overflow: "visible", transformOrigin: "center", WebkitTapHighlightColor: "transparent" };
/* the ball is the Fill's own slab and the eyes its ink */
const EYT_BODY = { fill: "var(--fill-slab, #ffffff)" };
const EYT_EYE = { fill: "var(--fill-on, #0b0b0d)" };
/* the chat bubble off the lower right, its square corner
   pointing back at the face */
const eytSay = (size, on, tint) => ({
  position: "absolute",
  left: `calc(50% + ${size * 0.36}px)`,
  top: `calc(50% + ${size * 0.3}px)`,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  minHeight: 34,
  padding: "0 16px",
  borderRadius: "6px 14px 14px 14px",
  background: tint,
  boxShadow: "inset 0 -1.5px 0 rgba(0, 0, 0, 0.1)",
  color: "#ffffff",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  fontWeight: 400,
  whiteSpace: "nowrap",
  transformOrigin: "top left",
  opacity: on ? 1 : 0,
  scale: on ? "1" : "0.85",
  pointerEvents: "none",
  transition: "opacity 160ms ease, scale 220ms cubic-bezier(0.24, 1.34, 0.38, 1), background-color 220ms ease",
});
const EYT_CARET = { width: 1.5, height: 13, borderRadius: 1, background: "var(--fill-slab, var(--card))", animation: "pet-caret 1s steps(1) infinite" };


/* ══ site: the halftone body ════════════════════════════════
   The hero's AsciiWake, cut down to a small square: a grid of
   ink dots, odd rows shifted half a cell like a halftone screen,
   each dot smaller toward the outline so the edge softens. The
   pointer drops heat along its path; a warm cell trades its dot
   for a glyph off the same ramp, densest under the hand, and the
   trail cools back to dots. The loop parks once it is cold. */
const EYT_RAMP = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
const EYT_MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
function eytDots(c, S, corner, still, within, eyesAt) {
  if (!c) return { paint() {}, stop() {} };
  const ratio = Math.min(3, window.devicePixelRatio || 1);
  c.width = Math.round(S * ratio); c.height = Math.round(S * ratio);
  const g = c.getContext("2d");
  /* a finer screen than the hero, so an eye is several dots wide */
  const size = 4.5, cw = size * 0.62, ch = size * 0.82;
  const cols = Math.floor(S / cw), rows = Math.floor(S / ch);
  const ox = (S - cols * cw) / 2, oy = (S - rows * ch) / 2;
  const mask = new Float32Array(cols * rows), heat = new Float32Array(cols * rows);
  /* inside the rounded square, and how far in: full dots in the
     body, shrinking over the last few px to the edge */
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = ox + (i + 0.5 + (j & 1) * 0.5) * cw, y = oy + (j + 0.5) * ch;
    const qx = Math.max(0, Math.abs(x - S / 2) - (S / 2 - corner)), qy = Math.max(0, Math.abs(y - S / 2) - (S / 2 - corner));
    const inside = corner - Math.hypot(qx, qy) - Math.max(Math.abs(x - S / 2) - S / 2, Math.abs(y - S / 2) - S / 2, -corner) * 0;
    const edge = Math.min(inside, S / 2 - Math.abs(x - S / 2), S / 2 - Math.abs(y - S / 2));
    mask[j * cols + i] = edge <= 0 ? 0 : 0.35 + 0.65 * Math.min(1, edge / 6);
  }
  const top = EYT_RAMP.length - 1, rad = 16;
  let hx = -999, hy = -999, lx = NaN, ly = NaN, inside = false, near = 0, raf = 0, deal = 0, tick = 0;
  const hash = (k, n) => { let h = (k * 374761393 + n * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const stamp = (x, y) => {
    x -= ox; y -= oy;
    const c0 = Math.max(0, Math.floor((x - rad) / cw)), c1 = Math.min(cols - 1, Math.ceil((x + rad) / cw));
    const r0 = Math.max(0, Math.floor((y - rad) / ch)), r1 = Math.min(rows - 1, Math.ceil((y + rad) / ch));
    for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
      const dx = (i + 0.5) * cw - x, dy = (j + 0.5) * ch - y, q = (dx * dx + dy * dy) / (rad * rad);
      if (q >= 1) continue; const t = 1 - q, k = j * cols + i; heat[k] = Math.min(1, heat[k] + 0.5 * t * t);
    }
  };
  /* ── the eyes are printed in the screen, not laid over it ──
     A cell whose centre falls inside an eye's rounded rectangle
     (turned with the pair's tilt) prints as a full white dot, so the
     eyes read as part of the pattern and blink and foreshorten in
     dots. */
  const k100 = S / 100;
  const inEye = (x, y) => {
    const es = eyesAt.current;
    for (let n = 0; n < 2; n++) {
      const e = es[n]; if (!e || e.hide) continue;
      const dx = x - e.x * k100, dy = y - e.y * k100;
      const a = (-e.tilt * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const lx = Math.abs(dx * ca - dy * sa), ly = Math.abs(dx * sa + dy * ca);
      const w = (e.w * k100) / 2 + cw * 0.35, h = (e.h * k100) / 2 + ch * 0.35, r = Math.min(e.r * k100, w, h);
      if (lx > w || ly > h) continue;
      const qx = Math.max(0, lx - (w - r)), qy = Math.max(0, ly - (h - r));
      if (qx * qx + qy * qy <= r * r) return true;
    }
    return false;
  };
  const paint = () => {
    g.setTransform(ratio, 0, 0, ratio, 0, 0); g.clearRect(0, 0, S, S);
    const whites = [];
    g.fillStyle = "#131313"; g.font = "500 " + size + "px " + EYT_MONO; g.textAlign = "center"; g.textBaseline = "middle";
    const dot = Math.min(cw, ch) * 0.48;
    g.beginPath();
    for (let j = 0; j < rows; j++) {
      const y = oy + (j + 0.5) * ch;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i, m = mask[k]; if (m <= 0) continue;
        const x = ox + (i + 0.5 + (j & 1) * 0.5) * cw;
        if (inEye(x, y)) { whites.push(x, y); continue; }
        let h = heat[k];
        if (near > 0.002) { const q = ((x - hx) ** 2 + (y - hy) ** 2) / (rad * rad); if (q < 1) h = Math.max(h, 0.95 * near * (1 - q) * (1 - q)); }
        let u = Math.min(1, h) * top + 0.5;
        if (h > 0.04) u += (hash(k, deal) - 0.5) * 1.6 * Math.min(1, h * 2);
        const idx = Math.min(top, Math.max(1, Math.floor(u)));
        if (h <= 0.04 || idx === 1) { const r = Math.max(0.45, dot * Math.sqrt(m)); g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); continue; }
        g.fillText(EYT_RAMP[idx], x, y);
      }
    }
    g.fill();
    g.fillStyle = "#ffffff"; g.beginPath();
    const wd = Math.min(cw, ch) * 0.5;
    for (let n = 0; n < whites.length; n += 2) { g.moveTo(whites[n] + wd, whites[n + 1]); g.arc(whites[n], whites[n + 1], wd, 0, Math.PI * 2); }
    g.fill();
  };
  const run = () => {
    if (raf || still) { paint(); return; }
    let prev = performance.now();
    const step = (t) => {
      const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
      const keep = Math.exp(-dt * 3 / 1.2); let warm = 0;
      for (let k = 0; k < heat.length; k++) { const h = heat[k] * keep; heat[k] = h < 0.003 ? 0 : h; if (h > warm) warm = h; }
      near += ((inside ? 1 : 0) - near) * (1 - Math.pow(0.004, dt));
      tick += dt; if (tick > 0.07) { tick = 0; deal++; }
      paint();
      raf = !inside && warm === 0 && near < 0.004 ? 0 : requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  /* the wake follows the pointer anywhere in the card, so the
     trail runs off the square's edge as the hand crosses it */
  const frame = c.closest(within || "[data-eyes-frame], a") || c;
  const move = (e) => {
    const f = frame.getBoundingClientRect();
    const on = e.clientX >= f.left && e.clientX <= f.right && e.clientY >= f.top && e.clientY <= f.bottom;
    if (!on) { if (inside) { inside = false; lx = NaN; run(); } return; }
    const r = c.getBoundingClientRect(), k = r.width / S;
    const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    if (Number.isNaN(lx)) { lx = x; ly = y; }
    const n = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (rad / 3)));
    for (let q = 1; q <= n; q++) stamp(lx + (x - lx) * q / n, ly + (y - ly) * q / n);
    lx = x; ly = y; hx = x; hy = y; inside = true;
    run();
  };
  paint();
  window.addEventListener("pointermove", move, { passive: true });
  return { paint, stop() { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); } };
}

let eytSeq = 0;
/* the glass body for the shapes a CSS box can match: the cube spans
   6..94 of the viewBox with 24-unit corners, the circle 7..93 */
const EYT_GLASS = {
  Cube: { k: 0.88, r: "27.3%" },
  Ball: { k: 1, r: "50%" },
  Circle: { k: 0.86, r: "50%" },
};

function EyeTracker({
  /* how far the ball turns toward the pointer, 0..100 */
  follow = 60,
  /* how much the turn overshoots and settles, 0..100 */
  bounce = 30,
  size = 100,
  shape = "Cube",
  eyes: look = "Slant",
  /* the eyes' size against the body; a small mark wants them
     bigger than a big one does to read at all */
  eyeScale = 1,
  /* the eyes' width on its own, for a thinner or fuller stroke */
  eyeWidth = 1,
  /* how round the eyes' corners are, 1 fully round; below 1 they
     start to square off */
  eyeRound = 1,
  /* the eyes' height on its own */
  eyeHeight = 1,
  /* a mark rather than a toy: it ignores the pointer, looks
     straight ahead, glances somewhere every five seconds and
     blinks every two */
  idle = false,
  /* the box it watches inside, as a selector; left unset it is the
     card it sits in */
  within,
  /* site: a frosted body — the slab drawn as a cream glass behind
     the SVG (backdrop blur can't be applied to an SVG path), so the
     card image shows through. Matched to Cube, Ball and Circle. */
  glass = false,
  /* site: a corner radius in px — the body becomes a full-size
     square with that corner, overriding `shape`, so it can match
     the site's 4px buttons at any size */
  corner,
  /* site: draw the body as the hero graphic's halftone — ink dots
     that thicken into glyphs where the pointer drags a wake through
     them — with the eyes in white on top */
  dots = false,
} = {}) {
  const still = eytStillness();
  const box = React.useRef(null);
  const [typed, setTyped] = React.useState("");
  const [talking, setTalking] = React.useState(false);
  const [tint, setTint] = React.useState(EYT_TINTS[0]);
  const turn = React.useRef(0);
  const lastLine = React.useRef(-1);
  React.useEffect(() => () => { turn.current++; }, []);
  const poke = async () => {
    if (idle) return;
    const mine = ++turn.current;
    const pool = EYT_LINES.map((_, i) => i).filter((i) => i !== lastLine.current);
    const i = pool[Math.floor(Math.random() * pool.length)];
    lastLine.current = i;
    const line = EYT_LINES[i];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    setTint(EYT_TINTS[Math.floor(Math.random() * EYT_TINTS.length)]);
    setTyped("");
    setTalking(true);
    for (let k = 1; k <= line.length; k++) {
      await wait(EYT_KEY_MS + Math.random() * 30);
      if (mine !== turn.current) return;
      setTyped(line.slice(0, k));
    }
    await wait(EYT_HOLD_MS);
    if (mine !== turn.current) return;
    setTalking(false);
  };
  const eyes = React.useRef([]);
  const knobs = React.useRef({ follow, bounce, eyeScale });
  knobs.current = { follow, bounce, eyeScale };
  const base = EYT_STYLES[look] || EYT_STYLES.Slant;
  const eye = {
    w: base.w * eyeScale * eyeWidth,
    h: base.h * eyeScale * eyeHeight,
    r: base.r * eyeScale * eyeWidth * eyeRound,
  };
  const eyeNow = React.useRef(eye);
  /* site: where each eye is drawn this frame, for the halftone body */
  const eyesAt = React.useRef([null, null]);
  const dotsApi = React.useRef(null);
  eyeNow.current = eye;

  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    /* where the face is on the ball (fractions of the radius),
       its speed, and where it is heading — one spring on a point,
       read as a turn when the eyes are drawn */
    const t = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    let raf = 0;
    let prev = 0;
    let blink = 0;
    let nextBlink = performance.now() + 2200;

    const draw = (now) => {
      /* a blink is 160ms down and up, as a squash on each eye */
      let lid = 1;
      if (now > nextBlink) {
        blink = now;
        nextBlink = now + (idle ? 2000 : 2600 + Math.random() * 3200);
      }
      const since = now - blink;
      if (since < 160) lid = 1 - 0.9 * Math.sin((since / 160) * Math.PI);

      /* the turn that brings the front of the ball to the face's
         spot: yaw about the vertical, pitch about the horizontal */
      const as = (v) => Math.asin(eytClamp(v, -0.92, 0.92));
      const yaw = as(t.x);
      const pitch = -as(t.y);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      /* the pair leans with a diagonal look and stands level on
         the axes: up-right and down-left lean one way, the other
         two the other, nothing straight on */
      const tilt = EYT_TILT * t.x * t.y;
      /* bigger eyes stand a little further apart */
      const g0 = EYT_GAP * Math.max(1, knobs.current.eyeScale * 0.8);

      [-g0, g0].forEach((x0, i) => {
        const g = eyes.current[i];
        if (!g) return;
        /* the eye as a point on the unit sphere, either side of
           the front, turned with the ball */
        const z0 = Math.sqrt(1 - x0 * x0);
        const x1 = x0 * cy + z0 * sy;
        const z1 = -x0 * sy + z0 * cy;
        const y2 = -z1 * sp;
        const z2 = z1 * cp;
        /* depth: the eye nearer the rim is further from you, so it
           is smaller all over and narrower still across the turn */
        const near = eytClamp(z2, 0, 1);
        const k = 0.45 + 0.55 * near;
        const sx = k * (0.7 + 0.3 * near);
        /* ── the size is written as a size, never as a scale ──
           A scale stretches the corner with the shape: an eye
           narrowed for depth or squashed by a blink had elliptical
           corners, rounder on one side than the other. Writing the
           width and height directly keeps every corner the same
           radius, clamped so it never exceeds half a side. */
        const e0 = eyeNow.current;
        const w = e0.w * sx;
        const h = Math.max(0.6, e0.h * k * lid);
        const rect = g.firstElementChild;
        if (rect) {
          rect.setAttribute("x", (-w / 2).toFixed(2));
          rect.setAttribute("y", (-h / 2).toFixed(2));
          rect.setAttribute("width", w.toFixed(2));
          rect.setAttribute("height", h.toFixed(2));
          rect.setAttribute("rx", Math.min(e0.r, w / 2, h / 2).toFixed(2));
        }
        g.setAttribute(
          "transform",
          `translate(${(50 + x1 * EYT_R).toFixed(2)} ${(50 + y2 * EYT_R).toFixed(2)}) rotate(${tilt.toFixed(2)})`,
        );
        g.style.opacity = z2 < 0.05 ? "0" : "1";
        eyesAt.current[i] = { x: 50 + x1 * EYT_R, y: 50 + y2 * EYT_R, w, h, r: Math.min(e0.r, w / 2, h / 2), tilt, hide: z2 < 0.05 };
      });
      if (dotsApi.current) dotsApi.current.paint();
    };

    /* ── it only runs while it can be seen ───────────────────
       Off screen or in a background tab the loop stops; it starts
       again the moment the ball comes back into view */
    let seen = true;
    const tick = (now) => {
      if (!seen || document.hidden) { raf = 0; prev = 0; return; }
      const dt = prev ? Math.min(2.5, (now - prev) / 16.67) : 1;
      prev = now;
      if (still) {
        t.x = t.tx;
        t.y = t.ty;
      } else {
        /* one spring for both axes; Bounce loosens the damping */
        const k = 0.06;
        const d = 0.34 - (eytClamp(knobs.current.bounce, 0, 100) / 100) * 0.22;
        t.vx += ((t.tx - t.x) * k - t.vx * d) * dt;
        t.vy += ((t.ty - t.y) * k - t.vy * d) * dt;
        t.x += t.vx * dt;
        t.y += t.vy * dt;
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const resume = () => { if (!raf && seen && !document.hidden) raf = requestAnimationFrame(tick); };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; resume(); });
    io.observe(el);
    document.addEventListener("visibilitychange", resume);
    const unwatch = () => { io.disconnect(); document.removeEventListener("visibilitychange", resume); };

    /* ── the face goes where you are ──────────────────────────
       A spot out along the pointer's direction, further the
       further away you are — so on top of it the face is dead
       centre, and off in a corner it is out by that corner's
       rim, turned, one eye smaller and the pair leaning. */
    /* ── only while you are in its card ─────────────────────
       It watches the pointer while the pointer is inside the
       card it sits in, and faces front again the moment you
       leave — a wall of these all turning after a cursor
       crossing the page read as noise. The reach is measured
       against that card, so the eyes arrive at the rim as you
       arrive at its edge. */
    const frame = el.closest(within || "[data-eyes-frame], a") || el;
    const aim = (e) => {
      const f = frame.getBoundingClientRect();
      if (e.clientX < f.left || e.clientX > f.right || e.clientY < f.top || e.clientY > f.bottom) {
        t.tx = 0;
        t.ty = 0;
        return;
      }
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.max(60, Math.min(f.width, f.height) * 0.28);
      const far = Math.min(0.85, Math.tanh(d / reach) * (eytClamp(knobs.current.follow, 0, 100) / 100) * 1.5);
      t.tx = (dx / d) * far;
      t.ty = (dy / d) * far;
    };
    const rest = () => { t.tx = 0; t.ty = 0; };

    /* ── idle: straight ahead, and now and then a glance ──────
       Every 5 seconds it looks off in a random direction,
       holds it for a moment, and comes back to centre. */
    if (idle) {
      let glance = 0;
      const lookAway = () => {
        const a = Math.random() * Math.PI * 2;
        const far = 0.45 + Math.random() * 0.25;
        t.tx = Math.cos(a) * far;
        t.ty = Math.sin(a) * far;
        glance = window.setTimeout(() => {
          rest();
          glance = window.setTimeout(lookAway, 5000 - 900);
        }, 900);
      };
      glance = window.setTimeout(lookAway, 5000);
      return () => {
        cancelAnimationFrame(raf);
        unwatch();
        window.clearTimeout(glance);
      };
    }

    window.addEventListener("pointermove", aim, { passive: true });
    document.documentElement.addEventListener("pointerleave", rest);
    return () => {
      cancelAnimationFrame(raf);
      unwatch();
      window.removeEventListener("pointermove", aim);
      document.documentElement.removeEventListener("pointerleave", rest);
    };
  }, [still, idle, within]);

  const s = eytClamp(size, 16, 180);
  const rc = corner != null ? Math.min(50, (corner * 100) / s) : null;
  const body = rc != null
    ? `M${rc} 0 H${100 - rc} A${rc} ${rc} 0 0 1 100 ${rc} V${100 - rc} A${rc} ${rc} 0 0 1 ${100 - rc} 100 H${rc} A${rc} ${rc} 0 0 1 0 ${100 - rc} V${rc} A${rc} ${rc} 0 0 1 ${rc} 0 Z`
    : EYT_SHAPES[shape] || EYT_SHAPES.Ball;
  const idRef = React.useRef(null);
  if (!idRef.current) idRef.current = `eyt-clip-${++eytSeq}`;
  const clip = idRef.current;

  /* ── a change of shape is a morph, not a swap ─────────────
     The first shape is drawn from its own path; every change
     after that eases the outline across in about half a second,
     with a little overshoot so it lands. Both the body and the
     clip the eyes sit in are written each frame. */
  const bodyEl = React.useRef(null);
  const clipEl = React.useRef(null);
  const shown = React.useRef(null);
  const from = React.useRef(shape);
  React.useLayoutEffect(() => {
    if (from.current === shape) return;
    const start = shown.current || eytMeasure(from.current);
    const end = eytMeasure(shape);
    from.current = shape;
    if (still) {
      shown.current = end;
      const d = eytOutline(end);
      bodyEl.current && bodyEl.current.setAttribute("d", d);
      clipEl.current && clipEl.current.setAttribute("d", d);
      return;
    }
    const t0 = performance.now();
    const ms = 520;
    let raf = 0;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms);
      /* ease out with a touch of overshoot */
      const c = 1.3;
      const e = 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
      const r = start.map((a, i) => a + (end[i] - a) * e);
      shown.current = r;
      const d = eytOutline(r);
      bodyEl.current && bodyEl.current.setAttribute("d", d);
      clipEl.current && clipEl.current.setAttribute("d", d);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shape, still]);
  const d0 = rc == null && shown.current ? eytOutline(shown.current) : body;
  const dotCv = React.useRef(null);
  React.useEffect(() => {
    if (!dots) return;
    const api = eytDots(dotCv.current, s, corner != null ? corner : s * 0.24, still, within, eyesAt);
    dotsApi.current = api;
    return () => { api.stop(); dotsApi.current = null; };
  }, [dots, s, corner, still, within]);
  return (
    <div
      ref={box}
      style={EYT_ROOT}
      role="img"
      aria-label="A ball with two eyes that follows the cursor"
    >
      {dots ? (
        <canvas ref={dotCv} aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: s, height: s, transform: "translate(-50%, -50%)" }} />
      ) : null}
      {glass && EYT_GLASS[shape] ? (
        <div style={{ position: "absolute", left: "50%", top: "50%", width: s * EYT_GLASS[shape].k, height: s * EYT_GLASS[shape].k, transform: "translate(-50%, -50%)", borderRadius: EYT_GLASS[shape].r, background: "rgba(247, 243, 241, 0.5)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }} />
      ) : null}
      <svg
        viewBox="0 0 100 100"
        style={{ ...EYT_BALL, position: "relative", zIndex: 1, width: s, height: s, cursor: idle ? undefined : "pointer" }}
        onClick={poke}
      >
        <defs>
          <clipPath id={clip}>
            <path ref={clipEl} d={d0} />
          </clipPath>
        </defs>
        <path ref={bodyEl} style={dots || (glass && EYT_GLASS[shape]) ? { fill: "transparent" } : EYT_BODY} d={d0} />
        <g clipPath={`url(#${clip})`} style={dots ? { opacity: 0 } : undefined}>
        {[0, 1].map((i) => (
          <g key={i} ref={(n) => { eyes.current[i] = n; }}>
            <rect
              style={dots ? { fill: "#ffffff" } : EYT_EYE}
              x={-eye.w / 2}
              y={-eye.h / 2}
              width={eye.w}
              height={eye.h}
              rx={eye.r}
            />
          </g>
        ))}
        </g>
      </svg>
      {idle ? null : (
        <span aria-live="polite" style={eytSay(s, talking, tint)}>
          <span>{typed}</span>
          <span style={EYT_CARET} />
        </span>
      )}
    </div>
  );
}

module.exports = { EyeTracker, Watcher: EyeTracker };
