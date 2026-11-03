/* Kaliga 1405 • weekly match centre and account predictions • v5 */
(() => {
  'use strict';
  const root = document.getElementById('match-list');
  const cfg = window.KALIGA_GOL_CONFIG;
  if (!root || !cfg || !window.supabase) return;
  const db = window.KaligaMember?.db || window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const bucket = db.storage.from('kaliga-1405-media');
  const weeks = ['','اول','دوم','سوم','چهارم','پنجم','ششم','هفتم','هشتم','نهم','دهم','یازدهم'];
  const fa = v => String(v ?? '').replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const el = (tag,cls,txt) => {const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
  const formatDate = d => d ? new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:'Asia/Tehran',year:'numeric',month:'long',day:'numeric'}).format(new Date(d)):'تاریخ نامشخص';
  const clock = m => m.kickoff_time ? fa(m.kickoff_time.slice(0,5)) : m.kickoff_at ? new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(m.kickoff_at)) : '';
  let games=[], teams=new Map(), summaries=new Map(), myGuesses=new Map(), week=1, selected=null, ready=false, predictionReady=false;

  const css=el('style');css.textContent=`
  .km-schedule{display:grid;gap:18px;min-width:0}.km-schedule *{min-width:0}
  .km-week-tabs{display:flex;gap:8px;overflow-x:auto;padding:3px 2px 12px;scrollbar-width:thin;scrollbar-color:#3c665e transparent}
  .km-week-tabs button{flex:none;border:1px solid #345852;border-radius:13px;background:#122d35;color:#d5e4e0;font:700 12px Vazirmatn,Tahoma,sans-serif;padding:11px 14px;cursor:pointer;white-space:nowrap}
  .km-week-tabs button[aria-selected=true]{background:#45d6a1;color:#062b22;border-color:#45d6a1;box-shadow:0 8px 24px #45d6a125}
  .km-week-heading{border:1px solid #315850;border-radius:18px;background:linear-gradient(115deg,#163b3e,#112731);padding:16px 19px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
  .km-week-heading strong{font:800 19px Estedad,Vazirmatn,sans-serif}.km-week-heading small{color:#b6d0c9;font-size:12px}
  .km-games{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
  .km-game{border:1px solid #34564d;border-radius:20px;background:linear-gradient(155deg,#102c34,#0d222b);padding:17px;display:grid;gap:13px;box-shadow:0 10px 30px #00000016}
  .km-gamemeta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#a9c7bf;font-size:11px}
  .km-gamemeta .km-time{color:#6eebbb;font-weight:800}.km-gamemeta .km-time.waiting{color:#ffd28e}
  .km-teams{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:9px;align-items:center}
  .km-side{display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;font-size:13px;font-weight:750;overflow-wrap:anywhere}
  .km-logo{width:48px;height:48px;border-radius:14px;background:#244749;display:grid;place-items:center;overflow:hidden;font-size:23px;flex:none}
  .km-logo img{width:100%;height:100%;object-fit:contain}.km-score{font:900 20px Estedad,Vazirmatn;text-align:center;color:#f4f9f3;white-space:nowrap}
  .km-resultstatus{display:block;text-align:center;color:#a8c0ba;font-size:10px;font-weight:500}
  .km-poll{background:#0a2028;border:1px solid #29474a;border-radius:15px;padding:13px;display:grid;gap:9px}
  .km-pollhead{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;color:#c1d8cf}
  .km-pollhead b{font-weight:800;color:#f1f8f2}.km-votebar{display:flex;overflow:hidden;height:14px;border-radius:99px;background:#26474b;direction:ltr}
  .km-votebar span{height:100%;min-width:0;transition:width .2s ease}.km-homebar{background:#47dca7}.km-drawbar{background:#e4bb72}.km-awaybar{background:#7c9fff}
  .km-outcomes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;font-size:10px;color:#b9d0c9;text-align:center}
  .km-outcomes b{font-weight:850;font-size:12px}.km-outcomes span:nth-child(1) b{color:#48dfaa}.km-outcomes span:nth-child(2) b{color:#f5cc80}.km-outcomes span:nth-child(3) b{color:#9eb8ff}
  .km-emptybar{font-size:11px;color:#91aaa7;text-align:center;padding:2px 0}
  .km-predict-toggle{border:1px solid #59ca9c;background:#164b3e;color:#a9ffe0;border-radius:12px;padding:11px;font:800 12px Vazirmatn,Tahoma;cursor:pointer}
  .km-predict-toggle:disabled{border-color:#304d4a;background:#203337;color:#94a8a5;cursor:not-allowed}
  .km-predict-help{font-size:11px;color:#c3d0c8;line-height:2}
  .km-predict-form{background:#19393c;border:1px solid #427267;border-radius:15px;padding:15px;display:grid;gap:11px}
  .km-predict-form label{font-size:12px;color:#e9f5f0;font-weight:650}.km-predict-form input{width:100%;margin-top:5px;border:1px solid #44655e;border-radius:10px;background:#10262c;color:#fff;padding:10px;font:inherit}
  .km-predict-form input:focus{outline:2px solid #52d3a4;outline-offset:1px}.km-predict-form .km-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.km-predict-form .km-two label,.km-outcomes span{overflow-wrap:anywhere}
  .km-predict-form input[type=checkbox]{width:auto;margin:0;accent-color:#4bdca4}.km-consent{display:flex;gap:8px;align-items:flex-start;line-height:1.7;font-size:11px!important;color:#d0e0da!important}
  .km-form-actions{display:flex;gap:8px;flex-wrap:wrap}.km-form-actions button{border-radius:10px;padding:10px 15px;border:1px solid #3b6c5b;font:700 12px Vazirmatn,Tahoma;cursor:pointer;background:#2cdd9f;color:#072b1c}
  .km-form-actions button[type=button]{background:transparent;color:#d1e8e1}.km-form-actions button:disabled{opacity:.55;cursor:wait}
  .km-form-status{font-size:11px;line-height:1.8;color:#ffd28e}
  .km-guide{border:1px solid #31524d;border-radius:14px;background:#0c232b;padding:14px 16px;font-size:12px;line-height:2.1;color:#bbd4c9}
  @media(max-width:800px){.km-games{grid-template-columns:1fr}}@media(max-width:460px){.km-game{padding:13px}.km-side{font-size:11px}.km-logo{width:42px;height:42px}.km-score{font-size:17px}}
  `;document.head.append(css);

  function teamLogo(t){const logo=el('span','km-logo');if(t?.logo_path){const image=el('img');image.src=bucket.getPublicUrl(t.logo_path).data.publicUrl;image.loading='lazy';image.alt='';image.onerror=()=>logo.replaceChildren(document.createTextNode('⚽'));logo.append(image);}else logo.textContent='⚽';return logo;}
  function side(t){const d=el('div','km-side');d.append(teamLogo(t),el('span','',t?.name||'تیم نامشخص'));return d;}
  function canPredict(m){return predictionReady && m.published && m.status==='scheduled' && !m.predictions_locked && Boolean(m.kickoff_at) && Date.now()<new Date(m.kickoff_at).getTime();}
  function poll(m){
    const homeName=teams.get(m.home_team_id)?.name||'تیم اول';
    const awayName=teams.get(m.away_team_id)?.name||'تیم دوم';
    const info=summaries.get(m.id)||{total:0,home_wins:0,draws:0,away_wins:0};
    const total=Number(info.total)||0;const home=Number(info.home_wins)||0,draw=Number(info.draws)||0,away=Number(info.away_wins)||0;
    const per=n=>total?Math.round(n*100/total):0;
    const box=el('div','km-poll');const heading=el('div','km-pollhead');heading.append(el('b','', '📊 نظر کاربران'),el('span','',`${fa(total)} پیش‌بینی`));box.append(heading);
    if(total){const bar=el('div','km-votebar');[[home,'km-homebar'],[draw,'km-drawbar'],[away,'km-awaybar']].forEach(([n,c])=>{const v=el('span',c);v.style.width=(n/total*100)+'%';bar.append(v);});bar.setAttribute('role','img');bar.setAttribute('aria-label',`${per(home)} درصد برد ${homeName}، ${per(draw)} درصد مساوی، ${per(away)} درصد برد ${awayName}`);box.append(bar);}
    else box.append(el('div','km-emptybar','اولین نفر باش که نتیجه این بازی رو پیش‌بینی می‌کنه'));
    const captions=el('div','km-outcomes');[[`برد ${homeName}`,home],['مساوی',draw],[`برد ${awayName}`,away]].forEach(([label,n])=>{const span=el('span');span.append(el('b','',fa(per(n))+'٪'),el('div','',label));captions.append(span);});box.append(captions);
    return box;
  }
  function formFor(m){
    const existing=myGuesses.get(m.id);
    const homeName=teams.get(m.home_team_id)?.name||'تیم اول';
    const awayName=teams.get(m.away_team_id)?.name||'تیم دوم';
    const form=el('form','km-predict-form');form.append(el('strong','',`پیش‌بینی ${homeName} - ${awayName}`));
    const note=el('div','km-predict-help','هر حساب یک پیش‌بینی برای هر بازی دارد. تا قبل از شروع مسابقه می‌توانی نتیجه را ویرایش کنی.');form.append(note);
    const goals=el('div','km-two');
    const field=(label,name,current)=>{const l=el('label','',label),input=el('input');input.name=name;input.type='number';input.min='0';input.max='60';input.required=true;input.inputMode='numeric';input.placeholder='۰';input.value=current===undefined?'':String(current);l.append(input);return l;};
    goals.append(field(`گل‌های ${homeName}`,'home',existing?.home_guess),field(`گل‌های ${awayName}`,'away',existing?.away_guess));form.append(goals);
    const actions=el('div','km-form-actions'),submit=el('button','',existing?'ذخیره ویرایش پیش‌بینی':'ثبت پیش‌بینی');submit.type='submit';const cancel=el('button','','انصراف');cancel.type='button';cancel.addEventListener('click',()=>{selected=null;render();});actions.append(submit,cancel);form.append(actions);
    const msg=el('div','km-form-status');msg.setAttribute('role','status');form.append(msg);
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!form.reportValidity())return;
      if(!canPredict(m)){msg.textContent='مهلت پیش‌بینی این بازی بسته شده است.';return;}
      if(window.KaligaMember?.profile?.status!=='active'){msg.textContent='ابتدا وارد حساب کاربری فعال خود شو.';return;}
      const values=new FormData(form),h=Number(values.get('home')),a=Number(values.get('away'));
      if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||h>60||a<0||a>60){msg.textContent='نتیجه باید دو عدد بین صفر و ۶۰ باشد.';return;}
      submit.disabled=true;msg.textContent='در حال ثبت...';
      try{
        const r=await db.rpc('kaliga_1405_predict',{p_match_id:m.id,p_home:h,p_away:a});if(r.error)throw r.error;
        await Promise.all([refreshMy(),refreshPoll()]);selected=null;render();
        const success=el('div','km-guide km-success','✅ پیش‌بینی شما ذخیره شد؛ در حساب کاربری قابل مشاهده است.');success.setAttribute('role','status');root.querySelector('.km-week-heading')?.after(success);
      }catch(error){msg.textContent=String(error?.message||'ثبت انجام نشد؛ دوباره تلاش کن.');submit.disabled=false;}
    });return form;
  }
  async function refreshMy(){
    if(window.KaligaMember?.profile?.status!=='active'){myGuesses.clear();if(ready)render();return;}
    const r=await db.rpc('kaliga_1405_my_predictions');if(!r.error)myGuesses=new Map((r.data||[]).map(x=>[x.match_id,x]));if(ready)render();
  }
  async function refreshPoll(){const r=await db.rpc('kaliga_1405_poll');if(!r.error){summaries=new Map((r.data||[]).map(x=>[x.match_id,x]));predictionReady=true;}}
  window.addEventListener('kaliga-auth-changed',()=>{refreshMy().catch(console.warn);});
  function matchCard(m){
    const card=el('article','km-game');const meta=el('div','km-gamemeta');meta.append(el('span','',`بازی ${fa(m.match_number||'—')}`));
    const when=el('span',clock(m)?'km-time':'km-time waiting',clock(m)?'ساعت '+clock(m):'ساعت اعلام نشده');meta.append(when);card.append(meta);
    const teamsRow=el('div','km-teams'),score=el('div','km-score');score.append(el('div','',m.status==='finished'||m.status==='live'?`${fa(m.home_score??'–')} : ${fa(m.away_score??'–')}`:'VS'),el('span','km-resultstatus',m.status==='finished'?'نتیجه نهایی':m.status==='live'?'در حال برگزاری':'برنامه مسابقه'));teamsRow.append(side(teams.get(m.home_team_id)),score,side(teams.get(m.away_team_id)));card.append(teamsRow);
    if(m.venue)card.append(el('div','km-gamemeta',m.venue));
    card.append(poll(m));
    const btn=el('button','km-predict-toggle');btn.type='button';
    if(canPredict(m)){
      if(!window.KaligaMember?.profile){btn.textContent='🔐 برای پیش‌بینی وارد حساب شو';btn.addEventListener('click',()=>{location.hash='#profile';});}
      else if(window.KaligaMember.profile.status!=='active'){btn.disabled=true;btn.textContent='حساب شما غیرفعال است';}
      else {btn.textContent=selected===m.id?'بستن فرم':myGuesses.has(m.id)?'✏️ ویرایش پیش‌بینی من':'✍️ پیش‌بینی این مسابقه';btn.addEventListener('click',()=>{selected=selected===m.id?null:m.id;render();});}
    }
    else {btn.disabled=true;btn.textContent=!predictionReady?'پیش‌بینی به‌زودی فعال می‌شود':m.status!=='scheduled'?'پیش‌بینی مسابقه بسته شده':m.predictions_locked?'پیش‌بینی توسط مدیر بسته شده':!m.kickoff_at?'پس از اعلام ساعت بازی فعال می‌شود':'مهلت پیش‌بینی تمام شده';}
    card.append(btn);
    if(selected===m.id && canPredict(m) && window.KaligaMember?.profile?.status==='active')card.append(formFor(m));
    return card;
  }
  function render(){
    if(!ready)return;const host=el('div','km-schedule');host.dataset.kaligaFixture='1';
    const nav=el('div','km-week-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','انتخاب هفته مسابقات');
    const hasExtra=games.some(x=>!x.week_number||x.week_number>11);const options=Array.from({length:11},(_,i)=>i+1);if(hasExtra)options.push(0);
    for(const n of options){const btn=el('button','',n===0?'سایر بازی‌ها':'هفته '+weeks[n]);btn.type='button';btn.setAttribute('role','tab');btn.setAttribute('aria-selected',String(week===n));btn.onclick=()=>{const left=nav.scrollLeft;week=n;selected=null;render();root.querySelector('.km-week-tabs').scrollLeft=left;};nav.append(btn);}host.append(nav);
    const items=games.filter(m=>week===0?(!m.week_number||Number(m.week_number)>11):Number(m.week_number)===week).sort((a,b)=>Number(a.match_number||999)-Number(b.match_number||999));
    const heading=el('div','km-week-heading');const title=el('strong','',week===0?'سایر مسابقات':'مسابقات هفته '+weeks[week]);const day=items[0]?.match_date?formatDate(items[0].match_date+'T12:00:00+03:30'):(items[0]?.kickoff_at?formatDate(items[0].kickoff_at):'تاریخ اعلام نشده');heading.append(title,el('small','',`${fa(items.length)} مسابقه • ${day}`));host.append(heading);
    const cards=el('div','km-games');if(items.length)items.forEach(m=>cards.append(matchCard(m)));else cards.append(el('div','km-guide','برای این هفته مسابقه‌ای ثبت نشده است.'));host.append(cards);
    host.append(el('div','km-guide','🏆 امتیاز پیش‌بینی: نتیجه دقیق ۳ امتیاز؛ فقط پیش‌بینی درست برد، مساوی یا باخت ۱ امتیاز؛ سایر موارد صفر. ساعت شروع هر بازی، مهلت پیش‌بینی همان بازی است.'));
    root.replaceChildren(host);const count=document.getElementById('stat-matches');if(count)count.textContent=fa(games.length);
  }
  // Existing page loads matches independently; keep the richer view in this container.
  const observer=new MutationObserver(()=>{if(ready&&!root.querySelector('[data-kaliga-fixture]'))render();});observer.observe(root,{childList:true});
  async function load(){
    try{
      const [mr,tr,ar]=await Promise.all([
        db.from('season_1405_matches').select('*').order('week_number',{ascending:true}).order('match_number',{ascending:true}),
        db.from('season_1405_teams').select('id,name,logo_path'),
        db.rpc('kaliga_1405_poll')
      ]);
      if(mr.error)throw mr.error;if(tr.error)throw tr.error;
      games=(mr.data||[]).filter(m=>m.published);teams=new Map((tr.data||[]).map(t=>[t.id,t]));
      predictionReady=!ar.error;if(!ar.error)summaries=new Map((ar.data||[]).map(x=>[x.match_id,x]));await refreshMy();
      const gameTime = m => m.kickoff_at ? new Date(m.kickoff_at).getTime() : m.match_date ? new Date(m.match_date+'T23:59:00+03:30').getTime() : Infinity;
      const sorted=games.slice().sort((a,b)=>gameTime(a)-gameTime(b));
      const upcoming=sorted.find(m=>m.status==='scheduled' && ((m.kickoff_at&&new Date(m.kickoff_at)>new Date())||(m.match_date&&new Date(m.match_date+'T23:59:00+03:30')>new Date())));
      if(upcoming&&Number(upcoming.week_number)>=1&&Number(upcoming.week_number)<=11)week=Number(upcoming.week_number);
      ready=true;render();
    }catch(e){console.warn('Kaliga match centre is unavailable:',e);observer.disconnect();}
  }
  load();
  // Close buttons promptly at match time even while the page stays open.
  setInterval(()=>{if(!ready)return;root.querySelectorAll('.km-predict-toggle:not(:disabled)').forEach(btn=>{const card=btn.closest('.km-game');const i=[...card?.parentNode?.children||[]].indexOf(card);const items=games.filter(m=>Number(m.week_number)===week).sort((a,b)=>Number(a.match_number||999)-Number(b.match_number||999));if(i>=0&&items[i]&&!canPredict(items[i])){selected=null;render();}});},15000);
})();
