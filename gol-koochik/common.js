(() => {
  'use strict';

  const config = window.KALIGA_GOL_CONFIG;
  if (!config || !window.supabase) {
    throw new Error('پیکربندی Supabase بارگذاری نشده است.');
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const statusLabels = Object.freeze({
    incomplete: 'ثبت‌نام ناقص',
    awaiting_payment: 'منتظر ارسال فیش واریزی',
    payment_submitted: 'فیش ارسال شده؛ در انتظار بررسی',
    approved: 'ثبت‌نام تأیید شده',
    needs_correction: 'نیازمند اصلاح مدارک',
    rejected: 'ثبت‌نام رد شده'
  });

  const faToEnMap = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
  const enToFaMap = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

  function toEnglishDigits(value) {
    return String(value ?? '').replace(/[۰-۹٠-٩]/g, ch => faToEnMap[ch] ?? ch);
  }

  function toPersianDigits(value) {
    return String(value ?? '').replace(/\d/g, d => enToFaMap[Number(d)]);
  }

  function normalizeIdentifier(value) {
    return toEnglishDigits(value)
      .trim()
      .toLowerCase()
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u200c\u200f\u202a-\u202e]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function accountEmail(type, username) {
    const normalized = normalizeIdentifier(username);
    const hash = await sha256Hex(`${type}:${normalized}`);
    return `${type}-${hash.slice(0, 40)}@${config.accountDomain}`;
  }

  function safeExtension(file) {
    const byType = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf'
    };
    return byType[file?.type] || 'bin';
  }

  function validateFile(file, maxMegabytes = 6) {
    if (!file) return 'فایلی انتخاب نشده است.';
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) return 'فقط فایل JPG، PNG یا PDF قابل قبول است.';
    if (file.size > maxMegabytes * 1024 * 1024) return `حجم فایل نباید بیشتر از ${toPersianDigits(maxMegabytes)} مگابایت باشد.`;
    return '';
  }

  function setMessage(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
  }

  function formatToman(value) {
    const number = Number(value || 0);
    return `${new Intl.NumberFormat('fa-IR').format(number)} تومان`;
  }

  function formatDateTime(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(new Date(value));
    } catch (_) {
      return value;
    }
  }

  function registrationIsOpen(settings) {
    if (!settings?.registration_open) return false;
    return Date.now() <= new Date(settings.registration_deadline).getTime();
  }

  async function getSettings() {
    const { data, error } = await client.from('gol_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return data;
  }

  async function currentSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function requireSession(redirectUrl) {
    const session = await currentSession();
    if (!session) {
      window.location.replace(redirectUrl);
      return null;
    }
    return session;
  }

  async function signedUrl(path, expiresIn = 300) {
    if (!path) return null;
    const { data, error } = await client.storage.from(config.storageBucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }

  async function checkDocumentLink(anchor, path) {
    if (!anchor) return;
    try {
      const response = await fetch(path, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) throw new Error('not found');
      anchor.href = path;
      anchor.classList.remove('disabled-link');
      anchor.removeAttribute('aria-disabled');
      anchor.textContent = 'مشاهده و دانلود شیوه‌نامه مسابقات 📄';
    } catch (_) {
      anchor.removeAttribute('href');
      anchor.classList.add('disabled-link');
      anchor.setAttribute('aria-disabled', 'true');
      anchor.textContent = 'شیوه‌نامه هنوز منتشر نشده است';
    }
  }

  window.KaligaGol = Object.freeze({
    client,
    config,
    statusLabels,
    toEnglishDigits,
    toPersianDigits,
    normalizeIdentifier,
    accountEmail,
    safeExtension,
    validateFile,
    setMessage,
    formatToman,
    formatDateTime,
    registrationIsOpen,
    getSettings,
    currentSession,
    requireSession,
    signedUrl,
    checkDocumentLink
  });
})();
