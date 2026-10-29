// Global "copy email" behaviour: any element with [data-copy-email] copies the
// address on click and shows a small "Email copied" tip below it.
(function () {
  if (window.__copyEmailWired) return;
  window.__copyEmailWired = true;
  const ADDR = 'alex@sheps.studio';
  const copy = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback.bind(null, text));
    fallback(text); return Promise.resolve();
  };
  function fallback(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
  }
  function tip(el) {
    const r = el.getBoundingClientRect();
    const up = el.getAttribute('data-copy-tip') === 'above';
    const t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.style.cssText = "position:fixed;z-index:1001;left:" + (r.left + r.width / 2) + "px;top:" + (up ? r.top - 12 : r.bottom + 12) + "px;transform:translateX(-50%)" + (up ? " translateY(-100%)" : "") + ";display:flex;align-items:center;gap:6px;padding:6px 10px 6px 6px;border-radius:4px;background:#E9E4E180;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:" + (el.getAttribute('data-copy-theme') === 'dark' ? '#F7F3F1' : '#131313') + ";font-family:'Inter',sans-serif;font-size:12px;font-weight:500;line-height:130%;letter-spacing:0.02em;white-space:nowrap;pointer-events:none;";
    t.innerHTML = '<span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:999px;background:#CAE9DF;"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.2 L4.1 7.2 L8 3" stroke="#131313" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10" stroke-dashoffset="10"></path></svg></span><span>Email copied</span>';
    document.body.appendChild(t);
    const circle = t.firstChild, path = t.querySelector('path');
    t.animate([{ opacity: 0, transform: up ? 'translate(-50%, calc(-100% + 4px))' : 'translate(-50%, -4px)' }, { opacity: 1, transform: up ? 'translate(-50%, -100%)' : 'translate(-50%, 0)' }], { duration: 200, easing: 'ease', fill: 'forwards' });
    circle.animate([{ transform: 'scale(0.4)' }, { transform: 'scale(1)' }], { duration: 300, delay: 50, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' });
    path.animate([{ strokeDashoffset: 10 }, { strokeDashoffset: 0 }], { duration: 350, delay: 180, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => {
      const out = t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease', fill: 'forwards' });
      out.onfinish = () => t.remove();
    }, 1800);
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-copy-email]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    copy(el.getAttribute('data-copy-email') || ADDR).then(() => tip(el));
    window.mixpanel && window.mixpanel.track('Email copied', { page: location.pathname, location: el.getAttribute('data-cta-location') || '' });
  }, true);
})();
