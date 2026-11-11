// Fusion page only (index-fusion.html): puts the 3D devices on the project card
// of the water homepage. The page's own carousel keeps doing everything it did
// (arrows, keys, swipe, text, links); this file only watches which project is
// current and shows the matching device. Without WebGL the flat images remain.
(function () {
  const root = document.documentElement;
  const stage = document.querySelector('.showcase__stage');
  const flat = () => root.classList.remove('fusion-3d'); // bring the screenshots back
  if (!stage) { flat(); return; }

  // The button joins the project's name and description inside the card. The
  // carousel script already holds this element, so it keeps updating its link.
  const info = document.querySelector('.showcase__info');
  const cta = stage.querySelector('.showcase__cta');
  if (info && cta) info.appendChild(cta);

  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  if (!window.Scene3D || mq('(forced-colors: active)').matches) { flat(); return; }

  const host = document.createElement('div');
  host.className = 'fusion-scene';
  host.setAttribute('aria-hidden', 'true');
  host.appendChild(document.createElement('canvas'));
  stage.appendChild(host);

  let scene = null;
  try { scene = window.Scene3D.mount(host, { fit: 1.03 }); } catch (e) { scene = null; }
  if (!scene || host.classList.contains('no-gl')) { host.remove(); flat(); return; }

  const slides = [...stage.querySelectorAll('.slide')];
  // monstrum.html -> "monstrum": the device set with the same name in layers.js
  const nameOf = s => (s.getAttribute('href') || '').replace(/\.html$/, '');
  let shown = null, prev = null;
  function sync() {
    const cur = slides.find(s => s.classList.contains('is-current'));
    if (!cur) return;
    const name = nameOf(cur);
    if (name === shown) return;
    // Which way did it go? The carousel parks the slide it just left on the
    // side it left from: "before" means the visitor moved forward.
    const dir = prev ? (prev.classList.contains('is-before') ? 1 : -1) : 0;
    prev = cur;
    if ((window.__LAYERS || {})[name]) {
      root.classList.add('fusion-3d');
      stage.classList.add('has-3d');
      scene.show(name, dir);
    } else {
      // a project without a 3D model keeps its flat image
      flat();
      stage.classList.remove('has-3d');
      scene.hide();
    }
    shown = name;
  }
  const watch = new MutationObserver(sync);
  slides.forEach(s => watch.observe(s, { attributes: true, attributeFilter: ['class'] }));
  sync();

  // While a finger (or the mouse) drags the card, the device follows it
  let x0 = null;
  stage.addEventListener('pointerdown', e => { if (e.button === 0) x0 = e.clientX; });
  stage.addEventListener('pointermove', e => {
    if (x0 === null || !stage.classList.contains('is-grabbing')) return;
    scene.drag((e.clientX - x0) / stage.clientWidth);
  });
  const let_go = () => { x0 = null; scene.drag(0); };
  stage.addEventListener('pointerup', let_go);
  stage.addEventListener('pointercancel', let_go);

  // Calm motion and More contrast are switched by the page; redraw when they change
  new MutationObserver(() => scene.refresh()).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-contrast'] });
})();

// The About statement lights up word by word as it scrolls into view
(function () {
  const say = document.querySelector('.about__title');
  if (!say) return;
  const root = document.documentElement;
  const calm = () => root.dataset.motion === 'calm' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const text = say.textContent.replace(/\u00a0/g, ' ').trim();
  say.setAttribute('aria-label', text);
  say.textContent = '';
  const words = text.split(/\s+/).map((w, i, all) => {
    const s = document.createElement('span');
    s.className = /^(process|purpose)\W*$/i.test(w) ? 'word word--accent' : 'word';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = w;
    say.appendChild(s);
    // each sentence starts on its own line
    if (i < all.length - 1) say.appendChild(/[.!?]$/.test(w) ? document.createElement('br') : document.createTextNode(' '));
    return s;
  });
  say.classList.add('is-scrub');
  let queued = false;
  const light = () => {
    queued = false;
    const r = say.getBoundingClientRect(), vh = window.innerHeight;
    // The words light up as the statement rises into view: the first when its
    // top line appears, the last when its bottom line has come fully on screen.
    const p = calm() ? 1 : Math.max(0, Math.min(1, (vh * 0.9 - r.top) / Math.max(1, r.height + vh * 0.12)));
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(light); } };
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  new MutationObserver(ask).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  light();
})();

// The portrait stays still (the hover tilt was removed)
