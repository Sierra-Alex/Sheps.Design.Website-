/* Particles — from Bencho (MIT, bencho.dev/licence).
   Ported from Particles.tsx to plain JSX: types removed, React
   read from the global, exported via module.exports so a DC can
   mount it with <x-import component="Particles" from="./components/Particles.jsx">. */

/* ══ Particles ════════════════════════════════════════════
   A shape made of dots. Move over it and the dots are pushed
   away from the pointer and spring home behind it; press and a
   shockwave throws them out, and they gather again into the
   NEXT shape — circle, square, flower, round again.

   ── ONE SET OF DOTS, MANY SHAPES ────────────────────────
   The dots never change, only where home is. Every shape is
   sampled to the same number of points, and a change of shape
   pairs each dot with a new home by angle round the middle, so
   the swarm sweeps round into the new outline rather than
   crossing itself.

   ── STRETCHED BY SPEED ──────────────────────────────────
   A dot at rest is round; a moving one is drawn a little long
   along the way it is going, which is what makes a burst read
   as a splash rather than a scatter of points. */

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   The maths was already on this bench twice, copied by hand:
   Humidity's wheel and Brightness's column both accumulate
   velocity toward a target, damp it, and snap when both the
   delta and the velocity fall under 0.02. Two copies is a
   coincidence; five would be a policy, so it comes out here
   before the elastic blocks are written against it.

   The two shipped copies are deliberately NOT refactored onto
   this. They work, they are tuned, and rewriting the innards
   of two live components to prove a point about duplication
   is how a good afternoon becomes a bad one. This is the one
   new code uses.

   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled.
   CLAUDE.md is not complimentary about the one permanent
   requestAnimationFrame already on this bench and there is no
   case for five more. */

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const ptcStillness = () =>
  typeof window !== "undefined" &&
  !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const PTC_W = 480;
const PTC_H = 400;
const PTC_CX = PTC_W / 2;
const PTC_CY = PTC_H / 2;
/* how many dots every shape is sampled to */
const PTC_N = 720;

const PTC_SHAPES = ["Circle", "Square", "Flower"];

const ptcClamp = (v, a, b) => Math.min(b, Math.max(a, v));

function ptcOutline(s) {
  const p = new Path2D();
  if (s === "Circle") p.arc(PTC_CX, PTC_CY, 150, 0, Math.PI * 2);
  else if (s === "Square") p.roundRect(PTC_CX - 140, PTC_CY - 140, 280, 280, 36);
  else {
    /* five round petals round a smaller middle — circles drawn
       the same way round, so the fill is their union. Petals
       just touching their neighbours, so the notches between
       them read at the dots' own grain */
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const x = PTC_CX + Math.cos(a) * 104;
      const y = PTC_CY + 8 + Math.sin(a) * 104;
      p.moveTo(x + 60, y);
      p.arc(x, y, 60, 0, Math.PI * 2);
    }
    p.moveTo(PTC_CX + 58, PTC_CY + 8);
    p.arc(PTC_CX, PTC_CY + 8, 58, 0, Math.PI * 2);
  }
  return p;
}

/* ── N points, spread evenly over the inside of a shape ──
   A hex grid spaced so the shape holds about N of them — its
   area over N, which is the spacing that fills it evenly — then
   trimmed or topped up to exactly N. It was a fixed fine grid
   thinned by a stride, and the stride beat against the grid:
   the circle came out in zigzag bands. */
function ptcHomes(s) {
  const c = document.createElement("canvas");
  c.width = PTC_W;
  c.height = PTC_H;
  const g = c.getContext("2d");
  const path = ptcOutline(s);
  let area = 0;
  for (let y = 1; y < PTC_H; y += 2) for (let x = 1; x < PTC_W; x += 2) if (g.isPointInPath(path, x, y)) area += 4;
  const sp = Math.sqrt((area / PTC_N) * (2 / Math.sqrt(3)));
  const rowH = (sp * Math.sqrt(3)) / 2;
  const pts = [];
  for (let y = rowH / 2, row = 0; y < PTC_H; y += rowH, row++) {
    for (let x = sp / 2 + (row % 2) * (sp / 2); x < PTC_W; x += sp) {
      if (g.isPointInPath(path, x, y)) pts.push([x, y]);
    }
  }
  /* within a few of N either way; drop evenly or repeat evenly */
  const out = [];
  for (let i = 0; i < PTC_N; i++) out.push(pts[Math.floor((i * pts.length) / PTC_N)]);
  return out;
}

const ptcAngle = (x, y) => Math.atan2(y - PTC_CY, x - PTC_CX);

/* ══ Particles (was the .ptc CSS) ══════════════════════════
   lab/Particles.tsx. The dots are drawn on a canvas in the
   element's own `color`, so the ink is set here and the theme
   carries it.

   This project has no stylesheet and no CSS custom properties —
   everything is inline — so the rules live here as style objects.
   Bencho's tokens are mapped on the component's own root so
   nothing leaks out:
     --ink      → #131313, the site's ink (body text, dark UI)
     --fill-on  → not set; Bencho uses it for "ink on a filled
                  surface", which this site expresses by passing a
                  different `ink` (e.g. #F7F3F1 cream on a dark
                  section). Left unset so the var() falls through
                  to --ink, exactly as the original CSS intends. */
const PTC_ROOT = {
  "--ink": "#131313",
  position: "relative",
  display: "grid",
  placeItems: "center",
};
const PTC_CANVAS = {
  display: "block",
  color: "var(--fill-on, var(--ink))",
  cursor: "crosshair",
  touchAction: "none",
};

function Particles({
  /* the shape it opens as */
  shape = "Circle",
  /* how far the pointer's push reaches, px */
  reach = 80,
  /* how hard it pushes, 0..100 */
  force = 60,
  /* the size of a dot */
  grain = "Fine",
  /* the dot colour — site addition; overrides --ink on the root */
  ink,
} = {}) {
  const still = ptcStillness();
  const cv = React.useRef(null);
  const dots = React.useRef([]);
  const at = React.useRef("Circle");
  const hand = React.useRef(null);
  const raf = React.useRef(0);
  const knobs = React.useRef({ reach, force, grain });
  knobs.current = { reach, force, grain };

  /* ── give every dot a home in a shape ────────────────── */
  const become = (s) => {
    at.current = s;
    const next = ptcHomes(s);
    const ds = dots.current;
    if (!ds.length) {
      dots.current = next.map(([x, y]) => ({ hx: x, hy: y, x, y, vx: 0, vy: 0 }));
      return;
    }
    /* pair by angle round the middle, so the swarm sweeps */
    const a = ds.map((d, i) => [ptcAngle(d.x, d.y), i]).sort((p, q) => p[0] - q[0]);
    const b = next.map((h, i) => [ptcAngle(h[0], h[1]), i]).sort((p, q) => p[0] - q[0]);
    a.forEach(([, di], k) => {
      const h = next[b[k][1]];
      ds[di].hx = h[0];
      ds[di].hy = h[1];
      if (still) { ds[di].x = h[0]; ds[di].y = h[1]; }
    });
  };

  const draw = () => {
    const c = cv.current;
    if (!c) return;
    const x = c.getContext("2d");
    const k = c.width / PTC_W;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, PTC_W, PTC_H);
    x.fillStyle = getComputedStyle(c).color;
    const r = knobs.current.grain === "Coarse" ? 2.7 : 1.9;
    x.beginPath();
    for (const d of dots.current) {
      const sp = Math.hypot(d.vx, d.vy);
      if (sp < 0.3) {
        x.moveTo(d.x + r, d.y);
        x.arc(d.x, d.y, r, 0, Math.PI * 2);
      } else {
        /* long along its path, a little thin across it */
        const s = Math.min(2.6, 1 + sp * 0.12);
        const rot = Math.atan2(d.vy, d.vx);
        x.moveTo(d.x + Math.cos(rot) * r * s, d.y + Math.sin(rot) * r * s);
        x.ellipse(d.x, d.y, r * s, r / Math.sqrt(s), rot, 0, Math.PI * 2);
      }
    }
    x.fill();
  };

  const run = () => {
    if (raf.current) return;
    let prev = 0;
    const tick = (t) => {
      const dt = prev ? ptcClamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      const h = hand.current;
      const R = ptcClamp(knobs.current.reach, 30, 160);
      const S = (ptcClamp(knobs.current.force, 0, 100) / 100) * 11;
      let busy = !!h;
      for (const d of dots.current) {
        if (h) {
          const dx = d.x - h.x;
          const dy = d.y - h.y;
          const dd = Math.hypot(dx, dy);
          if (dd < R && dd > 0.01) {
            const f = Math.pow(1 - dd / R, 2) * S;
            d.vx += (dx / dd) * f * dt;
            d.vy += (dy / dd) * f * dt;
          }
        }
        d.vx = (d.vx + (d.hx - d.x) * 0.05 * dt) * Math.pow(0.84, dt);
        d.vy = (d.vy + (d.hy - d.y) * 0.05 * dt) * Math.pow(0.84, dt);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (Math.abs(d.hx - d.x) < 0.05 && Math.abs(d.hy - d.y) < 0.05 && Math.abs(d.vx) < 0.02 && Math.abs(d.vy) < 0.02) {
          d.x = d.hx; d.y = d.hy; d.vx = 0; d.vy = 0;
        } else busy = true;
      }
      draw();
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  /* set up once, then follow the Shape knob */
  React.useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(PTC_W * dpr);
    c.height = Math.round(PTC_H * dpr);
  }, []);
  React.useEffect(() => {
    const s = PTC_SHAPES.includes(shape) ? shape : "Circle";
    become(s);
    draw();
    run();
  }, [shape]);
  React.useEffect(() => { draw(); }, [grain, ink]);
  React.useEffect(() => () => { cancelAnimationFrame(raf.current); raf.current = 0; }, []);
  React.useEffect(() => {
    const mo = new MutationObserver(() => draw());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const where = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = r.width / PTC_W;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  return (
    <div style={ink ? { ...PTC_ROOT, "--ink": ink } : PTC_ROOT}>
      <canvas
        ref={cv}
        style={{ ...PTC_CANVAS, width: PTC_W, height: PTC_H }}
        role="img"
        aria-label="A shape made of dots. Move over it; press to change the shape."
        onPointerMove={(e) => {
          if (still) return;
          hand.current = where(e);
          run();
        }}
        onPointerLeave={() => { hand.current = null; run(); }}
        onPointerDown={(e) => {
          /* the shockwave, then the next shape */
          const p = where(e);
          if (!still) {
            const S = 0.4 + (ptcClamp(knobs.current.force, 0, 100) / 100) * 1.2;
            for (const d of dots.current) {
              const dx = d.x - p.x;
              const dy = d.y - p.y;
              const dd = Math.hypot(dx, dy);
              if (dd > 200 || dd < 0.01) continue;
              const f = (1 - dd / 200) * 30 * S;
              d.vx += (dx / dd) * f;
              d.vy += (dy / dd) * f;
            }
          }
          become(PTC_SHAPES[(PTC_SHAPES.indexOf(at.current) + 1) % PTC_SHAPES.length]);
          draw();
          run();
        }}
      />
    </div>
  );
}

module.exports = { Particles, SHAPES: PTC_SHAPES };
