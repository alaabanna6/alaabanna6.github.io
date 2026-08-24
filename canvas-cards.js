(function () {
  var STORAGE_KEY = 'connectedPairs';

  function getConnected() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveConnected(index) {
    var c = getConnected();
    c[index] = true;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) {}
  }

  function initPair(pair, index) {
    var node = pair.querySelector('.canvas-node');
    var source = pair.querySelector('.canvas-card--source');
    var target = pair.querySelector('.canvas-card--target');
    var svg = pair.querySelector('.canvas-connector');
    // Direct-child scope: the arrowhead marker also contains a <path>
    // (inside <defs><marker>), and it comes first in document order, so an
    // unscoped 'path' query grabs the decorative arrow shape instead of the
    // actual connector line.
    var path = svg && svg.querySelector(':scope > path');
    if (!node || !source || !target || !svg || !path) return;

    function pointFromNode() {
      var pairRect = pair.getBoundingClientRect();
      var nodeRect = node.getBoundingClientRect();
      return {
        x: nodeRect.left + nodeRect.width / 2 - pairRect.left,
        y: nodeRect.top + nodeRect.height / 2 - pairRect.top,
      };
    }

    // Mobile stacks the cards in a column (node sits at the source card's
    // bottom-center edge already), so the line should drop from that point
    // straight to the target's top-center edge — staying inside the gap
    // between the two cards instead of arcing into the target's left-mid
    // edge, which cuts across the card's text on a narrow single-column
    // layout. Desktop's side-by-side geometry is untouched.
    function isStackedLayout() {
      return window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    }

    function pointOnTarget() {
      var pairRect = pair.getBoundingClientRect();
      var targetRect = target.getBoundingClientRect();
      if (isStackedLayout()) {
        return {
          x: targetRect.left + targetRect.width / 2 - pairRect.left,
          y: targetRect.top - pairRect.top,
        };
      }
      return {
        x: targetRect.left - pairRect.left,
        y: targetRect.top + targetRect.height / 2 - pairRect.top,
      };
    }

    function drawPath() {
      var start = pointFromNode();
      var end = pointOnTarget();
      var midX = (start.x + end.x) / 2;
      var d = 'M ' + start.x + ',' + start.y +
        ' C ' + midX + ',' + start.y + ' ' + midX + ',' + end.y + ' ' + end.x + ',' + end.y;
      path.setAttribute('d', d);
      var length = path.getTotalLength();
      path.style.strokeDasharray = length;
      if (!pair.classList.contains('is-connected')) {
        path.style.strokeDashoffset = length;
      }
      return length;
    }

    drawPath();
    window.addEventListener('resize', drawPath);

    // Restore connected state from this session without replaying the animation.
    if (getConnected()[index]) {
      pair.classList.add('is-connected');
      path.style.strokeDashoffset = '0';
    }

    function connect() {
      if (pair.classList.contains('is-connected')) return;
      var length = drawPath();
      path.style.transition = 'none';
      path.style.strokeDashoffset = length;
      void path.offsetWidth;
      path.style.transition = 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)';
      path.style.strokeDashoffset = '0';
      pair.classList.add('is-connected');
      saveConnected(index);
    }

    node.addEventListener('click', connect);

    // Auto-connect when the pair scrolls into view (40% visible).
    // Already-connected pairs (restored from sessionStorage) skip the observer.
    if (!getConnected()[index] && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          observer.unobserve(pair);
          setTimeout(connect, 300);
        }
      }, { threshold: 0.4 });
      observer.observe(pair);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.canvas-pair').forEach(function (pair, index) {
      initPair(pair, index);
    });
  });
})();
