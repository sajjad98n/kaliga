/*
 * Kaliga 1405 fixture view. It reads Supabase (no hard-coded team data),
 * groups matches by week and displays confirmed Friday dates plus time-of-day.
 * Loaded AFTER the existing season script from 1405/index.html.
 * No write access and no extra credentials are needed.
 */
(() => {
  'use strict';
  const root = document.getElementById('match-list');
  const config = window.KALIGA_GOL_CONFIG;
  if (!root || !config || !window.supabase) return;

  const fa = v => String(v ?? '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const weeks = ['','اول','دوم','سوم','چهارم','پنجم','ششم','هفتم','هشتم','نهم','دهم','یازدهم'];
  const client = window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
  const storage = client.storage.from('kaliga-1405-media');
  let games = [], teams = new Map(), currentWeek = 1, ready = false;

  const style = document.createElement('style');
  style.textContent = `
    .schedule1405{min-width:0;width:100%;display:grid;gap:14px}
    .schedule1405-tabs{display:flex;gap:7px;overflow-x:auto;padding:3px 2px 12px;scrollbar-width:thin;scrollbar-color:#3b685e transparent}
    .schedule1405-tabs button{flex:0 0 auto;padding:9px 14px;border-radius:13px;border:1px solid #35544f;background:#123039;color:#c4dcd7;font:600 12px Vazirmatn,Tahoma,sans-serif;white-space:nowrap;cursor:pointer}
    .schedule1405-tabs button[aria-selected="true"]{background:var(--green,#45d6a1);color:#09271e;border-color:transparent;font-weight:800}
    .schedule1405-week-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:12px 15px;border:1px solid #2e4e4a;border-radius:15px;background:#12323a}
    .schedule1405-week-head strong{font-size:15px}
    .schedule1405-week-head span{font-size:11px;color:#a7c8c1}
    .schedule1405-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
    .schedule1405 .match-card{min-width:0}
    .schedule1405 .match-team{min-width:0;overflow-wrap:anywhere}
    .schedule1405 .match-meta{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:7px}
    .schedule1405-clock{color:#75e8bc;font-weight:800}
    .schedule1405-pending{color:#f7cb77;font-weight:700}
    .schedule1405-no-date{opacity:.8}
    @media(max-width:760px){.schedule1405-grid{grid-template-columns:1fr}}
    @media(max-width:430px){.schedule1405 .match-card{gap:6px;padding:12px 10px}.schedule1405 .match-team{font-size:11px;gap:5px}.schedule1405 .match-middle{min-width:60px}.schedule1405 .match-team .mini{width:25px;height:25px;border-radius:7px}.schedule1405 .score{font-size:15px}.schedule1405-tabs button{padding:9px 12px}}
  `;
  document.head.append(style);

  const el = (tag, className, value) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value !== undefined) n.textContent = String(value);
    return n;
  };
  const formatDate = date => {
    if (!date) return null;
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone:'Asia/Tehran',day:'numeric',month:'short',year:'numeric'
    }).format(new Date(date));
  };
  const clockOf = match => {
    if (match.kickoff_time) return fa(String(match.kickoff_time).slice(0,5));
    if (match.kickoff_at) return new Intl.DateTimeFormat('fa-IR', {
      timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).format(new Date(match.kickoff_at));
    return null;
  };
  const teamEl = (data, side) => {
    const item = el('div','match-team'+(side === 'away' ? ' away' : ''));
    const badge = el('span','mini');
    if (data?.logo_path) {
      const img = document.createElement('img');
      img.src=storage.getPublicUrl(data.logo_path).data.publicUrl;
      img.alt = '';
      img.loading='lazy';
      img.onerror=()=>badge.replaceChildren(document.createTextNode('⚽'));
      badge.append(img);
    } else badge.textContent='⚽';
    const name = el('span','',data?.name||'تیم نامشخص');
    if (side === 'away') item.append(name,badge);
    else item.append(badge,name);
    return item;
  };
  const makeMatch = m => {
    const card = el('article','match-card');
    const middle=el('div','match-middle');
    const result = m.status==='finished'||m.status==='live'
      ? `${fa(m.home_score ?? '–')} : ${fa(m.away_score ?? '–')}` : 'VS';
    middle.append(el('div','score',result),el('small','',m.status==='finished'?'پایان بازی':m.status==='live'?'در حال برگزاری':'برنامه بازی'));
    card.append(teamEl(teams.get(m.home_team_id),'home'),middle,teamEl(teams.get(m.away_team_id),'away'));
    const meta = el('div','match-meta');
    if (m.match_number) meta.append(el('span','',`بازی ${fa(m.match_number)}`));
    meta.append(el('span','', '•'));
    const clock = clockOf(m);
    meta.append(el('span',clock?'schedule1405-clock':'schedule1405-pending',clock?`ساعت ${clock}`:'ساعت اعلام نشده'));
    if (m.match_date || m.kickoff_at) meta.append(el('span','',`• ${formatDate(m.match_date ? m.match_date+'T12:00:00+03:30' : m.kickoff_at)}`));
    if (m.venue) meta.append(el('span','',`• ${m.venue}`));
    card.append(meta);
    return card;
  };

  const render = () => {
    if (!ready) return;
    const host = el('div','schedule1405');
    host.dataset.fixtureEnhanced = '1';
    const tabs=el('div','schedule1405-tabs');
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','هفته مسابقات');
    const hasUnassigned = games.some(m=>!m.week_number || Number(m.week_number)>11);
    const shownWeeks = Array.from({length:11},(_,i)=>i+1);
    if(hasUnassigned)shownWeeks.push(0);
    shownWeeks.forEach(week=>{
      const text = week===0?'سایر بازی‌ها':`هفته ${weeks[week]}`;
      const btn=el('button','',text);
      btn.type='button'; btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected',String(week===currentWeek));
      btn.onclick=()=>{const scroll=tabs.scrollLeft;currentWeek=week;render();const next=root.querySelector('.schedule1405-tabs');if(next)next.scrollLeft=scroll;};
      tabs.append(btn);
    });
    host.append(tabs);
    const items=games.filter(m=>currentWeek===0?(!m.week_number||Number(m.week_number)>11):Number(m.week_number)===currentWeek)
      .sort((a,b)=>(Number(a.match_number)||999)-(Number(b.match_number)||999));
    const heading=el('div','schedule1405-week-head');
    const headerDate=items[0]?.match_date ? formatDate(items[0].match_date+'T12:00:00+03:30') : (items[0]?.kickoff_at ? formatDate(items[0].kickoff_at) : null);
    heading.append(el('strong','',currentWeek===0?'سایر مسابقات':`برنامه هفته ${weeks[currentWeek]}`));
    heading.append(el('span','',`${fa(items.length)} بازی • ${headerDate ? 'جمعه '+headerDate : 'تاریخ برگزاری اعلام نشده'}`));
    host.append(heading);
    const cards=el('div','schedule1405-grid');
    if (items.length) items.forEach(m=>cards.append(makeMatch(m)));
    else cards.append(el('div','empty','برای این هفته هنوز بازی‌ای ثبت نشده است.'));
    host.append(cards);
    root.replaceChildren(host);
    const total=document.getElementById('stat-matches');
    if (total) total.textContent=fa(games.length);
  };

  // The original season page also renders this list once after its own query.
  // Restore the weekly view if that late render replaces it, without looping.
  const observer = new MutationObserver(() => {
    if (ready && !root.querySelector('[data-fixture-enhanced]')) render();
  });
  observer.observe(root,{childList:true});

  (async () => {
    try {
      const [mr,tr] = await Promise.all([
        client.from('season_1405_matches').select('*').order('week_number',{ascending:true}).order('match_number',{ascending:true}),
        client.from('season_1405_teams').select('id,name,logo_path')
      ]);
      if (mr.error) throw mr.error;
      if (tr.error) throw tr.error;
      games=(mr.data||[]).filter(m=>m.published);
      teams=new Map((tr.data||[]).map(t=>[t.id,t]));
      ready=true;
      render();
    } catch (error) {
      // Preserve the existing public view when the SQL migration is not installed.
      console.warn('Kaliga weekly schedule not yet available:',error);
      observer.disconnect();
    }
  })();
})();
