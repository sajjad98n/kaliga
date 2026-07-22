(() => {
  'use strict';
  if (window.__KALIGA_ASSISTANT_LOADED__) return;
  window.__KALIGA_ASSISTANT_LOADED__ = true;

  const CONFIG_SRC = '/gol-koochik/config.js?v=8';
  const MAX_MESSAGE = 500;
  const MAX_HISTORY = 8;
  const STORAGE_KEY = 'kaliga-ai-chat-v1';
  const DEVICE_KEY = 'kaliga-ai-device-v1';

  const css = `
  #kaliga-ai-root{font-family:Tahoma,Arial,sans-serif;direction:rtl;position:fixed;z-index:2147483000;left:18px;bottom:18px;color:#eef5ff}
  .kaliga-ai-launch{width:58px;height:58px;border:0;border-radius:50%;cursor:pointer;background:linear-gradient(145deg,#22c55e,#0f9d58);color:#06120b;box-shadow:0 14px 40px rgba(0,0,0,.42);font-size:25px;display:grid;place-items:center;font-weight:900}
  .kaliga-ai-launch:focus-visible,.kaliga-ai-close:focus-visible,.kaliga-ai-send:focus-visible,.kaliga-ai-chip:focus-visible{outline:3px solid #facc15;outline-offset:2px}
  .kaliga-ai-panel{position:absolute;left:0;bottom:72px;width:min(380px,calc(100vw - 24px));height:min(610px,calc(100vh - 110px));background:#07111f;border:1px solid rgba(148,163,184,.28);border-radius:22px;box-shadow:0 28px 80px rgba(0,0,0,.55);overflow:hidden;display:none;grid-template-rows:auto 1fr auto}
  .kaliga-ai-panel.is-open{display:grid}
  .kaliga-ai-head{display:flex;align-items:center;gap:10px;padding:14px 15px;background:linear-gradient(120deg,#0a1a2a,#0f2d22);border-bottom:1px solid rgba(148,163,184,.2)}
  .kaliga-ai-mark{width:40px;height:40px;border-radius:13px;background:#22c55e;color:#05110a;display:grid;place-items:center;font-size:20px;font-weight:900}
  .kaliga-ai-title{flex:1;min-width:0}.kaliga-ai-title strong{display:block;font-size:15px}.kaliga-ai-title span{display:block;color:#a9b8ca;font-size:11px;margin-top:2px}
  .kaliga-ai-close{border:0;background:transparent;color:#dbe7f5;font-size:25px;cursor:pointer;padding:4px 7px}
  .kaliga-ai-body{overflow:auto;padding:14px;background:radial-gradient(circle at 20% 0,rgba(34,197,94,.08),transparent 35%),#07111f;scroll-behavior:smooth}
  .kaliga-ai-msg{max-width:88%;padding:10px 12px;border-radius:15px;margin:0 0 10px;white-space:pre-wrap;line-height:1.75;font-size:13px;word-break:break-word}
  .kaliga-ai-msg.bot{margin-left:auto;background:#112235;border:1px solid rgba(148,163,184,.17);border-bottom-right-radius:5px}
  .kaliga-ai-msg.user{margin-right:auto;background:#176b3a;color:#fff;border-bottom-left-radius:5px}
  .kaliga-ai-msg.error{background:#3b1820;border-color:#ef4444;color:#fecaca}
  .kaliga-ai-thinking{display:inline-flex;gap:4px}.kaliga-ai-thinking i{width:6px;height:6px;background:#9fb0c2;border-radius:50%;animation:kaligaAiPulse 1s infinite alternate}.kaliga-ai-thinking i:nth-child(2){animation-delay:.2s}.kaliga-ai-thinking i:nth-child(3){animation-delay:.4s}@keyframes kaligaAiPulse{to{opacity:.25;transform:translateY(-3px)}}
  .kaliga-ai-suggestions{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 12px}.kaliga-ai-chip{border:1px solid rgba(34,197,94,.45);background:rgba(34,197,94,.08);color:#dfffea;border-radius:999px;padding:7px 10px;font:inherit;font-size:11px;cursor:pointer}
  .kaliga-ai-foot{padding:10px;background:#091725;border-top:1px solid rgba(148,163,184,.18)}
  .kaliga-ai-warning{font-size:10px;color:#9fb0c2;margin:0 2px 7px;line-height:1.5}
  .kaliga-ai-form{display:flex;gap:8px;align-items:flex-end}.kaliga-ai-input{flex:1;resize:none;min-height:43px;max-height:110px;border-radius:13px;border:1px solid rgba(148,163,184,.35);background:#06101b;color:#fff;padding:10px 11px;font:inherit;line-height:1.55}.kaliga-ai-input::placeholder{color:#72859a}.kaliga-ai-send{border:0;border-radius:13px;background:#22c55e;color:#041109;min-width:55px;height:43px;font:inherit;font-weight:800;cursor:pointer}.kaliga-ai-send:disabled{opacity:.55;cursor:wait}
  @media(max-width:520px){#kaliga-ai-root{left:10px;bottom:10px}.kaliga-ai-panel{position:fixed;inset:8px;width:auto;height:auto;bottom:82px;border-radius:18px}.kaliga-ai-launch{width:55px;height:55px}}
  `;

  const style = document.createElement('style');
  style.id = 'kaliga-ai-style';
  style.textContent = css;
  document.head.appendChild(style);

  function node(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function getDeviceId() {
    try {
      let value = localStorage.getItem(DEVICE_KEY);
      if (!value) {
        value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_KEY, value);
      }
      return value;
    } catch {
      return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
    } catch { return []; }
  }

  function saveHistory(history) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch {}
  }

  async function ensureConfig() {
    if (window.KALIGA_GOL_CONFIG?.supabaseUrl && window.KALIGA_GOL_CONFIG?.supabaseAnonKey) return window.KALIGA_GOL_CONFIG;
    await new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(s => s.src.includes('/gol-koochik/config.js'));
      if (existing) {
        const started = Date.now();
        const timer = setInterval(() => {
          if (window.KALIGA_GOL_CONFIG) { clearInterval(timer); resolve(); }
          else if (Date.now() - started > 6000) { clearInterval(timer); reject(new Error('تنظیمات سایت بارگذاری نشد.')); }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.src = CONFIG_SRC;
      script.onload = resolve;
      script.onerror = () => reject(new Error('فایل تنظیمات سایت در دسترس نیست.'));
      document.head.appendChild(script);
    });
    if (!window.KALIGA_GOL_CONFIG) throw new Error('تنظیمات اتصال راهنما پیدا نشد.');
    return window.KALIGA_GOL_CONFIG;
  }

  const root = node('div'); root.id = 'kaliga-ai-root';
  const launch = node('button', 'kaliga-ai-launch', '؟');
  launch.type = 'button'; launch.setAttribute('aria-label', 'بازکردن راهنمای هوشمند کالیگا');
  const panel = node('section', 'kaliga-ai-panel'); panel.setAttribute('aria-label', 'راهنمای هوشمند کالیگا');
  const head = node('header', 'kaliga-ai-head');
  const mark = node('div', 'kaliga-ai-mark', 'K');
  const title = node('div', 'kaliga-ai-title'); title.append(node('strong', '', 'راهنمای هوشمند کالیگا'), node('span', '', 'ثبت‌نام، مسابقات و آمار فصل‌ها'));
  const close = node('button', 'kaliga-ai-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'بستن راهنما');
  head.append(mark, title, close);
  const body = node('div', 'kaliga-ai-body');
  const foot = node('footer', 'kaliga-ai-foot');
  const warning = node('p', 'kaliga-ai-warning', 'رمز، کد ملی، شماره کارت و اطلاعات خصوصی را در چت وارد نکنید.');
  const form = node('form', 'kaliga-ai-form');
  const input = node('textarea', 'kaliga-ai-input'); input.rows = 1; input.maxLength = MAX_MESSAGE; input.placeholder = 'سؤالت را درباره کالیگا بنویس…';
  const send = node('button', 'kaliga-ai-send', 'ارسال'); send.type = 'submit';
  form.append(input, send); foot.append(warning, form); panel.append(head, body, foot); root.append(panel, launch); document.body.appendChild(root);

  let history = loadHistory();
  let busy = false;

  function scrollBottom() { body.scrollTop = body.scrollHeight; }
  function addMessage(role, text, extra = '') {
    const msg = node('div', `kaliga-ai-msg ${role === 'user' ? 'user' : 'bot'} ${extra}`.trim(), text);
    body.appendChild(msg); scrollBottom(); return msg;
  }
  function addThinking() {
    const msg = node('div', 'kaliga-ai-msg bot');
    const dots = node('span', 'kaliga-ai-thinking'); dots.append(node('i'), node('i'), node('i')); msg.appendChild(dots); body.appendChild(msg); scrollBottom(); return msg;
  }
  function addSuggestions() {
    const wrap = node('div', 'kaliga-ai-suggestions');
    ['ثبت‌نام گل‌کوچک چطور است؟','چه مدارکی لازم است؟','جدول فصل ۱۴۰۴','رمزم را فراموش کردم'].forEach(label => {
      const chip = node('button', 'kaliga-ai-chip', label); chip.type = 'button';
      chip.addEventListener('click', () => { input.value = label; form.requestSubmit(); });
      wrap.appendChild(chip);
    });
    body.appendChild(wrap);
  }

  if (history.length) history.forEach(item => addMessage(item.role, item.content));
  else {
    addMessage('assistant', 'سلام! من راهنمای کالیگا هستم. درباره ثبت‌نام گل‌کوچک، قوانین و آمار فصل ۱۴۰۴ از من بپرس.');
    addSuggestions();
  }

  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    launch.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => input.focus(), 80);
  }
  launch.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
  close.addEventListener('click', () => setOpen(false));
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 110)}px`; });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const message = input.value.trim();
    if (message.length < 2) return;
    busy = true; send.disabled = true; input.disabled = true;
    addMessage('user', message); input.value = ''; input.style.height = 'auto';
    const thinking = addThinking();
    try {
      const config = await ensureConfig();
      const endpoint = `${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/kaliga-assistant`;
      const payloadHistory = history.slice(-6).map(item => ({ role: item.role, content: String(item.content).slice(0, 800) }));
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        },
        body: JSON.stringify({ message, history: payloadHistory, device_id: getDeviceId(), page: location.pathname })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'راهنما موقتاً پاسخ‌گو نیست.');
      const answer = String(data.answer || '').trim() || 'پاسخی دریافت نشد.';
      thinking.remove(); addMessage('assistant', answer);
      history.push({ role: 'user', content: message }, { role: 'assistant', content: answer });
      history = history.slice(-MAX_HISTORY); saveHistory(history);
    } catch (error) {
      thinking.remove(); addMessage('assistant', error.message || 'ارتباط با راهنما برقرار نشد.', 'error');
    } finally {
      busy = false; send.disabled = false; input.disabled = false; input.focus();
    }
  });
})();
