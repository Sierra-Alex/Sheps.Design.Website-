/* ASCII wake — from Bencho (MIT, bencho.dev/licence).
   Ported from ASCIIWake.tsx to plain JSX: types removed, React read
   from the global, exported via module.exports so a DC mounts it with
   <x-import component="AsciiWake" from="./components/ASCIIWake.jsx">.

   Site additions, kept small: the block scales to its container
   (`fluid`, default on) and the canvas backing store follows the
   displayed size so the glyphs stay sharp when it's drawn large;
   `ink` sets the dot colour. */

/* ══ ASCII wake ═══════════════════════════════════════════
   A cube drawn in ink dots, the dots shrinking toward
   its edge like a halftone. The pointer drags a wake through it:
   right under the hand the characters thicken to their densest
   and stay that way while the hand rests, and
   along the path it came from they thin back out, @ to # to + to
   a dot, as the wake cools. The glyphs lean toward the hand while
   it is near. Press and a ring goes out from the press.

   ── A GRID OF NUMBERS, THEN A RAMP ──────────────────────
   Every cell holds one number. The hand adds to it along the
   line it moved,
   so a fast stroke leaves no gaps; every frame the whole grid
   cools by the same fraction. The number picks a character off
   a ramp of glyphs, lightest to densest. That is the whole
   effect — the same field-then-palette idea as the Heat map,
   with characters where the heat map has colours.

   ── THE SHIMMER ─────────────────────────────────────────
   A cell that is in the wake picks its glyph with a little
   noise, re-dealt every few frames, so the warm part of the wake
   flickers between neighbouring characters the way a terminal
   redraw does. The cold field never flickers. */

const AW_W = 360;
const AW_H = 240;
const awClamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* lightest to densest; the first is always a blank */
const AW_RAMPS = {
  Classic: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
  Blocks: [" ", "·", "░", "▒", "▓", "█"],
  Dots: [" ", "·", "•", "●"],
  Binary: [" ", ".", ":", "0", "1"],
};

/* ── the shape: a cube, seen corner on ──────────────────────
   A solid, perfectly symmetric shape: three faces of an isometric
   cube make a hexagon, lit from above so each face has its own
   strength — the top brightest, the left in half light, the right
   in shade — with a little gradient across each for depth and a
   crisp line where two faces meet. Returns the dot size directly,
   0 to 1, so the halftone is dense right to the outline.

   The dots are the ink, so which face is dense depends on the page:
   on dark the dots are light and the lit top is the dense one; on
   light they are dark, so it is printed like a halftone — the lit top
   sparse, the shaded side dense. `lit` is the dot size for a face's
   light: the same value, read the right way round for the page. */
const AW_CUBE = 112;
function awCube(x, y, dark) {
  /* no face lighter than a third of a full dot: the faintest still
     reads as a face, and is still a field the wake can write on */
  const lit = (v) => 0.35 + 0.65 * awClamp(dark ? v : 1.09 - v, 0, 1);
  const R = AW_CUBE;
  const c = Math.cos(Math.PI / 6) * R, h = R / 2;
  /* the corners: top, upper right, bottom, lower left, upper left; the middle is 0,0 */
  const T = [0, -R], UR = [c, -h], B = [0, R], LL = [-c, h], UL = [-c, -h];
  /* where (x, y) sits in a face spanned from o along a and b: s, t in 0..1 when inside */
  const along = (o, p, q) => {
    const ax = p[0] - o[0], ay = p[1] - o[1], bx = q[0] - o[0], by = q[1] - o[1];
    const dx = x - o[0], dy = y - o[1];
    const det = ax * by - ay * bx;
    return [(dx * by - dy * bx) / det, (ax * dy - ay * dx) / det];
  };
  const inside = ([s, t]) => s >= 0 && s <= 1 && t >= 0 && t <= 1;
  /* the seams: a bright line where two faces meet, and the outline */
  const seam = (v) => (v < 0.045 ? 1 : 0);
  const top = along(T, UR, UL);
  if (inside(top)) {
    const [s, t] = top;
    return seam(1 - s) || seam(1 - t) ? 1 : lit(0.96 - 0.1 * (s + t) / 2);
  }
  const left = along(UL, [0, 0], LL);
  if (inside(left)) {
    const [s, t] = left;
    return seam(s) ? 1 : lit(0.56 - 0.12 * t);
  }
  const right = along([0, 0], UR, B);
  if (inside(right)) {
    const [s, t] = right;
    return seam(s) || seam(t) ? 1 : lit(0.13 - 0.05 * s);
  }
  return 0;
}

/* the face is the system's own monospace — nothing downloaded */
const AW_MONO = `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`;

/* below this much heat a cell is the field: a dot */
const AW_COLD = 0.04;
/* how long a press's ring takes to spread and fade, s */
const AW_RING_S = 2.2;

/* a stable 0..1 per cell per deal, so the shimmer is noise that
   holds for a few frames rather than flicker every frame */
function awHash(k, n) {
  let h = (k * 374761393 + n * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ══ the .asc CSS, as style objects ═════════════════════════
   This project has no stylesheet — every page is inline-styled —
   so the rules live here. Bencho's tokens map on the component's
   own root so nothing leaks out:
     --ink      → #131313, the site's ink (body text, dark UI).
                  The `ink` prop overrides it, e.g. #F7F3F1 cream
                  on a dark section.
     --fill-on  → left unset. Bencho uses it for ink on a filled
                  surface; this site has no separate token for that,
                  so the var() falls through to --ink as intended. */
const AW_ROOT = {
  "--ink": "#131313",
  position: "relative",
  cursor: "crosshair",
  touchAction: "none",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
  WebkitUserSelect: "none",
};
const AW_CANVAS = { display: "block", color: "var(--fill-on, var(--ink))" };

function AsciiWake({
  /* the ramp of glyphs */
  glyphs = "Classic",
  /* how big a character is, px */
  size = 10,
  /* how wide the wake is, 0..100 */
  reach = 50,
  /* seconds for the wake to cool */
  trail = 1.2,
  /* how far the glyphs lean toward the hand, 0..100 */
  pull = 40,
  /* site: dot colour, and whether to fill the container's width */
  ink,
  fluid = true,
  /* site: the block's own units, and media to draw in dots instead
     of the cube — [{ src, x, y, w, h }], each placed by fractions of
     the block, so one wake runs across every clip */
  width = AW_W,
  height = AW_H,
  media = null,
  label,
} = {}) {
  const W = width, H = height;
  const mediaKey = media ? media.map((m) => m.src).join("|") : "";
  const clips = React.useRef([]);
  const vis = React.useRef(true);
  const cv = React.useRef(null);
  const knobs = React.useRef({ glyphs, reach, trail, pull });
  knobs.current = { glyphs, reach, trail, pull };
  const st = React.useRef({
    cols: 0, rows: 0, cw: 0, ch: 0, ox: 0, oy: 0, font: "",
    /* the wake, one number per cell */
    heat: new Float32Array(0),
    /* how far inside the shape each cell is, 0 outside to 1 */
    mask: new Float32Array(0),
    /* the hand: where it is, where it was last stamped, and how
       present it is (for the lean, which follows it out) */
    hx: -999, hy: -999, lx: NaN, ly: NaN, near: 0, inside: false,
    /* rings going out from presses */
    rings: [],
    deal: 0, tick: 0,
    raf: 0, ratio: 1,
  });

  /* the grid for a character size, cut to the shape */
  const build = () => {
    const s = st.current;
    const c = cv.current;
    if (!c) return;
    /* site: backing store follows the displayed size, so a block
       drawn at 2× its design width is still crisp */
    const shown = c.getBoundingClientRect().width || W;
    const r = Math.min(4, (window.devicePixelRatio || 1) * Math.max(1, shown / W));
    s.ratio = r;
    c.width = Math.round(W * r);
    c.height = Math.round(H * r);
    /* which way round the shading reads: is the ink light (a dark page)? */
    const inkRGB = (getComputedStyle(c).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    const dark = (inkRGB[0] * 0.299 + inkRGB[1] * 0.587 + inkRGB[2] * 0.114) > 128;
    /* rows a little tighter than the face's own leading, so the
       resting dots sit on an even grid rather than in stripes */
    s.ch = size * 0.82;
    s.cw = size * 0.62;
    s.cols = Math.floor(W / s.cw - 0.5);
    s.rows = Math.floor(H / s.ch);
    s.font = `500 ${size}px ${AW_MONO}`;
    s.heat = new Float32Array(s.cols * s.rows);
    s.mask = new Float32Array(s.cols * s.rows);
    /* the grid centred in the block, whatever is left over split */
    const ox = (s.ox = (W - s.cols * s.cw) / 2), oy = (s.oy = (H - s.rows * s.ch) / 2);
    s.dark = dark;
    if (media) { sample(); return; }
    for (let j = 0; j < s.rows; j++) {
      for (let i = 0; i < s.cols; i++) {
        const x = ox + (i + 0.5 + (j & 1) * 0.5) * s.cw - W / 2, y = oy + (j + 0.5) * s.ch - H / 2;
        s.mask[j * s.cols + i] = awCube(x, y, dark);
      }
    }
  };

  /* site: the media's light, read once per cell. Bright is a full
     dot whichever way round the ink is — the shapes are the subject,
     so they print as dots on cream as well as on dark;
     the near-black around each clip drops out to blank, so the
     shapes keep their silhouettes. */
  const sample = () => {
    const s = st.current;
    if (!s.cols || !clips.current.length) return;
    if (!s.sc) { s.sc = document.createElement("canvas"); s.sx = s.sc.getContext("2d", { willReadFrequently: true }); }
    const cw = s.cols * 2, chh = s.rows;
    if (s.sc.width !== cw || s.sc.height !== chh) { s.sc.width = cw; s.sc.height = chh; }
    const g = s.sx;
    g.fillStyle = "#000"; g.fillRect(0, 0, cw, chh);
    /* the grid sits ox/oy in from the block; clips are placed on the block */
    const kx = cw / (s.cols * s.cw), ky = chh / (s.rows * s.ch);
    g.globalCompositeOperation = "lighten";
    for (const c of clips.current) {
      if (!c.ok) continue;
      g.drawImage(c.el, (c.x * W - s.ox) * kx, (c.y * H - s.oy) * ky, c.w * W * kx, c.h * H * ky);
    }
    g.globalCompositeOperation = "source-over";
    const px = g.getImageData(0, 0, cw, chh).data;
    for (let j = 0; j < s.rows; j++) {
      for (let i = 0; i < s.cols; i++) {
        /* the odd-row half-cell shift, read from the doubled-width sample */
        const p = (j * cw + Math.min(cw - 1, i * 2 + (j & 1))) * 4;
        let l = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) / 255;
        const m = awClamp((l - 0.1) / 0.75, 0, 1);
        s.mask[j * s.cols + i] = m < 0.08 ? 0 : 0.2 + 0.8 * Math.sqrt(m);
      }
    }
  };

  /* heat dropped on the grid in a soft round at a point */
  const stamp = (x, y, rad, amt) => {
    const s = st.current;
    x -= s.ox; y -= s.oy;
    const c0 = Math.max(0, Math.floor((x - rad) / s.cw));
    const c1 = Math.min(s.cols - 1, Math.ceil((x + rad) / s.cw));
    const r0 = Math.max(0, Math.floor((y - rad) / s.ch));
    const r1 = Math.min(s.rows - 1, Math.ceil((y + rad) / s.ch));
    const R2 = rad * rad;
    for (let j = r0; j <= r1; j++) {
      const dy = (j + 0.5) * s.ch - y;
      for (let i = c0; i <= c1; i++) {
        const dx = (i + 0.5) * s.cw - x;
        const q = (dx * dx + dy * dy) / R2;
        if (q >= 1) continue;
        const t = 1 - q;
        const k = j * s.cols + i;
        s.heat[k] = Math.min(1, s.heat[k] + amt * t * t);
      }
    }
  };

  /* the wake's width: one cell's worth at 0, a broad swathe at 100 */
  const radius = () => 12 + (awClamp(knobs.current.reach, 0, 100) / 100) * 58;

  const paint = () => {
    const s = st.current;
    const c = cv.current;
    if (!c || !s.cols) return;
    const g = c.getContext("2d");
    g.setTransform(s.ratio, 0, 0, s.ratio, 0, 0);
    g.clearRect(0, 0, W, H);
    /* one ink for everything, the theme's own */
    g.fillStyle = getComputedStyle(c).color;
    /* the resting dot: a real circle rather than a full stop, so
       it can be bigger than the face draws one */
    /* a halftone: the dot's AREA follows the density, up to nearly
       touching its neighbours where the shape is fullest */
    const dot = Math.min(s.cw, s.ch) * 0.44;
    g.font = s.font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ramp = AW_RAMPS[knobs.current.glyphs] || AW_RAMPS.Classic;
    const top = ramp.length - 1;
    /* the lean: up to most of a cell toward the hand, fading with
       distance over twice the wake's width */
    const lean = (awClamp(knobs.current.pull, 0, 100) / 100) * s.near;
    const rad = radius();
    const far = rad * 2;
    const far2 = far * far;
    /* the hand's own heat, worked out fresh each frame rather than
       stored, so it never cools: a hand at rest keeps its patch */
    const R2 = rad * rad;
    /* the rings, as a band that passes rather than heat that stays:
       a press leaves nothing behind it, only the wave going out */
    const rings = s.rings.map((r) => {
      /* slow and smooth: it eases out as it spreads, a soft wide band
         that fades over its whole life rather than snapping off */
      const p = r.t / AW_RING_S;
      const e = 1 - Math.pow(1 - p, 3);
      return { x: r.x, y: r.y, R: 8 + e * 260, amp: 0.6 * (1 - p) * (1 - p) * Math.min(1, p * 6) };
    });
    /* site: every resting dot goes in one path, filled once — the
       same picture, far fewer calls when the field is large */
    g.beginPath();
    for (let j = 0; j < s.rows; j++) {
      const y = s.oy + (j + 0.5) * s.ch;
      for (let i = 0; i < s.cols; i++) {
        const k = j * s.cols + i;
        const m = s.mask[k];
        if (m <= 0) continue;
        /* odd rows sit half a cell over: a halftone screen */
        const cx = s.ox + (i + 0.5 + (j & 1) * 0.5) * s.cw;
        let h = s.heat[k];
        if (s.near > 0.002) {
          const q = ((cx - s.hx) ** 2 + (y - s.hy) ** 2) / R2;
          if (q < 1) h = Math.max(h, 0.95 * s.near * (1 - q) * (1 - q));
        }
        for (const r of rings) {
          /* a wide band, so the ring is a soft swell rather than a line */
          const d = (Math.hypot(cx - r.x, y - r.y) - r.R) / 24;
          if (d > -2.5 && d < 2.5) h += r.amp * Math.exp(-d * d);
        }
        /* the faint faces take a little less of the wake, but only a
           little: scaled by the density outright, the lightest face
           never got warm enough to show a glyph at all */
        h *= 0.55 + 0.45 * m;
        const v = Math.min(1, h);
        /* the warm part shimmers, the cold field holds still */
        let u = v * top + 0.5;
        if (h > AW_COLD) u += (awHash(k, s.deal) - 0.5) * 1.6 * Math.min(1, h * 2);
        const idx = awClamp(Math.floor(u), 1, top);
        let x = cx;
        let yy = y;
        if (lean > 0.002) {
          const dx = s.hx - x, dy = s.hy - yy;
          const d2 = dx * dx + dy * dy;
          if (d2 < far2) {
            const f = 1 - d2 / far2;
            const d = Math.sqrt(d2) || 1;
            /* toward the hand by a share of the gap, never past it */
            const mm = Math.min(d * 0.6, 14 * lean * f * f);
            x += (dx / d) * mm;
            yy += (dy / d) * mm;
          }
        }
        /* cold, or the lightest step: the dot, smaller toward the
           shape's edge, so the wake fades back into the field
           without a glyph popping in or out */
        if (h <= AW_COLD || idx === 1) {
          const rr = Math.max(0.45, dot * Math.sqrt(m));
          g.moveTo(x + rr, yy);
          g.arc(x, yy, rr, 0, Math.PI * 2);
          continue;
        }
        g.fillText(ramp[idx], x, yy);
      }
    }
    g.fill();
  };

  /* the loop runs only while the wake is warm or the hand is moving */
  const run = () => {
    const s = st.current;
    if (s.raf) return;
    let prev = performance.now();
    const step = (t) => {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      /* the cooling: the same fraction off every cell, so a trail
         of seconds T is down to a twentieth after T */
      const keep = Math.exp((-dt * 3) / Math.max(0.1, knobs.current.trail));
      let warm = 0;
      for (let k = 0; k < s.heat.length; k++) {
        const h = s.heat[k] * keep;
        s.heat[k] = h < 0.003 ? 0 : h;
        if (h > warm) warm = h;
      }
      /* the rings run outward for RING_S and are gone */
      s.rings = s.rings.filter((r) => (r.t += dt) < AW_RING_S);
      /* the lean follows the hand in and out */
      s.near += ((s.inside ? 1 : 0) - s.near) * (1 - Math.pow(0.004, dt));
      s.tick += dt;
      if (s.tick > 0.07) { s.tick = 0; s.deal++; if (s.live) sample(); }
      paint();
      const still = !s.live && warm === 0 && !s.rings.length && Math.abs((s.inside ? 1 : 0) - s.near) < 0.004;
      s.raf = still ? 0 : requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  };

  React.useEffect(() => {
    build();
    paint();
  }, [size, ink]);
  React.useEffect(() => { paint(); }, [glyphs]);
  React.useEffect(() => () => { cancelAnimationFrame(st.current.raf); st.current.raf = 0; }, []);
  React.useEffect(() => {
    /* a theme flip turns the shading round, so the field is rebuilt */
    const mo = new MutationObserver(() => { build(); paint(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    /* site: a resize changes the drawn size, so the backing store follows */
    let t = 0;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { build(); paint(); }, 120); });
    if (cv.current) ro.observe(cv.current);
    return () => { mo.disconnect(); ro.disconnect(); clearTimeout(t); };
  }, []);

  /* site: media clips, played muted and only while the block is on
     screen; reduced motion holds the first frame */
  React.useEffect(() => {
    if (!media) return;
    const s = st.current;
    const still = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const list = media.map((m) => {
      const video = /\.(mp4|webm|mov)(\?|$)/i.test(m.src);
      const el = video ? document.createElement("video") : new Image();
      const c = { el, video, ok: false, x: m.x || 0, y: m.y || 0, w: m.w ?? 1, h: m.h ?? 1 };
      const ready = () => { c.ok = true; sample(); paint(); };
      if (video) {
        el.muted = true; el.loop = true; el.playsInline = true; el.preload = "auto";
        el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
        el.addEventListener("loadeddata", ready, { once: true });
      } else el.onload = ready;
      el.src = m.src;
      return c;
    });
    clips.current = list;
    const set = () => {
      const on = vis.current && !still && list.some((c) => c.video);
      list.forEach((c) => { if (c.video) { if (on) c.el.play().catch(() => {}); else c.el.pause(); } });
      s.live = on;
      if (on) run();
    };
    const io = new IntersectionObserver((es) => { vis.current = es[0].isIntersecting; set(); }, { rootMargin: "100px" });
    if (cv.current) io.observe(cv.current);
    set();
    return () => { io.disconnect(); s.live = false; list.forEach((c) => { if (c.video) { c.el.pause(); c.el.removeAttribute("src"); c.el.load(); } }); clips.current = []; };
  }, [mediaKey]);

  /* the pointer in the block's own units — the wall zooms cards */
  const where = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = r.width / W;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  /* the hand stamps along the whole line since its last frame, a
     stamp every third of a radius, so a flick is one stroke */
  const move = (e) => {
    const s = st.current;
    const { x, y } = where(e);
    const rad = radius();
    if (Number.isNaN(s.lx)) { s.lx = x; s.ly = y; }
    const d = Math.hypot(x - s.lx, y - s.ly);
    const n = Math.max(1, Math.ceil(d / (rad / 3)));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      stamp(s.lx + (x - s.lx) * f, s.ly + (y - s.ly) * f, rad, 0.5);
    }
    s.lx = x; s.ly = y; s.hx = x; s.hy = y;
    s.inside = true;
    run();
  };

  const size2 = fluid ? { width: "100%", aspectRatio: `${W} / ${H}` } : { width: W, height: H };
  return (
    <div
      style={{ ...AW_ROOT, ...(ink ? { "--ink": ink } : null), ...size2 }}
      onPointerEnter={(e) => { const s = st.current; s.lx = NaN; move(e); }}
      onPointerMove={move}
      onPointerLeave={() => { const s = st.current; s.inside = false; s.lx = NaN; run(); }}
      onPointerDown={(e) => {
        const { x, y } = where(e);
        st.current.rings.push({ x, y, t: 0 });
        run();
      }}
      role="img"
      aria-label={label || "A cube of dots that a pointer drags a wake through"}
    >
      <canvas ref={cv} style={{ ...AW_CANVAS, width: "100%", height: "100%" }} aria-hidden="true" />
    </div>
  );
}

module.exports = { AsciiWake, RAMPS: AW_RAMPS };
