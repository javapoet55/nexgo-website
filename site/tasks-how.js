(() => {
  const root = document.querySelector('.th-how');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-th-step]')];
  const states = [
    ['Draft', 'A SIMPLE START', 'Write a clear title, then add context to help you pick it up later.', '<dt>Notes</dt><dd>Outline the approach and prepare the first draft.</dd><dt>Project</dt><dd>Work</dd>', 'Next: plan the task →'],
    ['Planned', 'A PLACE IN YOUR DAY', 'Choose a start time and estimate how long the work will take. Save the details in the app.', '<dt>Schedule</dt><dd>Tomorrow · 10:00 AM</dd><dt>Estimate</dt><dd>30 minutes</dd><dt>Priority</dt><dd>High</dd>', 'Next: complete the task →'],
    ['Completed', 'PROGRESS YOU CAN SEE', 'When the work is finished, mark it complete. You can find it in completed tasks or reopen it with Mark incomplete.', '<dt>Task status</dt><dd>✓ Completed</dd><dt>Next time</dt><dd>Search your completed-task history.</dd>', 'Restart example ↺']
  ];
  let selected = 0;
  const show = index => {
    selected = index;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    const [badge, kicker, description, details, next] = states[index];
    root.querySelector('#th-badge').textContent = badge;
    root.querySelector('#th-content').innerHTML = `<p class="th-kicker">${kicker}</p><h4>Prepare the project proposal</h4><p>${description}</p><dl>${details}</dl>`;
    root.querySelector('#th-next').textContent = next;
  };
  buttons.forEach((button, index) => button.addEventListener('click', () => show(index)));
  root.querySelector('#th-next').addEventListener('click', () => show((selected + 1) % states.length));
})();
