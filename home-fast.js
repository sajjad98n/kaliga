/* KALIGA entrance performance v1. No Supabase SDK on the landing page.
   Compatible with existing public.feedbacks insert policy and page_views schema. */
(() => {
  'use strict';
  const cfg = window.KALIGA_GOL_CONFIG;
  const form = document.getElementById('suggestion-form');
  const status = document.getElementById('form-status');
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !form || !status) {
    if (status) { status.textContent = 'اتصال ارسال پیشنهاد آماده نیست؛ لطفاً صفحه را دوباره بارگذاری کنید.'; status.style.color='#fca5a5'; }
    return;
  }
  const post = async (table, data, signal) => {
    const base = cfg.supabaseUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabaseAnonKey,
        'Authorization': `Bearer ${cfg.supabaseAnonKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data),
      ...(signal ? {signal} : {}),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Supabase REST ${table}: ${response.status}`);
  };
  const button = form.querySelector('.submit');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const message = document.getElementById('message').value.trim();
    status.style.color = '#86efac';
    status.textContent = '';
    if (!message || message.length > 1500) {
      status.style.color = '#fca5a5';
      status.textContent = message ? 'متن پیشنهاد نباید بیشتر از ۱۵۰۰ نویسه باشد.' : 'لطفاً متن پیشنهاد را وارد کنید.';
      return;
    }
    const feedbackBody = [contact ? `راه ارتباطی: ${contact}` : null,'بخش: صفحه اصلی سایت','',message].filter(x => x !== null).join('\n');
    button.disabled = true;
    button.textContent = 'در حال ثبت...';
    status.textContent = 'لطفاً چند لحظه صبر کنید.';
    try {
      await post('feedbacks', {username:name || null, body:feedbackBody});
      form.reset();
      status.textContent = 'پیشنهاد شما با موفقیت ثبت شد. ممنون که به بهترشدن کالیگا کمک می‌کنید 💚';
    } catch (error) {
      console.error('Feedback submission failed:', error);
      status.style.color = '#fca5a5';
      status.textContent = 'ثبت پیشنهاد انجام نشد. لطفاً اتصال اینترنت را بررسی و دوباره تلاش کنید.';
    } finally {
      button.disabled = false;
      button.textContent = 'ارسال پیشنهاد ✉️';
    }
  });

  // Analytics is non-critical: do not block the homepage on it or on a CDN.
  const VISITOR_KEY='kaliga_player_id';
  const USERNAME_KEY='kaliga_username_V2';
  const getLocal = key => {try { return localStorage.getItem(key); } catch {return null;}};
  const getVisitor = () => {
    let id = getLocal(VISITOR_KEY);
    if (id) return id;
    id = 'plr_' + (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)+Date.now().toString(36));
    try {localStorage.setItem(VISITOR_KEY,id);} catch {};
    return id;
  };
  const logView = async () => {
    try {
      await post('page_views', {
        visitor_id: getVisitor(),
        username: getLocal(USERNAME_KEY)?.trim() || null,
        page_path: location.pathname || '/',
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null
      });
    } catch (err) { console.warn('Landing view logging unavailable:', err?.message); }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(logView, {timeout:3500});
  else setTimeout(logView, 1200);
})();

(() => {
  'use strict';

  /* Prefetch only likely *public static pages*, never personal data or API calls.
     Browser may use this hint for the next full-page navigation. */
  const shouldAvoidPrefetch = () => {
    const network = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(network?.saveData || /^(slow-2g|2g)$/.test(network?.effectiveType || ''));
  };
  if (!shouldAvoidPrefetch()) {
    const destinations = new Set(['/1405/', '/1404/', '/gol-koochik/']);
    const prefetched = new Set();
    let fontsWarmed = false;
    const prefetch = pathname => {
      if (!destinations.has(pathname) || prefetched.has(pathname) || document.visibilityState !== 'visible') return;
      prefetched.add(pathname);
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = pathname;
      hint.as = 'document';
      hint.fetchPriority = 'low';
      document.head.appendChild(hint);
    };
    const warmFontsForSeason = () => {
      if (fontsWarmed) return;
      fontsWarmed = true;
      // Only when the user shows interest in this destination: no global font requests.
      for (const [origin, isCors] of [
        ['https://fonts.googleapis.com', false],
        ['https://fonts.gstatic.com', true]
      ]) {
        const hint = document.createElement('link');
        hint.rel = 'preconnect';
        hint.href = origin;
        if (isCors) hint.crossOrigin = 'anonymous';
        document.head.appendChild(hint);
      }
    };
    document.querySelectorAll('.choices a[href]').forEach(anchor => {
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || !destinations.has(url.pathname)) return;
      const onIntent = () => {
        prefetch(url.pathname);
        if (url.pathname === '/1405/') warmFontsForSeason();
      };
      anchor.addEventListener('pointerenter', onIntent, {passive:true});
      anchor.addEventListener('focus', onIntent, {passive:true});
      anchor.addEventListener('touchstart', onIntent, {passive:true, once:true});
    });
    // Warm only the most likely next document when landing finishes loading.
    // Low-priority and delayed: do not compete with first paint or landing images.
    const warmPrimaryWhenIdle = () => {
      const warm = () => prefetch('/1405/');
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warm, {timeout:3500});
      } else {
        window.setTimeout(warm, 1400);
      }
    };
    if (document.readyState === 'complete') warmPrimaryWhenIdle();
    else window.addEventListener('load', warmPrimaryWhenIdle, {once:true});
  }
})();
