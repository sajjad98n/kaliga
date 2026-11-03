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
