// Subtle load/scroll-in animation. Uses the Web Animations API so it never
// fights React-managed inline styles; nothing persists after an element plays.
const seen = new WeakSet();
let io = null;

function play(el) {
  const a = el.__revealAnim;
  if (!a) return;
  el.__revealAnim = null;
  a.play();
}

export function reveal(selector, root) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const scope = root || document;
  const els = Array.from(scope.querySelectorAll(selector)).filter((el) => !seen.has(el));
  if (!els.length) return;
  if (!io) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        play(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  }
  const groupIndex = new Map();
  for (const el of els) {
    seen.add(el);
    const parent = el.parentElement;
    const i = groupIndex.get(parent) || 0;
    groupIndex.set(parent, i + 1);
    // Linear-style: soft blur + short rise, long ease-out tail, tight stagger
    const delay = Math.min(i * 90, 540);
    const media = el.tagName === 'CANVAS' || el.tagName === 'IFRAME';
    const frames = media
      ? [{ opacity: 0, filter: 'blur(12px)' }, { opacity: 1, filter: 'blur(0px)' }]
      : [{ opacity: 0, transform: 'translateY(20px)', filter: 'blur(10px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }];
    const anim = el.animate(frames, { duration: media ? 1600 : 1000, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
    anim.pause();
    el.__revealAnim = anim;
    io.observe(el);
  }
}
