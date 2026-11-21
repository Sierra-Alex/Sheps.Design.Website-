/**
 * IllustrationGrid: four illustrations in a 2x2 grid of frames styled like the bookshelf's outlined
 * filler books (soft white fill, #E1DDDC stroke). Click one and, like the books, the tile dims to the
 * book black and the illustration flies from its frame to the centre and scales up; it leans toward
 * the pointer once it lands. Click anywhere or press Esc to send it back.
 * Built for the Bits and Pieces case study (sits beside the newsletter bookshelf).
 * Each glass shape (the bubble and the pill) is its own full-size layer, painted out of the base image,
 * and drifts up and down on its own slow cycle.
 */
const IG_ITEMS = [
  { src: 'assets/case-study/bits-illo-1.webp', glass: [{ src: 'assets/case-study/bits-illo-1-glass-1.png', dur: 5.2, delay: 0 }, { src: 'assets/case-study/bits-illo-1-glass-2.png', dur: 6.4, delay: -2.3 }], alt: 'A blue sphere above cream horizontal stripes, cut by a ruler line, with a glass bead and a glass rod' },
  { src: 'assets/case-study/bits-illo-2.webp', glass: [{ src: 'assets/case-study/bits-illo-2-glass-1.png', dur: 6.1, delay: -1.7 }, { src: 'assets/case-study/bits-illo-2-glass-2.png', dur: 5.5, delay: -3.6 }], alt: 'A circle of vertical cream and blue bars like a candlestick chart, with a glass bead and a glass rod' },
  { src: 'assets/case-study/bits-illo-3.webp', glass: [{ src: 'assets/case-study/bits-illo-3-glass-1.png', dur: 5.6, delay: -3.1 }, { src: 'assets/case-study/bits-illo-3-glass-2.png', dur: 6.8, delay: -1.2 }], alt: 'Concentric rings with blue and cream arcs around a blue core, ringed by tick marks, with a glass bead and a glass rod' },
  { src: 'assets/case-study/bits-illo-4.webp', glass: [{ src: 'assets/case-study/bits-illo-4-glass-1.png', dur: 6.6, delay: -0.9 }, { src: 'assets/case-study/bits-illo-4-glass-2.png', dur: 5.3, delay: -2.8 }], alt: 'Stacked elliptical orbits rising from a base line with white and blue dots, a glass bead and a glass rod' },
];
const IG_DUR = 650;
const IG_EASE = 'cubic-bezier(0.65, 0, 0.25, 1)';
const IG_KF = '@keyframes ig-float{0%,100%{transform:translateY(-1.5%)}50%{transform:translateY(1.5%)}}@media (prefers-reduced-motion: reduce){[data-ig-bubble]{animation:none !important}}';

// One illustration drawn as a square: the base image plus its floating glass shapes.
function IgArt({ it, size, hidden, radius }) {
  return (
    <span data-art="" style={{ position: 'relative', display: 'block', width: size, height: size, flex: 'none', borderRadius: radius, overflow: 'hidden', visibility: hidden ? 'hidden' : 'visible' }}>
      <img src={it.src} alt={it.alt} draggable="false" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      {(it.glass || []).map((g, k) => (
        <img key={k} data-ig-bubble="" src={g.src} alt="" aria-hidden="true" draggable="false"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', willChange: 'transform', animation: `ig-float ${g.dur}s ease-in-out ${g.delay}s infinite` }} />
      ))}
    </span>
  );
}

function IllustrationGrid(props) {
  const items = props.items || IG_ITEMS;
  const rootRef = React.useRef(null);
  const cellRefs = React.useRef([]);
  const [open, setOpen] = React.useState(null);        // { i, from: {x,y,s} } while shown
  const [phase, setPhase] = React.useState('out');
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const [landed, setLanded] = React.useState(false);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useLayoutEffect(() => {
    const el = rootRef.current; if (!el) return;
    const fit = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    fit(); const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    items.forEach((it) => { const im = new Image(); im.src = it.src; });   // warm the full-size views
  }, []);

  const S = Math.round(Math.min(box.w, box.h) * 0.82);                    // size of the enlarged view
  const left = (box.w - S) / 2, top = (box.h - S) / 2;

  const show = (i) => {
    const root = rootRef.current, cell = cellRefs.current[i]; if (!root || !cell) return;
    const r0 = root.getBoundingClientRect(), r = cell.querySelector('[data-art]').getBoundingClientRect();
    const sz = Math.min(r.width, r.height);   // the drawn square inside the (object-fit: contain) img box
    setOpen({ i, from: { x: r.left + (r.width - sz) / 2 - r0.left - left, y: r.top + (r.height - sz) / 2 - r0.top - top, s: sz / S } });
    setPhase('out'); setLanded(false); setTilt({ x: 0, y: 0 });
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
    window.mixpanel && window.mixpanel.track('Illustration enlarged', { page: window.location.pathname, illustration: i + 1 });
  };
  const close = () => {
    if (!open) return;
    setPhase('out'); setLanded(false); setTilt({ x: 0, y: 0 });
    setTimeout(() => setOpen(null), calm ? 0 : IG_DUR);
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const id = phase === 'in' ? setTimeout(() => setLanded(true), IG_DUR) : 0;
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(id); };
  }, [open, phase]);

  const onTilt = (e) => {
    if (!landed || calm) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left - (left + S / 2)) / (S / 2), py = (e.clientY - r.top - (top + S / 2)) / (S / 2);
    if (Math.abs(px) > 1.2 || Math.abs(py) > 1.2) { setTilt({ x: 0, y: 0 }); return; }
    setTilt({ x: -py * 7, y: px * 9 });
  };

  const shown = phase === 'in';
  const t = calm ? '0s' : `${IG_DUR}ms ${IG_EASE}`;
  const pad = 8, gap = 8;   // 8px between frames and around the grid, so the frames fill the tile
  const art = Math.max(0, Math.floor(Math.min(box.w - 2 * pad - gap, box.h - 2 * pad - gap) / 2) - 10);   // square inside each frame (4px padding + 1px stroke)

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...(props.style || {}) }}>
      <style>{IG_KF}</style>
      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap, boxSizing: 'border-box' }}>
        {items.map((it, i) => (
          <button key={i} type="button" ref={(el) => { cellRefs.current[i] = el; }} onClick={() => show(i)}
            aria-haspopup="dialog" aria-label={'Enlarge illustration ' + (i + 1)}
            style={{ position: 'relative', minWidth: 0, minHeight: 0, padding: 4, margin: 0, border: '1px solid #E1DDDC', borderRadius: 8, background: 'rgba(255,255,255,0.35)', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s ease-out, border-color 0.2s ease-out' }}
            onMouseEnter={(e) => { if (!calm) e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#CBC5C1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#E1DDDC'; }}>
            <IgArt it={it} size={art} radius={4} hidden={open && open.i === i} />
          </button>
        ))}
      </div>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={'Illustration ' + (open.i + 1) + ' (click or press Esc to put it back)'} tabIndex={-1}
          onClick={close} onPointerMove={onTilt} onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          ref={(el) => { if (el && document.activeElement !== el) el.focus({ preventScroll: true }); }}
          style={{ position: 'absolute', inset: 0, zIndex: 5, perspective: 1800, cursor: 'pointer', outline: 'none' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#1E1E1E', opacity: shown ? 1 : 0, transition: `opacity ${t}` }}></div>
          <div style={{ position: 'absolute', inset: 0, transformOrigin: `${left + S / 2}px ${top + S / 2}px`, transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: landed ? 'transform 0.25s ease-out' : 'none', pointerEvents: 'none' }}>
            <div
              style={{ position: 'absolute', left, top, width: S, height: S, borderRadius: 4, overflow: 'hidden', transformOrigin: '0 0',
                transform: shown ? 'none' : `translate(${open.from.x}px, ${open.from.y}px) scale(${open.from.s})`,
                boxShadow: shown ? '0 40px 60px -30px rgba(0,0,0,0.6)' : 'none',
                transition: `transform ${t}, box-shadow ${t}` }}>
              <IgArt it={items[open.i]} size={S} radius={4} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

module.exports = { IllustrationGrid };
