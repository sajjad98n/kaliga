(() => {
  'use strict';

  const K = window.KaligaGol;
  if (!K) return;

  const client = K.client;
  const byId = id => document.getElementById(id);
  const refs = {
    section: byId('tournament-admin'),
    title: byId('tournament-title'),
    dateLabel: byId('tournament-date-label'),
    venue: byId('tournament-venue'),
    published: byId('tournament-published'),
    badge: byId('tournament-publish-badge'),
    groupA: byId('tournament-group-a-inputs'),
    groupB: byId('tournament-group-b-inputs'),
    datalist: byId('registered-team-options'),
    editor: byId('tournament-matches-editor'),
    standings: byId('tournament-admin-standings'),
    save: byId('tournament-save-button'),
    clear: byId('tournament-clear-results'),
    message: byId('tournament-message')
  };

  if (!refs.section) return;

  const state = {
    settings: null,
    teams: [],
    matches: [],
    loadedUserId: null
  };

  const fa = value => K.toPersianDigits(value);
  const clean = value => String(value ?? '').trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
  const scoreValue = value => {
    const text = K.toEnglishDigits(value).trim();
    if (text === '') return null;
    const number = Number(text);
    return Number.isInteger(number) && number >= 0 ? number : NaN;
  };

  function showMessage(text, type = 'info') {
    K.setMessage(refs.message, text, type);
  }

  function teamKey(groupCode, slot) {
    return `${groupCode}${slot}`;
  }

  function teamMap() {
    return new Map(state.teams.map(team => [teamKey(team.group_code, team.slot), team.team_name]));
  }

  function teamNameFromSlot(ref) {
    return teamMap().get(ref) || ref;
  }

  function groupMatches(groupCode) {
    return state.matches.filter(match => match.stage === 'group' && match.group_code === groupCode);
  }

  function isFinished(match) {
    return Number.isInteger(match.home_score) && Number.isInteger(match.away_score);
  }

  function calculateStandings(groupCode) {
    const table = [];
    const map = new Map();

    for (let slot = 1; slot <= 5; slot += 1) {
      const ref = teamKey(groupCode, slot);
      const row = {
        ref,
        name: teamNameFromSlot(ref),
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      };
      table.push(row);
      map.set(ref, row);
    }

    groupMatches(groupCode).forEach(match => {
      if (!isFinished(match)) return;
      const home = map.get(match.home_ref);
      const away = map.get(match.away_ref);
      if (!home || !away) return;

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.home_score;
      home.goalsAgainst += match.away_score;
      away.goalsFor += match.away_score;
      away.goalsAgainst += match.home_score;

      if (match.home_score > match.away_score) {
        home.wins += 1;
        away.losses += 1;
        home.points += 3;
      } else if (match.home_score < match.away_score) {
        away.wins += 1;
        home.losses += 1;
        away.points += 3;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });

    table.forEach(row => {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    });

    table.sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name, 'fa')
    );

    return table;
  }

  function groupComplete(groupCode) {
    return groupMatches(groupCode).filter(isFinished).length === 10;
  }

  function resolveMatchSide(reference) {
    if (/^[AB][1-5]$/.test(reference)) {
      return teamNameFromSlot(reference);
    }

    const rank = /^RANK:([AB]):([12])$/.exec(reference);
    if (rank) {
      const [, groupCode, positionText] = rank;
      if (!groupComplete(groupCode)) {
        return positionText === '1'
          ? `اول گروه ${groupCode}`
          : `دوم گروه ${groupCode}`;
      }
      const row = calculateStandings(groupCode)[Number(positionText) - 1];
      return row?.name || `رتبه ${fa(positionText)} گروه ${groupCode}`;
    }

    const winner = /^WIN:(\d+)$/.exec(reference);
    if (winner) {
      const sourceMatch = state.matches.find(match => match.match_no === Number(winner[1]));
      const resolved = sourceMatch ? matchWinner(sourceMatch) : null;
      return resolved || `برنده بازی ${fa(winner[1])}`;
    }

    return reference;
  }

  function matchWinner(match) {
    if (!isFinished(match)) return null;

    if (match.home_score > match.away_score) return resolveMatchSide(match.home_ref);
    if (match.away_score > match.home_score) return resolveMatchSide(match.away_ref);

    if (match.winner_side === 'home') return resolveMatchSide(match.home_ref);
    if (match.winner_side === 'away') return resolveMatchSide(match.away_ref);
    return null;
  }

  function stageLabel(match) {
    if (match.stage === 'group') {
      return `گروه ${match.group_code} ـ دور ${fa(match.round_no)}`;
    }
    if (match.stage === 'semifinal') {
      return `نیمه‌نهایی ${fa(match.round_no)}`;
    }
    return 'فینال';
  }

  function renderTeamInputs() {
    refs.groupA.textContent = '';
    refs.groupB.textContent = '';

    ['A', 'B'].forEach(groupCode => {
      const container = groupCode === 'A' ? refs.groupA : refs.groupB;
      for (let slot = 1; slot <= 5; slot += 1) {
        const ref = teamKey(groupCode, slot);
        const team = state.teams.find(item => item.group_code === groupCode && item.slot === slot);
        const row = document.createElement('label');
        row.className = 'tournament-team-input';
        row.innerHTML = `<span>${ref}</span><input data-team-ref="${ref}" list="registered-team-options" maxlength="80" required>`;
        const input = row.querySelector('input');
        input.value = team?.team_name || ref;
        input.addEventListener('input', () => {
          if (team) team.team_name = input.value;
          refreshDynamicLabels();
          renderStandings();
        });
        container.appendChild(row);
      }
    });
  }

  function renderRegisteredTeams(names) {
    refs.datalist.textContent = '';
    names.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      refs.datalist.appendChild(option);
    });
  }

  function renderStandingsTable(groupCode) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tournament-standing-card';

    const heading = document.createElement('div');
    heading.className = 'tournament-standing-title';
    heading.innerHTML = `<strong>گروه ${groupCode}</strong><span>${groupComplete(groupCode) ? 'جدول نهایی' : 'جدول فعلی'}</span>`;
    wrapper.appendChild(heading);

    const table = document.createElement('div');
    table.className = 'tournament-standing-table';
    table.innerHTML = `
      <div class="tournament-standing-row tournament-standing-header">
        <span>رتبه</span><span>تیم</span><span>بازی</span><span>برد</span><span>مساوی</span><span>باخت</span><span>تفاضل</span><span>امتیاز</span>
      </div>`;

    calculateStandings(groupCode).forEach((row, index) => {
      const line = document.createElement('div');
      line.className = `tournament-standing-row${index < 2 ? ' qualified' : ''}`;
      line.innerHTML = `
        <span>${fa(index + 1)}</span>
        <strong title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</strong>
        <span>${fa(row.played)}</span>
        <span>${fa(row.wins)}</span>
        <span>${fa(row.draws)}</span>
        <span>${fa(row.losses)}</span>
        <span>${fa(row.goalDifference)}</span>
        <b>${fa(row.points)}</b>`;
      table.appendChild(line);
    });

    wrapper.appendChild(table);
    return wrapper;
  }

  function renderStandings() {
    refs.standings.textContent = '';
    refs.standings.appendChild(renderStandingsTable('A'));
    refs.standings.appendChild(renderStandingsTable('B'));
  }

  function createScoreInput(match, side) {
    const input = document.createElement('input');
    input.className = 'tournament-score-input';
    input.type = 'number';
    input.min = '0';
    input.max = '99';
    input.inputMode = 'numeric';
    input.placeholder = '—';
    const key = side === 'home' ? 'home_score' : 'away_score';
    input.value = Number.isInteger(match[key]) ? match[key] : '';
    input.setAttribute('aria-label', side === 'home' ? 'گل تیم اول' : 'گل تیم دوم');
    input.addEventListener('input', () => {
      const value = scoreValue(input.value);
      match[key] = Number.isNaN(value) ? null : value;
      renderStandings();
      refreshDynamicLabels();
    });
    return input;
  }

  function renderMatches() {
    refs.editor.textContent = '';

    state.matches
      .slice()
      .sort((a, b) => a.match_no - b.match_no)
      .forEach(match => {
        const row = document.createElement('article');
        row.className = `tournament-match-editor ${match.stage}`;
        row.dataset.matchNo = String(match.match_no);

        const meta = document.createElement('div');
        meta.className = 'tournament-match-editor-meta';
        meta.innerHTML = `<strong>بازی ${fa(match.match_no)}</strong><span>${stageLabel(match)}</span>`;

        const teams = document.createElement('div');
        teams.className = 'tournament-match-editor-teams';

        const home = document.createElement('strong');
        home.className = 'match-home-label';
        home.textContent = resolveMatchSide(match.home_ref);

        const away = document.createElement('strong');
        away.className = 'match-away-label';
        away.textContent = resolveMatchSide(match.away_ref);

        teams.appendChild(home);
        teams.appendChild(createScoreInput(match, 'home'));

        const separator = document.createElement('span');
        separator.className = 'tournament-score-separator';
        separator.textContent = '–';
        teams.appendChild(separator);

        teams.appendChild(createScoreInput(match, 'away'));
        teams.appendChild(away);

        const controls = document.createElement('div');
        controls.className = 'tournament-match-editor-controls';

        const timeLabel = document.createElement('label');
        timeLabel.innerHTML = '<span>ساعت</span>';
        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.className = 'tournament-time-input';
        timeInput.value = match.match_time ? String(match.match_time).slice(0, 5) : '';
        timeInput.addEventListener('input', () => {
          match.match_time = timeInput.value || null;
        });
        timeLabel.appendChild(timeInput);
        controls.appendChild(timeLabel);

        if (match.stage !== 'group') {
          const winnerLabel = document.createElement('label');
          winnerLabel.innerHTML = '<span>برنده در صورت مساوی</span>';
          const winnerSelect = document.createElement('select');
          winnerSelect.className = 'tournament-winner-select';
          winnerSelect.innerHTML = `
            <option value="">خودکار / تعیین نشده</option>
            <option value="home">تیم اول</option>
            <option value="away">تیم دوم</option>`;
          winnerSelect.value = match.winner_side || '';
          winnerSelect.addEventListener('change', () => {
            match.winner_side = winnerSelect.value || null;
            refreshDynamicLabels();
          });
          winnerLabel.appendChild(winnerSelect);
          controls.appendChild(winnerLabel);
        }

        row.appendChild(meta);
        row.appendChild(teams);
        row.appendChild(controls);
        refs.editor.appendChild(row);
      });
  }

  function refreshDynamicLabels() {
    refs.editor.querySelectorAll('[data-match-no]').forEach(row => {
      const match = state.matches.find(item => item.match_no === Number(row.dataset.matchNo));
      if (!match) return;
      const home = row.querySelector('.match-home-label');
      const away = row.querySelector('.match-away-label');
      if (home) home.textContent = resolveMatchSide(match.home_ref);
      if (away) away.textContent = resolveMatchSide(match.away_ref);
    });
  }

  function fillSettings() {
    refs.title.value = state.settings.event_title || '';
    refs.dateLabel.value = state.settings.event_date_label || '';
    refs.venue.value = state.settings.venue || '';
    refs.published.checked = Boolean(state.settings.published);
    updateBadge();
  }

  function updateBadge() {
    const published = refs.published.checked;
    refs.badge.textContent = published ? 'منتشر شده' : 'منتشر نشده';
    refs.badge.className = `status-badge ${published ? 'approved' : 'pending'}`;
  }

  function readTeamsFromInputs() {
    const rows = [];
    ['A', 'B'].forEach(groupCode => {
      for (let slot = 1; slot <= 5; slot += 1) {
        const ref = teamKey(groupCode, slot);
        const input = refs.section.querySelector(`[data-team-ref="${ref}"]`);
        rows.push({
          group_code: groupCode,
          slot,
          team_name: clean(input?.value)
        });
      }
    });
    return rows;
  }

  function validateBeforeSave(settingsRow, teamRows, matchRows) {
    if (settingsRow.event_title.length < 2) {
      throw new Error('عنوان مسابقات را کامل وارد کنید.');
    }
    if (settingsRow.event_date_label.length < 3) {
      throw new Error('تاریخ روز مسابقات را وارد کنید.');
    }
    if (settingsRow.venue.length < 3) {
      throw new Error('محل برگزاری را کامل وارد کنید.');
    }

    if (teamRows.some(team => !team.team_name)) {
      throw new Error('نام هر ده تیم باید وارد شود.');
    }

    const normalized = teamRows.map(team => team.team_name.toLocaleLowerCase('fa').replace(/\s+/g, ' '));
    if (new Set(normalized).size !== normalized.length) {
      throw new Error('نام تیم‌ها نباید تکراری باشد.');
    }

    for (const match of matchRows) {
      const home = match.home_score;
      const away = match.away_score;
      if ((home === null) !== (away === null)) {
        throw new Error(`نتیجه بازی ${fa(match.match_no)} باید برای هر دو تیم وارد شود.`);
      }
      if ((home !== null && (!Number.isInteger(home) || home < 0)) ||
          (away !== null && (!Number.isInteger(away) || away < 0))) {
        throw new Error(`نتیجه بازی ${fa(match.match_no)} معتبر نیست.`);
      }
      if (match.stage !== 'group' && home !== null && home === away && !match.winner_side) {
        throw new Error(`بازی حذفی ${fa(match.match_no)} مساوی است؛ برنده را مشخص کنید.`);
      }
    }

    if (settingsRow.published && matchRows.some(match => !match.match_time)) {
      throw new Error('برای انتشار برنامه، ساعت هر ۲۳ مسابقه را وارد کنید.');
    }
  }

  async function saveTournament() {
    refs.save.disabled = true;
    showMessage('در حال ذخیره برنامه...', 'info');

    try {
      const settingsRow = {
        id: 1,
        event_title: clean(refs.title.value),
        event_date_label: clean(refs.dateLabel.value),
        venue: clean(refs.venue.value),
        published: refs.published.checked
      };

      const teamRows = readTeamsFromInputs();
      const matchRows = state.matches.map(match => ({
        match_no: match.match_no,
        stage: match.stage,
        group_code: match.group_code,
        round_no: match.round_no,
        home_ref: match.home_ref,
        away_ref: match.away_ref,
        match_time: match.match_time || null,
        home_score: Number.isInteger(match.home_score) ? match.home_score : null,
        away_score: Number.isInteger(match.away_score) ? match.away_score : null,
        winner_side: match.stage === 'group' ? null : (match.winner_side || null)
      }));

      validateBeforeSave(settingsRow, teamRows, matchRows);

      const settingsResult = await client
        .from('gol_tournament_settings')
        .upsert(settingsRow, { onConflict: 'id' });
      if (settingsResult.error) throw settingsResult.error;

      const teamsResult = await client
        .from('gol_tournament_teams')
        .upsert(teamRows, { onConflict: 'group_code,slot' });
      if (teamsResult.error) throw teamsResult.error;

      const matchesResult = await client
        .from('gol_tournament_matches')
        .upsert(matchRows, { onConflict: 'match_no' });
      if (matchesResult.error) throw matchesResult.error;

      state.settings = settingsRow;
      state.teams = teamRows;
      updateBadge();
      renderStandings();
      refreshDynamicLabels();
      showMessage('برنامه بازی‌ها با موفقیت ذخیره شد.', 'success');
    } catch (error) {
      console.error(error);
      let message = error.message || 'ذخیره برنامه انجام نشد.';
      if (error.code === '23505') message = 'نام یکی از تیم‌ها تکراری است.';
      if (error.code === '42P01') message = 'جدول‌های برنامه مسابقات ساخته نشده‌اند؛ ابتدا فایل SQL را اجرا کنید.';
      showMessage(message, 'error');
    } finally {
      refs.save.disabled = false;
    }
  }

  async function clearResults() {
    const accepted = window.confirm('نتیجه تمام ۲۳ بازی پاک شود؟ نام تیم‌ها و ساعت‌ها باقی می‌ماند.');
    if (!accepted) return;

    state.matches.forEach(match => {
      match.home_score = null;
      match.away_score = null;
      match.winner_side = null;
    });

    renderMatches();
    renderStandings();
    showMessage('نتایج در صفحه پاک شد؛ برای ثبت نهایی روی «ذخیره برنامه بازی‌ها» بزنید.', 'info');
  }

  async function loadRegisteredTeamSuggestions() {
    const { data, error } = await client
      .from('gol_teams')
      .select('team_name')
      .order('team_name', { ascending: true });

    if (!error && data) {
      renderRegisteredTeams([...new Set(data.map(row => row.team_name).filter(Boolean))]);
    }
  }

  async function loadTournament() {
    showMessage('در حال دریافت برنامه بازی‌ها...', 'info');

    try {
      const [settingsResult, teamsResult, matchesResult] = await Promise.all([
        client.from('gol_tournament_settings').select('*').eq('id', 1).single(),
        client.from('gol_tournament_teams').select('*').order('group_code').order('slot'),
        client.from('gol_tournament_matches').select('*').order('match_no')
      ]);

      if (settingsResult.error) throw settingsResult.error;
      if (teamsResult.error) throw teamsResult.error;
      if (matchesResult.error) throw matchesResult.error;

      state.settings = settingsResult.data;
      state.teams = teamsResult.data || [];
      state.matches = (matchesResult.data || []).map(match => ({
        ...match,
        home_score: match.home_score === null ? null : Number(match.home_score),
        away_score: match.away_score === null ? null : Number(match.away_score)
      }));

      fillSettings();
      renderTeamInputs();
      renderMatches();
      renderStandings();
      await loadRegisteredTeamSuggestions();
      showMessage('', 'info');
    } catch (error) {
      console.error(error);
      const message = error.code === '42P01'
        ? 'ابتدا فایل SQL برنامه مسابقات را در Supabase اجرا کنید.'
        : (error.message || 'دریافت برنامه مسابقات انجام نشد.');
      showMessage(message, 'error');
      refs.editor.innerHTML = `<div class="empty">${message}</div>`;
    }
  }

  async function handleSession(session) {
    if (!session?.user?.id || state.loadedUserId === session.user.id) return;

    const { data, error } = await client
      .from('gol_admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !data) return;
    state.loadedUserId = session.user.id;
    await loadTournament();
  }

  refs.save.addEventListener('click', saveTournament);
  refs.clear.addEventListener('click', clearResults);
  refs.published.addEventListener('change', updateBadge);

  client.auth.onAuthStateChange((_event, session) => {
    handleSession(session).catch(console.error);
  });

  client.auth.getSession().then(({ data }) => {
    handleSession(data.session).catch(console.error);
  });
})();
