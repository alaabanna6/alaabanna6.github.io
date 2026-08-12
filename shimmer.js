(function () {
  var SUNRISE = [
    { color: '#B6D3EF', position: 0 },
    { color: '#CAD1D7', position: 0.153 },
    { color: '#D7CFC8', position: 0.252 },
    { color: '#E1CDB9', position: 0.341 },
    { color: '#EAC6A5', position: 0.424 },
    { color: '#EDB185', position: 0.505 },
    { color: '#EF9B62', position: 0.586 },
    { color: '#F18F60', position: 0.669 },
    { color: '#F48D7A', position: 0.758 },
    { color: '#F78A94', position: 0.857 },
    { color: '#F888A0', position: 1 },
  ];

  var BAND_CORE_RATIO = 0.44;
  var MAX_SPREAD_PX = 48;
  var SPREAD_MID_RATIO = 0.72;
  var BASE_FONT_PX = 14;

  function buildBandGradient(stops, angle) {
    var sorted = stops.slice().sort(function (a, b) { return a.position - b.position; });
    var first = sorted[0] ? sorted[0].color : 'white';
    var last = sorted[sorted.length - 1] ? sorted[sorted.length - 1].color : 'white';
    var core = sorted
      .map(function (stop) {
        var factor = (stop.position - 0.5) * 2 * BAND_CORE_RATIO;
        return stop.color + ' calc(50% + var(--gs-spread-mid) * ' + factor.toFixed(4) + ')';
      })
      .join(', ');
    return [
      'linear-gradient(' + angle + 'deg',
      'var(--gs-base) calc(50% - var(--gs-spread))',
      'color-mix(in oklab, var(--gs-base) 42%, ' + first + ') calc(50% - var(--gs-spread-mid))',
      core,
      'color-mix(in oklab, var(--gs-base) 42%, ' + last + ') calc(50% + var(--gs-spread-mid))',
      'var(--gs-base) calc(50% + var(--gs-spread)))',
    ].join(', ');
  }

  function supportsBackgroundClipText() {
    return (
      window.CSS &&
      typeof window.CSS.supports === 'function' &&
      (window.CSS.supports('background-clip', 'text') || window.CSS.supports('-webkit-background-clip', 'text'))
    );
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  window.initGradientShimmer = function (el, options) {
    options = options || {};
    var stops = options.gradient || SUNRISE;
    var angle = options.angle != null ? options.angle : 105;
    var spread = options.spread != null ? options.spread : 3;
    var duration = options.duration != null ? options.duration : 1.45;
    var pauseBetween = options.pauseBetween != null ? options.pauseBetween : 1000;
    var baseColor = options.baseColor || 'currentColor';
    var charCount = options.charCount || (el.textContent || '').length || 10;
    var easingValue = 'cubic-bezier(0.45, 0, 0.55, 1)';

    if (!supportsBackgroundClipText()) return;

    el.style.position = 'relative';
    el.style.display = 'inline-block';
    el.style.backgroundImage = buildBandGradient(stops, angle);
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundColor = 'var(--gs-base)';
    el.style.webkitBackgroundClip = 'text';
    el.style.backgroundClip = 'text';
    el.style.webkitTextFillColor = 'transparent';
    el.style.setProperty('--gs-base', baseColor);

    function measure() {
      var rect = el.getBoundingClientRect();
      var textWidth = rect.width || 96;
      var fontSize = parseFloat(getComputedStyle(el).fontSize) || BASE_FONT_PX;
      var fontScale = fontSize / BASE_FONT_PX;
      var spreadPx = Math.min(charCount * spread * fontScale, MAX_SPREAD_PX * fontScale);
      var layerWidth = Math.max(1, textWidth + spreadPx * 2);
      var start = -spreadPx - layerWidth / 2;
      var end = textWidth + spreadPx - layerWidth / 2;
      el.style.setProperty('--gs-spread', spreadPx + 'px');
      el.style.setProperty('--gs-spread-mid', (spreadPx * SPREAD_MID_RATIO) + 'px');
      el.style.backgroundSize = layerWidth + 'px 100%';
      return { start: start, end: end, durationMs: duration * 1000 };
    }

    measure();
    if (options.respectReducedMotion !== false && prefersReducedMotion()) return;
    if (typeof el.animate !== 'function') return;

    var anim = null;
    var pauseTimer;
    var active = true;
    var cancelled = false;

    function runSweep() {
      if (cancelled) return;
      var m = measure();
      var next = el.animate(
        [{ backgroundPosition: m.start + 'px center' }, { backgroundPosition: m.end + 'px center' }],
        { duration: m.durationMs, easing: easingValue, fill: 'forwards' }
      );
      if (!active) next.pause();
      if (anim) anim.cancel();
      anim = next;
      next.onfinish = function () {
        pauseTimer = setTimeout(runSweep, Math.max(0, pauseBetween));
      };
    }

    var inViewport = true;
    var pageVisible = !document.hidden;
    var notScrolling = true;
    function compute() {
      active = inViewport && pageVisible && notScrolling;
      if (anim) {
        if (active) anim.play();
        else anim.pause();
      }
    }

    if (typeof IntersectionObserver !== 'undefined') {
      var io = new IntersectionObserver(
        function (entries) {
          var entry = entries[entries.length - 1];
          if (!entry) return;
          inViewport = entry.isIntersecting;
          compute();
        },
        { rootMargin: '160px' }
      );
      io.observe(el);
    }

    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      compute();
    });

    var scrollTimer;
    window.addEventListener(
      'scroll',
      function () {
        notScrolling = false;
        compute();
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
          notScrolling = true;
          compute();
        }, 120);
      },
      { passive: true, capture: true }
    );

    runSweep();

    return function stop() {
      cancelled = true;
      if (anim) anim.cancel();
      clearTimeout(pauseTimer);
    };
  };
})();
