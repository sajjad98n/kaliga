(async () => {
  'use strict';
  const K = window.KaligaGol;
  const session = await K.requireSession('../login.html');
  if (!session) return;
  if (session.user.user_metadata?.account_type !== 'gol_team') {
    await K.client.auth.signOut();
    window.location.replace('../login.html');
    return;
  }

  const teamTitle = document.getElementById('team-title');
  const subtitle = document.getElementById('team-subtitle');
  const statusBadge = document.getElementById('status-badge');
  const statusNotice = document.getElementById('status-notice');
  const receiptForm = document.getElementById('receipt-form');
  const receiptButton = document.getElementById('receipt-button');
  const receiptMessage = document.getElementById('receipt-message');
  let team;
  let settings;


  function maskNationalId(value) {
    const text = String(value || '');
    return text.length === 10 ? `${K.toPersianDigits(text.slice(0, 3))}***${K.toPersianDigits(text.slice(-4))}` : K.toPersianDigits(text);
  }

  function statusDescription(status) {
    const map = {
      incomplete: 'ثبت‌نام تیم هنوز کامل نشده است. فرم ثبت‌نام را دوباره تکمیل کنید.',
      awaiting_payment: 'اطلاعات پنج بازیکن ثبت شده است. برای ادامه، مبلغ ثبت‌نام را واریز و فیش را از همین صفحه ارسال کنید.',
      payment_submitted: 'فیش واریزی دریافت شده و در انتظار بررسی مسئول برگزاری است. نتیجه بررسی در همین صفحه نمایش داده می‌شود.',
      approved: 'ثبت‌نام تیم شما تأیید شده است. اطلاعیه‌های بعدی مسابقات را از سایت دنبال کنید.',
      needs_correction: 'مدارک یا فیش واریزی نیاز به اصلاح دارد. توضیح مسئول برگزاری را بررسی و فایل صحیح را دوباره ارسال کنید.',
      rejected: 'ثبت‌نام این تیم تأیید نشده است. برای پیگیری با مسئول برگزاری تماس بگیرید.'
    };
    return map[status] || 'وضعیت ثبت‌نام در حال بررسی است.';
  }

  function createCell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  async function addPrivateLink(cell, path, label) {
    if (!path) {
      cell.textContent = 'ثبت نشده';
      return;
    }
    const button = document.createElement('button');
    button.className = 'mini-link';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const url = await K.signedUrl(path, 180);
        window.open(url, '_blank', 'noopener');
      } catch (error) {
        console.error(error);
        alert('بازکردن فایل ممکن نشد. دوباره تلاش کنید.');
      } finally {
        button.disabled = false;
      }
    });
    cell.appendChild(button);
  }

  async function render() {
    try {
      settings = await K.getSettings();
      const result = await K.client.from('gol_teams').select('*, gol_players(*)').eq('owner_id', session.user.id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) {
        teamTitle.textContent = 'ثبت‌نام تیم کامل نشده است';
        subtitle.textContent = 'برای تکمیل ثبت‌نام به فرم برگردید.';
        statusNotice.className = 'notice danger';
        statusNotice.textContent = 'حساب ورود ساخته شده، اما اطلاعات تیم هنوز ثبت نشده است.';
        const back = document.createElement('a');
        back.className = 'button primary';
        back.href = '../register.html';
        back.textContent = 'تکمیل فرم ثبت‌نام';
        statusNotice.appendChild(document.createElement('br'));
        statusNotice.appendChild(back);
        receiptButton.disabled = true;
        return;
      }
      team = result.data;
      teamTitle.textContent = team.team_name;
      subtitle.textContent = `ثبت‌شده در ${K.formatDateTime(team.created_at)}`;
      statusBadge.textContent = K.statusLabels[team.status] || team.status;
      statusBadge.className = `status-badge ${team.status}`;
      statusNotice.textContent = statusDescription(team.status);
      statusNotice.className = team.status === 'approved' ? 'notice success' : (['needs_correction','rejected'].includes(team.status) ? 'notice danger' : 'notice');
      if (team.admin_note) {
        const note = document.createElement('p');
        note.style.margin = '8px 0 0';
        const strong = document.createElement('strong');
        strong.textContent = 'پیام مسئول برگزاری: ';
        note.append(strong, document.createTextNode(team.admin_note));
        statusNotice.appendChild(note);
      }
      if (team.status === 'needs_correction') {
        const correctionLink = document.createElement('a');
        correctionLink.className = 'button gold';
        correctionLink.href = '../register.html';
        correctionLink.textContent = 'اصلاح اطلاعات و بیمه‌ها';
        correctionLink.style.marginTop = '10px';
        statusNotice.appendChild(correctionLink);
      }

      document.getElementById('captain-phone').textContent = K.toPersianDigits(team.captain_phone);
      document.getElementById('fee-value').textContent = K.formatToman(settings.fee_toman);
      document.getElementById('deadline-value').textContent = settings.deadline_label;
      document.getElementById('bank-value').textContent = settings.bank_account || '________________';
      document.getElementById('holder-value').textContent = settings.account_holder || '________________';

      const tbody = document.getElementById('players-body');
      tbody.textContent = '';
      const players = [...(team.gol_players || [])].sort((a, b) => a.player_order - b.player_order);
      for (const player of players) {
        const tr = document.createElement('tr');
        tr.appendChild(createCell(K.toPersianDigits(player.player_order)));
        tr.appendChild(createCell(player.is_captain ? 'کاپیتان' : 'بازیکن'));
        tr.appendChild(createCell(player.full_name));
        tr.appendChild(createCell(player.father_name));
        tr.appendChild(createCell(maskNationalId(player.national_id)));
        tr.appendChild(createCell(`${K.toPersianDigits(player.birth_year)}/${K.toPersianDigits(String(player.birth_month).padStart(2,'0'))}/${K.toPersianDigits(String(player.birth_day).padStart(2,'0'))}`));
        const fileCell = document.createElement('td');
        await addPrivateLink(fileCell, player.insurance_path, 'مشاهده');
        tr.appendChild(fileCell);
        tbody.appendChild(tr);
      }

      if (team.registration_report_path) {
        const reportLink = document.getElementById('report-link');
        reportLink.classList.remove('hidden');
        reportLink.addEventListener('click', async event => {
          event.preventDefault();
          const url = await K.signedUrl(team.registration_report_path, 180);
          window.open(url, '_blank', 'noopener');
        }, { once: true });
      }

      if (team.payment_receipt_path) {
        const currentReceipt = document.getElementById('current-receipt');
        currentReceipt.classList.remove('hidden');
        currentReceipt.addEventListener('click', async event => {
          event.preventDefault();
          const url = await K.signedUrl(team.payment_receipt_path, 180);
          window.open(url, '_blank', 'noopener');
        });
      }

      if (team.status === 'approved' || team.status === 'rejected' || team.status === 'incomplete') {
        receiptButton.disabled = true;
        receiptButton.textContent = team.status === 'approved' ? 'ثبت‌نام تأیید شده' : 'ارسال فیش در این وضعیت غیرفعال است';
      }
    } catch (error) {
      console.error(error);
      statusNotice.className = 'notice danger';
      statusNotice.textContent = 'دریافت اطلاعات تیم انجام نشد. لطفاً صفحه را دوباره بارگذاری کنید.';
    }
  }

  receiptForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!team) return;
    const file = document.getElementById('receipt-file').files[0];
    const fileError = K.validateFile(file, 8);
    if (fileError) {
      K.setMessage(receiptMessage, fileError, 'error');
      return;
    }
    receiptButton.disabled = true;
    K.setMessage(receiptMessage, 'در حال بارگذاری فیش...', 'info');
    try {
      const path = `${session.user.id}/payment/receipt.${K.safeExtension(file)}`;
      const upload = await K.client.storage.from(K.config.storageBucket).upload(path, file, {
        upsert: true, contentType: file.type, cacheControl: '3600'
      });
      if (upload.error) throw upload.error;
      const submit = await K.client.rpc('gol_submit_receipt', { p_receipt_path: path });
      if (submit.error) throw submit.error;
      K.setMessage(receiptMessage, 'فیش با موفقیت ارسال شد و در انتظار بررسی است.', 'success');
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error(error);
      K.setMessage(receiptMessage, 'ارسال فیش انجام نشد. دوباره تلاش کنید.', 'error');
      receiptButton.disabled = false;
    }
  });

  document.getElementById('logout-button').addEventListener('click', async () => {
    await K.client.auth.signOut();
    window.location.replace('../login.html');
  });

  await render();
})();
