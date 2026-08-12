(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var header = document.querySelector('header');
    var stage = document.getElementById('intro-stage');
    var cursor = document.getElementById('intro-cursor');
    var cursorIcon = document.getElementById('intro-cursor-icon');
    var box = document.getElementById('intro-box');
    var name = document.getElementById('intro-name');
    var line1 = document.getElementById('intro-line1');
    var line2 = document.getElementById('intro-line2');
    var taglineText = document.getElementById('hero-tagline-text');
    var btnViewWork = document.getElementById('btn-view-work');
    var btnContact = document.getElementById('btn-get-in-touch');
    var marqueeContainer = document.getElementById('color-picker');
    var marqueeBox = document.getElementById('marquee-box');
    if (!header || !stage || !cursor || !box || !name || !line1 || !line2) return;

    // The color picker's viewport height should never exceed the name's
    // height (so it can't reach down as far as the tagline/buttons below
    // it), but forcing it to always MATCH that height left a tall pill with
    // a lot of empty rounded-cap space above/below the swatches whenever
    // the name renders taller than the swatch stack actually needs — which
    // it usually does. Capping at the smaller of the two lets the pill hug
    // its own content instead.
    function sizeMarqueeToStage() {
      if (!marqueeContainer) return;
      var stageRect = stage.getBoundingClientRect();
      var grid = document.getElementById('color-picker-grid');
      var contentHeight = grid ? grid.scrollHeight + 32 : stageRect.height; // +32 = the panel's own 16px top/bottom padding
      marqueeContainer.style.height = Math.min(stageRect.height, contentHeight) + 'px';
    }

    var WORD1 = 'Alaa';
    var WORD2 = 'El Banna';
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Play the intro once per browser session. Navigating away to a project
    // and back (or using the browser's back/forward buttons) should land on
    // the finished state instantly, not replay the whole sequence — only an
    // actual page reload (detected via the Navigation Timing API) resets it.
    var INTRO_SESSION_KEY = 'introPlayed';
    var alreadyPlayed = false;
    try {
      var navEntries = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation') : [];
      var isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
      if (isReload) sessionStorage.removeItem(INTRO_SESSION_KEY);
      alreadyPlayed = sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch (e) {}

    var skipAnimation = reduced || alreadyPlayed;

    function showInstantly(el) {
      if (el) el.classList.add('is-visible');
    }

    function startShimmer() {
      window.initGradientShimmer(name, {
        charCount: (WORD1 + WORD2).length,
        duration: 1.45,
        pauseBetween: 1000,
        angle: 105,
      });
    }

    if (skipAnimation) {
      line1.textContent = WORD1;
      line2.textContent = WORD2;
      // Jump straight to the finished state with no transition — box.style
      // width/height and the outline-color class both animate by default
      // (same rules the drawn animation uses), so without this the box
      // would briefly draw/fade itself in on every instant load.
      box.style.transition = 'none';
      box.style.width = 'auto';
      box.style.height = 'auto';
      var reducedRect = box.getBoundingClientRect();
      stage.style.width = reducedRect.width + 'px';
      stage.style.height = reducedRect.height + 'px';
      box.classList.add('is-hidden-border');
      void box.offsetWidth;
      box.style.transition = '';
      cursor.style.display = 'none';
      showInstantly(header);
      showInstantly(taglineText);
      showInstantly(btnViewWork);
      showInstantly(btnContact);
      startShimmer();
      sizeMarqueeToStage();
      if (marqueeBox) marqueeBox.style.display = 'none';
      if (marqueeContainer) marqueeContainer.classList.add('is-active');
      if (window.initCursorColorPicker) window.initCursorColorPicker();
      if (window.startLiveCursor) window.startLiveCursor();
      var pullSwitch = document.querySelector('.pull-switch');
      if (pullSwitch) pullSwitch.classList.add('is-revealed');
      return;
    }

    // ─── Cursor + reveal helpers (viewport-space, position:fixed) ────────────
    function rectCenter(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function moveCursorTo(x, y, durationSec, easing) {
      cursor.style.transition = 'transform ' + durationSec + 's ' + easing + ', opacity .3s ease';
      cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    }

    // One-shot left-to-right glow sweep across plain text (no background box
    // to overlay, so the "sweep" is a moving text-clip gradient band instead),
    // with a soft drop-shadow bloom that peaks as the band crosses the middle.
    function sweepTextOnce(el, durationMs) {
      var textWidth = el.getBoundingClientRect().width || 100;
      var bandPx = Math.min(70, textWidth * 0.4);
      var layerWidth = textWidth + bandPx * 2;
      el.style.backgroundImage =
        'linear-gradient(100deg, currentColor, color-mix(in oklab, var(--accent) 85%, white) calc(50% - 3px), color-mix(in oklab, var(--accent) 85%, white) calc(50% + 3px), currentColor)';
      el.style.backgroundSize = layerWidth + 'px 100%';
      el.style.webkitBackgroundClip = 'text';
      el.style.backgroundClip = 'text';
      el.style.webkitTextFillColor = 'transparent';
      var start = -bandPx - layerWidth / 2;
      var end = textWidth + bandPx - layerWidth / 2;
      el.style.backgroundPosition = start + 'px 0';
      el.style.filter = 'drop-shadow(0 0 0px transparent)';

      requestAnimationFrame(function () {
        var anim = el.animate(
          [
            { backgroundPosition: start + 'px 0', filter: 'drop-shadow(0 0 0px transparent)' },
            { backgroundPosition: (start + end) / 2 + 'px 0', filter: 'drop-shadow(0 0 7px var(--accent))', offset: 0.5 },
            { backgroundPosition: end + 'px 0', filter: 'drop-shadow(0 0 0px transparent)' },
          ],
          { duration: durationMs, easing: 'ease-in-out', fill: 'forwards' }
        );
        anim.onfinish = function () {
          el.style.removeProperty('background-image');
          el.style.removeProperty('background-size');
          el.style.removeProperty('background-position');
          el.style.removeProperty('-webkit-background-clip');
          el.style.removeProperty('background-clip');
          el.style.removeProperty('-webkit-text-fill-color');
          el.style.removeProperty('filter');
        };
      });
    }

    // Click at a point: cursor presses, the target element is created with an
    // effect matched to its shape (text sweep / button shine-sweep / nav edge glow).
    function clickCreate(el, effect, callback) {
      cursorIcon.classList.add('is-pressing');
      setTimeout(function () {
        cursorIcon.classList.remove('is-pressing');
        el.classList.add('is-visible');

        if (effect === 'text') {
          sweepTextOnce(el, 800);
        } else if (effect === 'box') {
          el.classList.add('is-sweeping');
          setTimeout(function () { el.classList.remove('is-sweeping'); }, 1000);
        } else if (effect === 'nav') {
          el.classList.add('is-glowing');
          setTimeout(function () { el.classList.remove('is-glowing'); }, 450);
        }

        if (callback) callback();
      }, 140);
    }

    function goCreate(el, effect, moveDuration, delayBeforeClick, callback) {
      var point = rectCenter(el);
      moveCursorTo(point.x, point.y, moveDuration, 'cubic-bezier(0.22,1,0.36,1)');
      setTimeout(function () {
        clickCreate(el, effect, callback);
      }, delayBeforeClick);
    }

    // ─── 1. Name: cursor arrives, draws the box, types the name ──────────────
    var BUFFER_PX = 10;

    function startNameIntro() {
      function run() {
        line1.textContent = WORD1;
        line2.textContent = WORD2;
        box.style.transition = 'none';
        box.style.width = 'auto';
        box.style.height = 'auto';
        void box.offsetWidth;
        var rect = box.getBoundingClientRect();
        var targetW = rect.width + BUFFER_PX;
        var targetH = rect.height + BUFFER_PX;
        var origin = { x: rect.left, y: rect.top };

        // Reserve the final layout space immediately — the box (now absolutely
        // positioned) animates purely visually from here on, so the page never
        // reflows/pushes content down while it grows.
        stage.style.width = targetW + 'px';
        stage.style.height = targetH + 'px';

        line1.textContent = '';
        line2.textContent = '';
        box.style.width = '0px';
        box.style.height = '0px';
        void box.offsetWidth;
        box.style.transition = '';

        // Cursor arrives from off-frame toward the box's top-left corner.
        cursor.style.transition = 'none';
        cursor.style.transform = 'translate(' + (origin.x - 40) + 'px, ' + (origin.y - 40) + 'px)';
        cursor.style.opacity = '0';
        void cursor.offsetWidth;

        requestAnimationFrame(function () {
          cursor.style.opacity = '1';
          moveCursorTo(origin.x, origin.y, 0.4, 'cubic-bezier(0.22,1,0.36,1)');
        });

        setTimeout(function () {
          moveCursorTo(origin.x + targetW, origin.y + targetH, 0.45, 'cubic-bezier(0.4,0,0.2,1)');
          box.style.width = targetW + 'px';
          box.style.height = targetH + 'px';

          setTimeout(function () {
            var i = 0;
            function typeWord1() {
              if (i <= WORD1.length) {
                line1.textContent = WORD1.slice(0, i);
                i++;
                setTimeout(typeWord1, 50);
              } else {
                i = 0;
                setTimeout(typeWord2, 80);
              }
            }
            function typeWord2() {
              if (i <= WORD2.length) {
                line2.textContent = WORD2.slice(0, i);
                i++;
                setTimeout(typeWord2, 50);
              } else {
                setTimeout(finishName, 280);
              }
            }
            typeWord1();
          }, 500);
        }, 400);
      }

      function finishName() {
        box.classList.add('is-hidden-border');
        sizeMarqueeToStage();
        setTimeout(startShimmer, 400);
        setTimeout(spawnTagline, 260);
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(run, run);
      } else {
        run();
      }
    }

    // ─── 2-5. Tagline, buttons, navbar — one click each, in order ─────────────
    function spawnTagline() {
      if (!taglineText) { spawnViewWork(); return; }
      goCreate(taglineText, 'text', 0.4, 430, function () {
        spawnViewWork();
      });
    }

    function spawnViewWork() {
      if (!btnViewWork) { spawnContact(); return; }
      goCreate(btnViewWork, 'box', 0.35, 370, spawnContact);
    }

    function spawnContact() {
      if (!btnContact) { spawnNav(); return; }
      goCreate(btnContact, 'box', 0.3, 330, spawnNav);
    }

    function spawnNav() {
      goCreate(header, 'nav', 0.45, 500, spawnColorPicker);
    }

    // ─── 6. Color picker: cursor draws a vertical box, then the swatches fade in ──
    function spawnColorPicker() {
      if (!marqueeContainer || !marqueeBox) { spawnPullSwitch(); return; }
      var rect = marqueeContainer.getBoundingClientRect();
      if (!rect.width || !rect.height) { spawnPullSwitch(); return; } // hidden below lg breakpoint

      var origin = { x: rect.left, y: rect.top };
      var targetW = rect.width;
      var targetH = rect.height;

      marqueeBox.style.transition = 'none';
      marqueeBox.style.width = '0px';
      marqueeBox.style.height = '0px';
      void marqueeBox.offsetWidth;
      marqueeBox.style.transition = '';

      moveCursorTo(origin.x, origin.y, 0.4, 'cubic-bezier(0.22,1,0.36,1)');

      setTimeout(function () {
        marqueeBox.classList.add('is-drawing');
        moveCursorTo(origin.x + targetW, origin.y + targetH, 0.45, 'cubic-bezier(0.4,0,0.2,1)');
        marqueeBox.style.width = targetW + 'px';
        marqueeBox.style.height = targetH + 'px';

        setTimeout(function () {
          marqueeBox.classList.add('is-hidden-border');
          marqueeContainer.classList.add('is-active');
          if (window.initCursorColorPicker) window.initCursorColorPicker();
          if (window.startLiveCursor) window.startLiveCursor();
          spawnPullSwitch();
        }, 540);
      }, 430);
    }

    // ─── 7. Pull-switch: cursor clicks where the lamp belongs, it glows in ──
    // Kept out of the page's initial paint entirely (see .pull-switch's
    // opacity:0 default in this page's <style>) so it doesn't just sit there
    // next to the nav from frame one while everything else gets clicked into
    // existence — it needed the same treatment as the rest of this sequence.
    function spawnPullSwitch() {
      var wrap = document.querySelector('.pull-switch');
      var bulb = wrap && wrap.querySelector('.pull-switch__bulb');
      if (!wrap || !bulb) { finishIntro(); return; }
      var rect = bulb.getBoundingClientRect();
      if (!rect.width) { finishIntro(); return; }
      var point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

      moveCursorTo(point.x, point.y, 0.4, 'cubic-bezier(0.22,1,0.36,1)');

      setTimeout(function () {
        cursorIcon.classList.add('is-pressing');
        setTimeout(function () {
          cursorIcon.classList.remove('is-pressing');
          wrap.classList.add('is-revealed');
          finishIntro();
        }, 140);
      }, 400);
    }

    function finishIntro() {
      setTimeout(function () {
        cursor.style.transition = 'opacity .35s ease';
        cursor.style.opacity = '0';
      }, 200);
    }

    startNameIntro();
  });
})();
