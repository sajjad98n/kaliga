(() => {
  'use strict';

  const K = window.KaligaGol;
  if (!K) return;

  const client = K.client;
  const root = document.getElementById('tournament-public');
  if (!root) return;

  const titleEl = document.getElementById('tournament-public-title');
  const metaEl = document.getElementById('tournament-public-meta');
  const groupsEl = document.getElementById('tournament-public-groups');
  const standingsEl = document.getElementById('tournament-public-standings');
  const scheduleEl = document.getElementById('tournament-public-schedule');
  const championEl = document.getElementById('tournament-champion');

  const fa = value => K.toPersianDigits(value);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
  const state = { settings: null, teams: [], matches: [] };

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
      return calculateStandings(groupCode)[Number(positionText) - 1]?.name || reference;
    }

    const winner = /^WIN:(\d+)$/.exec(reference);
    if (winner) {
      const source = state.matches.find(match => match.match_no === Number(winner[1]));
      return source ? (matchWinner(source) || `برنده بازی ${fa(winner[1])}`) : reference;
    }

    const loser = /^LOSE:(\d+)$/.exec(reference);
    if (loser) {
      const source = state.matches.find(match => match.match_no === Number(loser[1]));
      return source ? (matchLoser(source) || `بازنده بازی ${fa(loser[1])}`) : reference;
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

  function matchLoser(match) {
    if (!isFinished(match)) return null;

    if (match.home_score > match.away_score) return resolveMatchSide(match.away_ref);
    if (match.away_score > match.home_score) return resolveMatchSide(match.home_ref);

    if (match.winner_side === 'home') return resolveMatchSide(match.away_ref);
    if (match.winner_side === 'away') return resolveMatchSide(match.home_ref);
    return null;
  }

  function stageLabel(match) {
    if (match.stage === 'group') return `گروه ${match.group_code}`;
    if (match.stage === 'semifinal') return `نیمه‌نهایی ${fa(match.round_no)}`;
    if (match.stage === 'third_place') return 'رده‌بندی';
    return 'فینال';
  }

  function displayTime(value) {
    if (!value) return 'ساعت اعلام می‌شود';
    return fa(String(value).slice(0, 5));
  }

  function renderGroups() {
    groupsEl.textContent = '';

    ['A', 'B'].forEach(groupCode => {
      const card = document.createElement('article');
      card.className = 'tournament-group-card';
      card.innerHTML = `<div class="tournament-group-title"><strong>گروه ${groupCode}</strong><span>۵ تیم</span></div>`;

      const list = document.createElement('ol');
      state.teams
        .filter(team => team.group_code === groupCode)
        .sort((a, b) => a.slot - b.slot)
        .forEach(team => {
          const item = document.createElement('li');
          item.innerHTML = `<span>${groupCode}${fa(team.slot)}</span><strong>${escapeHtml(team.team_name)}</strong>`;
          list.appendChild(item);
        });

      card.appendChild(list);
      groupsEl.appendChild(card);
    });
  }

  function renderStandingCard(groupCode) {
    const card = document.createElement('article');
    card.className = 'tournament-standing-card';

    const heading = document.createElement('div');
    heading.className = 'tournament-standing-title';
    heading.innerHTML = `<strong>جدول گروه ${groupCode}</strong><span>${groupComplete(groupCode) ? 'نهایی' : 'زنده'}</span>`;
    card.appendChild(heading);

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

    card.appendChild(table);
    return card;
  }

  function renderStandings() {
    standingsEl.textContent = '';
    standingsEl.appendChild(renderStandingCard('A'));
    standingsEl.appendChild(renderStandingCard('B'));
  }

  function renderSchedule() {
    scheduleEl.textContent = '';

    const sorted = state.matches.slice().sort((a, b) => {
      const aTime = a.match_time || '99:99:99';
      const bTime = b.match_time || '99:99:99';
      return aTime.localeCompare(bTime) || a.match_no - b.match_no;
    });

    sorted.forEach(match => {
      const card = document.createElement('article');
      card.className = `tournament-schedule-card ${match.stage}`;

      const score = isFinished(match)
        ? `<div class="tournament-public-score"><b>${fa(match.home_score)}</b><span>–</span><b>${fa(match.away_score)}</b></div>`
        : '<div class="tournament-public-score pending-score"><span>مقابل</span></div>';

      card.innerHTML = `
        <div class="tournament-schedule-time">
          <strong>${displayTime(match.match_time)}</strong>
          <span>بازی ${fa(match.match_no)}</span>
        </div>
        <div class="tournament-schedule-stage">${stageLabel(match)}</div>
        <div class="tournament-schedule-teams">
          <strong>${escapeHtml(resolveMatchSide(match.home_ref))}</strong>
          ${score}
          <strong>${escapeHtml(resolveMatchSide(match.away_ref))}</strong>
        </div>`;

      if (match.stage !== 'group' && isFinished(match)) {
        const winner = matchWinner(match);
        if (winner) {
          const winnerLine = document.createElement('div');
          winnerLine.className = 'tournament-match-winner';
          winnerLine.textContent = match.stage === 'third_place'
            ? `مقام سوم: ${winner}`
            : `برنده: ${winner}`;
          card.appendChild(winnerLine);
        }
      }

      scheduleEl.appendChild(card);
    });
  }

  function renderChampion() {
    const finalMatch = state.matches.find(match => match.match_no === 23);
    const champion = finalMatch ? matchWinner(finalMatch) : null;

    if (!champion) {
      championEl.classList.add('hidden');
      championEl.textContent = '';
      return;
    }

    championEl.classList.remove('hidden');
    championEl.innerHTML = `<span>🏆 قهرمان مسابقات</span><strong>${escapeHtml(champion)}</strong>`;
  }

  async function load() {
    try {
      const settingsResult = await client
        .from('gol_tournament_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingsResult.error || !settingsResult.data?.published) return;

      const [teamsResult, matchesResult] = await Promise.all([
        client.from('gol_tournament_teams').select('*').order('group_code').order('slot'),
        client.from('gol_tournament_matches').select('*').order('match_no')
      ]);

      if (teamsResult.error) throw teamsResult.error;
      if (matchesResult.error) throw matchesResult.error;

      state.settings = settingsResult.data;
      state.teams = teamsResult.data || [];
      state.matches = (matchesResult.data || []).map(match => ({
        ...match,
        home_score: match.home_score === null ? null : Number(match.home_score),
        away_score: match.away_score === null ? null : Number(match.away_score)
      }));

      titleEl.textContent = state.settings.event_title;
      metaEl.textContent = `${state.settings.event_date_label} — ${state.settings.venue}`;

      renderGroups();
      renderStandings();
      renderSchedule();
      renderChampion();
      root.classList.remove('hidden');
    } catch (error) {
      console.error('خطا در دریافت برنامه مسابقات:', error);
    }
  }

  load();
})();
