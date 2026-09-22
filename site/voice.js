/* Optional, user-initiated narration of the visible example conversation. */
(function(){
  var button=document.getElementById('voice-demo-play');
  if(!button||!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;
  var status=document.getElementById('voice-demo-status'),playing=false;
  function reset(message){playing=false;button.textContent='♫ Tap to hear';button.setAttribute('aria-pressed','false');status.textContent=message||'Hear the example conversation using your browser’s voice.';}
  button.hidden=false;
  button.onclick=function(){
    if(playing){window.speechSynthesis.cancel();reset();return;}
    var text=Array.from(document.querySelectorAll('.v2-message p')).map(function(p){return p.textContent}).join(' ');
    var speech=new SpeechSynthesisUtterance(text);speech.lang='en-US';speech.rate=.95;
    playing=true;button.textContent='■ Stop audio';button.setAttribute('aria-pressed','true');
    status.textContent='Playing the example conversation using your browser’s voice.';
    speech.onend=function(){reset('Example complete. Tap to hear it again.');};
    speech.onerror=function(){reset('Audio could not play. You can read the conversation below.');};
    window.speechSynthesis.speak(speech);
  };
  window.addEventListener('pagehide',function(){if(playing)window.speechSynthesis.cancel();});
})();
