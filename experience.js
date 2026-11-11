// The page adapts to the visitor: three options in the hero that change how the
// page behaves (a 30 second version, calm motion, more contrast). Choices are
// remembered on this device.
// Also here: the 3D tilt on the project stage and the sections rising into view.
(function () {
  const root = document.documentElement;
  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const systemReduced = () => mq('(prefers-reduced-motion: reduce)').matches;
  const calm = () => root.dataset.motion === 'calm';
  const motionOk = () => !systemReduced() && !calm();

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
  };

  const form = document.getElementById('adapt');
  if (!form) return;
  const status = form.querySelector('.adapt__status');
  const chip = name => form.querySelector('[data-act="' + name + '"]');

  function say(text) {
    // Clear first so the same sentence is announced again if repeated
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = text; });
  }
  function sync() {
    chip('calm').setAttribute('aria-pressed', calm() ? 'true' : 'false');
    chip('contrast').setAttribute('aria-pressed', root.dataset.contrast === 'more' ? 'true' : 'false');
    if (window.Water) window.Water.refresh();
  }

  function setCalm(on) {
    if (on) root.dataset.motion = 'calm'; else delete root.dataset.motion;
    store.set('ab-motion', on ? 'calm' : null);
    sync();
    say(on ? 'Done. The water is still and the devices stop floating.'
      : systemReduced() ? 'Motion is allowed again, but your system asks for reduced motion, so the page stays still.'
        : 'Motion is back. Move across the water to see it respond.');
    if (!on && window.Water) window.Water.rain();
  }
  function setContrast(on) {
    if (on) root.dataset.contrast = 'more'; else delete root.dataset.contrast;
    store.set('ab-contrast', on ? 'more' : 'default');
    sync();
    say(on ? 'Done. Text and borders are darker and the water is hidden.' : 'Contrast is back to the default.');
  }
  function reset() {
    delete root.dataset.motion;
    delete root.dataset.contrast;
    store.set('ab-motion', null);
    store.set('ab-contrast', 'default');
    sync();
    say('Back to the default page.');
  }
  function go(id, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
    // Move keyboard and screen reader focus along with the scroll
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    say('Here you go: ' + label + '.');
  }

  // ---- the 30 second version: built from the project cards already on the page ----
  const ARROW = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 13l6-6M8 7h5v5"/></svg>';
  let brief = null;
  function buildBrief() {
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const projects = [...document.querySelectorAll('#projects .slide')].map(s =>
      '<li><a class="brief__project" href="' + esc(s.getAttribute('href')) + '">' +
      '<span class="brief__project-name">' + esc(s.dataset.name) + ARROW + '</span>' +
      '<span class="brief__project-desc">' + esc(s.dataset.desc) + '</span></a></li>').join('');
    const tagline = document.querySelector('.hero__tagline');
    const email = document.querySelector('.contact__email');
    const resume = document.querySelector('.contact__links a[href$=".pdf"]');
    const d = document.createElement('dialog');
    d.className = 'brief';
    d.setAttribute('aria-labelledby', 'brief-title');
    d.innerHTML =
      '<div class="brief__inner">' +
        '<div class="brief__head"><div>' +
          '<p class="brief__eyebrow">The 30 second version</p>' +
          '<h2 class="brief__title" id="brief-title">Alaa El Banna, Product Designer</h2>' +
        '</div>' +
        '<button type="button" class="brief__close" aria-label="Close">' +
          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>' +
        '</button></div>' +
        '<p class="brief__who">' + esc(tagline ? tagline.textContent : '') + ' Based in Toronto, with a Master of Digital Media from Toronto Metropolitan University.</p>' +
        '<ul class="brief__list" aria-label="Projects">' + projects + '</ul>' +
        '<div class="brief__actions">' +
          (email ? '<a class="btn btn--primary" href="' + esc(email.getAttribute('href')) + '">Email Alaa</a>' : '') +
          (resume ? '<a class="btn btn--ghost" href="' + esc(resume.getAttribute('href')) + '" target="_blank" rel="noopener noreferrer">View Resume</a>' : '') +
          '<a class="btn btn--ghost" href="https://linkedin.com/in/alaa-banna/" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelector('.brief__close').addEventListener('click', () => d.close());
    // Click on the dimmed area closes it, like every sheet people already know
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    return d;
  }
  function openBrief() {
    if (!brief) brief = buildBrief();
    if (typeof brief.showModal !== 'function') { go('projects', 'the projects'); return; }
    if (!brief.open) brief.showModal();
    say('Opened the 30 second version.');
  }

  form.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'brief') openBrief();
    if (b.dataset.act === 'calm') setCalm(!calm());
    if (b.dataset.act === 'contrast') setContrast(root.dataset.contrast !== 'more');
  });
  sync();

  // ---- 3D tilt on the project stage (mouse only; never while swiping) ----
  const stage = document.querySelector('.showcase__stage');
  if (stage && mq('(hover: hover) and (pointer: fine)').matches) {
    let queued = null;
    const flat = () => {
      stage.classList.remove('is-tilting');
      stage.style.setProperty('--rx', '0deg');
      stage.style.setProperty('--ry', '0deg');
      stage.style.setProperty('--glare', '0');
    };
    stage.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !motionOk() || stage.classList.contains('is-grabbing')) { flat(); return; }
      queued = e;
      requestAnimationFrame(() => {
        if (!queued) return;
        const r = stage.getBoundingClientRect();
        const x = (queued.clientX - r.left) / r.width, y = (queued.clientY - r.top) / r.height;
        queued = null;
        stage.classList.add('is-tilting');
        stage.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        stage.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
        stage.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        stage.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        stage.style.setProperty('--glare', '1');
      });
    });
    stage.addEventListener('pointerleave', () => { queued = null; flat(); });
    stage.addEventListener('pointerdown', flat);
  }

  // ---- sections rise into view, once ----
  if (motionOk() && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.section-head, .about__title, .about__text p, .skills, .contact__card');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el, i) => {
      // Anything already on screen is left alone, so nothing flashes on load
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.style.setProperty('--rise-delay', (el.matches('.about__text p') ? (i % 3) * 0.08 : 0) + 's');
      el.classList.add('rise');
      io.observe(el);
    });
  }
})();
