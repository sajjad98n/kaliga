/* Kaliga 1405 v7: lazy section data; original visual renderers preserved. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const digits = value => new Intl.NumberFormat('fa-IR').format(Number(value) || 0);
  const dateString = value => value ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Tehran'}).format(new Date(value)) : 'تاریخ اعلام نشده';
  const dateTime = value => value ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tehran'}).format(new Date(value)) : 'زمان اعلام نشده';
  const mk = (tag,cls,txt) => {const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e;};
  const empty = (el,message,icon='⏳') => {el.replaceChildren();const b=mk('div','empty');b.append(mk('span','empty-icon',icon),mk('span','',message));el.append(b);};
  const cfg=window.KALIGA_GOL_CONFIG;
  if (!cfg || !window.supabase) { $('connection-alert').hidden=false;$('connection-alert').textContent='برای نمایش اطلاعات فصل، اتصال به پایگاه داده باید فعال شود.';return; }
  const db=window.KALIGA_1405_DB||(window.KALIGA_1405_DB=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey));
  const storage=db.storage.from('kaliga-1405-media');
  const urlFor = path => path ? storage.getPublicUrl(path).data.publicUrl : '';
  const logoEl = (team,klass='team-logo') => {const wrap=mk('div',klass);if(team?.logo_path){const img=document.createElement('img');img.src=urlFor(team.logo_path);img.loading='lazy';img.alt=`لوگوی ${team.name}`;img.onerror=()=>{wrap.replaceChildren(mk('span','', '⚽'));};wrap.append(img);}else{wrap.textContent='⚽';}return wrap;};
  const rows = {teams:[],matches:[],announcements:[],posts:[],media:[]};
  const badge = (txt) => mk('span','pill',txt);
  function renderTeams() {
    const root=$('team-grid');root.replaceChildren();const ts=rows.teams;
    $('stat-teams').textContent=digits(ts.length);$('team-count-pill').textContent=ts.length?`${digits(ts.length)} تیم معرفی شده`:'در انتظار معرفی';
    ts.forEach(t=>{const card=mk('article','team-card');card.append(logoEl(t),mk('h3','',t.name));if(t.city)card.append(mk('p','',t.city));if(t.coach)card.append(mk('p','',`مربی: ${t.coach}`));if(t.bio)card.append(mk('p','team-bio',t.bio));root.append(card);});
    const planned=Math.max(0,12-ts.length);for(let i=0;i<planned;i++){const card=mk('article','team-card placeholder');card.append(logoEl(null),mk('h3','',`جایگاه تیم ${digits(ts.length+i+1)}`),mk('p','','در انتظار معرفی رسمی'));root.append(card);}
  }
  function computeStandings(){const map=new Map(rows.teams.map(t=>[t.id,{team:t,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));rows.matches.filter(m=>m.status==='finished'&&m.home_score!==null&&m.away_score!==null).forEach(m=>{const h=map.get(m.home_team_id),a=map.get(m.away_team_id);if(!h||!a)return;const hs=Number(m.home_score),as=Number(m.away_score);h.p++;a.p++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;if(hs>as){h.w++;a.l++;h.pts+=3;}else if(hs<as){a.w++;h.l++;a.pts+=3;}else{h.d++;a.d++;h.pts++;a.pts++;}});return [...map.values()].sort((a,b)=>b.pts-a.pts||((b.gf-b.ga)-(a.gf-a.ga))||b.gf-a.gf||b.w-a.w||a.team.name.localeCompare(b.team.name,'fa'));}
  function renderStandings(){const root=$('standings-body');root.replaceChildren();const data=computeStandings();if(!data.length){const tr=mk('tr');const td=mk('td','empty','بعد از معرفی تیم‌ها جدول لیگ فعال می‌شود.');td.colSpan=8;tr.append(td);root.append(tr);$('table-hint').textContent='منتظر معرفی تیم‌ها';return;}
    $('table-hint').textContent=`${digits(data.length)} تیم`;data.forEach((r,i)=>{const tr=mk('tr');tr.append(mk('td','rank',digits(i+1)));const name=mk('td','team-col');const teamCell=mk('div','team-cell');teamCell.append(logoEl(r.team,'ball'),mk('span','',r.team.name));name.append(teamCell);tr.append(name);[r.p,r.w,r.d,r.l].forEach(n=>tr.append(mk('td','',digits(n))));tr.append(mk('td','',digits(r.gf-r.ga)),mk('td','pts',digits(r.pts)));root.append(tr);});}
  function renderNotices(){const root=$('notice-list');root.replaceChildren();if(!rows.announcements.length){empty(root,'هنوز اطلاعیه‌ای منتشر نشده است.','📣');return;}
    rows.announcements.forEach(n=>{const a=mk('article','notice-item');const m=mk('div','notice-top');if(n.pinned)m.append(mk('span','pin','📌 سنجاق‌شده'));m.append(mk('time','',dateString(n.created_at)));a.append(m,mk('h4','',n.title));if(n.body)a.append(mk('p','',n.body));root.append(a);});}
  function renderMatches(){const root=$('match-list');root.replaceChildren();$('stat-matches').textContent=digits(rows.matches.length);if(!rows.matches.length){empty(root,'زمان و برنامه بازی‌ها بعد از قرعه‌کشی اعلام می‌شود.','📅');return;}
    const byId=new Map(rows.teams.map(t=>[t.id,t]));rows.matches.slice().sort((a,b)=>{
      if(!a.kickoff_at)return 1;if(!b.kickoff_at)return -1;return new Date(a.kickoff_at)-new Date(b.kickoff_at);
    }).forEach(m=>{const h=byId.get(m.home_team_id),a=byId.get(m.away_team_id);if(!h||!a)return;const card=mk('article','match-card');const left=mk('div','match-team');left.append(logoEl(h,'mini'),mk('span','',h.name));const middle=mk('div','match-middle');const s=m.status==='finished'||m.status==='live' ? `${m.home_score??'–'} : ${m.away_score??'–'}` : 'VS';middle.append(mk('div','score',s),mk('small','',m.status==='finished'?'پایان بازی':m.status==='live'?'در حال برگزاری':'برنامه بازی'));const right=mk('div','match-team away');right.append(mk('span','',a.name),logoEl(a,'mini'));const sub=mk('div','match-meta',`${m.round_label||'لیگ'}  ·  ${dateTime(m.kickoff_at)}${m.venue?'  ·  '+m.venue:''}`);card.append(left,middle,right,sub);root.append(card);});}
  async function sharePost(post){const link=location.origin+location.pathname+'#post-'+post.id;try{if(navigator.share)await navigator.share({title:post.title,url:link});else if(navigator.clipboard){await navigator.clipboard.writeText(link);alert('لینک پست کپی شد.');}else{prompt('لینک پست:',link);}}catch(e){if(e.name!=='AbortError')alert('اشتراک‌گذاری انجام نشد.');}}
  function renderPosts(){const root=$('post-feed');root.replaceChildren();$('stat-posts').textContent=digits(rows.posts.length);if(!rows.posts.length){empty(root,'اولین پست‌های فصل جدید به‌زودی منتشر می‌شوند.','📸');return;}
    rows.posts.forEach(post=>{const files=rows.media.filter(f=>f.post_id===post.id).sort((a,b)=>a.display_order-b.display_order);const article=mk('article','post');article.id='post-'+post.id;const header=mk('header','post-head');const profile=mk('div','profile');const avatar=mk('div','avatar');const img=mk('img');img.src='../logo.png';img.alt='لوگوی کالیگا';avatar.append(img);const names=mk('div');names.append(mk('strong','','kaliga.official'),mk('small','',dateString(post.created_at)));profile.append(avatar,names);header.append(profile,post.pinned?mk('span','post-badge','📌 ویژه'):mk('span','post-badge','فصل ۱۴۰۵'));article.append(header);
      if(files.length){let active=0;const gallery=mk('div','post-gallery');const badgeEl=mk('div','gallery-badge');const dots=mk('div','gallery-dots');let current=null;
        function show(index){active=(index+files.length)%files.length;if(current&&current.tagName==='VIDEO')current.pause();gallery.replaceChildren();const f=files[active];const src=urlFor(f.file_path);current=document.createElement(f.media_type==='video'?'video':'img');current.src=src;if(f.media_type==='video'){current.controls=true;current.playsInline=true;current.preload='metadata';current.setAttribute('aria-label',f.alt_text||post.title);}else{current.alt=f.alt_text||post.title;current.loading='lazy';}gallery.append(current);if(files.length>1){const prev=mk('button','gallery-arrow prev','‹'),next=mk('button','gallery-arrow next','›');prev.type=next.type='button';prev.setAttribute('aria-label','تصویر قبل');next.setAttribute('aria-label','تصویر بعد');prev.addEventListener('click',()=>show(active-1));next.addEventListener('click',()=>show(active+1));gallery.append(prev,next);badgeEl.textContent=`${active+1} / ${files.length}`;gallery.append(badgeEl);}dots.replaceChildren();if(files.length>1)files.forEach((_,i)=>{const dot=mk('span','gallery-dot'+(i===active?' active':''));dots.append(dot);});}
        show(0);article.append(gallery);if(files.length>1)article.append(dots);
      }
      const actions=mk('div','post-actions');const share=mk('button','action-btn','↗ اشتراک‌گذاری');share.type='button';share.addEventListener('click',()=>sharePost(post));actions.append(share,mk('span','muted','کالیگا • رسانه رسمی'));const caption=mk('div','post-caption');caption.append(mk('h3','',post.title));if(post.caption)caption.append(mk('p','',post.caption));caption.append(mk('time','',dateString(post.created_at)));article.append(actions,caption);root.append(article);
    });}

  // Loading each section only when visited avoids holding the homepage hostage
  // to posts, galleries, matches and media. Same existing rendering functions.
  // A shared promise cache prevents match/standings/teams from downloading
  // the same table twice during one visit. Failing requests are retryable.
  const cachedTables=window.KALIGA_1405_TABLES||(window.KALIGA_1405_TABLES=new Map());
  const pageLoads=new Map();
  async function get(table,columns='*',order='created_at'){
    if(cachedTables.has(table))return cachedTables.get(table);
    let q=db.from(table).select('*');
    q=order==='display_order'?q.order('display_order',{ascending:true}):q.order(order,{ascending:false});
    const promise=Promise.resolve(q).then(r=>{
      if(r.error)throw new Error(table+': '+r.error.message);
      return r.data||[];
    }).catch(e=>{cachedTables.delete(table);throw e;});
    cachedTables.set(table,promise);
    return promise;
  }
  function loadError(page,error){
    console.error('Kaliga section load:',page,error);
    const section=$(page);
    if(!section)return;
    let message=section.querySelector('.kh-load-error');
    if(!message){message=mk('div','alert kh-load-error');const head=section.querySelector('.head');
      if(head)head.after(message);else section.prepend(message);}
    message.replaceChildren(mk('span','', 'اطلاعات این بخش فعلاً دریافت نشد. اتصال اینترنت را بررسی کن. '));
    const retry=mk('button','btn ghost','تلاش دوباره');retry.type='button';
    retry.addEventListener('click',()=>{message.remove();activate(page);});
    message.append(retry);
  }
  async function activate(page){
    if(!['standings','teams','news','media'].includes(page))return;
    if(pageLoads.has(page))return pageLoads.get(page);
    const promise=(async()=>{
      if(page==='teams'){
        rows.teams=await get('season_1405_teams','*','display_order');renderTeams();
      }else if(page==='standings'){
        [rows.teams,rows.matches]=await Promise.all([
          get('season_1405_teams','*','display_order'),get('season_1405_matches','*','created_at')
        ]);renderStandings();
      }else if(page==='news'){
        rows.announcements=await get('season_1405_announcements','*','created_at');
        rows.announcements.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||new Date(b.created_at)-new Date(a.created_at));
        renderNotices();
      }else if(page==='media'){
        [rows.posts,rows.media]=await Promise.all([
          get('season_1405_posts','*','created_at'),get('season_1405_post_media','*','display_order')
        ]);
        rows.posts.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||new Date(b.created_at)-new Date(a.created_at));
        renderPosts();
        if(location.hash.startsWith('#post-'))requestAnimationFrame(()=>$(location.hash.slice(1))?.scrollIntoView());
      }
      $(page)?.querySelector('.kh-load-error')?.remove();
    })().catch(error=>{pageLoads.delete(page);loadError(page,error);});
    pageLoads.set(page,promise);return promise;
  }
  window.addEventListener('kaliga-page-changed',event=>activate(event.detail?.page));
  activate(window.KALIGA_1405_PAGE||decodeURIComponent(location.hash.slice(1))||'home');

})();
