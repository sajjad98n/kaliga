(async () => {
  'use strict';
  const K = window.KaligaGol;
  const loginPanel = document.getElementById('login-panel');
  const dashboard = document.getElementById('dashboard');
  const logoutButton = document.getElementById('logout-button');
  const loginForm = document.getElementById('admin-login');
  const loginMessage = document.getElementById('login-message');
  const teamsList = document.getElementById('teams-list');
  let settings;
  let teams = [];


  async function isAdmin(userId) {
    const { data, error } = await K.client.from('gol_admins').select('user_id,username').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  function toLocalInputValue(iso) {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  async function showDashboard(session) {
    const allowed = await isAdmin(session.user.id);
    if (!allowed) {
      await K.client.auth.signOut();
      K.setMessage(loginMessage, 'این حساب دسترسی مدیریتی ندارد.', 'error');
      return;
    }
    loginPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');
    logoutButton.classList.remove('hidden');
    await loadSettings();
    await loadTeams();
  }

  async function loadSettings() {
    settings = await K.getSettings();
    document.getElementById('registration-open').checked = settings.registration_open;
    document.getElementById('deadline-input').value = toLocalInputValue(settings.registration_deadline);
    document.getElementById('deadline-label').value = settings.deadline_label;
    document.getElementById('minimum-age').value = settings.min_age;
    document.getElementById('fee-input').value = settings.fee_toman;
    document.getElementById('bank-account').value = settings.bank_account || '';
    document.getElementById('account-holder').value = settings.account_holder || '';
  }

  function createText(tag, text, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  async function openPrivate(path) {
    try {
      const url = await K.signedUrl(path, 300);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      console.error(error);
      alert('بازکردن فایل ممکن نشد.');
    }
  }

  function fileButton(label, path) {
    const button = createText('button', label, 'mini-link');
    button.type = 'button';
    if (!path) {
      button.disabled = true;
      button.textContent += ' ـ ثبت نشده';
    } else {
      button.addEventListener('click', () => openPrivate(path));
    }
    return button;
  }

  function renderTeams() {
    teamsList.textContent = '';
    document.getElementById('team-count').textContent = `${K.toPersianDigits(teams.length)} تیم`;
    if (!teams.length) {
      teamsList.appendChild(createText('div', 'هنوز تیمی ثبت‌نام نکرده است.', 'empty'));
      return;
    }

    teams.forEach(team => {
      const card = document.createElement('article');
      card.className = 'team-admin-card';
      const head = document.createElement('div');
      head.className = 'team-admin-head';
      const info = document.createElement('div');
      info.appendChild(createText('h3', team.team_name));
      info.appendChild(createText('p', `تماس کاپیتان: ${K.toPersianDigits(team.captain_phone)} • ثبت: ${K.formatDateTime(team.created_at)}`));
      const badge = createText('span', K.statusLabels[team.status] || team.status, `status-badge ${team.status}`);
      head.append(info, badge); card.appendChild(head);

      const players = [...(team.gol_players || [])].sort((a, b) => a.player_order - b.player_order);
      const tableWrap = document.createElement('div');
      tableWrap.className = 'table-wrap';
      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      ['نقش','نام','نام پدر','شماره ملی','تولد','بیمه'].forEach(label => hr.appendChild(createText('th', label)));
      thead.appendChild(hr); table.appendChild(thead);
      const tbody = document.createElement('tbody');
      players.forEach(player => {
        const tr = document.createElement('tr');
        const values = [
          player.is_captain ? 'کاپیتان' : `بازیکن ${K.toPersianDigits(player.player_order)}`,
          player.full_name,
          player.father_name,
          K.toPersianDigits(player.national_id),
          `${K.toPersianDigits(player.birth_year)}/${K.toPersianDigits(String(player.birth_month).padStart(2,'0'))}/${K.toPersianDigits(String(player.birth_day).padStart(2,'0'))}`
        ];
        values.forEach(value => tr.appendChild(createText('td', value)));
        const fileCell = document.createElement('td');
        fileCell.appendChild(fileButton('مشاهده', player.insurance_path));
        tr.appendChild(fileCell); tbody.appendChild(tr);
      });
      table.appendChild(tbody); tableWrap.appendChild(table); card.appendChild(tableWrap);

      const files = document.createElement('div');
      files.className = 'file-links';
      files.appendChild(fileButton('فیش واریزی', team.payment_receipt_path));
      files.appendChild(fileButton('خلاصه ثبت‌نام PDF', team.registration_report_path));
      card.appendChild(files);

      const controls = document.createElement('div');
      controls.className = 'form-grid';
      controls.style.marginTop = '14px';
      const statusField = document.createElement('div'); statusField.className = 'field';
      statusField.appendChild(createText('label', 'وضعیت ثبت‌نام'));
      const select = document.createElement('select');
      const options = ['awaiting_payment','payment_submitted','approved','needs_correction','rejected'];
      options.forEach(value => {
        const option = document.createElement('option');
        option.value = value; option.textContent = K.statusLabels[value]; option.selected = team.status === value;
        select.appendChild(option);
      });
      statusField.appendChild(select);
      const noteField = document.createElement('div'); noteField.className = 'field';
      noteField.appendChild(createText('label', 'پیام برای تیم'));
      const note = document.createElement('textarea'); note.value = team.admin_note || ''; note.maxLength = 800; note.placeholder = 'مثلاً فیش خوانا نیست؛ دوباره ارسال شود.';
      noteField.appendChild(note); controls.append(statusField, noteField); card.appendChild(controls);

      const actions = document.createElement('div'); actions.className = 'admin-actions';
      const save = createText('button', 'ذخیره وضعیت', 'button primary'); save.type = 'button';
      const feedback = createText('span', '', 'message');
      save.addEventListener('click', async () => {
        save.disabled = true; K.setMessage(feedback, 'در حال ذخیره...', 'info');
        try {
          const result = await K.client.rpc('gol_admin_set_status', { p_team_id: team.id, p_status: select.value, p_note: note.value.trim() || null });
          if (result.error) throw result.error;
          K.setMessage(feedback, 'وضعیت ذخیره شد.', 'success');
          await loadTeams();
        } catch (error) {
          console.error(error); K.setMessage(feedback, 'ذخیره وضعیت انجام نشد.', 'error'); save.disabled = false;
        }
      });
      actions.append(save, feedback); card.appendChild(actions);
      teamsList.appendChild(card);
    });
  }

  async function loadTeams() {
    teamsList.innerHTML = '<div class="empty">در حال دریافت تیم‌ها...</div>';
    const { data, error } = await K.client.from('gol_teams').select('*, gol_players(*)').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      teamsList.innerHTML = '<div class="empty">دریافت فهرست تیم‌ها انجام نشد.</div>';
      return;
    }
    teams = data || [];
    renderTeams();
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    const button = loginForm.querySelector('button');
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    button.disabled = true;
    K.setMessage(loginMessage, 'در حال ورود...', 'info');

    try {
      if (!username || !password) {
        throw new Error('نام کاربری و رمز ورود را کامل وارد کنید.');
      }

      const email = await K.accountEmail('admin', username);
      const { data, error } = await K.client.auth.signInWithPassword({ email, password });

      if (error) {
        const message = String(error.message || '').toLowerCase();

        if (message.includes('invalid login credentials')) {
          throw new Error(
            `ورود در بخش Authentication ناموفق بود. رمز عبور این حساب درست نیست یا کاربر با ایمیل داخلی ${email} در همین پروژه Supabase وجود ندارد.`
          );
        }

        if (message.includes('email not confirmed')) {
          throw new Error('ایمیل حساب مدیر هنوز تأیید نشده است. در Supabase گزینه Confirm user را فعال کنید.');
        }

        throw new Error(`خطای ورود Supabase: ${error.message || 'خطای ناشناخته'}`);
      }

      if (!data?.session?.user?.id) {
        throw new Error('ورود انجام شد، اما نشست کاربری ساخته نشد.');
      }

      const allowed = await isAdmin(data.session.user.id);
      if (!allowed) {
        await K.client.auth.signOut();
        throw new Error('ورود به حساب انجام شد، اما این کاربر در جدول gol_admins دسترسی مدیریت ندارد.');
      }

      loginPanel.classList.add('hidden');
      dashboard.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      await loadSettings();
      await loadTeams();
    } catch (error) {
      console.error(error);
      K.setMessage(loginMessage, error.message || 'ورود انجام نشد.', 'error');
      button.disabled = false;
    }
  });

  document.getElementById('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('settings-message');
    const button = event.currentTarget.querySelector('button');
    button.disabled = true; K.setMessage(message, 'در حال ذخیره...', 'info');
    try {
      const deadlineValue = document.getElementById('deadline-input').value;
      const result = await K.client.rpc('gol_admin_update_settings', {
        p_registration_open: document.getElementById('registration-open').checked,
        p_registration_deadline: new Date(deadlineValue).toISOString(),
        p_deadline_label: document.getElementById('deadline-label').value.trim(),
        p_min_age: Number(document.getElementById('minimum-age').value),
        p_fee_toman: Number(document.getElementById('fee-input').value),
        p_bank_account: document.getElementById('bank-account').value.trim(),
        p_account_holder: document.getElementById('account-holder').value.trim()
      });
      if (result.error) throw result.error;
      K.setMessage(message, 'تنظیمات ذخیره شد.', 'success');
      await loadSettings();
    } catch (error) {
      console.error(error); K.setMessage(message, 'ذخیره تنظیمات انجام نشد.', 'error');
    } finally { button.disabled = false; }
  });

  document.getElementById('refresh-button').addEventListener('click', loadTeams);
  document.getElementById('export-button').addEventListener('click', () => {
    const rows = [['نام تیم','شماره کاپیتان','وضعیت','نام بازیکن','نقش','نام پدر','شماره ملی','تاریخ تولد']];
    teams.forEach(team => (team.gol_players || []).forEach(player => rows.push([
      team.team_name, team.captain_phone, K.statusLabels[team.status] || team.status, player.full_name,
      player.is_captain ? 'کاپیتان' : 'بازیکن', player.father_name, player.national_id,
      `${player.birth_year}/${String(player.birth_month).padStart(2,'0')}/${String(player.birth_day).padStart(2,'0')}`
    ])));
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'gol-koochik-registrations.csv'; link.click(); URL.revokeObjectURL(url);
  });

  logoutButton.addEventListener('click', async () => {
    await K.client.auth.signOut(); window.location.reload();
  });

  const session = await K.currentSession();
  if (session) {
    try { await showDashboard(session); } catch (error) { console.error(error); }
  }
})();
