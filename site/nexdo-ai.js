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
