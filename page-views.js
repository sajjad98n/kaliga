(() => {
  'use strict';

  const VISITOR_KEY = 'kaliga_player_id';
  const USERNAME_KEY = 'kaliga_username_V2';

  function getVisitorId() {
    try {
      let visitorId = localStorage.getItem(VISITOR_KEY);

      if (!visitorId) {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          visitorId = `plr_${window.crypto.randomUUID()}`;
        } else {
          visitorId = `plr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        }

        localStorage.setItem(VISITOR_KEY, visitorId);
      }

      return visitorId;
    } catch (error) {
      console.warn('ساخت شناسه بازدیدکننده انجام نشد:', error);
      return `plr_guest_${Date.now().toString(36)}`;
    }
  }

  function getSavedUsername() {
    try {
      return (localStorage.getItem(USERNAME_KEY) || '').trim() || null;
    } catch {
      return null;
    }
  }

  function findSupabaseClient() {
    if (window.KaligaGol && window.KaligaGol.client) {
      return window.KaligaGol.client;
    }

    try {
      // صفحه اصلی قبلاً متغیر db را می‌سازد.
      if (typeof db !== 'undefined' && db && typeof db.from === 'function') {
        return db;
      }
    } catch {
      // در صفحاتی که db وجود ندارد، از KaligaGol استفاده می‌شود.
    }

    return null;
  }

  async function waitForClient() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const client = findSupabaseClient();
      if (client) return client;
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return null;
  }

  async function recordPageView() {
    const client = await waitForClient();

    if (!client) {
      console.warn('ثبت بازدید انجام نشد: اتصال Supabase در این صفحه پیدا نشد.');
      return;
    }

    const payload = {
      visitor_id: getVisitorId(),
      username: getSavedUsername(),
      page_path: window.location.pathname || '/',
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null
    };

    try {
      const { error } = await client
        .from('page_views')
        .insert(payload);

      if (error) throw error;
    } catch (error) {
      console.error('خطا در ثبت بازدید کالیگا:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordPageView, { once: true });
  } else {
    recordPageView();
  }
})();
