/* Kaliga 1405 • clean, section-based public season hub */
(() => {
  'use strict';
  const main = document.querySelector('body > main.wrap');
  const header = document.querySelector('.site-header');
  if (!main || !header || document.getElementById('kaliga-section-nav')) return;
  const sectionMap = new Map();
  const $ = id => document.getElementById(id);
  const node=(tag,cls,text)=>{const d=document.createElement(tag);if(cls)d.className=cls;if(text!==undefined)d.textContent=text;return d;};
  const styles=node('style');styles.textContent=`
    body{--hub-offset:134px}
    .site-header>.header-inner>.nav{display:none!important}.site-header .nav{display:none!important}.mobile-nav{display:none!important}
    #kaliga-section-nav{position:sticky;top:75px;z-index:29;background:#0a2026f5;border-bottom:1px solid #2b4b46;backdrop-filter:blur(18px)}
    .kh-navinner{display:flex;gap:9px;align-items:center;overflow-x:auto;padding:11px 0;scrollbar-width:thin;scrollbar-color:#396758 transparent}
    .kh-navbtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:none;white-space:nowrap;border-radius:12px;background:#112e34;color:#d2e2de;border:1px solid #34534e;padding:11px 15px;font:750 12px Vazirmatn,Tahoma,sans-serif;cursor:pointer;transition:background .2s,transform .2s}
    .kh-navbtn:hover{background:#1a4846;transform:translateY(-1px)}.kh-navbtn[aria-current=page]{background:linear-gradient(115deg,#4fe2aa,#68bfb4);color:#083027;border-color:transparent;box-shadow:0 4px 19px #3de2ae2d}
    .kh-view[hidden]{display:none!important}.kh-view{animation:kh-in .22s ease-out both;min-width:0}
    @keyframes kh-in{from{opacity:.2;transform:translateY(9px)}to{opacity:1;transform:none}}
    .kh-homegrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin:28px 0 40px}
    .kh-quick{display:flex;flex-direction:column;gap:9px;min-width:0;padding:22px 20px;border:1px solid #335a50;background:linear-gradient(150deg,#12343a,#10252e);border-radius:18px;transition:border-color .2s,transform .2s}
    .kh-quick:hover{border-color:#58dca9;transform:translateY(-3px)}.kh-quick .kh-icon{font-size:27px}.kh-quick strong{font:750 16px Estedad,Vazirmatn}.kh-quick small{font-size:11px;color:#adc9c1;line-height:1.9}
    #standings .league-layout{display:block!important}#standings .league-layout>.panel{width:100%;max-width:none}#news .panel{max-width:none}
    #home .hero{margin-top:25px}#home .hero-stats{margin-bottom:15px}
    .kh-sectiontitle{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:34px 0 17px}.kh-sectiontitle h2{margin:0;font:800 23px Estedad,Vazirmatn}.kh-sectiontitle p{color:#abc7bc;font-size:12px}
    @media(max-width:780px){.kh-homegrid{grid-template-columns:repeat(2,minmax(0,1fr))}#kaliga-section-nav{top:66px}.kh-navbtn{font-size:11px;padding:10px 12px}}
    @media(max-width:460px){.kh-homegrid{grid-template-columns:1fr}.kh-quick{padding:17px}.kh-navinner{gap:6px}}
    @media(prefers-reduced-motion:reduce){.kh-view{animation:none}.kh-quick,.kh-navbtn{transition:none}}
  `;document.head.append(styles);

  // Move the old embedded announcements panel to its own navigable section.
  const oldNews=$('news');
  if(oldNews){oldNews.id='kaliga-news-panel';const sect=node('section','section');sect.id='news';const intro=node('div','head');const left=node('div');left.append(node('div','kicker','OFFICIAL NEWS'),node('h2','','اطلاعیه‌ها و اخبار رسمی'),node('p','','خبرها و اطلاعیه‌های فصل ۱۴۰۵ در یک بخش مستقل.'));intro.append(left);sect.append(intro,oldNews);const media=$('media');if(media)main.insertBefore(sect,media);else main.append(sect);}

  // Home contains only the hero, overview metrics and concise shortcuts.
  const hero=main.querySelector(':scope > .hero');const stats=main.querySelector(':scope > .hero-stats');
  const home=node('section','');home.id='home';
  if(hero)home.append(hero);if(stats)home.append(stats);
  const intro=node('div','kh-sectiontitle');const copy=node('div');copy.append(node('h2','','بخش‌های فصل ۱۴۰۵'),node('p','','بخش موردنظر را انتخاب کن؛ هر قسمت به‌صورت مستقل باز می‌شود.'));intro.append(copy);home.append(intro);
  const shortcuts=node('div','kh-homegrid');
  const labels=[['matches','📅','برنامه و پیش‌بینی','بازی‌های هر هفته، ساعت‌ها، نتایج و پیش‌بینی کاربران'],['standings','🏆','جدول لیگ','رده‌بندی خودکار بر اساس نتایج رسمی'],['teams','👕','تیم‌ها','مشخصات و نشان تیم‌های حاضر'],['news','📣','اطلاعیه‌ها','آخرین اخبار رسمی مسابقات'],['media','📸','رسانه کالیگا','عکس‌ها، ویدئوها و گزارش‌های تصویری'],['profile','👤','حساب من','ثبت‌نام، ورود، پیش‌بینی‌ها و پیام‌های خصوصی']];
  labels.forEach(([id,emoji,title,description])=>{if(!$(id))return;const a=node('a','kh-quick');a.href='#'+id;a.append(node('span','kh-icon',emoji),node('strong','',title),node('small','',description));shortcuts.append(a);});home.append(shortcuts);
  const alert=$('connection-alert');if(alert)alert.after(home);else main.prepend(home);

  const profile=node('section','section');profile.id='profile';profile.className='section';const profileHeading=node('div','head');const profileHeadLeft=node('div');profileHeadLeft.append(node('div','kicker','KALIGA MEMBERS'),node('h2','','حساب کاربری و پیام‌های من'),node('p','','پیش‌بینی‌ها، امتیازات شخصی و گفتگوهای خصوصی با پشتیبانی.'));profileHeading.append(profileHeadLeft);profile.append(profileHeading);const profileBox=node('div','');profileBox.id='kaliga-member-panel';profile.append(profileBox);main.append(profile);

  const views=[['home','🏠','خانه'],['matches','📅','بازی‌ها و پیش‌بینی'],['standings','🏆','جدول'],['teams','👕','تیم‌ها'],['news','📣','اخبار'],['media','📸','رسانه'],['profile','👤','حساب من']];
  const bar=node('nav');bar.id='kaliga-section-nav';bar.setAttribute('aria-label','بخش‌های مجزای فصل ۱۴۰۵');const inner=node('div','wrap kh-navinner');bar.append(inner);header.after(bar);
  const buttons=new Map();
  views.forEach(([id,icon,name])=>{const target=$(id);if(!target)return;target.classList.add('kh-view');sectionMap.set(id,target);const button=node('button','kh-navbtn');button.type='button';button.textContent=icon+'  '+name;button.addEventListener('click',()=>goTo(id));buttons.set(id,button);inner.append(button);});
  let active='home';
  function show(id,scroll){const chosen=sectionMap.has(id)?id:'home';active=chosen;sectionMap.forEach((v,k)=>v.hidden=k!==chosen);buttons.forEach((b,k)=>{if(k===chosen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});document.title=(chosen==='home'?'فصل ۱۴۰۵':buttons.get(chosen)?.textContent?.trim()||'فصل ۱۴۰۵')+' | لیگ فوتسال کالیگا';if(scroll)window.scrollTo({top:0,behavior:'smooth'});}
  function goTo(id){history.pushState(null,'','#'+id);show(id,true);}
  function sync(){const id=decodeURIComponent(location.hash.slice(1));if(sectionMap.has(id)){show(id,false);return;}if(id.startsWith('post-')){show('media',false);requestAnimationFrame(()=>$(id)?.scrollIntoView({behavior:'smooth',block:'start'}));return;}show('home',false);}
  document.addEventListener('click',event=>{const a=event.target.closest('a[href^="#"]');if(!a)return;const to=a.getAttribute('href').slice(1);if(sectionMap.has(to)){event.preventDefault();goTo(to);}});
  window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
  sync();
})();
