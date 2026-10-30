/*
 * Kaliga 1404 — Studio Number One interactive team photo (team id 2).
 * All photo pixels come from ../pic2.png; crops are lossless extractions of the user's photo.
 * No AI images, face recognition, beauty filters, personal-data API, or Supabase requests.
 * Only the team-2 photo button is intercepted. The season archive remains unchanged.
 */
(() => {
  'use strict';

  // Player order: RIGHT -> LEFT in the original 1280x853 photograph.
  // Polygon coordinates are percentages of original photograph dimensions.
  const players = [
    {
      no: '4', name: 'سید محمدحسین نبوی', father: 'سید امرالدین', age: 23,
      x: 87.6, y: 56, crop: 'numberone-crops/player-4.png',
      silhouette: '82.8% 44%, 83.4% 40%, 85% 36%, 86.5% 34.5%, 88% 34.5%, 89.4% 36%, 90.6% 39%, 92% 44%, 93.3% 52%, 92.8% 60%, 91.4% 66%, 92.4% 79%, 93.8% 98%, 90.2% 99%, 88.4% 79%, 87% 76%, 86.1% 84%, 85.1% 99%, 81.2% 99%, 82.3% 76%, 81.8% 62%, 81.4% 53%'
    },
    {
      no: '9', name: 'سید حسین نبوی', father: 'سید مهدی', age: 23,
      x: 72.8, y: 55.5, crop: 'numberone-crops/player-9.png',
      silhouette: '67.5% 42%, 68.4% 39%, 70.5% 37%, 72.6% 37%, 74.8% 40%, 77.3% 46%, 79% 57%, 77.5% 63%, 77.2% 76%, 78% 99%, 74.1% 99%, 72.7% 77%, 71.5% 77%, 70.1% 99%, 66.2% 99%, 67% 78%, 67.1% 62%, 66.8% 51%'
    },
    {
      no: '6', name: 'سید اسماعیل نبوی', father: 'سید تاج الدین', age: 51,
      x: 60.9, y: 56.2, crop: 'numberone-crops/player-6.png',
      silhouette: '56.1% 44%, 57% 41%, 58.2% 39%, 59.7% 39%, 61.4% 40%, 63.4% 44%, 65.3% 51%, 65.7% 61%, 64.2% 69%, 64.5% 82%, 64.2% 98%, 61.2% 98%, 60.4% 79%, 59.2% 79%, 58.9% 99%, 55.9% 99%, 56.2% 82%, 56.3% 66%, 55.2% 59%, 55.3% 51%'
    },
    {
      no: '24', name: 'سید محمدیامین نبوی', father: 'سید محسن', age: 20,
      x: 49.8, y: 56, crop: 'numberone-crops/player-24.png',
      silhouette: '45.3% 43%, 46% 38%, 47.2% 35%, 48.2% 34.8%, 50.3% 35%, 51.9% 38%, 54.1% 46%, 55.3% 54%, 54.4% 66%, 54.6% 79%, 55.6% 98%, 52.3% 99%, 50.8% 80%, 49.6% 78%, 48.5% 99%, 44.7% 99%, 45.7% 77%, 45.7% 65%, 44.7% 55%, 44.5% 47%'
    },
    {
      no: '2', name: 'سید عرفان نبوی', father: 'سید محمدعلی', age: 48,
      x: 39.2, y: 55.6, crop: 'numberone-crops/player-2.png',
      silhouette: '35.1% 43%, 36.2% 40%, 38% 39.2%, 39.4% 39.2%, 41% 41%, 43.2% 46%, 44.5% 55%, 44% 63%, 43.4% 78%, 44.7% 98%, 41% 99%, 39.5% 79%, 38.5% 79%, 37.7% 99%, 33.5% 99%, 34.3% 78%, 34.1% 63%, 33.2% 54%, 33.4% 48%'
    },
    {
      no: '10', name: 'مهدیار جعفری', father: 'جعفری', age: 17,
      x: 26.5, y: 56, crop: 'numberone-crops/player-10.png',
      silhouette: '21.7% 42%, 23% 39%, 24.5% 37%, 26.6% 37%, 28.1% 40%, 30.2% 45%, 31.8% 53%, 31% 64%, 30.5% 79%, 31.7% 99%, 27.7% 99%, 27% 79%, 25.7% 78%, 24.4% 99%, 20.6% 99%, 21.6% 78%, 21.2% 63%, 20.7% 54%, 20.9% 48%'
    },
    {
      no: '7', name: 'سید حسن نبوی', father: 'عبدالمطلب', age: 18,
      x: 14.2, y: 56.2, crop: 'numberone-crops/player-7.png',
      silhouette: '9.8% 41%, 10.7% 38%, 12.3% 36%, 14.6% 36%, 16.4% 38%, 18.5% 43%, 20.3% 53%, 20% 62%, 19.2% 78%, 20.6% 99%, 16.5% 99%, 15.1% 79%, 13.8% 79%, 12.5% 99%, 8% 99%, 9.4% 78%, 9% 63%, 8.4% 54%, 8.5% 48%'
    }
  ];

  const teamInfo = window.KALIGA_1404?.teams?.find(t => Number(t.id) === 2);
  if (!teamInfo) return;
  const fa = value => String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

  // Distinct dialog: the existing image dialog still handles all OTHER teams.
  const dialog = document.createElement('dialog');
  dialog.className = 'ni-dialog';
  dialog.setAttribute('aria-label', 'عکس تعاملی تیم استودیو نامبر وان');
  dialog.innerHTML = `
    <header class="ni-head">
      <div><h2>استودیو نامبر وان · معرفی بازیکنان</h2><p>آرشیو فصل ۱۴۰۴ کالیگا · عکس واقعی و بدون تغییر</p></div>
      <button class="ni-close" type="button" aria-label="بستن عکس">×</button>
    </header>
    <div class="ni-scene" data-selected="false">
      <img class="ni-image" src="../pic2.png" alt="عکس گروهی بازیکنان تیم استودیو نامبر وان" draggable="false">
      <div class="ni-shade" aria-hidden="true"></div>
      <img class="ni-spotlight" src="../pic2.png" alt="" aria-hidden="true" draggable="false">
      <div class="ni-hotspots"></div>
      <section class="ni-card" hidden aria-live="polite" aria-label="مشخصات بازیکن">
      <button class="ni-card-close" type="button" aria-label="بستن اطلاعات بازیکن">×</button>
      <div class="ni-card-main"><img class="ni-crop" alt="برش واقعی از عکس تیمی"><div class="ni-detail"><small>شماره پیراهن</small><span class="ni-number"></span><h3></h3></div></div>
      <div class="ni-meta"><div><span>سن</span><strong class="ni-age"></strong></div><div><span>نام پدر</span><strong class="ni-father"></strong></div></div>
      </section>
    </div>
    <footer class="ni-footer"><span class="ni-hint">+ برای نمایش مشخصات بازیکن، روی علامت لمس کنید.</span><div class="ni-roster" aria-label="انتخاب بازیکن از فهرست"></div></footer>`;
  document.body.appendChild(dialog);

  const scene = dialog.querySelector('.ni-scene');
  const original = dialog.querySelector('.ni-image');
  const spotlight = dialog.querySelector('.ni-spotlight');
  const markers = dialog.querySelector('.ni-hotspots');
  const card = dialog.querySelector('.ni-card');
  const roster = dialog.querySelector('.ni-roster');
  let selectedIndex = -1;
  let holdTimer = null;

  function clearHold() {
    if (holdTimer !== null) window.clearTimeout(holdTimer);
    holdTimer = null;
  }

  function selectPlayer(index) {
    const player = players[index];
    if (!player) return;
    clearHold();
    selectedIndex = index;
    spotlight.style.clipPath = `polygon(${player.silhouette})`;
    scene.dataset.selected = 'true';
    card.hidden = false;
    // Put the info card away from the selected player on wide screens.
    card.classList.toggle('ni-card-right', player.x < 50);
    const crop = card.querySelector('.ni-crop');
    crop.src = player.crop;
    crop.alt = 'برش واقعی از عکس تیمی: ' + player.name;
    card.querySelector('.ni-number').textContent = fa(player.no);
    card.querySelector('h3').textContent = player.name;
    card.querySelector('.ni-age').textContent = fa(player.age) + ' سال';
    card.querySelector('.ni-father').textContent = player.father;
    markers.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    roster.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }

  function deselect() {
    clearHold();
    selectedIndex = -1;
    scene.dataset.selected = 'false';
    card.hidden = true;
    markers.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    roster.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
  }

  players.forEach((player, index) => {
    const point = document.createElement('button');
    point.type = 'button';
    point.className = 'ni-point';
    point.style.setProperty('--x', player.x + '%');
    point.style.setProperty('--y', player.y + '%');
    point.setAttribute('aria-label', 'مشخصات ' + player.name);
    point.setAttribute('aria-pressed', 'false');
    point.title = player.name;
    const plus = document.createElement('span');
    plus.className = 'ni-plus';
    plus.setAttribute('aria-hidden', 'true');
    plus.textContent = '+';
    point.appendChild(plus);
    point.addEventListener('click', event => { event.stopPropagation(); selectPlayer(index); });
    point.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      clearHold();
      holdTimer = window.setTimeout(() => selectPlayer(index), 420);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => point.addEventListener(type, clearHold));
    point.addEventListener('contextmenu', event => event.preventDefault());
    markers.appendChild(point);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ni-chip';
    chip.textContent = 'شماره ' + fa(player.no);
    chip.title = player.name;
    chip.setAttribute('aria-label', 'مشخصات ' + player.name);
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => selectPlayer(index));
    roster.appendChild(chip);
  });

  scene.addEventListener('click', event => {
    if (!event.target.closest('.ni-point')) deselect();
  });
  dialog.querySelector('.ni-card-close').addEventListener('click', deselect);
  dialog.querySelector('.ni-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', deselect);
  original.addEventListener('error', () => {
    scene.insertAdjacentHTML('afterend', '<p class="ni-error">عکس تیم بارگذاری نشد. فایل pic2.png را در پوشه اصلی سایت بررسی کنید.</p>');
    markers.hidden = true;
  }, { once: true });

  // Existing app.js has its own click listener for photo buttons. Capture only team 2.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.team-photo-btn[data-team="2"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    deselect();
    if (!dialog.open) dialog.showModal();
  }, true);
})();
