/* Features module tour: the module crossing the viewport midpoint becomes active. Its video plays
   (only that one loads), the 01–09 control and the URL hash follow. On wide screens the videos move
   into a sticky app window; elsewhere each module keeps its own video. */
(() => {
  const root = document.querySelector('.fx');
  if (!root) return;
  const layout = root.querySelector('[data-fx]');
  const blocks = [...root.querySelectorAll('[data-fx-block]')];
  const videos = blocks.map(b => b.querySelector('[data-fx-video]'));
  const media = blocks.map(b => b.querySelector('.fx-media'));
  const progress = root.querySelector('[data-fx-progress]');
  const links = [...progress.querySelectorAll('[data-fx-jump]')];
  const stage = root.querySelector('[data-fx-stage]');
  const screen = root.querySelector('[data-fx-screen]');
  const title = root.querySelector('[data-fx-title]');
  const count = root.querySelector('[data-fx-count]');
  const fill = root.querySelector('[data-fx-fill]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 1101px) and (min-height: 640px)');
  const START = 2.8, OUTRO = 2.6; // skip the title card and the closing logo of each video
  const total = String(blocks.length).padStart(2, '0');
  let active = -1;

  /* Loop only the part of each video that shows the product. */
  videos.forEach(video => {
    video.removeAttribute('loop');
    if (reduce) { video.controls = true; return; }
    const seekStart = () => { if (video.duration > START + OUTRO + 2) video.currentTime = START; };
    video.addEventListener('loadedmetadata', seekStart);
    video.addEventListener('timeupdate', () => { if (video.duration && video.currentTime > video.duration - OUTRO) video.currentTime = START; });
    video.addEventListener('ended', () => { seekStart(); video.play().catch(() => {}); });
  });

  function play(i) {
    videos.forEach((video, n) => {
      if (n === i) {
        if (reduce) return;
        video.preload = 'auto';
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    const next = videos[i + 1];
    if (next && next.preload === 'none') next.preload = 'metadata';
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    blocks.forEach((b, n) => b.classList.toggle('is-active', n === i));
    videos.forEach((v, n) => v.classList.toggle('is-active', n === i));
    links.forEach((a, n) => a.setAttribute('aria-current', String(n === i)));
    title.textContent = videos[i].dataset.title;
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
    const link = links[i];
    if (!root.classList.contains('is-pinned') && progress.scrollWidth > progress.clientWidth) {
      progress.scrollTo({ left: link.offsetLeft - (progress.clientWidth - link.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (location.hash !== '#' + blocks[i].id) history.replaceState(null, '', '#' + blocks[i].id);
    play(i);
  }

  /* Active module = the one crossing the middle of the viewport. */
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) setActive(blocks.indexOf(entry.target)); });
  }, { rootMargin: '-50% 0px -50% 0px' });
  blocks.forEach(b => io.observe(b));

  /* Pause everything once the tour is off screen; drop the hash when scrolling back above it. */
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) return;
    videos.forEach(v => v.pause());
    if (active !== -1 && entry.boundingClientRect.top > 0 && blocks.some(b => location.hash === '#' + b.id)) {
      history.replaceState(null, '', location.pathname + location.search);
      active = -1;
    }
  }).observe(layout);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(v => v.pause());
    else if (active >= 0 && layout.getBoundingClientRect().bottom > 0 && layout.getBoundingClientRect().top < innerHeight) play(active);
  });

  /* Overall progress line across the tour. */
  let ticking = false;
  function updateFill() {
    ticking = false;
    const r = root.querySelector('.fx-copy').getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight / 2 - r.top) / r.height));
    fill.style.setProperty('--p', p.toFixed(4));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateFill); } }, { passive: true });

  /* Wide screens: move the videos and the progress control into the sticky window. */
  function applyMode() {
    const pinned = wide.matches;
    root.classList.toggle('is-pinned', pinned);
    videos.forEach((video, i) => (pinned ? screen : media[i]).appendChild(video));
    if (pinned) stage.appendChild(progress);
    else layout.insertBefore(progress, layout.firstChild);
    if (active >= 0) play(active);
    updateFill();
  }
  applyMode();
  wide.addEventListener('change', applyMode);

  /* Direct links: the 01–09 control, the navbar dropdown and #slug deep links. */
  function jump(i, behavior) {
    blocks[i].scrollIntoView({ behavior: reduce ? 'instant' : behavior, block: root.classList.contains('is-pinned') ? 'center' : 'start' });
    history.replaceState(null, '', '#' + blocks[i].id);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest && event.target.closest('a[href*="#"]');
    if (!link || link.pathname !== location.pathname) return;
    const i = blocks.findIndex(b => '#' + b.id === link.hash);
    if (i === -1) return;
    event.preventDefault();
    jump(i, 'smooth');
  });
  const fromHash = () => { const i = blocks.findIndex(b => '#' + b.id === location.hash); if (i !== -1) jump(i, 'instant'); };
  addEventListener('hashchange', fromHash);
  /* Re-land after fonts and images settle, unless the visitor has already scrolled away. */
  if (location.hash) {
    let moved = false;
    const settle = () => { if (!moved) fromHash(); };
    addEventListener('wheel', () => { moved = true; }, { once: true, passive: true });
    addEventListener('touchmove', () => { moved = true; }, { once: true, passive: true });
    addEventListener('keydown', () => { moved = true; }, { once: true });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(settle);
    if (document.readyState === 'complete') settle(); else addEventListener('load', settle, { once: true });
  }
})();
