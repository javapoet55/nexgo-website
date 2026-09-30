(() => {
  const page = document.querySelector('.nai-page');
  if (!page) return;
  const input = page.querySelector('#nai-prompt');
  page.querySelectorAll('.nai-chips button').forEach(button => button.addEventListener('click', () => { input.value = button.textContent; input.focus(); }));
  page.querySelector('.nai-input').addEventListener('submit', event => {
    event.preventDefault();
    let answer = page.querySelector('.nai-demo-answer');
    if (!answer) { answer = document.createElement('p'); answer.className = 'nai-demo-answer'; answer.setAttribute('role', 'status'); page.querySelector('.nai-chips').after(answer); }
    answer.replaceChildren(document.createTextNode('Ready to turn your request into action? '));
    const link = document.createElement('a'); link.href = 'https://app.nexdoapp.com/login'; link.textContent = 'Sign in to Nexdo AI'; answer.append(link);
  });
  const demo = page.querySelector('.nai-conversation');
  const status = page.querySelector('.nai-demo-hint');
  status.setAttribute('role','status');
  demo.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    status.textContent = button.textContent.trim() === 'Confirm' ? 'You’re all set! In this example, the event is created and your reminder is set for 9:45 AM. No real event was saved.' : 'Example cancelled. Nothing was added.';
  }));
})();
// The request examples update only this illustrative conversation.
(() => {
  const section = document.querySelector('.nai-journey');
  if (!section) return;
  const examples = [
    ['Plan a weekend trip for my family', 'Let’s plan a weekend everyone will enjoy.', ['Choose your destination', 'Set a budget and travel dates', 'Find activities for the family'], 'Where would you like to go?'],
    ['Find time for a workout this week', 'Here are a few example workout options:', ['Tuesday · 7:00 AM', 'Thursday · 5:30 PM', 'Saturday · 9:00 AM'], 'Which time would you like to add to your calendar?'],
    ['Add milk, eggs and bread to my shopping list', 'Here’s your shopping list to review:', ['Milk', 'Eggs', 'Bread'], 'Shall I add these to your shopping list?'],
    ['What are my top priorities today?', 'Here are your top 3 priorities today:', ['Finish the project proposal', 'Call Mom', 'Plan dinner for Saturday'], 'Would you like me to add anything to your calendar?'],
    ['Suggest a gift idea for my mom', 'Here are a few thoughtful ideas:', ['A personalized photo book', 'A relaxing spa experience', 'A class you can enjoy together'], 'What does she enjoy, and what’s your budget?'],
    ['Summarize my day', 'Here’s an example of your daily summary:', ['Review your priorities', 'Check upcoming appointments', 'Make time for what matters'], 'Would you like help planning your next step?']
  ];
  section.querySelectorAll('[data-nai-example]').forEach(button => button.addEventListener('click', () => {
    const example = examples[Number(button.dataset.naiExample)];
    section.querySelectorAll('[data-nai-example]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    section.querySelector('.nai-j-question').textContent = example[0];
    section.querySelector('.nai-j-answer-intro').textContent = example[1];
    const list = section.querySelector('.nai-j-answer-list');
    list.replaceChildren(...example[2].map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    section.querySelector('.nai-j-followup').textContent = example[3];
  }));
})();

// Opt-in spoken illustration; this demo never records audio or creates data.
(() => {
  const section = document.querySelector('.nai-action-life');
  if (!section) return;
  const button = section.querySelector('.nai-a-audio button');
  const status = section.querySelector('.nai-a-audio small');
  const waveStatus = section.querySelector('.nai-a-wave small');
  let playing = false;
  let speech;
  const reset = message => {
    playing = false;
    section.classList.remove('nai-audio-playing');
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '♫ Tap to hear';
    status.textContent = message;
    waveStatus.textContent = 'Ready to play';
  };
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    button.hidden = true;
    status.textContent = 'Read the example conversation below.';
    return;
  }
  button.addEventListener('click', () => {
    if (playing) {
      playing = false;
      window.speechSynthesis.cancel();
      reset('Example stopped. Tap to hear again.');
      return;
    }
    speech = new SpeechSynthesisUtterance(Array.from(section.querySelectorAll('.nai-a-message p'), p => p.textContent).join('\n\n'));
    speech.lang = 'en-US';
    speech.rate = 0.95;
    speech.onend = () => { if (playing) reset('Example complete. Tap to hear it again.'); };
    speech.onerror = () => { if (playing) reset('Audio unavailable. You can read the conversation below.'); };
    playing = true;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = '■ Stop audio';
    status.textContent = 'Playing the example conversation…';
    waveStatus.textContent = 'Playing…';
    section.classList.add('nai-audio-playing');
    window.speechSynthesis.speak(speech);
  });
  window.addEventListener('pagehide', () => { if (playing) { playing = false; window.speechSynthesis.cancel(); } });
})();
