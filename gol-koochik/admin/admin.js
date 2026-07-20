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
    button.dataset.filePath = path || '';

    if (!path) {
      button.disabled = true;
      button.textContent += ' ـ ثبت نشده';
    }

    button.addEventListener('click', () => {
      const currentPath = button.dataset.filePath;
      if (currentPath) openPrivate(currentPath);
    });

    return button;
  }


  function cleanNumber(value) {
    return K.toEnglishDigits(value).replace(/\D/g, '');
  }

  function validNationalId(value) {
    const code = cleanNumber(value);
    if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
    const sum = code.slice(0, 9).split('').reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
    const remainder = sum % 11;
    const expected = remainder < 2 ? remainder : 11 - remainder;
    return Number(code[9]) === expected;
  }

  function validJalaliDate(year, month, day) {
    if (!Number.isInteger(year) || year < 1300 || year > 1500) return false;
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    const maxDay = month <= 6 ? 31 : 30;
    return Number.isInteger(day) && day >= 1 && day <= maxDay;
  }

  function oldEnough(year, month, day) {
    const latest = [
      Number(settings.age_reference_year) - Number(settings.min_age),
      Number(settings.age_reference_month),
      Number(settings.age_reference_day)
    ];
    const birth = [year, month, day];
    for (let i = 0; i < 3; i += 1) {
      if (birth[i] < latest[i]) return true;
      if (birth[i] > latest[i]) return false;
    }
    return true;
  }

  function makeField(labelText, input) {
    const field = document.createElement('div');
    field.className = 'field';
    field.appendChild(createText('label', labelText));
    field.appendChild(input);
    return field;
  }

  function textInput(value, maxLength, inputMode = '') {
    const input = document.createElement('input');
    input.value = value ?? '';
    input.required = true;
    if (maxLength) input.maxLength = maxLength;
    if (inputMode) input.inputMode = inputMode;
    input.autocomplete = 'off';
    return input;
  }

  function nextPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function buildAdminReport(team) {
    const root = document.createElement('div');
    root.id = `admin-report-${team.id}`;
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;left:-12000px;top:0;display:block!important;visibility:visible!important;direction:rtl;background:#fff;color:#111;font-family:Tahoma,Arial,sans-serif;width:760px;padding:34px;line-height:1.8;box-sizing:border-box;z-index:-1';

    const title = createText('h1', 'خلاصه ثبت‌نام مسابقات گل کوچک کالیگا');
    title.style.cssText = 'font-size:24px;text-align:center;margin:0 0 20px';
    root.appendChild(title);

    const meta = document.createElement('div');
    meta.style.cssText = 'border:1px solid #ccc;border-radius:12px;padding:14px;margin-bottom:18px';
    [
      ['نام تیم', team.team_name],
      ['شماره تماس کاپیتان', team.captain_phone],
      ['هزینه ثبت‌نام', K.formatToman(settings.fee_toman)],
      ['مهلت ثبت‌نام', settings.deadline_label],
      ['آخرین بازسازی فایل', new Date().toLocaleString('fa-IR')]
    ].forEach(([label, value]) => {
      const p = document.createElement('p');
      p.style.margin = '4px 0';
      const strong = createText('strong', `${label}: `);
      p.append(strong, document.createTextNode(value));
      meta.appendChild(p);
    });
    root.appendChild(meta);

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    ['ردیف','نقش','نام و نام خانوادگی','نام پدر','شماره ملی','تاریخ تولد'].forEach(text => {
      const th = createText('th', text);
      th.style.cssText = 'border:1px solid #bbb;padding:8px;background:#eee';
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    [...(team.gol_players || [])].sort((a, b) => a.player_order - b.player_order).forEach(player => {
      const tr = document.createElement('tr');
      [
        K.toPersianDigits(player.player_order),
        player.is_captain ? 'کاپیتان' : 'بازیکن',
        player.full_name,
        player.father_name,
        K.toPersianDigits(player.national_id),
        `${K.toPersianDigits(player.birth_year)}/${K.toPersianDigits(String(player.birth_month).padStart(2, '0'))}/${K.toPersianDigits(String(player.birth_day).padStart(2, '0'))}`
      ].forEach(value => {
        const td = createText('td', value);
        td.style.cssText = 'border:1px solid #bbb;padding:8px;text-align:center';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);

    const note = createText('p', 'این فایل به‌صورت خودکار ساخته شده و شامل رمز ورود تیم نیست.');
    note.style.cssText = 'margin-top:18px;color:#555;font-size:11px';
    root.appendChild(note);
    document.body.appendChild(root);
    return root;
  }


  async function renderElementToPdfBlob(element) {
    if (typeof window.html2canvas !== 'function') {
      throw new Error('کتابخانه ساخت تصویر گزارش بارگذاری نشده است.');
    }

    const JsPdf = window.jspdf?.jsPDF || window.jsPDF;
    if (!JsPdf) {
      throw new Error('کتابخانه ساخت PDF بارگذاری نشده است.');
    }

    const blocker = document.createElement('div');
    blocker.setAttribute('aria-hidden', 'true');
    blocker.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#07111f',
      'color:#fff',
      'font-family:Tahoma,Arial,sans-serif',
      'font-size:18px',
      'text-align:center',
      'padding:24px'
    ].join(';');
    blocker.textContent = 'در حال ساخت فایل خلاصه ثبت‌نام…';

    const oldStyle = element.getAttribute('style');
    const oldClass = element.getAttribute('class');
    const oldAria = element.getAttribute('aria-hidden');

    document.body.appendChild(blocker);

    try {
      element.className = '';
      element.setAttribute('aria-hidden', 'true');
      element.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        'z-index:2147483646',
        'display:block',
        'visibility:visible',
        'opacity:1',
        'transform:none',
        'direction:rtl',
        'background:#fff',
        'color:#111',
        'font-family:Tahoma,Arial,sans-serif',
        'width:760px',
        'padding:34px',
        'line-height:1.8',
        'box-sizing:border-box',
        'overflow:visible'
      ].join(';');

      if (document.fonts?.ready) await document.fonts.ready;
      await nextPaint();
      await new Promise(resolve => setTimeout(resolve, 180));

      const width = Math.max(760, element.scrollWidth);
      const height = Math.max(400, element.scrollHeight);

      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width,
        height,
        windowWidth: Math.max(900, width),
        windowHeight: Math.max(1200, height)
      });

      if (!canvas || canvas.width < 100 || canvas.height < 100) {
        throw new Error('تصویر گزارش ساخته نشد.');
      }

      // Prevent uploading a technically valid but visually blank PDF.
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const step = Math.max(4, Math.floor((canvas.width * canvas.height) / 25000));
      let visibleSamples = 0;

      for (let pixel = 0; pixel < pixels.length; pixel += 4 * step) {
        const red = pixels[pixel];
        const green = pixels[pixel + 1];
        const blue = pixels[pixel + 2];
        const alpha = pixels[pixel + 3];

        if (alpha > 20 && (red < 245 || green < 245 || blue < 245)) {
          visibleSamples += 1;
          if (visibleSamples > 80) break;
        }
      }

      if (visibleSamples <= 80) {
        throw new Error('محتوای گزارش سفید تشخیص داده شد و فایل جایگزین نشد.');
      }

      const pdf = new JsPdf({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const pagePixelHeight = Math.floor(canvas.width * printableHeight / printableWidth);

      let sourceY = 0;
      let pageNumber = 0;

      while (sourceY < canvas.height) {
        const sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const pageContext = pageCanvas.getContext('2d');
        pageContext.fillStyle = '#ffffff';
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.drawImage(
          canvas,
          0, sourceY, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight
        );

        if (pageNumber > 0) pdf.addPage();

        const renderedHeight = sliceHeight * printableWidth / canvas.width;
        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.96),
          'JPEG',
          margin,
          margin,
          printableWidth,
          renderedHeight,
          undefined,
          'FAST'
        );

        sourceY += sliceHeight;
        pageNumber += 1;
      }

      const blob = pdf.output('blob');
      if (!(blob instanceof Blob) || blob.size < 3000) {
        throw new Error('فایل PDF نهایی به‌درستی ساخته نشد.');
      }

      return blob;
    } finally {
      blocker.remove();

      if (oldStyle === null) element.removeAttribute('style');
      else element.setAttribute('style', oldStyle);

      if (oldClass === null) element.removeAttribute('class');
      else element.setAttribute('class', oldClass);

      if (oldAria === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', oldAria);
    }
  }

  async function createAdminReportBlob(team) {
    const root = buildAdminReport(team);
    try {
      return await renderElementToPdfBlob(root);
    } finally {
      root.remove();
    }
  }

  async function regenerateTeamReport(teamId) {
    const { data: team, error: readError } = await K.client
      .from('gol_teams')
      .select('*, gol_players(*)')
      .eq('id', teamId)
      .single();
    if (readError) throw readError;

    const blob = await createAdminReportBlob(team);
    const path = `${team.owner_id}/reports/registration-summary-${Date.now()}.pdf`;
    const upload = await K.client.storage.from(K.config.storageBucket).upload(
      path,
      new File([blob], 'registration-summary.pdf', { type: 'application/pdf' }),
      { upsert: false, contentType: 'application/pdf', cacheControl: '0' }
    );
    if (upload.error) throw upload.error;

    const savePath = await K.client.rpc('gol_admin_set_report_path', {
      p_team_id: team.id,
      p_report_path: path
    });
    if (savePath.error) throw savePath.error;
    return path;
  }

  function createPlayerEditor(team, player) {
    const editor = document.createElement('section');
    editor.className = 'panel hidden';
    editor.style.marginTop = '10px';
    editor.appendChild(createText('h4', `ویرایش ${player.is_captain ? 'کاپیتان' : `بازیکن ${K.toPersianDigits(player.player_order)}`}`));

    const grid = document.createElement('div');
    grid.className = 'form-grid';
    const fullName = textInput(player.full_name, 100);
    const fatherName = textInput(player.father_name, 80);
    const nationalId = textInput(player.national_id, 10, 'numeric');
    const birthYear = textInput(player.birth_year, 4, 'numeric');
    const birthMonth = textInput(player.birth_month, 2, 'numeric');
    const birthDay = textInput(player.birth_day, 2, 'numeric');
    const insurance = document.createElement('input');
    insurance.type = 'file';
    insurance.accept = 'image/jpeg,image/png,application/pdf';

    grid.append(
      makeField('نام و نام خانوادگی', fullName),
      makeField('نام پدر', fatherName),
      makeField('شماره ملی', nationalId),
      makeField('سال تولد', birthYear),
      makeField('ماه تولد', birthMonth),
      makeField('روز تولد', birthDay),
      makeField('تعویض بیمه ورزشی ـ اختیاری', insurance)
    );
    editor.appendChild(grid);

    const actions = document.createElement('div');
    actions.className = 'admin-actions';
    const save = createText('button', 'ذخیره اطلاعات بازیکن', 'button primary');
    save.type = 'button';
    const feedback = createText('span', '', 'message');

    save.addEventListener('click', async () => {
      save.disabled = true;
      K.setMessage(feedback, 'در حال ذخیره...', 'info');
      try {
        const cleanFullName = fullName.value.trim();
        const cleanFatherName = fatherName.value.trim();
        const cleanNationalId = cleanNumber(nationalId.value);
        const year = Number(cleanNumber(birthYear.value));
        const month = Number(cleanNumber(birthMonth.value));
        const day = Number(cleanNumber(birthDay.value));

        if (cleanFullName.length < 3) throw new Error('نام و نام خانوادگی را کامل وارد کنید.');
        if (cleanFatherName.length < 2) throw new Error('نام پدر را وارد کنید.');
        if (!validNationalId(cleanNationalId)) throw new Error('شماره ملی معتبر نیست.');
        if (!validJalaliDate(year, month, day)) throw new Error('تاریخ تولد معتبر نیست.');
        if (!oldEnough(year, month, day)) throw new Error(`بازیکن باید حداقل ${K.toPersianDigits(settings.min_age)} سال تمام داشته باشد.`);

        let insurancePath = null;
        const file = insurance.files[0];
        if (file) {
          const fileError = K.validateFile(file, 6);
          if (fileError) throw new Error(fileError);
          insurancePath = `${team.owner_id}/insurance/player-${player.player_order}.${K.safeExtension(file)}`;
          const upload = await K.client.storage.from(K.config.storageBucket).upload(insurancePath, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
          });
          if (upload.error) throw upload.error;
        }

        const result = await K.client.rpc('gol_admin_update_player', {
          p_player_id: player.id,
          p_full_name: cleanFullName,
          p_father_name: cleanFatherName,
          p_national_id: cleanNationalId,
          p_birth_year: year,
          p_birth_month: month,
          p_birth_day: day,
          p_insurance_path: insurancePath
        });
        if (result.error) {
          if (result.error.code === '23505' || String(result.error.message || '').toLowerCase().includes('duplicate key')) {
            throw new Error('این شماره ملی قبلاً برای بازیکن دیگری ثبت شده است.');
          }
          throw result.error;
        }

        K.setMessage(feedback, 'اطلاعات ذخیره شد؛ فایل خلاصه در حال بازسازی است...', 'info');
        try {
          await regenerateTeamReport(team.id);
          K.setMessage(feedback, 'اطلاعات بازیکن و فایل خلاصه ذخیره شد.', 'success');
        } catch (reportError) {
          console.error(reportError);
          K.setMessage(feedback, 'اطلاعات بازیکن ذخیره شد، اما بازسازی فایل خلاصه انجام نشد. دکمه بازسازی PDF را بزنید.', 'error');
        }
        setTimeout(loadTeams, 700);
      } catch (error) {
        console.error(error);
        K.setMessage(feedback, error.message || 'ذخیره اطلاعات بازیکن انجام نشد.', 'error');
        save.disabled = false;
      }
    });

    actions.append(save, feedback);
    editor.appendChild(actions);
    return editor;
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
      ['نقش','نام','نام پدر','شماره ملی','تولد','بیمه','ویرایش'].forEach(label => hr.appendChild(createText('th', label)));
      thead.appendChild(hr); table.appendChild(thead);
      const tbody = document.createElement('tbody');
      const editors = document.createElement('div');
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
        tr.appendChild(fileCell);

        const editor = createPlayerEditor(team, player);
        const editCell = document.createElement('td');
        const editButton = createText('button', 'ویرایش', 'mini-link');
        editButton.type = 'button';
        editButton.addEventListener('click', () => {
          editor.classList.toggle('hidden');
          editButton.textContent = editor.classList.contains('hidden') ? 'ویرایش' : 'بستن';
        });
        editCell.appendChild(editButton);
        tr.appendChild(editCell);
        tbody.appendChild(tr);
        editors.appendChild(editor);
      });
      table.appendChild(tbody); tableWrap.appendChild(table); card.appendChild(tableWrap);
      card.appendChild(editors);

      const files = document.createElement('div');
      files.className = 'file-links';
      files.appendChild(fileButton('فیش واریزی', team.payment_receipt_path));
      const reportFileButton = fileButton('خلاصه ثبت‌نام PDF', team.registration_report_path);
      files.appendChild(reportFileButton);
      const rebuildReport = createText('button', 'بازسازی فایل خلاصه PDF', 'mini-link');
      rebuildReport.type = 'button';
      const reportFeedback = createText('span', '', 'message');
      rebuildReport.addEventListener('click', async () => {
        rebuildReport.disabled = true;
        K.setMessage(reportFeedback, 'در حال بازسازی فایل...', 'info');
        try {
          const newPath = await regenerateTeamReport(team.id);
          team.registration_report_path = newPath;
          reportFileButton.dataset.filePath = newPath;
          reportFileButton.disabled = false;
          reportFileButton.textContent = 'خلاصه ثبت‌نام PDF جدید';
          rebuildReport.disabled = false;
          K.setMessage(reportFeedback, 'فایل خلاصه با موفقیت بازسازی شد. اکنون روی «خلاصه ثبت‌نام PDF جدید» بزنید.', 'success');
        } catch (error) {
          console.error(error);
          K.setMessage(reportFeedback, error.message || 'بازسازی فایل انجام نشد.', 'error');
          rebuildReport.disabled = false;
        }
      });
      files.append(rebuildReport, reportFeedback);
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
