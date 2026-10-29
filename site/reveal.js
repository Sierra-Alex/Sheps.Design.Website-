// Subtle load/scroll-in animation. Uses the Web Animations API so it never
// fights React-managed inline styles; nothing persists after an element plays.
const seen = { has: (el) => !!el.__revealSeen, add: (el) => { el.__revealSeen = true; } };
let io = window.__revealIO || null;

// Liquify: each element gets its own SVG turbulence + displacement filter
// whose strength eases from a heavy ripple to nothing as it fades in. The
// filter is removed (and any inline filter restored) the moment it settles.
const NS = 'http://www.w3.org/2000/svg';
let defs = null, uid = 0;
const allEls = new Set();
const exited = [];
function liquify(el, delay, duration, out) {
  if (!defs) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
  }
  const id = 'liquify-' + (++uid);
  const f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('x', '-10%'); f.setAttribute('y', '-60%'); f.setAttribute('width', '120%'); f.setAttribute('height', '220%');
  const turb = document.createElementNS(NS, 'feTurbulence');
  turb.setAttribute('type', 'fractalNoise');
  turb.setAttribute('numOctaves', '1');
  turb.setAttribute('seed', String(uid % 97));
  // R pinned to 0.5 so nothing moves sideways: the whole shape only
  // melts vertically, one broad wave rather than a ripple
  const ct = document.createElementNS(NS, 'feComponentTransfer');
  const fr = document.createElementNS(NS, 'feFuncR');
  fr.setAttribute('type', 'linear'); fr.setAttribute('slope', '0'); fr.setAttribute('intercept', '0.5');
  ct.appendChild(fr);
  const disp = document.createElementNS(NS, 'feDisplacementMap');
  disp.setAttribute('in', 'SourceGraphic');
  disp.setAttribute('xChannelSelector', 'R');
  disp.setAttribute('yChannelSelector', 'G');
  turb.setAttribute('result', 'n'); ct.setAttribute('in', 'n'); ct.setAttribute('result', 'm'); disp.setAttribute('in2', 'm');
  f.appendChild(turb); f.appendChild(ct); f.appendChild(disp); defs.appendChild(f);
  const orig = el.style.filter;
  const MAX = 220;
  const set = (p) => {
    const k = 1 - p;
    turb.setAttribute('baseFrequency', (0.0008 + 0.001 * k).toFixed(4) + ' ' + (0.0016 + 0.002 * k).toFixed(4));
    disp.setAttribute('scale', (MAX * k * k).toFixed(2));
  };
  set(0);
  el.style.filter = 'url(#' + id + ')' + (orig ? ' ' + orig : '');
  const t0 = performance.now() + delay;
  const step = (now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / duration));
    set(out ? 1 - p * p * p : 1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
    else if (!out) { el.style.filter = orig; f.remove(); }
    else exited.push({ el, orig, f });
  };
  requestAnimationFrame(step);
}

if (typeof window !== 'undefined') window.__liquify = liquify;

function play(el) {
  const a = el.__revealAnim;
  if (el.__revealStale) { el.__revealStale.forEach((x) => { try { x.cancel(); } catch (_) {} }); el.__revealStale = null; }
  if (!a) return;
  el.__revealAnim = null;
  a.play();
  const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : { delay: 0, duration: 900 };
  liquify(el, t.delay || 0, (t.duration || 900) * 1.2);
}

export function reveal(selector, root) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const scope = root || document;
  // A container that holds media is split into its pieces — each image,
  // video, graphic and text block melts in on its own as it scrolls into
  // view, rather than the whole tall block going at once.
  const MEDIA = 'img,video,canvas,picture,svg,iframe,[role="img"]';
  const LEAF = 'h1,h2,h3,h4,h5,h6,p,ul,ol,img,video,canvas,picture,svg,iframe,[role="img"],button,a[data-cta],[style*="patterns/plus"]';
  const out = [];
  for (const el of scope.querySelectorAll(selector)) {
    if (el.matches(LEAF) || !el.querySelector(MEDIA)) { out.push(el); continue; }
    const leaves = Array.from(el.querySelectorAll(LEAF));
    leaves.forEach((l) => { if (!leaves.some((o) => o !== l && o.contains(l))) out.push(l); });
  }
  // the + pattern dividers sit between sections, outside any matched
  // container, so they're always picked up on their own
  scope.querySelectorAll('[style*="patterns/plus"]').forEach((p) => { if (!out.some((o) => o === p || o.contains(p))) out.push(p); });
  const els = out.filter((el, i) => !seen.has(el) && out.indexOf(el) === i && !out.some((o) => o !== el && o.contains(el) && !seen.has(o)));
  els.forEach((el) => allEls.add(el));
  if (!els.length) return;
  if (!io) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        play(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    window.__revealIO = io;
  }
  const groupIndex = new Map();
  for (const el of els) {
    seen.add(el);
    const parent = el.parentElement;
    const i = groupIndex.get(parent) || 0;
    groupIndex.set(parent, i + 1);
    // Drop in from above while one broad vertical melt settles, tight stagger
    const delay = Math.min(i * 60, 360);
    const media = el.matches(MEDIA);
    const frames = [{ opacity: 0, transform: 'translateY(-28px)' }, { opacity: 1, transform: 'translateY(0)' }];
    const anim = el.animate(frames, { duration: media ? 1200 : 900, delay, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'backwards' });
    anim.pause();
    el.__revealAnim = anim;
    // Groups marked data-reveal-now play on load (e.g. hero content that may sit just below the fold on mobile)
    if (parent && parent.hasAttribute('data-reveal-now')) { play(el); continue; }
    io.observe(el);
  }
}

// Exit: the load effect in reverse. A click on an internal page link melts
// what's on screen back up and out, then navigates. Skipped for new tabs,
// modifier clicks, in-page anchors, mailto/tel, and copy/About triggers.
// Coming back via the back button (bfcache) restores the page as it was.
if (typeof window !== 'undefined' && !window.__revealExitWired) {
  window.__revealExitWired = true;
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving = false;
  const outs = [];
  document.addEventListener('click', (e) => {
    if (still || leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-copy-email') || a.hasAttribute('data-about')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    leaving = true;
    const vh = window.innerHeight;
    const els = Array.from(new Set([...allEls, ...document.querySelectorAll('nav[aria-label="Main"], footer')]))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.width > 0; });
    const tops = els.filter((el) => !els.some((o) => o !== el && o.contains(el)));
    const D = 520;
    tops.forEach((el, i) => {
      const delay = Math.min(i * 40, 240);
      // keep any transform the element already has (the fixed home nav is
      // centred with translateX(-50%)) and add the rise on top of it
      const base = getComputedStyle(el).transform;
      const pre = base && base !== 'none' ? base + ' ' : '';
      outs.push(el.animate([{ opacity: 1, transform: pre + 'translateY(0)' }, { opacity: 0, transform: pre + 'translateY(-28px)' }], { duration: D, delay, easing: 'cubic-bezier(0.55, 0, 0.75, 0.25)', fill: 'forwards' }));
      liquify(el, delay, D, true);
    });
    setTimeout(() => { location.href = url.href; }, D + Math.min(tops.length * 40, 240) + 40);
  }, false);
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    outs.splice(0).forEach((x) => { try { x.cancel(); } catch (_) {} });
    exited.splice(0).forEach(({ el, orig, f }) => { el.style.filter = orig; f.remove(); });
  });
}
