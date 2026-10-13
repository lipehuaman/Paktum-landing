(() => {
  const explorer = document.querySelector('.ref-explorer');
  if (!explorer) return;
  const list = document.getElementById('refLogos');
  const rows = Array.from(list.querySelectorAll('.logo-card'));
  const dots = Array.from(explorer.querySelectorAll('.map-dot'));
  const panel = document.getElementById('refMapPanel');
  const toggle = explorer.querySelector('.ref-map-toggle');
  const pagination = explorer.querySelector('.ref-pagination');
  const previous = pagination.querySelector('[data-direction="previous"]');
  const next = pagination.querySelector('[data-direction="next"]');
  const status = pagination.querySelector('.ref-page-status');
  const selection = explorer.querySelector('.ref-map-selection');
  const locale = document.documentElement.lang || 'de';
  const size = 16;
  let page = 0;
  let selected = null;
  const names = new Map(rows.map(row => [row.dataset.club, row.getAttribute('aria-label')]));
  rows.sort((a, b) => names.get(a.dataset.club).localeCompare(names.get(b.dataset.club), locale));
  rows.forEach(row => {
    row.lastElementChild.textContent = names.get(row.dataset.club);
    row.setAttribute('aria-pressed', 'false');
    list.appendChild(row);
  });

  function renderPage() {
    rows.forEach((row, index) => { row.hidden = Math.floor(index / size) !== page; });
    previous.disabled = page === 0;
    next.disabled = (page + 1) * size >= rows.length;
    status.textContent = `${page * size + 1}–${Math.min((page + 1) * size, rows.length)} / ${rows.length}`;
  }

  function select(id, reveal) {
    selected = id;
    rows.forEach(row => {
      const active = row.dataset.club === id;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-pressed', String(active));
    });
    dots.forEach(dot => {
      const active = dot.dataset.club === id;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
    selection.textContent = names.get(id);
    if (reveal) {
      page = Math.floor(rows.findIndex(row => row.dataset.club === id) / size);
      renderPage();
    }
  }

  function preview(id, active) {
    [...rows, ...dots].forEach(item => item.classList.toggle('is-preview', active && item.dataset.club === id));
  }

  [...rows, ...dots].forEach(item => {
    const id = item.dataset.club;
    item.addEventListener('mouseenter', () => preview(id, true));
    item.addEventListener('mouseleave', () => preview(id, false));
    item.addEventListener('focus', () => preview(id, true));
    item.addEventListener('blur', () => preview(id, false));
    item.addEventListener('click', () => select(id, item.classList.contains('map-dot')));
  });
  dots.forEach(dot => {
    dot.setAttribute('role', 'button');
    dot.setAttribute('aria-label', names.get(dot.dataset.club));
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(dot.dataset.club, true);
      }
    });
  });
  [previous, next].forEach(button => button.addEventListener('click', () => {
    page += button === next ? 1 : -1;
    preview(selected, false);
    renderPage();
    if (button.disabled) (button === next ? previous : next).focus();
  }));
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? toggle.dataset.hide : toggle.dataset.show;
    panel.classList.toggle('is-open', open);
  });
  renderPage();
  if (rows.length) select(rows[0].dataset.club, false);
  pagination.hidden = rows.length <= size;
  explorer.classList.add('is-ready');
})();
