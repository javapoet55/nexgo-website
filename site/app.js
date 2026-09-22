(function(){

  var path=location.pathname.replace(/\/+$/,'')||'/';
  document.querySelectorAll('[data-nav] a').forEach(function(a){a.classList.toggle('cur',a.getAttribute('href')===path)});
  var menu=document.getElementById('menu'),burger=document.getElementById('burger');
  if(burger&&menu)burger.onclick=function(){var o=!menu.classList.contains('open');menu.classList.toggle('open',o);burger.setAttribute('aria-expanded',String(o))};

  var bb=document.querySelectorAll('[data-bill]'),save=document.getElementById('save');
  bb.forEach(function(b){b.onclick=function(){var a=b.dataset.bill==='a';
    bb.forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
    document.querySelectorAll('.pcard [data-m]').forEach(function(el){el.textContent=a?el.dataset.a:el.dataset.m});
    if(save)save.textContent=a?'Save up to 20%':'Save up to 20% with annual';}});
  var cb=document.getElementById('cmpBtn'),cmp=document.getElementById('cmp');
  if(cb&&cmp)cb.onclick=function(){var o=cmp.hidden;cmp.hidden=!o;cb.setAttribute('aria-expanded',String(o));cb.textContent=o?'Hide all features ▴':'Show all features ▾'};
  /* Products dropdown */
  document.querySelectorAll('.dd>button').forEach(function(b){b.onclick=function(){var d=b.parentNode,o=!d.classList.contains('open');d.classList.toggle('open',o);b.setAttribute('aria-expanded',String(o))};if(b.parentNode.querySelector('a.cur'))b.parentNode.classList.add('cur')});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.dd.open').forEach(function(d){d.classList.remove('open');d.querySelector('button').setAttribute('aria-expanded','false')})});
  /* analytics hook: no SDK; pushes to window.dataLayer if present and emits nexdo:track */
  function track(name){var d={event:name,path:location.pathname};try{(window.dataLayer=window.dataLayer||[]).push(d)}catch(x){}try{document.dispatchEvent(new CustomEvent('nexdo:track',{detail:d}))}catch(x){}}
  if(path==='/voice-ai')track('voice_ai_page_view');
  if(path==='/shopping-lists')track('shopping_page_view');
  if(path==='/important-moments')track('moments_page_view');
  if(path==='/ask-ai')track('askai_page_view');
  document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('[data-event]');if(el)track(el.getAttribute('data-event'))});
})();
