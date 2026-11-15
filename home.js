/* Home page: product tour dialog, hero product animation, parallax and scroll effects. Navigation lives in site-nav.js. */
(() => {
  const tour = document.getElementById('product-tour');
  const video = tour?.querySelector('video');
  document.querySelectorAll('[data-open-tour]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      tour.showModal();
      if (!video.hasAttribute('src')) {
        video.src = video.dataset.src;
        video.load();
      }
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(() => {});
    });
  });
  tour?.querySelector('[data-close-tour]')?.addEventListener('click', () => tour.close());
  tour?.addEventListener('click', event => {
    if (event.target !== tour) return;
    const rect = tour.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) tour.close();
  });
  tour?.addEventListener('close', () => video.pause());
})();

/* ---------- Hero: a scripted, non-interactive replica of the Position Editor and Analytics ---------- */
(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = root.querySelector('.app');
  const visual = root.closest('.hero-visual');
  const S = JSON.parse(root.dataset.strings);
  const locale = { de: 'de-DE', en: 'en-GB', es: 'es-ES' }[root.dataset.locale] || 'en-GB';
  const nf = new Intl.NumberFormat(locale, { useGrouping: 'always' });
  const money = n => nf.format(Math.round(n)) + ' EUR';
  const kilo = n => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1000) + 'K';
  const $ = sel => root.querySelector(sel);
  const boards = [...root.querySelectorAll('.board')];
  const byKey = key => root.querySelector(`[data-board="${key}"]`);
  const slot = root.querySelector('.demo-slot');
  const stadium = $('[data-stadium]');
  const cursor = $('[data-cursor]');
  const toast = $('[data-toast]');
  const floatContract = document.querySelector('[data-float-contract]');
  const BOX = ['--x', '--y', '--w', '--h'];
  const initial = boards.map(b => ({ b, status: b.dataset.status, box: BOX.map(p => b.style.getPropertyValue(p)) }));
  const BASE_CONTRACT = 66500, BASE_TOTAL = 121500;
  let booked = 0;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const clearLater = () => { timers.forEach(clearTimeout); timers.clear(); };
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const setRing = (circle, len, off = 0) => { circle.style.strokeDasharray = `${len} 100`; circle.style.strokeDashoffset = String(-off); };

  function update() {
    const count = { available: 0, reserved: 0, booked: 0, selected: 0 };
    boards.forEach(b => count[b.dataset.status]++);
    root.querySelectorAll('[data-count]').forEach(el => {
      const value = String(count[el.dataset.count]);
      if (el.textContent !== value) { el.textContent = value; restart(el, 'is-bump'); }
    });
    const total = boards.length, free = count.available + count.selected;
    setRing($('.d-avail'), free / total * 100);
    setRing($('.d-reserved'), count.reserved / total * 100, free / total * 100);
    setRing($('.d-booked'), count.booked / total * 100, (free + count.reserved) / total * 100);
    $('[data-available-pct]').textContent = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(free / total * 100) + '%';
    const used = (count.booked + count.reserved) / total * 100;
    const util = document.querySelector('[data-util]');
    if (util) { util.textContent = Math.round(used) + '%'; setRing(document.querySelector('.u-ring'), used); }
    const sel = boards.filter(b => b.dataset.status === 'selected');
    const value = sel.reduce((sum, b) => sum + Number(b.dataset.price), 0);
    $('[data-selection-text]').textContent = sel.length ? S.selected.replace('{n}', sel.length) : S.emptySelection;
    $('[data-selection-value]').textContent = sel.length ? '· ' + money(value) : '';
    $('[data-selection]').classList.toggle('has-selection', sel.length > 0);
    $('[data-book]').classList.toggle('is-ready', sel.length > 0);
  }

  function select(b, instant) {
    b.dataset.status = 'selected';
    if (!instant) restart(b, 'is-press');
    update();
  }

  function countTo(el, from, to, format, ms) {
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / ms);
      el.textContent = format(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function book(instant) {
    const sel = boards.filter(b => b.dataset.status === 'selected');
    const value = sel.reduce((sum, b) => sum + Number(b.dataset.price), 0);
    booked += value;
    sel.forEach((b, i) => {
      const apply = () => { b.dataset.status = 'booked'; if (!instant) restart(b, 'is-pop'); update(); };
      instant ? apply() : later(apply, i * 120);
    });
    if (instant) return;
    restart($('[data-book]'), 'is-press');
    $('[data-toast-value]').textContent = '· ' + money(value);
    toast.classList.add('is-visible');
    later(() => toast.classList.remove('is-visible'), 2200);
    if (floatContract) {
      floatContract.querySelector('[data-float-value]').textContent = money(value);
      floatContract.classList.add('is-on');
    }
  }

  function setView(view, instant) {
    if (instant) app.classList.add('is-instant');
    app.dataset.view = view;
    root.querySelectorAll('[data-view-target]').forEach(el => el.classList.toggle('is-active', el.dataset.viewTarget === view));
    $('[data-window-title]').textContent = view === 'analytics' ? S.analyticsWindow : root.dataset.editorTitle;
    app.classList.remove('an-on');
    if (view === 'analytics') {
      root.querySelectorAll('.bar.is-forecast').forEach(bar => bar.style.setProperty('--add', (booked / 4 / 1000 * .9).toFixed(2)));
      const contract = BASE_CONTRACT + booked, total = BASE_TOTAL + booked;
      setRing($('.r-contract'), contract / total * 100);
      $('[data-new-value]').textContent = '+' + money(booked);
      const tag = $('[data-bar-tag]');
      tag.classList.remove('is-visible');
      if (instant) {
        $('[data-contractual]').textContent = money(contract); $('[data-total]').textContent = kilo(total);
        tag.classList.add('is-visible'); app.classList.add('an-on');
      } else {
        countTo($('[data-total]'), BASE_TOTAL, total, kilo, 1400);
        countTo($('[data-contractual]'), BASE_CONTRACT, contract, money, 1400);
        later(() => { tag.classList.add('is-visible'); restart($('[data-contractual]'), 'is-bump'); }, 1300);
        void app.offsetWidth; requestAnimationFrame(() => app.classList.add('an-on'));
      }
    }
    if (instant) { void app.offsetWidth; requestAnimationFrame(() => app.classList.remove('is-instant')); }
  }

  /* Position relative to .app from offsets, so the parallax tilt does not skew it. */
  function centerOf(el) {
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, node = el;
    while (node && node !== app) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return [x, y];
  }
  function moveCursor(target, ms) {
    const [x, y] = Array.isArray(target) ? target : centerOf(target);
    cursor.style.setProperty('--cdur', ms + 'ms');
    cursor.style.setProperty('--cx', x - 4 + 'px');
    cursor.style.setProperty('--cy', y - 3 + 'px');
  }
  function click(fn) {
    cursor.classList.add('is-down');
    later(() => cursor.classList.remove('is-down'), 160);
    fn();
  }

  function reset() {
    clearLater();
    initial.forEach(({ b, status, box }) => {
      b.dataset.status = status;
      BOX.forEach((p, i) => b.style.setProperty(p, box[i]));
      b.classList.remove('is-gliding', 'is-dragging', 'is-pop', 'is-press');
    });
    slot?.classList.remove('is-filled', 'is-target');
    booked = 0;
    toast.classList.remove('is-visible');
    floatContract?.classList.remove('is-on');
    cursor.classList.remove('is-down');
    setView('editor', true);
    update();
  }

  /* 14-second script: select three boards, move one, book them, then open Analytics. */
  const DURATION = 14000;
  const startPoint = () => { const [x, y] = centerOf(stadium); return [x + stadium.offsetWidth * .42, y + stadium.offsetHeight * .62]; };
  const steps = [
    [0, () => { moveCursor(startPoint(), 0); cursor.classList.add('is-visible'); }],
    [350, () => moveCursor(byKey('top-3'), 650)],
    [1050, () => click(() => select(byKey('top-3')))],
    [1200, () => moveCursor(byKey('top-5'), 450)],
    [1700, () => click(() => select(byKey('top-5')))],
    [1850, () => moveCursor(byKey('top-9'), 480)],
    [2400, () => click(() => select(byKey('top-9')))],
    [2750, () => { cursor.classList.add('is-down'); byKey('top-9').classList.add('is-dragging'); slot.classList.add('is-target'); }],
    [2950, () => {
      const b = byKey('top-9');
      b.classList.add('is-gliding');
      BOX.forEach(p => b.style.setProperty(p, slot.style.getPropertyValue(p)));
      moveCursor(slot, 850);
    }],
    [3850, () => { cursor.classList.remove('is-down'); slot.classList.remove('is-target'); slot.classList.add('is-filled'); byKey('top-9').classList.remove('is-gliding', 'is-dragging'); }],
    [4100, () => moveCursor($('[data-book]'), 650)],
    [4800, () => click(() => book(false))],
    [6000, () => moveCursor(root.querySelector('[data-view-target="analytics"]'), 650)],
    [6700, () => click(() => setView('analytics', false))],
    [7700, () => moveCursor(root.querySelector('.bar:nth-child(11)'), 800)],
    [9900, () => moveCursor($('.an-ring'), 700)],
    [12600, () => cursor.classList.remove('is-visible')],
  ];

  let t = 0, idx = 0, last = null, playing = false, raf = 0, started = false;
  function tick(now) {
    if (!playing) return;
    if (last === null) last = now;
    t += Math.min(now - last, 100); last = now;
    while (idx < steps.length && steps[idx][0] <= t) { steps[idx][1](); idx++; }
    if (t >= DURATION) { reset(); t = 0; idx = 0; }
    raf = requestAnimationFrame(tick);
  }
  const play = () => { if (!playing && started) { playing = true; last = null; raf = requestAnimationFrame(tick); } };
  const stop = () => { playing = false; cancelAnimationFrame(raf); };

  reset();
  if (reduce) return;

  /* The screen rises in from below the hero, then the script starts. It only runs while on screen. */
  let visible = false;
  /* If the CSS fallback already showed the screen (slow load), skip the entrance instead of replaying it. */
  let waiting = getComputedStyle(visual).opacity === '0';
  if (waiting) visual.classList.add('is-waiting');
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started && !visual.dataset.entered) {
      visual.dataset.entered = '1';
      if (waiting) { visual.classList.replace('is-waiting', 'screen-in'); waiting = false; }
      setTimeout(() => { started = true; if (visible && !document.hidden) play(); }, visual.classList.contains('screen-in') ? 1000 : 0);
    }
    visible && !document.hidden ? play() : stop();
  }, { threshold: .2 }).observe(visual);
  document.addEventListener('visibilitychange', () => (visible && !document.hidden ? play() : stop()));
})();

/* ---------- Parallax, scroll reveals and micro-interactions ---------- */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.add('motion');

  /* Scroll reveals, staggered within each group. */
  const groups = [
    '.trust-top', '.logo-grid > div', '.problem-layout > div:first-child', '.problem-list article',
    '.section-heading', '.overview .eyebrow', '.overview-links', '.module-card', '.section > .eyebrow', '.voices-grid .quote-card',
    '.results-intro', '.stat', '.article-card', '.faq-intro', '.faq-list details', '.final-layout > *', '.footer-grid > div'
  ];
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    reveal.unobserve(entry.target);
    const number = entry.target.querySelector('.stat-number');
    if (number) countUp(number);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  groups.forEach(selector => document.querySelectorAll(selector).forEach(el => {
    if (el.hasAttribute('data-reveal')) return;
    const index = [...el.parentElement.children].filter(c => c.matches(selector)).indexOf(el);
    el.setAttribute('data-reveal', '');
    el.style.setProperty('--d', Math.min(index, 9) * 0.07 + 's');
    reveal.observe(el);
  }));

  function countUp(el) {
    const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
    if (!node) return;
    const target = Number(node.textContent.trim());
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / 1300);
      node.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    node.textContent = '0';
    requestAnimationFrame(step);
  }

  /* Hero: mouse parallax and tilt, plus a light scroll drift on wide screens. */
  const hero = document.querySelector('.hero');
  const stage = hero?.querySelector('[data-tilt]');
  const layers = hero ? [...hero.querySelectorAll('[data-depth]')] : [];
  const copy = hero?.querySelector('.hero-copy');
  let tx = 0, ty = 0, cx = 0, cy = 0, scroll = 0, cs = 0, running = false;
  function frame() {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08; cs += (scroll - cs) * .15;
    if (stage) stage.style.transform = `rotateY(${(cx * 5).toFixed(2)}deg) rotateX(${(-cy * 4).toFixed(2)}deg) translateY(${(cs * -.06).toFixed(1)}px)`;
    layers.forEach(layer => {
      const depth = Number(layer.dataset.depth);
      layer.style.transform = `translate3d(${(cx * depth).toFixed(1)}px, ${(cy * depth - cs * depth * .006).toFixed(1)}px, 0)`;
    });
    if (copy) copy.style.transform = `translateY(${(cs * .12).toFixed(1)}px)`;
    if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(scroll - cs) > .002) requestAnimationFrame(frame);
    else running = false;
  }
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  if (hero) {
    if (fine) {
      hero.addEventListener('pointermove', event => {
        const r = hero.getBoundingClientRect();
        tx = (event.clientX - r.left) / r.width * 2 - 1;
        ty = (event.clientY - r.top) / r.height * 2 - 1;
        kick();
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    }
    const wide = matchMedia('(min-width: 961px)');
    addEventListener('scroll', () => {
      const y = wide.matches ? Math.min(scrollY, hero.offsetHeight) : 0;
      if (y !== scroll) { scroll = y; kick(); }
    }, { passive: true });
  }

  if (!fine) return;

  /* Spotlight that follows the pointer. */
  document.querySelectorAll('.module-card, .final-cta, .article-art').forEach(el => {
    el.setAttribute('data-spot', '');
    el.addEventListener('pointermove', event => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', event.clientX - r.left + 'px');
      el.style.setProperty('--my', event.clientY - r.top + 'px');
    });
  });

  /* Gentle 3D tilt on testimonial cards. */
  document.querySelectorAll('.quote-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const r = card.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - .5, y = (event.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* Magnetic primary buttons. */
  document.querySelectorAll('.hero .btn-primary, .final-cta .btn-primary, .hero .btn-outline').forEach(btn => {
    btn.setAttribute('data-magnetic', '');
    btn.addEventListener('pointermove', event => {
      const r = btn.getBoundingClientRect();
      const x = event.clientX - r.left - r.width / 2, y = event.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${(x * .18).toFixed(1)}px, ${(y * .28).toFixed(1)}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
})();
