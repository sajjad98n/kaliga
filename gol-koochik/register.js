(async () => {
  'use strict';
  const K = window.KaligaGol;
  const form = document.getElementById('registration-form');
  const message = document.getElementById('message');
  const submitButton = document.getElementById('submit-button');
  let settings;


  try {
    settings = await K.getSettings();
    document.getElementById('minimum-age').textContent = `${K.toPersianDigits(settings.min_age)} سال تمام`;
    document.getElementById('fee').textContent = K.formatToman(settings.fee_toman);
    document.getElementById('deadline').textContent = settings.deadline_label;
    document.getElementById('bank').textContent = settings.bank_account || '________________';
    document.getElementById('holder').textContent = settings.account_holder || '________________';
    if (!K.registrationIsOpen(settings)) {
      submitButton.disabled = true;
      submitButton.textContent = 'مهلت ثبت‌نام پایان یافته';
      K.setMessage(message, 'در حال حاضر ثبت‌نام بسته است.', 'error');
    }
  } catch (error) {
    console.error(error);
    submitButton.disabled = true;
    K.setMessage(message, 'اطلاعات ثبت‌نام دریافت نشد. لطفاً بعداً دوباره تلاش کنید.', 'error');
  }

  function cleanNumber(value) {
    return K.toEnglishDigits(value).replace(/\D/g, '');
  }

  function validNationalId(value) {
    const code = cleanNumber(value);
    if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
    const sum = code.slice(0, 9).split('').reduce((acc, digit, index) => acc + Number(digit) * (10 - index), 0);
    const remainder = sum % 11;
    const expected = remainder < 2 ? remainder : 11 - remainder;
    return Number(code[9]) === expected;
  }

  function validJalaliDate(year, month, day) {
    if (!Number.isInteger(year) || year < 1300 || year > 1500) return false;
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    const maxDay = month <= 6 ? 31 : (month <= 11 ? 30 : 30);
    return Number.isInteger(day) && day >= 1 && day <= maxDay;
  }

  function oldEnough(year, month, day) {
    const maxYear = Number(settings.age_reference_year) - Number(settings.min_age);
    const latest = [maxYear, Number(settings.age_reference_month), Number(settings.age_reference_day)];
    const birth = [year, month, day];
    for (let i = 0; i < 3; i += 1) {
      if (birth[i] < latest[i]) return true;
      if (birth[i] > latest[i]) return false;
    }
    return true;
  }

  function collectPlayers() {
    const players = [];
    const nationalIds = new Set();
    for (let i = 1; i <= 5; i += 1) {
      const fullName = document.getElementById(`full-name-${i}`).value.trim();
      const fatherName = document.getElementById(`father-name-${i}`).value.trim();
      const nationalId = cleanNumber(document.getElementById(`national-id-${i}`).value);
      const birthYear = Number(cleanNumber(document.getElementById(`birth-year-${i}`).value));
      const birthMonth = Number(cleanNumber(document.getElementById(`birth-month-${i}`).value));
      const birthDay = Number(cleanNumber(document.getElementById(`birth-day-${i}`).value));
      const insuranceFile = document.getElementById(`insurance-${i}`).files[0];

      if (fullName.length < 3) throw new Error(`نام و نام خانوادگی بازیکن ${K.toPersianDigits(i)} را کامل وارد کنید.`);
      if (fatherName.length < 2) throw new Error(`نام پدر بازیکن ${K.toPersianDigits(i)} را وارد کنید.`);
      if (!validNationalId(nationalId)) throw new Error(`شماره ملی بازیکن ${K.toPersianDigits(i)} معتبر نیست.`);
      if (nationalIds.has(nationalId)) throw new Error('شماره ملی بازیکنان نباید تکراری باشد.');
      nationalIds.add(nationalId);
      if (!validJalaliDate(birthYear, birthMonth, birthDay)) throw new Error(`تاریخ تولد بازیکن ${K.toPersianDigits(i)} معتبر نیست.`);
      if (!oldEnough(birthYear, birthMonth, birthDay)) throw new Error(`بازیکن ${K.toPersianDigits(i)} باید تا ${settings.deadline_label} حداقل ${K.toPersianDigits(settings.min_age)} سال تمام داشته باشد.`);
      const fileError = K.validateFile(insuranceFile, 6);
      if (fileError) throw new Error(`بیمه ورزشی بازیکن ${K.toPersianDigits(i)}: ${fileError}`);

      players.push({
        player_order: i,
        is_captain: i === 1,
        full_name: fullName,
        father_name: fatherName,
        national_id: nationalId,
        birth_year: birthYear,
        birth_month: birthMonth,
        birth_day: birthDay,
        insuranceFile
      });
    }
    return players;
  }

  function buildReport(teamName, captainPhone, players) {
    const root = document.getElementById('report-root');
    root.className = '';
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;left:-12000px;top:0;display:block!important;visibility:visible!important;direction:rtl;background:#fff;color:#111;font-family:Tahoma,Arial,sans-serif;width:760px;padding:34px;line-height:1.8;box-sizing:border-box;z-index:-1';
    root.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'خلاصه ثبت‌نام مسابقات گل کوچک کالیگا';
    title.style.cssText = 'font-size:24px;text-align:center;margin:0 0 20px';
    root.appendChild(title);

    const meta = document.createElement('div');
    meta.style.cssText = 'border:1px solid #ccc;border-radius:12px;padding:14px;margin-bottom:18px';
    const rows = [
      ['نام تیم', teamName],
      ['شماره تماس کاپیتان', captainPhone],
      ['هزینه ثبت‌نام', K.formatToman(settings.fee_toman)],
      ['مهلت ثبت‌نام', settings.deadline_label],
      ['زمان ثبت فرم', new Date().toLocaleString('fa-IR')]
    ];
    rows.forEach(([label, value]) => {
      const p = document.createElement('p');
      p.style.margin = '4px 0';
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      p.append(strong, document.createTextNode(value));
      meta.appendChild(p);
    });
    root.appendChild(meta);

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    ['ردیف','نقش','نام و نام خانوادگی','نام پدر','شماره ملی','تاریخ تولد'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.cssText = 'border:1px solid #bbb;padding:8px;background:#eee';
      hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    players.forEach(player => {
      const tr = document.createElement('tr');
      const values = [
        K.toPersianDigits(player.player_order),
        player.is_captain ? 'کاپیتان' : 'بازیکن',
        player.full_name,
        player.father_name,
        K.toPersianDigits(player.national_id),
        `${K.toPersianDigits(player.birth_year)}/${K.toPersianDigits(String(player.birth_month).padStart(2,'0'))}/${K.toPersianDigits(String(player.birth_day).padStart(2,'0'))}`
      ];
      values.forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        td.style.cssText = 'border:1px solid #bbb;padding:8px;text-align:center';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); root.appendChild(table);
    const note = document.createElement('p');
    note.textContent = 'این فایل به‌صورت خودکار پس از ثبت‌نام ساخته شده و شامل رمز ورود تیم نیست.';
    note.style.cssText = 'margin-top:18px;color:#555;font-size:11px';
    root.appendChild(note);
    return root;
  }

  async function ensureAuth(teamName, password) {
    const email = await K.accountEmail('team', teamName);
    let response = await K.client.auth.signUp({
      email,
      password,
      options: { data: { account_type: 'gol_team', team_name: teamName } }
    });
    if (response.error || !response.data.session) {
      const login = await K.client.auth.signInWithPassword({ email, password });
      if (login.error) {
        if (!response.error && response.data.user && !response.data.session) {
          throw new Error('حساب ساخته شد اما ورود خودکار فعال نیست. در Supabase باید گزینه تأیید ایمیل برای ثبت‌نام تیم‌ها غیرفعال شود.');
        }
        throw new Error('این نام تیم قبلاً ثبت شده است یا رمز واردشده با حساب موجود مطابقت ندارد.');
      }
      response = login;
    }
    return response.data.user || response.data.session?.user;
  }

  async function uploadFile(path, file) {
    const { error } = await K.client.storage.from(K.config.storageBucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600'
    });
    if (error) throw error;
  }


  function nextPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function createReportBlob(teamName, captainPhone, players) {
    const reportElement = buildReport(teamName, captainPhone, players);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await nextPaint();

      const blob = await window.html2pdf().set({
        margin: 8,
        filename: 'registration-summary.pdf',
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 900,
          onclone: clonedDocument => {
            const clonedRoot = clonedDocument.getElementById('report-root');
            if (clonedRoot) {
              clonedRoot.className = '';
              clonedRoot.style.position = 'static';
              clonedRoot.style.left = 'auto';
              clonedRoot.style.top = 'auto';
              clonedRoot.style.display = 'block';
              clonedRoot.style.visibility = 'visible';
              clonedRoot.style.zIndex = 'auto';
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] }
      }).from(reportElement).toPdf().outputPdf('blob');

      if (!(blob instanceof Blob) || blob.size < 1500) {
        throw new Error('فایل خلاصه ثبت‌نام به‌درستی ساخته نشد. صفحه را تازه‌سازی و دوباره تلاش کنید.');
      }
      return blob;
    } finally {
      reportElement.className = 'hidden';
      reportElement.removeAttribute('style');
      reportElement.removeAttribute('aria-hidden');
      reportElement.textContent = '';
    }
  }

  function friendlyRegistrationError(error) {
    const raw = String(error?.message || '').trim();
    const lower = raw.toLowerCase();

    if (!raw) return 'ثبت‌نام کامل نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.';
    if (/[آ-ی]/.test(raw)) return raw;
    if (lower.includes('email logins are disabled')) return 'سامانه ورود تیم‌ها موقتاً غیرفعال است. موضوع را به مسئول برگزاری اطلاع دهید.';
    if (lower.includes('email not confirmed')) return 'حساب تیم ساخته شده اما هنوز فعال نشده است. با مسئول برگزاری تماس بگیرید.';
    if (lower.includes('signups not allowed') || lower.includes('signup is disabled')) return 'ساخت حساب جدید در سامانه موقتاً بسته است. با مسئول برگزاری تماس بگیرید.';
    if (lower.includes('user already registered') || lower.includes('already been registered')) return 'این نام تیم قبلاً برای یک حساب استفاده شده است. با رمز همان تیم وارد شوید یا نام دیگری انتخاب کنید.';
    if (lower.includes('invalid login credentials')) return 'این نام تیم قبلاً ثبت شده است یا رمز واردشده با حساب موجود مطابقت ندارد.';
    if (lower.includes('duplicate key') || error?.code === '23505') return 'نام تیم یا یکی از شماره‌های ملی قبلاً ثبت شده است.';
    if (lower.includes('row-level security') || lower.includes('permission denied')) return 'سامانه اجازه ذخیره این اطلاعات را نداد. با مسئول برگزاری تماس بگیرید.';
    if (lower.includes('bucket not found')) return 'فضای بارگذاری مدارک تنظیم نشده است. با مسئول برگزاری تماس بگیرید.';
    if (lower.includes('payload too large') || lower.includes('maximum allowed size')) return 'حجم یکی از فایل‌ها بیشتر از حد مجاز است.';
    if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('load failed')) return 'ارتباط با سامانه برقرار نشد. اینترنت را بررسی و دوباره تلاش کنید.';
    return raw;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!settings || !K.registrationIsOpen(settings)) {
      K.setMessage(message, 'مهلت ثبت‌نام پایان یافته یا ثبت‌نام غیرفعال است.', 'error');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'در حال ثبت اطلاعات...';
    K.setMessage(message, 'لطفاً صفحه را نبندید؛ فایل‌های بیمه در حال بارگذاری هستند.', 'info');

    try {
      const teamName = document.getElementById('team-name').value.trim();
      const teamKey = K.normalizeIdentifier(teamName);
      const captainPhone = cleanNumber(document.getElementById('captain-phone').value);
      const password = document.getElementById('password').value;
      const passwordConfirm = document.getElementById('password-confirm').value;

      if (teamName.length < 2) throw new Error('نام تیم را کامل وارد کنید.');
      if (!/^09\d{9}$/.test(captainPhone)) throw new Error('شماره تماس کاپیتان باید ۱۱ رقم و با ۰۹ شروع شود.');
      if (password.length < 8) throw new Error('رمز ورود باید حداقل ۸ نویسه باشد.');
      if (password !== passwordConfirm) throw new Error('رمز ورود و تکرار آن یکسان نیستند.');
      if (!document.getElementById('rules-accept').checked) throw new Error('تأیید صحت اطلاعات و قوانین الزامی است.');

      const players = collectPlayers();
      const availability = await K.client.rpc('gol_team_name_available', { p_team_key: teamKey });
      if (availability.error) throw availability.error;

      const current = await K.currentSession();
      const expectedEmail = await K.accountEmail('team', teamName);
      let user;
      if (current && current.user.email === expectedEmail && current.user.user_metadata?.account_type === 'gol_team') {
        user = current.user;
      } else {
        if (current) await K.client.auth.signOut();
        if (availability.data === false) {
          // ممکن است ثبت قبلی ناقص باشد؛ ورود با همان نام و رمز امتحان می‌شود.
        }
        user = await ensureAuth(teamName, password);
      }
      if (!user) throw new Error('ورود تیم ایجاد نشد. دوباره تلاش کنید.');

      let { data: team, error: teamReadError } = await K.client.from('gol_teams').select('*').eq('owner_id', user.id).maybeSingle();
      if (teamReadError) throw teamReadError;
      if (team && !['incomplete', 'needs_correction'].includes(team.status)) {
        window.location.replace('team/');
        return;
      }
      if (!team) {
        const inserted = await K.client.from('gol_teams').insert({
          owner_id: user.id,
          team_name: teamName,
          team_key: teamKey,
          captain_phone: captainPhone
        }).select('*').single();
        if (inserted.error) {
          if (inserted.error.code === '23505') throw new Error('این نام تیم قبلاً ثبت شده است. نام دیگری انتخاب کنید.');
          throw inserted.error;
        }
        team = inserted.data;
      }

      const removeOld = await K.client.from('gol_players').delete().eq('team_id', team.id);
      if (removeOld.error) throw removeOld.error;

      const playerRows = [];
      for (const player of players) {
        K.setMessage(message, `در حال بارگذاری بیمه بازیکن ${K.toPersianDigits(player.player_order)} از ۵...`, 'info');
        const extension = K.safeExtension(player.insuranceFile);
        const path = `${user.id}/insurance/player-${player.player_order}.${extension}`;
        await uploadFile(path, player.insuranceFile);
        playerRows.push({
          team_id: team.id,
          player_order: player.player_order,
          is_captain: player.is_captain,
          full_name: player.full_name,
          father_name: player.father_name,
          national_id: player.national_id,
          birth_year: player.birth_year,
          birth_month: player.birth_month,
          birth_day: player.birth_day,
          insurance_path: path
        });
      }

      const playerInsert = await K.client.from('gol_players').insert(playerRows);
      if (playerInsert.error) {
        if (playerInsert.error.code === '23505') throw new Error('یکی از شماره‌های ملی قبلاً برای تیم دیگری ثبت شده است.');
        throw playerInsert.error;
      }

      K.setMessage(message, 'در حال ساخت فایل خلاصه ثبت‌نام...', 'info');
      const reportBlob = await createReportBlob(teamName, captainPhone, players);
      const reportPath = `${user.id}/reports/registration-summary.pdf`;
      await uploadFile(reportPath, new File([reportBlob], 'registration-summary.pdf', { type: 'application/pdf' }));

      const complete = await K.client.rpc('gol_complete_registration', { p_report_path: reportPath });
      if (complete.error) throw complete.error;

      K.setMessage(message, 'ثبت‌نام تیم با موفقیت انجام شد. در حال انتقال به صفحه تیم...', 'success');
      setTimeout(() => window.location.replace('team/'), 900);
    } catch (error) {
      console.error(error);
      K.setMessage(message, friendlyRegistrationError(error), 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'ثبت نهایی تیم';
    }
  });
})();
