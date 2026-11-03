/* Gol Koochik landing: run original settings updater after deferred dependencies. */
(async () => {
  const K = window.KaligaGol;
  if (!K) { console.warn('KaligaGol was not loaded'); return; }
  try {
    const s = await K.getSettings();
    document.getElementById('fee-value').textContent = K.formatToman(s.fee_toman);
    document.getElementById('age-value').textContent = `بالای ${K.toPersianDigits(s.min_age)} سال`;
    document.getElementById('deadline-value').textContent = `تا ${s.deadline_label}`;
    document.getElementById('bank-value').textContent = s.bank_account || '6393461052263270';
    document.getElementById('holder-value').textContent = s.account_holder || 'علی قادری چاشمی';
    const open = K.registrationIsOpen(s);
    document.getElementById('open-value').textContent = open ? 'فعال' : 'پایان یافته';
    if (!open) {
      const b = document.getElementById('register-button');
      b.removeAttribute('href');
      b.textContent = 'مهلت ثبت‌نام پایان یافته';
      b.classList.add('danger');
    }
  } catch (e) { console.error('Gol Koochik settings:', e); }
})();
