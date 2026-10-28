(() => {
  const explorer = document.querySelector('.ref-explorer');
  if (!explorer) return;
  const viewport = explorer.querySelector('.ref-badge-viewport');
  const stage = explorer.querySelector('.ref-stage');
  const map = explorer.querySelector('.map-card');
  const rows = Array.from(explorer.querySelectorAll('.logo-card'));
  const dots = Array.from(explorer.querySelectorAll('.map-dot'));
  if (!rows.length || !viewport || !stage) return;
  // The info card lives under the section heading, not over the map.
  const popup = explorer.closest('.map-band').querySelector('.ref-info');
  const prompt = popup.parentElement.querySelector('.map-sub');
  const close = popup.querySelector('.ref-info-close');
  const selection = explorer.querySelector('.ref-map-selection');
  const status = explorer.querySelector('.ref-badge-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clubs = new Map(rows.map(row => {
    const dot = dots.find(item => item.dataset.club === row.dataset.club);
    const title = dot?.querySelector('title')?.textContent || '';
    return [row.dataset.club, {
      row, dot, name: row.getAttribute('aria-label'),
      city: title.split(' – ').slice(1).join(' – ')
    }];
  }));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const badgeSize = 76;
  let edges = [];
  let points = [];
  let positions = [];
  let width = 0;
  let height = 0;
  let mapWidth = 0;
  let mapHeight = 0;
  let fit = 1;
  let compact = false;
  let group = 0;
  const groupSize = 12;
  const navigation = Array.from(explorer.querySelectorAll('[data-direction]'));
  navigation.forEach(button => { button.dataset.organisationLabel = button.getAttribute('aria-label'); });
  let selected = null;
  let current = 0;
  let opener = null;
  let gesture = null;
  let suppressClickUntil = 0;
  let motion = 0;
  let hoverActive = false;
  let camera = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  let resting = { x: 0, y: 0 };

  rows.forEach((row, i) => {
    row.setAttribute('aria-pressed', 'false');
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-controls', popup.id);
    row.setAttribute('aria-haspopup', 'dialog');
    row.tabIndex = i === 0 ? 0 : -1;
    row.querySelectorAll('img').forEach(img => { img.draggable = false; });
  });

  function stopMotion() {
    cancelAnimationFrame(motion);
    motion = 0;
    target = { ...camera };
  }

  function keepMapClear(node) {
    const rx = mapWidth / 2 + node.r + 12;
    const ry = mapHeight / 2 + node.r + 12;
    const distance = Math.hypot(node.x / rx, node.y / ry);
    if (distance < 1) {
      if (distance < .001) node.y = -ry;
      else { node.x /= distance; node.y /= distance; }
    }
  }

  function separate(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        if (distance < .001) { dx = .01; dy = .01; distance = Math.hypot(dx, dy); }
        const minimum = (a.r + b.r) * 1.12;
        if (distance >= minimum) continue;
        const correction = (minimum - distance) / distance * .5;
        a.x -= dx * correction; a.y -= dy * correction;
        b.x += dx * correction; b.y += dy * correction;
      }
    }
  }

  function render() {
    const nodes = points.map((point, index) => {
      const x = point.x + camera.x;
      const y = point.y + camera.y;
      const relativeDistance = Math.hypot(x, y) / point.orbit;
      const radius = point.radius * clamp(1 + (1 - relativeDistance) * .7, .72, 1.2);
      return { index, x, y, ax: x, ay: y, r: radius };
    }).filter(node => !rows[node.index].hidden);
    // Size and spacing use the same metric: neighbouring centres are 1.18 times
    // their combined radii apart. Relaxing the lattice keeps small edge badges
    // packed, unlike shrinking circles on a fixed grid. The map is an obstacle.
    for (let iteration = 0; iteration < 40; iteration++) {
      edges.forEach(([a, b]) => {
        const first = nodes[a], second = nodes[b];
        if (!first || !second) return;
        const dx = second.x - first.x, dy = second.y - first.y;
        const distance = Math.hypot(dx, dy) || 1;
        const correction = (distance - (first.r + second.r) * 1.18) / distance * .27;
        first.x += dx * correction; first.y += dy * correction;
        second.x -= dx * correction; second.y -= dy * correction;
      });
      nodes.forEach(node => {
        node.x += (node.ax - node.x) * .012;
        node.y += (node.ay - node.y) * .012;
        keepMapClear(node);
      });
      separate(nodes);
    }
    // Resolve crowded areas after the springs settle, without anchor forces
    // pulling badges back into one another while the pointer moves.
    for (let iteration = 0; iteration < 28; iteration++) {
      nodes.forEach(keepMapClear);
      separate(nodes);
    }
    positions = Array(rows.length).fill(null);
    nodes.forEach(node => {
      positions[node.index] = node;
      const row = rows[node.index];
      row.style.transform = `translate3d(${width / 2 + node.x - badgeSize / 2}px, ${height / 2 + node.y - badgeSize / 2}px, 0) scale(${node.r * 2 / badgeSize})`;
      row.style.zIndex = row.dataset.club === selected ? '3' : '1';
    });
  }

  function moveTo(x, y, animate = true) {
    // The ring stays inside its frame; pointer movement gently shifts the lens.
    target = { x: clamp(x, -22 * fit, 22 * fit), y: clamp(y, -22 * fit, 22 * fit) };
    if (!animate || reducedMotion.matches) {
      cancelAnimationFrame(motion);
      motion = 0;
      camera = { ...target };
      render();
      return;
    }
    if (motion) return;
    let previous = performance.now();
    function frame(now) {
      const ease = 1 - Math.exp(-Math.min(40, now - previous) / 75);
      previous = now;
      camera.x += (target.x - camera.x) * ease;
      camera.y += (target.y - camera.y) * ease;
      if (Math.hypot(target.x - camera.x, target.y - camera.y) < .12) {
        camera = { ...target };
        motion = 0;
      } else motion = requestAnimationFrame(frame);
      render();
    }
    motion = requestAnimationFrame(frame);
  }

  function setCurrent(index) {
    current = index;
    rows.forEach((row, i) => { row.tabIndex = i === index ? 0 : -1; });
    status.textContent = compact
      ? `${group * groupSize + 1}–${Math.min((group + 1) * groupSize, rows.length)} / ${rows.length}`
      : `${String(index + 1).padStart(2, '0')} / ${rows.length}`;
  }

  function preview(id) {
    [...rows, ...dots].forEach(item => item.classList.toggle('is-preview', item.dataset.club === id));
  }

  // Closing the card also clears the selection, so the map goes back to
  // having no lit location.
  function closePopup(restoreFocus = false) {
    const wasOpen = !popup.hidden;
    popup.hidden = true;
    prompt.hidden = false;
    selected = null;
    [...rows, ...dots].forEach(item => {
      item.classList.remove('is-active');
      item.setAttribute('aria-pressed', 'false');
      item.setAttribute('aria-expanded', 'false');
    });
    if (wasOpen) selection.textContent = selection.dataset.prompt;
    if (restoreFocus && wasOpen && opener) opener.focus({ preventScroll: true });
  }

  function reveal(index) {
    if (compact && Math.floor(index / groupSize) !== group) {
      group = Math.floor(index / groupSize);
      resize();
    }
  }

  function select(id, source) {
    const club = clubs.get(id);
    if (!club) return;
    stopMotion();
    hoverActive = false;
    selected = id;
    opener = source || club.row;
    const index = rows.indexOf(club.row);
    setCurrent(index);
    reveal(index);
    preview(null);
    [...rows, ...dots].forEach(item => {
      const active = item.dataset.club === id;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
      item.setAttribute('aria-expanded', String(active));
    });
    selection.textContent = [club.name, club.city].filter(Boolean).join(' · ');
    popup.querySelector('.ref-info-name').textContent = club.name;
    popup.querySelector('.ref-info-location').textContent = club.city;
    const logo = club.row.firstElementChild.cloneNode(true);
    logo.querySelectorAll('img').forEach(img => { img.alt = ''; });
    if (logo.tagName === 'IMG') logo.alt = '';
    popup.querySelector('.ref-info-logo').replaceChildren(logo);
    popup.hidden = false;
    prompt.hidden = true;
    // Replay the entrance animation when switching straight to another club
    popup.classList.remove('is-entering');
    void popup.offsetWidth;
    popup.classList.add('is-entering');
    render();
    if (source?.matches(':focus-visible')) close.focus({ preventScroll: true });
  }

  [...rows, ...dots].forEach(item => {
    const id = item.dataset.club;
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && !gesture?.dragged) preview(id);
    });
    item.addEventListener('pointerleave', () => preview(null));
    item.addEventListener('focus', () => preview(id));
    item.addEventListener('blur', () => preview(null));
    item.addEventListener('click', event => {
      if (performance.now() < suppressClickUntil && event.detail !== 0) return;
      select(id, item);
    });
  });
  rows.forEach((row, index) => {
    row.addEventListener('focus', () => {
      setCurrent(index);
      if (row.matches(':focus-visible') && !gesture) {
        stopMotion();
        reveal(index);
      }
    });
    row.addEventListener('keydown', event => {
      const vectors = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
      let next = index;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = rows.length - 1;
      else if (vectors[event.key]) {
        const [dx,dy] = vectors[event.key];
        let best = Infinity;
        positions.forEach((point, i) => {
          if (!point) return;
          const x = point.x - positions[index].x, y = point.y - positions[index].y;
          if (x * dx + y * dy < 1) return;
          const score = Math.hypot(x,y) + Math.abs(x * dy - y * dx) * 2;
          if (score < best) { best = score; next = i; }
        });
      } else return;
      event.preventDefault();
      closePopup();
      reveal(next);
      rows[next].focus({ preventScroll: true });
    });
  });
  dots.forEach(dot => {
    dot.setAttribute('role', 'button');
    dot.setAttribute('aria-label', dot.querySelector('title')?.textContent || clubs.get(dot.dataset.club)?.name);
    dot.setAttribute('aria-pressed', 'false');
    dot.setAttribute('aria-expanded', 'false');
    dot.setAttribute('aria-controls', popup.id);
    dot.setAttribute('aria-haspopup', 'dialog');
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(dot.dataset.club, dot);
      }
    });
  });

  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || event.buttons || gesture || !popup.hidden || reducedMotion.matches) return;
    const box = viewport.getBoundingClientRect();
    hoverActive = true;
    moveTo((event.clientX - box.x - width / 2) / width * 38,
      (event.clientY - box.y - height / 2) / height * 38);
  });
  stage.addEventListener('pointerleave', () => {
    if (!hoverActive || gesture || !popup.hidden) return;
    hoverActive = false;
    moveTo(resting.x, resting.y);
  });
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || !popup.hidden) return;
    stopMotion();
    hoverActive = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, camera: { ...camera }, dragged: false };
  });
  viewport.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.dragged && Math.hypot(dx,dy) < 7) return;
    if (!gesture.dragged) {
      gesture.dragged = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      preview(null);
    }
    moveTo(gesture.camera.x + dx * .16, gesture.camera.y + dy * .16, false);
    resting = { ...camera };
  });
  function finishGesture(event) {
    // Touch starts with implicit capture on the badge. Transferring capture to
    // the viewport must not be mistaken for the end of the swipe.
    if (event.type === 'lostpointercapture' && event.target !== viewport) return;
    if (!gesture || gesture.id !== event.pointerId) return;
    const ended = gesture;
    const dragged = ended.dragged;
    gesture = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (dragged) {
      suppressClickUntil = performance.now() + 400;
      if (compact && event.type === 'pointerup' && Math.abs(event.clientX - ended.x) > 45) {
        changeGroup(event.clientX < ended.x ? 1 : -1);
      } else {
        resting = { x: 0, y: 0 };
        moveTo(0, 0);
      }
    }
  }
  window.addEventListener('pointerup', finishGesture);
  window.addEventListener('pointercancel', finishGesture);
  viewport.addEventListener('lostpointercapture', finishGesture);
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  close.addEventListener('click', () => closePopup(true));
  document.addEventListener('pointerdown', event => {
    if (!popup.contains(event.target) && !event.target.closest('.logo-card, .map-dot')) closePopup();
    if (!stage.contains(event.target)) stopMotion();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) {
      stopMotion();
      closePopup(true);
    }
  });
  function changeGroup(delta) {
    closePopup();
    preview(null);
    group = (group + delta + Math.ceil(rows.length / groupSize)) % Math.ceil(rows.length / groupSize);
    current = group * groupSize;
    camera = { x: 0, y: 0 };
    resting = { ...camera };
    stopMotion();
    resize();
    setCurrent(current);
  }
  navigation.forEach(button => {
    button.addEventListener('click', () => {
      const delta = button.dataset.direction === 'next' ? 1 : -1;
      if (compact) { changeGroup(delta); return; }
      const index = (current + delta + rows.length) % rows.length;
      select(rows[index].dataset.club, button);
    });
  });
  explorer.querySelector('.ref-reset').addEventListener('click', () => {
    if (compact) { changeGroup(-group); return; }
    closePopup();
    preview(null);
    hoverActive = false;
    resting = { x: 0, y: 0 };
    moveTo(0,0);
  });
  function resize() {
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    mapWidth = map.clientWidth;
    mapHeight = map.clientHeight;
    const wasCompact = compact;
    compact = matchMedia('(max-width: 700px)').matches;
    if (wasCompact !== compact) group = Math.floor(current / groupSize);
    const diameter = Math.min(width, height);
    fit = diameter / 560;
    points = rows.map((row, i) => {
      row.hidden = compact && Math.floor(i / groupSize) !== group;
      const inner = i < groupSize;
      const count = compact || inner ? groupSize : rows.length - groupSize;
      const index = compact ? i % groupSize : inner ? i : i - groupSize;
      // The map takes ~54% of the stage, so the inner ring sits just outside
      // it with slightly smaller badges, leaving room for the outer ring.
      const orbit = diameter * (compact ? .382 : inner ? .335 : .425);
      const angle = index / count * Math.PI * 2 - Math.PI / 2 + (!compact && !inner ? Math.PI / count : 0);
      return {
        x: Math.cos(angle) * orbit, y: Math.sin(angle) * orbit,
        orbit, radius: orbit * Math.sin(Math.PI / count) / 1.18 * (!compact && inner ? .78 : 1)
      };
    });
    edges = [];
    const visible = points.filter((_, i) => !rows[i].hidden);
    visible.forEach((a, i) => visible.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < (a.radius + b.radius) * 1.4) edges.push([i, j]);
    }));
    navigation.forEach(button => {
      const label = compact ? button.dataset.groupLabel : button.dataset.organisationLabel;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
    setCurrent(current);
    render();
  }
  explorer.classList.add('is-ready');
  setCurrent(0);
  selection.textContent = selection.dataset.prompt;
  new ResizeObserver(resize).observe(viewport);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { stopMotion(); render(); } });
  resize();
})();
