(function () {
  var MAX_TRAVEL = 34;
  var TRIGGER_THRESHOLD = 14;

  function init(bulb) {
    var wrap = bulb.closest('.pull-switch');
    if (!wrap) return;

    var startY = 0;
    var dragging = false;
    var dragged = false;

    function setOffset(px) {
      bulb.style.transform = 'translate(-50%, ' + px + 'px)';
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var dy = e.clientY - startY;
      if (dy < 0) dy = 0; // it's a hanging cord — only pulling down does anything
      if (dy > 2) dragged = true;
      // Diminishing-return elastic travel: fast at first, then resists
      // harder the further it's pulled, so it never feels like it detaches.
      setOffset(MAX_TRAVEL * (1 - 1 / (1 + dy / MAX_TRAVEL)));
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('is-dragging');
      bulb.style.transition = '';
      setOffset(0);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      var dy = e.clientY - startY;
      if (dragged && dy > TRIGGER_THRESHOLD && window.__toggleTheme) {
        window.__toggleTheme();
      }
      // The click-suppression listener below consumes `dragged` (resets it
      // to false) the moment the browser's own post-drag click arrives. If
      // no click follows at all (happens on some touch paths), this timeout
      // is the fallback so the flag can't linger and swallow an unrelated
      // later click — e.g. a keyboard/screen-reader activation, which fires
      // 'click' with no pointerdown to reset it naturally.
      setTimeout(function () { dragged = false; }, 400);
    }

    bulb.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      dragged = false;
      startY = e.clientY;
      wrap.classList.add('is-dragging');
      bulb.style.transition = 'none';
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });

    // A drag release already triggers the toggle above — without this, the
    // browser's own click event (fired right after pointerup) would toggle
    // it a second time and immediately flip it back. Attaching this listener
    // before theme.js's (see script order in <head>) makes it run first, so
    // stopImmediatePropagation actually reaches theme.js's listener in time.
    bulb.addEventListener('click', function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopImmediatePropagation();
        dragged = false;
      }
    });
  }

  // Docked position: next to whichever real nav element is actually visible
  // at this width (Contact on desktop, the hamburger once nav links
  // collapse), instead of an arbitrary offset from the nav's edge. On
  // desktop the gap matches the nav's own link-to-link spacing (measured
  // live from About→Contact) so it reads as part of the same row rhythm
  // instead of a guessed pixel value.
  function dockedLeftFor(nav, navRect) {
    var contact = nav.querySelector('.nav-link--contact');
    var about = nav.querySelector('.nav-link--about');
    var hamburger = nav.querySelector('#menu-toggle');
    var anchor = (contact && contact.offsetParent) ? contact : hamburger;
    var x;
    if (anchor === contact && about && about.offsetParent) {
      var contactRect = contact.getBoundingClientRect();
      var aboutRect = about.getBoundingClientRect();
      var linkGap = contactRect.left - aboutRect.right;
      x = contactRect.right + linkGap + 10; // +10 = half the bulb's width, so the gap (not its center) matches
    } else if (anchor) {
      var r = anchor.getBoundingClientRect();
      x = r.right + 20;
    } else {
      x = navRect.right - 20;
    }
    return x - navRect.left;
  }

  // Hero position: lined up on the same vertical axis as the color-picker
  // swatch column, so the lamp doesn't read as a random floating element —
  // only index.html's hero has one. Pages without it just use the docked
  // position from the start (returns null here, handled by the caller).
  function heroLeftFor(navRect) {
    var picker = document.getElementById('color-picker');
    if (!picker || !picker.offsetParent) return null;
    var r = picker.getBoundingClientRect();
    return (r.left + r.width / 2) - navRect.left;
  }

  // Runs after cursor-color.js's own alignColorPickerToButton (both are
  // deferred scripts, which all finish their top-level run before
  // DOMContentLoaded fires — see script order in <head>), so the picker's
  // rect is already correct by the time this reads it.
  function positionPullSwitch() {
    var wrap = document.querySelector('.pull-switch');
    var nav = document.querySelector('header nav');
    if (!wrap || !nav) return;
    var navRect = nav.getBoundingClientRect();
    var docked = wrap.classList.contains('is-docked');
    var heroLeft = heroLeftFor(navRect);
    var left = (docked || heroLeft === null) ? dockedLeftFor(nav, navRect) : heroLeft;
    wrap.style.left = left + 'px';
  }

  // Never actually scrolls with the page (see the comment in theme.css) —
  // past a small scroll threshold it just switches to the docked position/
  // hides the cord, both within the same fixed header. Reversible, so
  // scrolling back to the top restores the hanging state.
  //
  // The position/cord change itself is a hard snap (see theme.css) — it's
  // masked by fading .pull-switch to opacity 0, snapping while invisible,
  // then fading back in. Animating top/left directly looked janky, so this
  // trades a moved animation for a clean fade, which reads as smooth
  // because the actual jump is never on screen.
  var DOCK_SCROLL_THRESHOLD = 24;
  var DOCK_FADE_MS = 190;
  var scrollCheckPending = false;
  var dockTransitioning = false;

  function applyDockChange(wrap, shouldDock) {
    dockTransitioning = true;
    wrap.classList.add('is-dock-transitioning');
    setTimeout(function () {
      wrap.classList.toggle('is-docked', shouldDock);
      positionPullSwitch();
      void wrap.offsetWidth; // flush the snap before opacity fades back in
      wrap.classList.remove('is-dock-transitioning');
      dockTransitioning = false;
    }, DOCK_FADE_MS);
  }

  // Only index.html's hero (above the lg breakpoint, where the color-picker
  // is actually shown) has anything for the lamp to hang next to and be
  // "discovered" against. Everywhere else — every project page, and even
  // index.html itself below lg — there's no hero moment to justify a
  // drop-down phase, so it should just sit docked next to Contact from the
  // first frame, not hang and then retract.
  function hasHeroPosition() {
    var picker = document.getElementById('color-picker');
    return !!(picker && picker.offsetParent);
  }

  function updateDockState() {
    scrollCheckPending = false;
    var wrap = document.querySelector('.pull-switch');
    if (!wrap || dockTransitioning) return;
    var shouldDock = !hasHeroPosition() || window.scrollY > DOCK_SCROLL_THRESHOLD;
    if (shouldDock === wrap.classList.contains('is-docked')) return;
    applyDockChange(wrap, shouldDock);
  }
  function onScroll() {
    if (scrollCheckPending) return;
    scrollCheckPending = true;
    requestAnimationFrame(updateDockState);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.pull-switch__bulb').forEach(init);
    var wrap = document.querySelector('.pull-switch');
    // Set the initial docked state directly, with no fade — that masking
    // trick is for a live toggle, not for "what it looks like on first
    // paint," which should just be correct immediately, no flash-then-dock.
    if (wrap && (!hasHeroPosition() || window.scrollY > DOCK_SCROLL_THRESHOLD)) {
      wrap.classList.add('is-docked');
    }
    positionPullSwitch();
  });
  window.addEventListener('resize', positionPullSwitch);
  window.addEventListener('load', positionPullSwitch);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionPullSwitch);
  }
})();
