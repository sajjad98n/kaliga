(() => {
  "use strict";
  const D = window.KALIGA_1404;
  const app = document.getElementById("app");
  const detailsDialog = document.getElementById("details-dialog");
  const detailsContent = document.getElementById("details-content");
  const imageDialog = document.getElementById("image-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const teamMap = new Map(D.teams.map(t => [Number(t.id), t]));
  let currentWeek = 1;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fa = value => new Intl.NumberFormat("fa-IR").format(value);
  const team = id => teamMap.get(Number(id));
  const dateLabel = value => { const p=String(value).split("-"); return `${p[2]}/${p[1]}/${p[0]}`; };

  function logo(t, size=40){
    return `<span class="logo-wrap" style="width:${size}px;height:${size}px;flex-basis:${size}px;background:${esc(t.color)}"><img src="../team${t.id}.png" alt="لوگوی ${esc(t.name)}" data-jpg="../team${t.id}.jpg"><b hidden>${esc(t.logo)}</b></span>`;
  }
  function bindImageFallbacks(root=document){
    root.querySelectorAll(".logo-wrap img").forEach(img => {
      img.addEventListener("error", () => {
        if (!img.dataset.tried) { img.dataset.tried="1"; img.src=img.dataset.jpg; return; }
        img.hidden=true; const b=img.nextElementSibling; if(b) b.hidden=false;
      });
    });
  }
  function hero(){
    const champ=team(D.summary.championTeamId);
    return `<section class="hero"><div class="hero-card"><h2>آرشیو کامل فصل ۱۴۰۴</h2><p>این نسخه از داده‌های نهایی فصل ساخته شده و برای نمایش نتایج به دیتابیس متصل نمی‌شود. ثبت پیش‌بینی، نظر و نتیجه جدید در این آرشیو بسته است.</p></div><div class="metric"><strong>${fa(D.summary.matches)}</strong><span>مسابقه</span></div><div class="metric"><strong>${fa(D.summary.goals)}</strong><span>گل ثبت‌شده</span></div><div class="metric"><strong>${esc(champ.name)}</strong><span>قهرمان فصل</span></div></section>`;
  }
  function predictionHtml(match){
    const p=D.predictionSummary[String(match.id)] || D.predictionSummary[match.id];
    if(!p) return `<div class="prediction-head">برای این بازی پیش‌بینی ثبت نشده است.</div>`;
    const h=team(match.homeTeamId), a=team(match.awayTeamId);
    return `<div class="prediction"><div class="prediction-head">خلاصه ${fa(p.total)} پیش‌بینی ثبت‌شده</div><div class="prediction-bars"><div class="pred home"><i style="width:${p.home_percent}%"></i><span>${esc(h.shortName)} ${fa(p.home_percent)}٪</span></div><div class="pred draw"><i style="width:${p.draw_percent}%"></i><span>مساوی ${fa(p.draw_percent)}٪</span></div><div class="pred away"><i style="width:${p.away_percent}%"></i><span>${esc(a.shortName)} ${fa(p.away_percent)}٪</span></div></div></div>`;
  }
  function matchCard(m){
    const h=team(m.homeTeamId), a=team(m.awayTeamId);
    return `<article class="match-card"><div class="match-main"><div class="team-side">${logo(h)}<span class="team-name">${esc(h.name)}</span></div><div class="score">${fa(m.homeScore)} — ${fa(m.awayScore)}</div><div class="team-side away"><span class="team-name">${esc(a.name)}</span>${logo(a)}</div></div><div class="match-meta"><span>هفته ${fa(m.week)} • ${esc(m.stadium)}</span><span>${dateLabel(m.date)} • ${esc(m.time)}</span></div>${predictionHtml(m)}<div class="match-actions"><button class="action details-btn" data-match="${m.id}">گلزنان و جزئیات</button></div></article>`;
  }
  function renderMatches(){
    const buttons=Array.from({length:11},(_,i)=>i+1).map(w=>`<button data-week="${w}" class="${w===currentWeek?'active':''}">هفته ${fa(w)}</button>`).join("");
    const list=D.matches.filter(m=>Number(m.week)===currentWeek).map(matchCard).join("");
    app.innerHTML=hero()+`<h2 class="section-title">مسابقات، نتایج و پیش‌بینی‌های هفته ${fa(currentWeek)}</h2><div class="week-tabs">${buttons}</div><div class="matches-grid">${list}</div>`;
    app.querySelectorAll("[data-week]").forEach(b=>b.addEventListener("click",()=>{currentWeek=Number(b.dataset.week);renderMatches();window.scrollTo({top:120,behavior:"smooth"});}));
    app.querySelectorAll(".details-btn").forEach(b=>b.addEventListener("click",()=>openDetails(Number(b.dataset.match))));
    bindImageFallbacks(app);
  }
  function openDetails(id){
    const m=D.matches.find(x=>Number(x.id)===id), h=team(m.homeTeamId), a=team(m.awayTeamId), d=D.matchDetails[String(id)] || {};
    const box=(title,items)=>`<section class="detail-box"><h4>${esc(title)}</h4><ul>${(items||["-"]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`;
    detailsContent.innerHTML=`<h3 class="details-title">${esc(h.name)} ${fa(m.homeScore)} — ${fa(m.awayScore)} ${esc(a.name)}</h3><div class="details-grid">${box(`گلزنان ${h.name}`,d.homeScorers)}${box(`گلزنان ${a.name}`,d.awayScorers)}${box("کارت‌های زرد",d.yellowCards)}${box("کارت‌های قرمز",d.redCards)}</div>`;
    detailsDialog.showModal();
  }
  function renderStandings(){
    const champ=team(D.standings[0].teamId);
    const rows=D.standings.map(r=>{const t=team(r.teamId);return `<tr><td><span class="position ${r.position<=3?'top':''}">${fa(r.position)}</span></td><td class="team-col">${esc(t.name)}</td><td>${fa(r.played)}</td><td>${fa(r.wins)}</td><td>${fa(r.draws)}</td><td>${fa(r.losses)}</td><td>${fa(r.goalsFor)}</td><td>${fa(r.goalsAgainst)}</td><td>${fa(r.goalDifference)}</td><td><strong>${fa(r.points)}</strong></td></tr>`}).join("");
    app.innerHTML=hero()+`<h2 class="section-title">جدول نهایی فصل ۱۴۰۴</h2><div class="champion-note">🏆 قهرمان فصل: <strong>${esc(champ.name)}</strong> با ${fa(D.standings[0].points)} امتیاز</div><div class="panel"><table class="data-table"><thead><tr><th>#</th><th>تیم</th><th>بازی</th><th>برد</th><th>مساوی</th><th>باخت</th><th>گل زده</th><th>گل خورده</th><th>تفاضل</th><th>امتیاز</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function renderTeams(){
    const cards=D.teams.map(t=>`<article class="team-card"><div class="team-card-head">${logo(t,48)}<div><h3>${esc(t.name)}</h3><small>${esc(t.shortName)}</small></div></div><p>${esc(D.teamDescriptions[String(t.id)] || D.teamDescriptions[t.id] || "")}</p><button class="action team-photo-btn" data-team="${t.id}">مشاهده تصویر تیم</button></article>`).join("");
    app.innerHTML=hero()+`<h2 class="section-title">تیم‌ها و بازیکنان فصل ۱۴۰۴</h2><div class="teams-grid">${cards}</div>`;
    app.querySelectorAll(".team-photo-btn").forEach(b=>b.addEventListener("click",()=>openTeamPhoto(Number(b.dataset.team)))); bindImageFallbacks(app);
  }
  function openTeamPhoto(id){
    dialogImage.dataset.tried=""; dialogImage.src=`../pic${id}.jpg`; dialogImage.dataset.png=`../pic${id}.png`; imageDialog.showModal();
  }
  dialogImage.addEventListener("error",()=>{if(!dialogImage.dataset.tried){dialogImage.dataset.tried="1";dialogImage.src=dialogImage.dataset.png;}else{dialogImage.alt="تصویر تیم در پوشه سایت پیدا نشد";}});
  function renderStats(){
    const scorers=D.topScorers.map((r,i)=>`<tr><td>${fa(i+1)}</td><td>${esc(r.player)}</td><td>${esc(r.team)}</td><td>${fa(r.goals)}</td></tr>`).join("");
    const cards=D.cards.map((r,i)=>`<tr><td>${fa(i+1)}</td><td>${esc(r.player)}</td><td>${esc(r.team)}</td><td>${fa(r.yellow)}</td><td>${fa(r.red)}</td></tr>`).join("");
    app.innerHTML=hero()+`<h2 class="section-title">آمار ثبت‌شده فصل</h2><div class="stats-grid"><section class="panel"><h3>⚽ گلزنان برتر</h3><table class="data-table"><thead><tr><th>#</th><th>بازیکن</th><th>تیم</th><th>گل</th></tr></thead><tbody>${scorers}</tbody></table></section><section class="panel"><h3>🟨🟥 کارت‌ها</h3><table class="data-table"><thead><tr><th>#</th><th>بازیکن</th><th>تیم</th><th>زرد</th><th>قرمز</th></tr></thead><tbody>${cards}</tbody></table></section></div>`;
  }
  function renderMedia(){
    const posts=D.mediaPosts.map(p=>{const imgs=(p.images||[]).map(img=>`<img src="../${esc(img.file_path)}" alt="${esc(img.caption||p.title)}">`).join("");return `<article class="panel media-post"><div>${imgs}</div><div><h3>${esc(p.title)}</h3><p>${esc(p.caption)}</p></div></article>`}).join("") || `<div class="panel empty">اطلاعیه‌ای ثبت نشده است.</div>`;
    app.innerHTML=hero()+`<h2 class="section-title">رسانه و اطلاعیه‌های فصل ۱۴۰۴</h2><section class="panel video-box"><h3>🎬 کلیپ فصل</h3><video controls preload="metadata" playsinline src="../mp1.mp4"></video></section><div style="height:12px"></div>${posts}`;
  }
  const renderers={matches:renderMatches,standings:renderStandings,teams:renderTeams,stats:renderStats,media:renderMedia};
  document.querySelectorAll(".main-nav button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".main-nav button").forEach(x=>x.classList.toggle("active",x===btn));renderers[btn.dataset.page]();window.scrollTo({top:0,behavior:"smooth"});}));
  document.querySelectorAll(".dialog-close").forEach(b=>b.addEventListener("click",()=>b.closest("dialog").close()));
  [detailsDialog,imageDialog].forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close();}));
  renderMatches();
})();