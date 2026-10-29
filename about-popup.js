// Global "About" pop-up: any element with [data-about] opens a two-column cream modal (copy left, photo right).
(function () {
  if (window.__aboutWired) return;
  window.__aboutWired = true;
  const ROWS = [["Sheps.Studio","Founder / Creative Director"],["Mixpanel","Principal Designer / 2018 - 2026"],["Highfive","Senior Visual Designer / 2016 - 2018"],["PagerDuty","Graphic Designer / 2015 - 2016"],["Freelance","Graphic Designer / 2014 - 2015"],["Hot Pickle","Graphic Designer / 2012 - 2014"],["Protége","Design Teacher / Mentor / 2010 - 2011"],["The Hospital Club","Artist in Residence / 2010 - 2011"]];
  let open = null, lastFocus = null;
  function close() {
    if (!open) return;
    const o = open; open = null;
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = '';
    // the same liquify, reversed, then the scrim fades
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pieces = (!still && window.__liquify && o._pieces) || [];
    pieces.forEach((el, i) => {
      const delay = Math.min(i * 30, 240);
      el.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-28px)' }], { duration: 420, delay, easing: 'cubic-bezier(0.55, 0, 0.75, 0.25)', fill: 'forwards' });
      window.__liquify(el, delay, 420, true);
    });
    const wait = pieces.length ? 420 + Math.min(pieces.length * 30, 240) : 0;
    const a = o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, delay: Math.max(0, wait - 120), easing: 'ease', fill: 'forwards' });
    a.onfinish = () => o.remove();
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  // Hover: the photo turns into the hero's halftone dot field, and the pointer drags a glyph wake through it.
  function dotWake(el, src) {
    const RAMP = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'], TOP = RAMP.length - 1, SIZE = 9;
    const cw = SIZE * 0.62, ch = SIZE * 0.82, font = '500 ' + SIZE + 'px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;';
    el.appendChild(c);
    const img = new Image(); let ok = false; img.onload = () => { ok = true; }; img.src = src;
    let W = 0, H = 0, cols = 0, rows = 0, mask = null, heat = null, ratio = 1;
    let hx = -999, hy = -999, lx = NaN, ly = NaN, near = 0, inside = false, raf = 0, deal = 0, tick = 0;
    const hash = (k, n) => { let h = (k * 374761393 + n * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const build = () => {
      const r = el.getBoundingClientRect(); W = r.width; H = r.height;
      ratio = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(W * ratio); c.height = Math.round(H * ratio);
      cols = Math.floor(W / cw - 0.5); rows = Math.floor(H / ch);
      mask = new Float32Array(cols * rows); heat = new Float32Array(cols * rows);
      const sw = cols * 2, sc = document.createElement('canvas'); sc.width = sw; sc.height = rows;
      const g = sc.getContext('2d', { willReadFrequently: true });
      const k = Math.max(W / img.width, H / img.height), pw = img.width * k, ph = img.height * k;
      g.drawImage(img, (W - pw) * 0.52 * sw / W, (H - ph) * 0.4 * rows / H, pw * sw / W, ph * rows / H);
      const px = g.getImageData(0, 0, sw, rows).data;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = (j * sw + Math.min(sw - 1, i * 2 + (j & 1))) * 4;
        const l = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) / 255;
        const m = Math.min(1, Math.max(0, (1.05 - l) / 0.9));
        mask[j * cols + i] = m < 0.08 ? 0 : 0.2 + 0.8 * Math.sqrt(m);
      }
    };
    const rad = 41;
    const stamp = (x, y) => {
      const c0 = Math.max(0, Math.floor((x - rad) / cw)), c1 = Math.min(cols - 1, Math.ceil((x + rad) / cw));
      const r0 = Math.max(0, Math.floor((y - rad) / ch)), r1 = Math.min(rows - 1, Math.ceil((y + rad) / ch));
      for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
        const dx = (i + 0.5) * cw - x, dy = (j + 0.5) * ch - y, q = (dx * dx + dy * dy) / (rad * rad);
        if (q >= 1) continue; const t = 1 - q, k = j * cols + i; heat[k] = Math.min(1, heat[k] + 0.5 * t * t);
      }
    };
    const paint = () => {
      const g = c.getContext('2d');
      g.setTransform(ratio, 0, 0, ratio, 0, 0); g.clearRect(0, 0, W, H);
      g.fillStyle = '#131313'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      const dot = Math.min(cw, ch) * 0.44, R2 = rad * rad, lean = 0.4 * near, far2 = rad * rad * 4;
      g.beginPath();
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * ch;
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i, m = mask[k];
          const cx = (i + 0.5 + (j & 1) * 0.5) * cw;
          let h = heat[k];
          if (near > 0.002) { const q = ((cx - hx) ** 2 + (y - hy) ** 2) / R2; if (q < 1) h = Math.max(h, 0.95 * near * (1 - q) * (1 - q)); }
          if (h < 0.03) continue;
          h *= 0.55 + 0.45 * m;
          let u = Math.min(1, h) * TOP + 0.5;
          if (h > 0.04) u += (hash(k, deal) - 0.5) * 1.6 * Math.min(1, h * 2);
          const idx = Math.min(TOP, Math.max(1, Math.floor(u)));
          let x = cx, yy = y;
          if (lean > 0.002) { const dx = hx - x, dy = hy - yy, d2 = dx * dx + dy * dy; if (d2 < far2) { const f = 1 - d2 / far2, d = Math.sqrt(d2) || 1, mm = Math.min(d * 0.6, 14 * lean * f * f); x += dx / d * mm; yy += dy / d * mm; } }
          g.fillStyle = 'rgba(247,243,241,' + Math.min(1, h * 3) + ')'; g.fillRect(cx - cw / 2 - 0.5, y - ch / 2 - 0.5, cw + 1, ch + 1); g.fillStyle = '#131313';
          if (m <= 0) continue;
          if (h <= 0.04 || idx === 1) { const rr = Math.max(0.45, dot * Math.sqrt(m)); g.moveTo(x + rr, yy); g.arc(x, yy, rr, 0, Math.PI * 2); continue; }
          g.fillText(RAMP[idx], x, yy);
        }
      }
      g.fill();
    };
    const run = () => {
      if (raf) return; let prev = performance.now();
      const step = (t) => {
        const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
        const keep = Math.exp(-dt * 3 / 1.2); let warm = 0;
        for (let k = 0; k < heat.length; k++) { const h = heat[k] * keep; heat[k] = h < 0.003 ? 0 : h; if (h > warm) warm = h; }
        near += ((inside ? 1 : 0) - near) * (1 - Math.pow(0.004, dt));
        tick += dt; if (tick > 0.07) { tick = 0; deal++; }
        paint();
        const still = !inside && warm === 0 && near < 0.004;
        raf = still ? 0 : requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const move = (e) => {
      if (!ok) return;
      const r = el.getBoundingClientRect();
      if (!mask || Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) build();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (Number.isNaN(lx)) { lx = x; ly = y; }
      const n = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (rad / 3)));
      for (let k = 1; k <= n; k++) stamp(lx + (x - lx) * k / n, ly + (y - ly) * k / n);
      lx = x; ly = y; hx = x; hy = y; inside = true; c.style.opacity = '1';
      run();
    };
    el.addEventListener('pointerenter', (e) => { lx = NaN; move(e); });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { inside = false; lx = NaN; run(); });
  }
  function show(trigger) {
    if (open) return;
    lastFocus = trigger;
    const o = document.createElement('div');
    o.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(19,19,19,0.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-family:'Inter',sans-serif;";
    const P = "margin:0;color:#6F6F6F;font-size:16px;font-weight:400;line-height:150%;letter-spacing:0.01em;text-wrap:pretty;";
    const MP = /\.dc\.html$/.test(decodeURIComponent(location.pathname)) ? 'Case Study - Mixpanel.dc.html' : '/mixpanel';
    const LNK = (href, txt, ext) => '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' style="color:#131313;text-decoration:underline dotted #131313;text-decoration-thickness:1.5px;text-underline-offset:4px;" onmouseenter="this.style.textDecorationStyle=\'solid\'" onmouseleave="this.style.textDecorationStyle=\'dotted\'">' + txt + '</a>';
    o.innerHTML = '<div role="dialog" aria-modal="true" aria-label="About Alex Shepherd" style="position:relative;width:100%;max-width:1200px;max-height:calc(100vh - 32px);overflow:auto;padding:40px;border-radius:8px;background:#F7F3F1;box-shadow:0 24px 64px rgba(19,19,19,0.2);">'
      + '<button type="button" data-about-close aria-label="Close" style="position:absolute;z-index:2;top:6px;right:6px;display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;background:transparent;color:#6F6F6F;cursor:pointer;"><svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></button>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 340px), 1fr));gap:40px;align-items:stretch;">'
      + '<div data-about-copy style="display:flex;flex-direction:column;gap:16px;min-width:0;">'
      + '<p style="' + P + 'color:#131313;font-weight:600;">I’m Alex Shepherd, an interactive designer and creative director. For&nbsp;the past 15 years I’ve worked across in-house teams and external projects, partnering with companies like ' + LNK(MP, 'Mixpanel') + ', ' + LNK('https://www.pagerduty.com', 'PagerDuty', 1) + ', ' + LNK('https://www.mattel.com', 'Mattel', 1) + ' and ' + LNK('https://www.unilever.com', 'Unilever', 1) + ', and helping startups build and scale their brands and&nbsp;products.</p>'
      + '<p style="' + P + '">My focus is creating memorable brand moments and building customer loyalty through consistent, meaningful engagement. That only works when the foundation is strong. A well-crafted system is what lets a brand scale without losing what makes it&nbsp;unique.</p>'
      + '<p style="' + P + '">In the age of AI, that foundation matters more than ever. That’s why I founded ' + LNK('https://sheps.studio', 'Sheps.Studio', 1) + ', a consultancy that builds agentic design systems and AI tooling so teams can scale&nbsp;consistently.</p>'
      + '<p style="' + P + '">AI speeds up production, but it doesn’t replace design thinking. Design and craft are still at the heart of my practice. I believe the best work comes from pairing strong design fundamentals with tools that let teams move&nbsp;faster.</p>'
      + '<div style="display:flex;flex-direction:column;margin-top:16px;"><div style="padding:0 0 8px;color:#131313;font-size:14px;font-weight:500;line-height:140%;">Experience</div>'
      + ROWS.map(([a, b]) => '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 16px;padding:8px 0;border-top:1px solid #E1DDDC;"><span style="color:#131313;font-size:14px;line-height:140%;">' + a + '</span><span style="color:#6F6F6F;font-size:14px;line-height:140%;">' + b + '</span></div>').join('')
      + '</div>'
      + '<a href="mailto:alex@sheps.studio" data-copy-email="alex@sheps.studio" data-copy-tip="above" data-cta-location="about" onmouseenter="this.style.background=\'#CAE9DF\'" onmouseleave="this.style.background=\'#E9E4E1\'" title="Copy email address" style="align-self:flex-start;margin-top:16px;display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:4px;background:#E9E4E1;color:#131313;cursor:pointer;transition:background-color 0.15s ease;font-size:14px;font-weight:500;line-height:130%;letter-spacing:0.02em;text-decoration:none;">Let\'s Chat</a>'
      + '</div>'
      + '<div data-about-photo style="position:relative;min-width:0;min-height:360px;cursor:crosshair;border-radius:4px;overflow:hidden;"><img src="assets/about/alex.jpg" alt="Alex Shepherd" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:52% 40%;filter:grayscale(1) contrast(1.05);"></div>'
      + '</div></div>';
    document.body.appendChild(o);
    open = o;
    // wide screens: copy column scrolls on its own, photo stays put
    if (matchMedia('(min-width: 808px)').matches) {
      const dlg = o.querySelector('[role="dialog"]'), copy = o.querySelector('[data-about-copy]');
      dlg.style.overflow = 'hidden';
      copy.style.cssText += 'max-height:calc(100vh - 112px);overflow-y:auto;overscroll-behavior:contain;padding-right:16px;margin-right:-16px;scrollbar-width:thin;scrollbar-color:#C9C4C2 transparent;';
    }
    document.documentElement.style.overflow = 'hidden';
    o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-about-close]')) close(); });
    const btn = o.querySelector('[data-about-close]');
    btn.addEventListener('mouseenter', () => { btn.style.color = '#131313'; });
    btn.addEventListener('mouseleave', () => { btn.style.color = '#6F6F6F'; });
    const ph = o.querySelector('[data-about-photo]');
    // the photo swipes in left to right once it has loaded; the leading edge
    // is a band of pixel blocks, coarse at the front and finer behind, that
    // resolve into the photo as the swipe passes
    const pimg = ph && ph.querySelector('img');
    if (pimg) {
      pimg.style.clipPath = 'inset(0 100% 0 0)';
      const swipe = () => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { pimg.style.clipPath = ''; return; }
        const r = ph.getBoundingClientRect(), W = r.width, H = r.height, dpr = Math.min(2, window.devicePixelRatio || 1);
        const cv = document.createElement('canvas');
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.setAttribute('aria-hidden', 'true');
        cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        ph.appendChild(cv);
        const g = cv.getContext('2d');
        // the photo as it's shown (cover, 52% 40%), at three block sizes
        const k = Math.max(W / pimg.naturalWidth, H / pimg.naturalHeight), pw = pimg.naturalWidth * k, phh = pimg.naturalHeight * k;
        const dx = (W - pw) * 0.52, dy = (H - phh) * 0.4;
        const tiers = [8, 16, 32].map((b) => {
          const sw = Math.ceil(W / b), sh = Math.ceil(H / b), sc = document.createElement('canvas');
          sc.width = sw; sc.height = sh;
          const sx = sc.getContext('2d');
          sx.filter = 'grayscale(1) contrast(1.05)';
          sx.drawImage(pimg, dx / b, dy / b, pw / b, phh / b);
          return { b, sc };
        });
        const BAND = 40, TOTAL = BAND * tiers.length, D = 1100, t0 = performance.now() + 250;
        const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
        const step = (now) => {
          const u = Math.min(1, Math.max(0, (now - t0) / D)), e = ease(u) * (W + TOTAL);
          pimg.style.clipPath = 'inset(0 ' + Math.max(0, W - (e - TOTAL)).toFixed(1) + 'px 0 0)';
          g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
          tiers.forEach((t, i) => {
            const x0 = Math.max(0, e - TOTAL + i * BAND), x1 = Math.min(W, e - TOTAL + (i + 1) * BAND);
            if (x1 <= x0) return;
            g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, H); g.clip();
            g.drawImage(t.sc, 0, 0, t.sc.width * t.b, t.sc.height * t.b);
            g.restore();
          });
          if (u < 1) requestAnimationFrame(step); else { pimg.style.clipPath = ''; cv.remove(); }
        };
        requestAnimationFrame(step);
      };
      if (pimg.complete && pimg.naturalWidth) swipe(); else pimg.addEventListener('load', swipe, { once: true });
    }
    if (ph && !matchMedia('(prefers-reduced-motion: reduce)').matches) dotWake(ph, 'assets/about/alex.jpg');
    document.addEventListener('keydown', onKey, true);
    o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
    // the site's liquify load, piece by piece: copy, experience rows, button, photo
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const all = Array.from(new Set(o.querySelectorAll('[role="dialog"] > div > div > *, [data-about-photo]')));
    const pieces = all.filter((el) => !all.some((p) => p !== el && p.contains(el)));
    o._pieces = pieces;
    if (!still && window.__liquify) pieces.forEach((el, i) => {
      const delay = Math.min(i * 50, 500);
      el.animate([{ opacity: 0, transform: 'translateY(-28px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 900, delay, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'backwards' });
      window.__liquify(el, delay, 1080);
    });
    o.firstChild.animate([{ transform: 'translateY(12px) scale(0.98)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    btn.focus();
    window.mixpanel && window.mixpanel.track('About opened', { page: location.pathname });
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-about]');
    if (!el) return;
    e.preventDefault();
    show(el);
  }, true);
})();
