(function () {
  var container = null;
  var track = null;
  var ITEMS = ['Figma', 'FigJam', 'Miro', 'Maze', 'UserTesting', 'Notion', 'Claude', 'ChatGPT'];
  var SPEED_PX_PER_SEC = 26;
  var COPIES = 3;
  var singleSetHeight = 0;
  var started = false;

  function measure() {
    if (!track) return;
    singleSetHeight = track.scrollHeight / COPIES;
  }

  function frame(time, state) {
    if (state.lastTime == null) state.lastTime = time;
    var dt = (time - state.lastTime) / 1000;
    state.lastTime = time;

    state.offset += SPEED_PX_PER_SEC * dt;
    if (singleSetHeight > 0 && state.offset >= singleSetHeight) {
      state.offset -= singleSetHeight;
    }
    track.style.transform = 'translateY(' + (-state.offset) + 'px)';

    var containerRect = container.getBoundingClientRect();
    var centerY = containerRect.top + containerRect.height / 2;
    var halfHeight = containerRect.height / 2 || 1;

    var items = track.children;
    for (var i = 0; i < items.length; i++) {
      var itemRect = items[i].getBoundingClientRect();
      var itemCenter = itemRect.top + itemRect.height / 2;
      var norm = (itemCenter - centerY) / halfHeight;
      var distance = Math.min(1, Math.abs(norm));
      items[i].style.filter = 'blur(' + (distance * 5).toFixed(2) + 'px)';
      items[i].style.opacity = (1 - distance * 0.6).toFixed(2);
    }

    requestAnimationFrame(function (t) { frame(t, state); });
  }

  // Build the DOM items and measure them, but stay invisible/static until
  // startToolMarquee() is called (the intro sequence triggers that once the
  // cursor finishes drawing the box around this area).
  window.initToolMarquee = function () {
    container = document.getElementById('tool-marquee');
    track = document.getElementById('tool-marquee-track');
    if (!container || !track) return;

    for (var copy = 0; copy < COPIES; copy++) {
      ITEMS.forEach(function (name) {
        var el = document.createElement('span');
        el.className = 'tool-marquee__item';
        el.textContent = name;
        track.appendChild(el);
      });
    }
    measure();
    window.addEventListener('resize', measure);
  };

  window.startToolMarquee = function () {
    if (!track || started) return;
    started = true;
    track.style.opacity = '1';

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function') return;

    var state = { offset: 0, lastTime: null };
    requestAnimationFrame(function (t) { frame(t, state); });
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.initToolMarquee();
  });
})();
