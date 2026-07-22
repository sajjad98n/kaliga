(() => {
  'use strict';
  const K = window.KaligaGol;
  if (!K || window.__KALIGA_AI_ADMIN__) return;
  window.__KALIGA_AI_ADMIN__ = true;
  const el = (tag, text, cls='') => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  let editingId = null;

  function field(label, control) { const wrap=el('div',undefined,'field'); wrap.append(el('label',label),control); return wrap; }
  function message(target,text,type='info'){ K.setMessage(target,text,type); }
  function formatDate(value){ try{return K.formatDateTime(value)}catch{return value||''} }

  async function isAdmin() {
    const session = await K.currentSession(); if(!session) return false;
    const r = await K.client.from('gol_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    return !r.error && !!r.data;
  }

  function createPanel() {
    if (document.getElementById('kaliga-ai-admin-panel')) return;
    const dashboard=document.getElementById('dashboard'); if(!dashboard) return;
    const section=el('section',undefined,'panel'); section.id='kaliga-ai-admin-panel'; section.style.margin='22px 0';
    const heading=el('div',undefined,'dashboard-head');
    const hText=el('div'); hText.append(el('h2','راهنمای هوشمند کالیگا'),el('p','مدیریت اطلاعات پاسخ‌گویی و سؤال‌هایی که پاسخ قطعی نداشته‌اند.'));
    const refresh=el('button','تازه‌سازی','link-button'); refresh.type='button'; refresh.id='kaliga-ai-refresh'; heading.append(hText,refresh); section.appendChild(heading);

    const stats=el('div',undefined,'stats-grid'); stats.id='kaliga-ai-stats'; section.appendChild(stats);
    const layout=el('div',undefined,'admin-layout');
    const formWrap=el('aside',undefined,'panel sticky');
    const form=el('form',undefined,'form-shell'); form.id='kaliga-ai-knowledge-form';
    const title=document.createElement('input'); title.id='kaliga-ai-title'; title.required=true; title.maxLength=160;
    const category=document.createElement('input'); category.id='kaliga-ai-category'; category.value='عمومی'; category.maxLength=80;
    const keywords=document.createElement('input'); keywords.id='kaliga-ai-keywords'; keywords.placeholder='با ویرگول جدا کنید';
    const content=document.createElement('textarea'); content.id='kaliga-ai-content'; content.required=true; content.maxLength=6000; content.rows=9;
    const enabled=document.createElement('input'); enabled.type='checkbox'; enabled.id='kaliga-ai-enabled'; enabled.checked=true;
    const enabledLabel=el('label',undefined,'checkbox'); enabledLabel.append(enabled,el('span','فعال باشد'));
    const actions=el('div',undefined,'submit-row'); const save=el('button','ذخیره مطلب','button primary'); save.type='submit'; const cancel=el('button','لغو ویرایش','button'); cancel.type='button'; cancel.id='kaliga-ai-cancel'; cancel.hidden=true; const msg=el('div','', 'message'); msg.id='kaliga-ai-form-message'; actions.append(save,cancel,msg);
    form.append(field('عنوان',title),field('دسته‌بندی',category),field('کلیدواژه‌ها',keywords),field('متن پاسخ و اطلاعات',content),enabledLabel,actions); formWrap.appendChild(form);

    const right=el('div');
    const tabs=el('div',undefined,'top-actions'); tabs.style.marginBottom='12px';
    const knowledgeBtn=el('button','مطالب راهنما','link-button'); knowledgeBtn.type='button';
    const unansweredBtn=el('button','سؤال‌های بی‌پاسخ','link-button'); unansweredBtn.type='button'; tabs.append(knowledgeBtn,unansweredBtn); right.appendChild(tabs);
    const list=el('div'); list.id='kaliga-ai-admin-list'; right.appendChild(list); layout.append(formWrap,right); section.appendChild(layout); dashboard.appendChild(section);
    refresh.addEventListener('click',loadAll); knowledgeBtn.addEventListener('click',loadKnowledge); unansweredBtn.addEventListener('click',loadUnanswered); cancel.addEventListener('click',resetForm); form.addEventListener('submit',saveKnowledge);
  }

  function resetForm(){editingId=null;document.getElementById('kaliga-ai-knowledge-form').reset();document.getElementById('kaliga-ai-category').value='عمومی';document.getElementById('kaliga-ai-enabled').checked=true;document.getElementById('kaliga-ai-cancel').hidden=true;}
  async function saveKnowledge(event){event.preventDefault();const msg=document.getElementById('kaliga-ai-form-message');const title=document.getElementById('kaliga-ai-title').value.trim(),content=document.getElementById('kaliga-ai-content').value.trim();if(!title||!content)return;const payload={title,content,category:document.getElementById('kaliga-ai-category').value.trim()||'عمومی',keywords:document.getElementById('kaliga-ai-keywords').value.split(/[،,]/).map(x=>x.trim()).filter(Boolean),enabled:document.getElementById('kaliga-ai-enabled').checked,slug:`admin-${editingId||crypto.randomUUID()}`,sort_order:200};let q=K.client.from('kaliga_ai_knowledge');const r=editingId?await q.update(payload).eq('id',editingId):await q.insert(payload);if(r.error){message(msg,r.error.message||'ذخیره نشد.','error');return}message(msg,'مطلب راهنما ذخیره شد.','success');resetForm();await loadKnowledge();}
  async function loadStats(){const since=new Date(Date.now()-7*86400000).toISOString();const [all,unanswered]=await Promise.all([K.client.from('kaliga_ai_requests').select('answered').gte('created_at',since),K.client.from('kaliga_ai_unanswered').select('id',{count:'exact',head:true}).eq('resolved',false)]);const rows=all.data||[],cards=[['پیام‌های ۷ روز',rows.length],['پاسخ‌داده‌شده',rows.filter(x=>x.answered).length],['بدون پاسخ قطعی',unanswered.count||0]];const box=document.getElementById('kaliga-ai-stats');box.innerHTML='';cards.forEach(([label,value])=>{const c=el('div',undefined,'stat-card');c.append(el('strong',K.toPersianDigits(value)),el('span',label));box.appendChild(c)});}
  async function loadKnowledge(){const list=document.getElementById('kaliga-ai-admin-list');list.innerHTML='<div class="empty">در حال دریافت مطالب...</div>';const r=await K.client.from('kaliga_ai_knowledge').select('*').order('sort_order').order('updated_at',{ascending:false});if(r.error){list.textContent='دریافت مطالب انجام نشد.';return}list.innerHTML='';(r.data||[]).forEach(item=>{const card=el('article',undefined,'team-card');const head=el('div',undefined,'team-card-head');const name=el('div');name.append(el('h3',item.title),el('p',`${item.category} • ${item.enabled?'فعال':'غیرفعال'} • ${formatDate(item.updated_at)}`));const actions=el('div',undefined,'top-actions');const edit=el('button','ویرایش','mini-link'),del=el('button','حذف','mini-link');edit.type=del.type='button';edit.addEventListener('click',()=>{editingId=item.id;document.getElementById('kaliga-ai-title').value=item.title;document.getElementById('kaliga-ai-category').value=item.category||'عمومی';document.getElementById('kaliga-ai-keywords').value=(item.keywords||[]).join('، ');document.getElementById('kaliga-ai-content').value=item.content;document.getElementById('kaliga-ai-enabled').checked=item.enabled;document.getElementById('kaliga-ai-cancel').hidden=false;document.getElementById('kaliga-ai-title').scrollIntoView({behavior:'smooth',block:'center'});});del.addEventListener('click',async()=>{if(!confirm(`مطلب «${item.title}» حذف شود؟`))return;const q=await K.client.from('kaliga_ai_knowledge').delete().eq('id',item.id);if(q.error)alert('حذف انجام نشد.');else loadKnowledge();});actions.append(edit,del);head.append(name,actions);card.append(head,el('p',item.content));list.appendChild(card)});if(!list.children.length)list.appendChild(el('div','مطلبی ثبت نشده است.','empty'));}
  async function loadUnanswered(){const list=document.getElementById('kaliga-ai-admin-list');list.innerHTML='<div class="empty">در حال دریافت سؤال‌ها...</div>';const r=await K.client.from('kaliga_ai_unanswered').select('*').order('resolved').order('last_asked_at',{ascending:false}).limit(200);if(r.error){list.textContent='دریافت سؤال‌ها انجام نشد.';return}list.innerHTML='';(r.data||[]).forEach(item=>{const card=el('article',undefined,'team-card');const head=el('div',undefined,'team-card-head');const info=el('div');info.append(el('h3',item.question),el('p',`${K.toPersianDigits(item.ask_count)} بار پرسیده شده • ${formatDate(item.last_asked_at)}`));const toggle=el('button',item.resolved?'بازکردن دوباره':'علامت‌گذاری به‌عنوان رسیدگی‌شده','mini-link');toggle.type='button';toggle.addEventListener('click',async()=>{const q=await K.client.from('kaliga_ai_unanswered').update({resolved:!item.resolved}).eq('id',item.id);if(q.error)alert('ذخیره انجام نشد.');else loadUnanswered();});head.append(info,toggle);card.appendChild(head);list.appendChild(card)});if(!list.children.length)list.appendChild(el('div','سؤال بی‌پاسخی ثبت نشده است.','empty'));}
  async function loadAll(){await Promise.all([loadStats(),loadKnowledge()]);}
  async function activate(){if(!(await isAdmin()))return;createPanel();await loadAll();}
  const observer=new MutationObserver(()=>{const d=document.getElementById('dashboard');if(d&&!d.classList.contains('hidden'))activate().catch(console.error)});observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});setTimeout(()=>activate().catch(()=>{}),800);
})();
