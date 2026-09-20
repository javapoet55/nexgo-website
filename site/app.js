(function(){
  var root=document.documentElement,bs=document.querySelectorAll('.mode button');
  function set(m){if(m==='system')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
    bs.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m))});try{localStorage.setItem('nexdo-mode',m)}catch(e){}}
  var saved='system';try{saved=localStorage.getItem('nexdo-mode')||'system'}catch(e){}
  bs.forEach(function(b){b.onclick=function(){set(b.dataset.m)}});set(saved);

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
})();
