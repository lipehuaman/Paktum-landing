(() => {
  const section = document.querySelector('.voices');
  if (!section || section.hidden) return;
  const windowEl = section.querySelector('.voices-window');
  const track = section.querySelector('.voices-track');
  const cards = [...track.children];
  const pause = section.querySelector('[data-voice-pause]');
  const status = section.querySelector('.voices-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let step = 1;
  let cycle = 1;
  let position = 0;
  let frame = null;
  let previousTime = null;
  let visible = false;
  let hovered = false;
  let focused = false;
  let paused = false;
  let pointerStart = null;
  let movement = null;

  // Copies on both sides keep the same club sequence visible across the loop seam.
  function copies() {
    const fragment = document.createDocumentFragment();
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      fragment.append(clone);
    });
    return fragment;
  }
  track.prepend(copies());
  track.append(copies());
  section.classList.add('is-enhanced');

  function normalize(value) { return ((value % cycle) + cycle) % cycle; }
  function render() {
    track.style.transform = `translate3d(${-cycle - normalize(position)}px, 0, 0)`;
    const index = Math.floor((normalize(position) + .5) / step) % cards.length;
    section.querySelector('[data-voice-current]').textContent = String(index + 1).padStart(2, '0');
  }
  function measure() {
    const oldStep = step;
    step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
    cycle = step * cards.length;
    position *= step / oldStep;
    if (movement) {
      movement.from *= step / oldStep;
      movement.to *= step / oldStep;
    }
    render();
  }
  function canPlay() {
    return visible && !hovered && !focused && !paused && !document.hidden && !reducedMotion.matches && pointerStart === null;
  }
  function tick(time) {
    frame = null;
    const delta = previousTime === null ? 0 : Math.min(time - previousTime, 64);
    previousTime = time;
    if (movement) {
      movement.elapsed += delta;
      const progress = Math.min(movement.elapsed / 650, 1);
      position = movement.from + (movement.to - movement.from) * (1 - Math.pow(1 - progress, 3));
      if (progress === 1) { position = normalize(position); movement = null; }
    } else if (canPlay()) {
      position = normalize(position + delta * .024);
    }
    render();
    updateHover();
    if (movement || canPlay()) frame = requestAnimationFrame(tick);
    else previousTime = null;
  }
  // Hover is resolved geometrically: the cloned cards are inert, so they never receive mouse events.
  let mouse = null;
  function updateHover() {
    hovered = mouse !== null && [...track.children].some(card => {
      const rect = card.getBoundingClientRect();
      return mouse.x >= rect.left && mouse.x <= rect.right && mouse.y >= rect.top && mouse.y <= rect.bottom;
    });
  }
  function syncPlayback() {
    pause.disabled = reducedMotion.matches;
    pause.setAttribute('aria-label', paused ? pause.dataset.playLabel : pause.dataset.pauseLabel);
    pause.querySelector('[data-pause-icon]').toggleAttribute('hidden', paused);
    pause.querySelector('[data-play-icon]').toggleAttribute('hidden', !paused);
    if ((movement || canPlay()) && frame === null) frame = requestAnimationFrame(tick);
    else if (!movement && !canPlay() && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
    }
  }
  function advance(direction) {
    const from = movement ? movement.to : position;
    const target = direction > 0 ? (Math.floor((from + 1) / step) + 1) * step : (Math.ceil((from - 1) / step) - 1) * step;
    if (reducedMotion.matches) { position = normalize(target); movement = null; render(); }
    else movement = { from: position, to: target, elapsed: 0 };
    const index = Math.round(normalize(target) / step) % cards.length;
    status.textContent = `${index + 1} / ${cards.length}. ${cards[index].querySelector('.voice-club').textContent}. ${cards[index].querySelector('blockquote').textContent}`;
    syncPlayback();
  }
  section.querySelector('[data-voice-prev]').addEventListener('click', () => advance(-1));
  section.querySelector('[data-voice-next]').addEventListener('click', () => advance(1));
  pause.addEventListener('click', () => { paused = !paused; syncPlayback(); });
  windowEl.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    mouse = { x: event.clientX, y: event.clientY };
    updateHover();
    syncPlayback();
  });
  windowEl.addEventListener('pointerleave', () => { mouse = null; hovered = false; syncPlayback(); });
  // Only keyboard focus pauses; a mouse click on the arrows should not leave the carousel stopped.
  section.addEventListener('focusin', event => { focused = event.target.matches(':focus-visible'); syncPlayback(); });
  section.addEventListener('focusout', event => {
    if (!section.contains(event.relatedTarget)) { focused = false; syncPlayback(); }
  });
  section.addEventListener('keydown', event => {
    if (!event.target.closest('button') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    advance(event.key === 'ArrowRight' ? 1 : -1);
  });
  windowEl.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    windowEl.setPointerCapture(event.pointerId);
    syncPlayback();
  });
  windowEl.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) advance(dx < 0 ? 1 : -1);
    syncPlayback();
  });
  windowEl.addEventListener('pointercancel', () => { pointerStart = null; syncPlayback(); });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && movement) { position = normalize(movement.to); movement = null; render(); }
    syncPlayback();
  });
  new ResizeObserver(measure).observe(windowEl);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncPlayback();
    }, { threshold: .15 }).observe(section);
  } else visible = true;
  measure();
  syncPlayback();
})();
