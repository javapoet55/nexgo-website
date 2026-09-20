// First-party event hook only. No external analytics, cookies, or personal data.
function track(name, details={}) {
  window.dispatchEvent(new CustomEvent('nexdo:analytics', {detail:{name,path:location.pathname,...details}}));
  if (typeof window.nexdoAnalytics === 'function') window.nexdoAnalytics(name,{path:location.pathname,...details});
}
const menu=document.querySelector('.menu-toggle');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));menu.setAttribute('aria-label',open?'Open navigation':'Close navigation');document.getElementById('mobile-nav').hidden=open;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});
document.addEventListener('click',e=>{const target=e.target.closest('[data-event]');if(target)track(target.dataset.event,{label:target.textContent.trim()});});
const scenarios=[
['“I have 30 minutes. What should I do next?”','Give the proposal a head start.','It’s due today. Use this gap to outline your key points before your next meeting.','Outline the proposal','Suggested next step · 25 min','FOCUS'],
['“My meeting moved to 2. Help me fix my day.”','Make a little room for the change.','Move the proposal block earlier and save the follow-up for after your meeting. Review this suggestion before applying it.','Move proposal to 11:00','Suggested change · Awaiting your review','REVIEW'],
['“I still need to get back to Alex.”','Turn that intention into a next step.','Open the contact task to call or message Alex. If now isn’t a good time, choose Remind Later.','Follow up with Alex','Contact task · Choose when to act','NEXT']
];
document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.scenario),d=scenarios[i];document.querySelectorAll('[data-scenario]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('demo-question').textContent=d[0];const result=document.getElementById('demo-result');result.innerHTML=`<h3>${d[1]}</h3><p>${d[2]}</p><div class="demo-task"><span class="task-check" aria-hidden="true">○</span><span>${d[3]}<small>${d[4]}</small></span><span class="tag">${d[5]}</span></div>`;track('scenario_view',{scenario:i});}));
track('page_view');
