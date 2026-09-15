(function(){

  var data = [
    {
      q:"“What should I focus on today?”",
      h:"Less deciding. More doing.",
      p:"Start with the proposal — it's due today and needs your best thinking. The follow-up can wait until after lunch.",
      n:"Priorities, deadlines and real available time — not just the first three tasks.",
      rows:[
        {t:"09:00", n:"Finish the proposal", s:"Critical · 60 min", key:true},
        {t:"10:00", n:"Design review", s:"Calendar · 30 min"},
        {t:"13:30", n:"Send the follow-up", s:"Task · 15 min"}
      ]
    },
    {
      q:"“The design review moved to 2. Fix my day.”",
      h:"Here's the afternoon, rebuilt.",
      p:"Your deep-work block moves up so the proposal still lands before 5. The follow-up slides to the gap after the review.",
      n:"Review the change before it touches your plan — accept, edit, or leave it as it was.",
      rows:[
        {t:"09:30", n:"Finish the proposal", s:"Moved earlier · 60 min", key:true},
        {t:"14:00", n:"Design review", s:"Rescheduled · 30 min"},
        {t:"14:45", n:"Send the follow-up", s:"Task · 15 min"}
      ]
    },
    {
      q:"“How does the rest of my week look?”",
      h:"Thursday is where it gets tight.",
      p:"Two deadlines land on the same afternoon with only 40 free minutes between them. Moving one task to Wednesday clears it.",
      n:"Nexdo flags the squeeze days ahead of time, while you can still do something about it.",
      rows:[
        {t:"Tue", n:"Clear — 2 tasks, 3 hrs free", s:"Comfortable"},
        {t:"Wed", n:"Room for one more", s:"1 hr 20 min free"},
        {t:"Thu", n:"Two deadlines, 40 min between", s:"Needs a change", key:true}
      ]
    }
  ];

  var tl = document.getElementById('tl');
  if (!tl) { initBilling(); return; }
  function render(i){
    var d = data[i];
    document.getElementById('q').textContent = d.q;
    document.getElementById('ah').textContent = d.h;
    document.getElementById('ap').textContent = d.p;
    document.getElementById('fn').lastChild.textContent = " " + d.n;
    tl.innerHTML = d.rows.map(function(r){
      return '<div class="tl-row'+(r.key?' key':'')+'">'
        + '<span class="tl-time">'+r.t+'</span>'
        + '<span><span class="tl-name">'+r.n+'</span><span class="tl-sub">'+r.s+'</span></span>'
        + '</div>';
    }).join('');
  }

  var btns = Array.prototype.slice.call(document.querySelectorAll('.scen-btn'));
  btns.forEach(function(b){
    b.addEventListener('click', function(){
      btns.forEach(function(x){ x.setAttribute('aria-selected','false'); });
      b.setAttribute('aria-selected','true');
      render(parseInt(b.dataset.s,10));
    });
  });
  render(0);

  initBilling();

  function initBilling(){
  var bm = document.getElementById('bm'), ba = document.getElementById('ba');
  if (!bm || !ba) return;
  function bill(mode){
    bm.setAttribute('aria-pressed', mode === 'm' ? 'true' : 'false');
    ba.setAttribute('aria-pressed', mode === 'a' ? 'true' : 'false');
    Array.prototype.forEach.call(document.querySelectorAll('[data-m]'), function(el){
      el.textContent = mode === 'a' ? el.dataset.a : el.dataset.m;
    });
  }
  bm.addEventListener('click', function(){ bill('m'); });
  ba.addEventListener('click', function(){ bill('a'); });
  }
})();
