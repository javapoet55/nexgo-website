(() => {
  const page = document.querySelector('.cal-page');
  if (!page) return;
  const tabs = Array.from(page.querySelectorAll('[data-cal-view]'));
  const select = tab => {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      page.querySelector('#' + item.getAttribute('aria-controls')).hidden = !active;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next]);
      tabs[next].focus();
    });
  });
  const complete = page.querySelector('.cal-complete');
  complete.addEventListener('click', () => {
    const done = complete.getAttribute('aria-pressed') !== 'true';
    complete.setAttribute('aria-pressed', String(done));
    complete.querySelector('span').textContent = done ? 'Mark incomplete' : 'Mark complete';
    page.querySelector('#cal-completion-status').textContent = done ? 'Completed' : 'Upcoming';
  });
})();
