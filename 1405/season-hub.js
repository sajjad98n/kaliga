/* KALIGA 1405 — v6: minimal landing + genuine isolated tab views.
 * Keeps all pre-existing Supabase render targets in the DOM so the v5
 * schedule, account, team, news and media scripts continue to work.
 */
(() => {
  'use strict';
  const main = document.querySelector('body > main.wrap');
  const header = document.querySelector('body > header.site-header');
  if (!main || !header || document.getElementById('kaliga-section-nav')) return;

  const byId = id => document.getElementById(id);
  const element = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = String(text);
    return e;
  };
  const pages = [
    {id:'home', icon:'⌂', title:'خانه', label:'صفحه اصلی'},
    {id:'matches', icon:'⚽', title:'مسابقات', label:'بازی‌ها و پیش‌بینی‌ها', description:'برنامه هر هفته، نتایج و پیش‌بینی‌ها'},
    {id:'standings', icon:'🏆', title:'جدول لیگ', label:'جدول رده‌بندی', description:'امتیاز و جایگاه تیم‌ها'},
    {id:'teams', icon:'👕', title:'تیم‌ها', label:'تیم‌های لیگ', description:'معرفی دوازده تیم فصل'},
    {id:'news', icon:'📣', title:'اطلاعیه‌ها', label:'اخبار و اطلاعیه‌ها', description:'خبرهای رسمی مسابقات'},
    {id:'media', icon:'▣', title:'رسانه', label:'رسانه کالیگا', description:'تصاویر، ویدئوها و گزارش‌ها'},
    {id:'profile', icon:'◉', title:'حساب من', label:'پروفایل من', description:'ورود، پیش‌بینی‌های من و پشتیبانی'}
  ];
  const pageMap = new Map();
  const navLinks = new Map();

  const style = element('style');
  style.id = 'kaliga-hub-v6-styles';
  style.textContent = `
    /* The old anchor scrolling navigation is completely replaced. */
    .site-header .nav, .mobile-nav{display:none!important}
    #kaliga-section-nav{position:sticky;top:75px;z-index:29;background:rgba(7,27,33,.97);border-bottom:1px solid #315047;backdrop-filter:blur(18px)}
    .kh-tabs{display:flex;justify-content:center;align-items:center;gap:8px;padding:10px 0;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#355d55 transparent}
    .kh-tab{display:inline-flex;justify-content:center;align-items:center;gap:7px;flex:0 0 auto;min-height:40px;padding:10px 14px;border:1px solid transparent;border-radius:11px;color:#bed6d0;background:transparent;text-decoration:none;font:700 12px Vazirmatn,Tahoma,sans-serif;white-space:nowrap;transition:background .2s,color .2s}
    .kh-tab:hover{background:#173b3b;color:#f2fff8}.kh-tab[aria-current="page"]{color:#092b25;background:#4bd4a2;border-color:#56d7ad;box-shadow:0 3px 16px #1cbb8a25}
    .kh-tab-icon{font-size:16px;line-height:1.1}
    #kaliga-page-shell{min-height:56vh;max-width:100%;overflow:clip}
    #kaliga-page-shell .kh-view[hidden]{display:none!important}
    #kaliga-page-shell .kh-view{min-width:0;max-width:100%;margin-top:26px;animation:kh-fade .17s ease-out}
    #kaliga-page-shell .kh-view:focus{outline:none}
    @keyframes kh-fade{from{opacity:.35}to{opacity:1}}
    #kaliga-page-shell .kh-home{margin-top:28px;animation:kh-fade .17s ease-out}
    #kaliga-page-shell .kh-home[hidden]{display:none!important}
    .kh-intro{position:relative;overflow:hidden;border:1px solid #30534c;border-radius:23px;background:linear-gradient(115deg,#13352f,#0c252f 82%);padding:31px clamp(18px,4vw,38px)}
    .kh-intro:before{content:"";position:absolute;left:-70px;top:-120px;width:300px;height:300px;pointer-events:none;border-radius:50%;background:radial-gradient(circle,#3ccca127,transparent 68%)}
    .kh-overline{position:relative;display:inline-flex;padding:5px 12px;border:1px solid #365f54;border-radius:99px;color:#74e6ba;font-size:11px;font-weight:750;background:#173b36}
    .kh-intro h1{position:relative;margin:12px 0 5px;font:800 clamp(28px,4.5vw,43px)/1.45 Estedad,Vazirmatn,sans-serif;letter-spacing:-1px}
    .kh-intro h1 em{font-style:normal;color:#55dba7}
    .kh-intro p{position:relative;margin:0;color:#bdd1ca;font-size:12px;line-height:2}
    .kh-summary{position:relative;display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
    .kh-summary-item{display:inline-flex;align-items:baseline;gap:7px;padding:8px 13px;border:1px solid #33594c;background:#0a2928;border-radius:11px;color:#bbd3ca;font-size:11px}
    .kh-summary-item strong{color:#effcf7;font:750 17px Estedad,Vazirmatn,sans-serif}
    .kh-section-head{display:flex;align-items:end;justify-content:space-between;margin:25px 0 14px;gap:12px}
    .kh-section-head h2{margin:0;font:750 18px Estedad,Vazirmatn,sans-serif}
    .kh-section-head span{color:#a8c6bb;font-size:11px}
    .kh-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:20px}
    .kh-card{position:relative;display:flex;align-items:flex-start;flex-direction:column;justify-content:space-between;gap:12px;min-width:0;min-height:139px;padding:19px;border:1px solid #31534e;border-radius:17px;background:linear-gradient(145deg,#112e36,#0e252e);text-decoration:none;transition:transform .2s,border-color .2s,background .2s}
    .kh-card:hover{transform:translateY(-3px);border-color:#59d9ad;background:linear-gradient(145deg,#153c3e,#112a33)}
    .kh-card:focus-visible,.kh-tab:focus-visible{outline:3px solid #ffcd79;outline-offset:3px}
    .kh-card-primary{border-color:#439d7e;background:linear-gradient(150deg,#134237,#102c30)}
    .kh-card-symbol{display:grid;place-items:center;width:35px;height:35px;border-radius:10px;background:#20443d;color:#6fe9bb;font-size:19px;line-height:1}
    .kh-card strong{display:block;font:750 15px Estedad,Vazirmatn,sans-serif;color:#effaf6}
    .kh-card small{display:block;color:#a9c6bc;line-height:1.9;font-size:11px;margin-top:4px}
    .kh-card-arrow{position:absolute;left:17px;top:20px;color:#76cfae;font-size:16px}
    /* Preserve the legacy counters for the existing asynchronous renderers,
       while excluding their oversized visuals from the new minimalist home. */
    #kh-legacy-home{display:none!important}
    #standings .league-layout{display:block!important}#standings .league-layout>.panel{width:100%;max-width:none}
    #news .panel{max-width:none}#media .feed-layout{grid-template-columns:minmax(0,760px);justify-content:center}#media .feed-aside{display:none!important}
    #kaliga-page-shell .section>.head{margin-bottom:19px}
    @media(max-width:1100px){.kh-tabs{justify-content:flex-start}}
    @media(max-width:720px){#kaliga-section-nav{top:66px}.kh-tabs{gap:5px;padding:7px 0}.kh-tab{font-size:11px;padding:9px 11px;min-height:37px}.kh-tab-icon{font-size:15px}.kh-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.kh-card{min-height:125px;padding:13px}.kh-card strong{font-size:13px}.kh-card small{font-size:10px}.kh-card-symbol{width:30px;height:30px}.kh-intro{padding:24px 19px;border-radius:18px}.kh-section-head{margin-top:23px}#kaliga-page-shell .kh-view{margin-top:18px}}
    @media(max-width:350px){.kh-cards{grid-template-columns:1fr}.kh-card{min-height:95px}}
    @media(prefers-reduced-motion:reduce){.kh-view,.kh-home{animation:none!important}.kh-tab,.kh-card{transition:none}}
  `;
  document.head.append(style);

  // Move announcements out of the standings section into a full separate view.
  const noticePanel = byId('news');
  if (noticePanel) {
    noticePanel.id = 'kaliga-notice-panel';
    const newsPage = element('section', 'section');
    newsPage.id = 'news';
    const heading = element('div', 'head');
    const headingBody = element('div');
    headingBody.append(element('div','kicker','OFFICIAL NEWS'),element('h2','','اطلاعیه‌ها و اخبار'),element('p','','آخرین اطلاعیه‌های رسمی لیگ در این بخش.'));
    heading.append(headingBody);
    newsPage.append(heading,noticePanel);
    main.insertBefore(newsPage,byId('media') || null);
  }

  // Keep the existing stats IDs intact: the old data loader updates them.
  const legacy = element('div');
  legacy.id = 'kh-legacy-home';
  const originalHero = Array.from(main.children).find(x => x.classList?.contains('hero'));
  const originalStats = Array.from(main.children).find(x => x.classList?.contains('hero-stats'));
  if (originalHero) legacy.append(originalHero);
  if (originalStats) legacy.append(originalStats);

  const home = element('section','kh-home');
  home.id='home';
  const intro = element('div','kh-intro');
  intro.append(element('span','kh-overline','✦ فصل دوم لیگ فوتسال چاشم'));
  const h1=element('h1');h1.append('کالیگا ',element('em','','۱۴۰۵'));
  intro.append(h1,element('p','','مسابقات، نتایج، تیم‌ها و لحظه‌های فصل جدید؛ هر بخش در صفحه مخصوص خودش.'));
  const summary=element('div','kh-summary');
  const numbers=[['stat-teams','تیم'],['stat-matches','مسابقه'],['stat-posts','پست رسانه‌ای']];
  numbers.forEach(([source,label])=>{
    const item=element('span','kh-summary-item');
    const value=element('strong','kh-number','—');
    const original=byId(source);
    if(original){
      const update=()=>{const s=original.textContent?.trim();value.textContent=s||'—';};
      update();
      new MutationObserver(update).observe(original,{childList:true,characterData:true,subtree:true});
    }
    item.append(value,element('span','',label));summary.append(item);
  });
  intro.append(summary);
  const sectionHeading=element('div','kh-section-head');
  sectionHeading.append(element('h2','','بخش‌های کالیگا'),element('span','','یک بخش را انتخاب کنید'));
  const cards=element('div','kh-cards');
  pages.filter(p=>p.id!=='home').forEach((p,i)=>{
    const link=element('a','kh-card'+(i===0?' kh-card-primary':''));
    link.href='#'+p.id;
    link.append(element('span','kh-card-symbol',p.icon));
    const copy=element('div');
    copy.append(element('strong','',p.label),element('small','',p.description));
    link.append(copy,element('span','kh-card-arrow','↖'));
    cards.append(link);
  });
  home.append(intro,sectionHeading,cards,legacy);

  // One explicit page shell contains ALL views; exactly one is visible.
  const shell=element('div');shell.id='kaliga-page-shell';
  shell.append(home);
  for(const id of ['standings','teams','matches','news','media']){
    const section=byId(id);
    if(section) shell.append(section);
  }

  const profile=element('section','section');profile.id='profile';
  const profileHeading=element('div','head');
  const profileInfo=element('div');
  profileInfo.append(element('div','kicker','MY KALIGA'),element('h2','','حساب کاربری من'),element('p','','پیش‌بینی‌ها، امتیازهای شخصی و پیام‌های خصوصی.'));
  profileHeading.append(profileInfo);
  profile.append(profileHeading,element('div'));
  profile.lastElementChild.id='kaliga-member-panel';
  shell.append(profile);

  const alert=byId('connection-alert');
  if(alert) alert.after(shell);
  else main.prepend(shell);

  const bar=element('nav');bar.id='kaliga-section-nav';
  bar.setAttribute('aria-label','صفحه‌های فصل ۱۴۰۵');
  const inner=element('div','wrap kh-tabs');
  bar.append(inner);
  pages.forEach(p=>{
    const view=byId(p.id);
    if(!view)return;
    view.classList.add('kh-view');
    view.setAttribute('data-kaliga-page',p.id);
    pageMap.set(p.id,view);
    const link=element('a','kh-tab');
    link.href='#'+p.id;
    link.setAttribute('aria-controls',p.id);
    link.append(element('span','kh-tab-icon',p.icon),element('span','',p.title));
    inner.append(link);navLinks.set(p.id,link);
  });
  header.after(bar);

  let current='';
  function openPage(id,resetScroll=false){
    const selected=pageMap.has(id)?id:'home';
    pageMap.forEach((view,key)=>{
      const isCurrent=key===selected;
      view.hidden=!isCurrent;
      view.inert=!isCurrent;
      view.setAttribute('aria-hidden',isCurrent?'false':'true');
    });
    navLinks.forEach((link,key)=>{
      if(key===selected)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if(current!==selected){
      current=selected;
      const label=pages.find(p=>p.id===selected)?.label||'خانه';
      document.title=(selected==='home'?'فصل ۱۴۰۵':label)+' | لیگ فوتسال کالیگا';
    }
    if(resetScroll) window.scrollTo({top:0,behavior:'instant'});
  }
  function navigate(id){
    if(!pageMap.has(id))return;
    const hash='#'+id;
    if(location.hash!==hash)history.pushState({kaligaPage:id},'',hash);
    openPage(id,true);
  }
  function syncFromURL(){
    const hash=decodeURIComponent(location.hash.slice(1));
    if(pageMap.has(hash)){openPage(hash,false);return;}
    if(hash.startsWith('post-')){
      openPage('media',false);
      // The existing async media renderer will also scroll when its post loads.
      requestAnimationFrame(()=>byId(hash)?.scrollIntoView({block:'start'}));
      return;
    }
    openPage('home',false);
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)return;
    const link=event.target.closest('a[href^="#"]');
    if(!link)return;
    const id=link.getAttribute('href').slice(1);
    if(!pageMap.has(id))return;
    event.preventDefault();
    navigate(id);
  });
  window.addEventListener('popstate',syncFromURL);
  window.addEventListener('hashchange',syncFromURL);
  syncFromURL();
})();
