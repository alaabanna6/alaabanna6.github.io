(function () {
  var STORAGE_KEY = 'cursorColor';
  var DEFAULT_COLOR = 'neutral';
  var canFinePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function getStoredColor() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || DEFAULT_COLOR;
    } catch (e) {
      return DEFAULT_COLOR;
    }
  }

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  // Picks black or white text depending on how light/dark the swatch is,
  // so the follow label stays readable against every color (white, yellow,
  // black, etc.) rather than assuming light text always works.
  function contrastingTextColor(hex) {
    var rgb = hexToRgb(hex);
    var luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.6 ? '#18181B' : '#FFFFFF';
  }

  // "neutral" isn't a fixed hex — it's whichever of black/white actually
  // contrasts with the current theme (a literal black or white would vanish
  // outright half the time, against a same-toned background). --primary
  // already tracks exactly that (near-black in light mode, near-white in
  // dark), so this just reads the resolved value straight from the
  // stylesheet instead of duplicating those two hex codes here.
  function resolveToken(token) {
    if (token !== 'neutral') return token;
    var v = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    return v || DEFAULT_COLOR;
  }

  function applyColor(token) {
    var hex = resolveToken(token);
    var rgb = hexToRgb(hex);
    document.documentElement.style.setProperty('--live-cursor-color', hex);
    document.documentElement.style.setProperty('--live-cursor-text', contrastingTextColor(hex));
    // Same color drives the hero dot-grid's cursor spotlight (see
    // .hero-dots__spotlight), so the whole canvas — not just the cursor
    // icon — reflects whatever the visitor picked.
    document.documentElement.style.setProperty(
      '--spotlight-dot',
      'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.75)'
    );
    var swatches = document.querySelectorAll('.color-picker__swatch');
    swatches.forEach(function (btn) {
      btn.classList.toggle('is-selected', btn.dataset.color.toLowerCase() === token.toLowerCase());
    });
  }

  function setColor(token) {
    applyColor(token);
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch (e) {}
  }

  // Apply the saved/default color immediately so the live cursor is correct
  // the moment it's created, without waiting for the picker to be revealed.
  applyColor(getStoredColor());

  // "neutral" resolves differently per theme, so flipping the theme (via
  // the pull-switch) needs to re-resolve and re-apply it live, or picking
  // neutral in light mode would stay black forever instead of flipping to
  // white in dark mode. Harmless to re-run for any other color too — a hex
  // token just resolves back to itself.
  document.addEventListener('themechange', function () {
    applyColor(getStoredColor());
  });

  // ─── Align the picker's right edge to the "Get in Touch" button ──────────
  // CSS alone can't reference another element's position, and the button's
  // own right edge doesn't line up with a simple fixed offset (it moves with
  // its flex row across breakpoints), so this measures it directly. Runs
  // before intro.js reads the container's rect for the box-draw animation.
  function alignColorPickerToButton() {
    var picker = document.getElementById('color-picker');
    var btn = document.getElementById('btn-get-in-touch');
    if (!picker || !btn || !picker.offsetParent) return;
    var parentRect = picker.offsetParent.getBoundingClientRect();
    var btnRect = btn.getBoundingClientRect();
    if (!btnRect.width) return; // button not laid out yet
    picker.style.right = (parentRect.right - btnRect.right) + 'px';
  }
  alignColorPickerToButton();
  window.addEventListener('resize', alignColorPickerToButton);
  window.addEventListener('load', alignColorPickerToButton);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(alignColorPickerToButton);
  }

  // ─── Swatch picker: wires clicks once the panel exists in the DOM ────────
  var pickerInitialized = false;
  window.initCursorColorPicker = function () {
    if (pickerInitialized) return;
    pickerInitialized = true;
    var grid = document.getElementById('color-picker-grid');
    if (!grid) return;
    applyColor(getStoredColor());
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.color-picker__swatch');
      if (!btn) return;
      setColor(btn.dataset.color);
    });
  };

  // ─── Live cursor: tracks the real mouse, only on fine-pointer devices ────
  // The native cursor is hidden for the whole session once this starts —
  // that toggle is set once here and never flipped back off, so there's no
  // window (or event race) where both the native and colored cursor show
  // at once. mousemove only ever controls this element's position/opacity.
  var liveCursorStarted = false;
  window.startLiveCursor = function () {
    if (liveCursorStarted || !canFinePointer) return;
    var el = document.getElementById('live-cursor');
    if (!el) return;
    liveCursorStarted = true;
    document.documentElement.classList.add('live-cursor-active');

    var pending = false;
    var lastX = window.innerWidth / 2;
    var lastY = window.innerHeight / 2;

    // ─── Cursor follow: trailing label shown over project cards ────────────
    var followEl = document.getElementById('live-cursor-follow');
    var hoveredCard = null;

    function apply() {
      pending = false;
      el.style.transform = 'translate(' + lastX + 'px, ' + lastY + 'px)';
      if (followEl && hoveredCard) {
        followEl.style.transform = 'translate(' + (lastX + 20) + 'px, ' + (lastY + 20) + 'px)';
      }
    }

    document.addEventListener('mousemove', function (e) {
      lastX = e.clientX;
      lastY = e.clientY;
      el.classList.add('is-active');
      if (!pending) {
        pending = true;
        requestAnimationFrame(apply);
      }
    });

    if (followEl) {
      document.addEventListener('mouseover', function (e) {
        var card = e.target.closest && e.target.closest('[data-cursor-label]');
        if (!card || card === hoveredCard) return;
        var firstReveal = !hoveredCard;
        hoveredCard = card;
        followEl.textContent = card.dataset.cursorLabel || '';

        if (firstReveal) {
          // Jump straight to the cursor's current spot with no transition,
          // so it fades in in place instead of sliding in from its resting
          // off-screen position (translate(-9999px, -9999px)).
          followEl.style.transition = 'none';
          followEl.style.transform = 'translate(' + (lastX + 20) + 'px, ' + (lastY + 20) + 'px)';
          void followEl.offsetWidth;
          followEl.style.transition = '';
        }

        followEl.classList.add('is-active');
      });

      document.addEventListener('mouseout', function (e) {
        if (!hoveredCard) return;
        var card = e.target.closest && e.target.closest('[data-cursor-label]');
        if (card !== hoveredCard) return;
        if (card.contains(e.relatedTarget)) return; // still inside the same card
        hoveredCard = null;
        followEl.classList.remove('is-active');
      });
    }

    // Only hide the colored cursor when the mouse truly leaves the browser
    // window (not on every element boundary crossing inside the page).
    document.documentElement.addEventListener('mouseleave', function () {
      el.classList.remove('is-active');
      if (followEl) followEl.classList.remove('is-active');
      hoveredCard = null;
    });
  };
})();
