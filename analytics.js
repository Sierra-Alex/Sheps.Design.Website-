
// Mixpanel — loaded once per page from each page's <helmet>.
// Events:
//   Page View ($mp_web_page_view) — automatic via track_pageview
//   Button Clicked  — every <a>/<button>; tag CTAs with data-cta, data-cta-tier="primary", data-cta-location
//   Scroll Depth Reached — once per milestone (25/50/75/90/100) per page view
//   Page Left — max_scroll_percent + seconds_on_page on exit
//   Every event carries page_name ("Home", "Mixpanel case study"…) — use it for funnels instead of Current URL.
//   Only tracks on the live domain, never in previews/Vercel branch URLs or embedded iframes.
(function () {
  if (window.mixpanel && window.mixpanel.__SV) return;
  if (!/^(www\.)?sheps\.studio$/.test(location.hostname) || window.top !== window.self) return;
  var PAGES = { '/': 'Home', '/mixpanel': 'Mixpanel case study', '/coach': 'Coach case study', '/insights': 'Insights case study', '/highfive': 'Highfive case study', '/agentic-systems': 'Agentic systems', '/mixpanel-rebrand': 'Mixpanel Rebrand case study', '/coach-walkthrough': 'Coach walkthrough', '/verdant-orb': 'Verdant Orb' };
  var path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1') || '/';
  var PAGE_NAME = PAGES[path] || path.replace(/^\//, '').replace(/-/g, ' ');
  var TOKEN = '22b0e0ec324b760a60f50783cb3f0ca2';
  var CONFIG = {
    track_pageview: false, autocapture: true, persistence: 'localStorage', api_host: 'https://api-js.mixpanel.com',
    loaded: function (m) {
      m.register({ page_name: PAGE_NAME, page_path: path });
      m.track_pageview({ page_name: PAGE_NAME, page_path: path });
      // Strip fbclid/utm/etc. once Mixpanel has read them, so later events log a clean URL.
      if (location.search) try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) {}
    }
  };
  var mp = (window.mixpanel = []);
  mp.__SV = 1.2;
  mp._i = [[TOKEN, CONFIG, 'mixpanel']];
  mp.people = mp.people || [];
  'track track_pageview track_links track_forms register register_once unregister identify alias reset set_config opt_in_tracking opt_out_tracking time_event'.split(' ').forEach(function (m) {
    mp[m] = function () { mp.push([m].concat(Array.prototype.slice.call(arguments))); };
  });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
  document.head.appendChild(s);

  function track(name, props, opts) {
    try {
      props = props || {};
      props.page = path;
      props.page_name = PAGE_NAME;
      props.page_title = document.title;
      window.mixpanel.track(name, props, opts);
    } catch (e) {}
  }
  function slug(t) { return (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }

  // Clicks — delegated so it covers buttons added later and inside imported components.
  document.addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    var el = null;
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.nodeType === 1 && n.matches('a,button,[role="button"]')) { el = n; break; }
    }
    if (!el) return;
    var text = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
    var region = el.closest('nav') ? 'nav' : el.closest('footer') ? 'footer' : '';
    var section = el.closest('[data-cta-location],[data-screen-label],section[id],[id]');
    track('Button Clicked', {
      cta_id: el.getAttribute('data-cta') || slug(text) || el.tagName.toLowerCase(),
      cta_text: text.slice(0, 120),
      cta_tier: el.getAttribute('data-cta-tier') || (region === 'nav' ? 'nav' : 'secondary'),
      cta_location: el.getAttribute('data-cta-location') || region || (section && (section.getAttribute('data-screen-label') || section.id)) || 'body',
      element: el.tagName.toLowerCase(),
      destination: el.getAttribute('href') || null
    });
  }, true);

  // Scroll depth
  var MILESTONES = [25, 50, 75, 90, 100], hit = {}, maxPct = 0, start = Date.now(), ticking = false;
  function pct() {
    var d = document.scrollingElement || document.documentElement;
    var h = d.scrollHeight - window.innerHeight;
    return h <= 0 ? 100 : Math.min(100, Math.round((d.scrollTop / h) * 100));
  }
  function check() {
    ticking = false;
    var p = pct();
    if (p > maxPct) maxPct = p;
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      if (p >= m && !hit[m]) { hit[m] = 1; track('Scroll Depth Reached', { percent: m }); }
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });

  var left = false;
  function leave() {
    if (left) return; left = true;
    track('Page Left', { max_scroll_percent: maxPct, seconds_on_page: Math.round((Date.now() - start) / 1000) }, { transport: 'sendBeacon' });
  }
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); });
})();
