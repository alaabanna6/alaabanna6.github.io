(function () {
  function getPreferredTheme() {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark'; // default for first-time visitors (no stored choice yet)
  }

  function spawnParticles(knob) {
    for (var i = 0; i < 3; i++) {
      (function (i) {
        var p = document.createElement('span');
        p.className = 'theme-toggle__particle';
        p.style.animationDelay = (i * 0.1) + 's';
        p.style.animationDuration = (0.5 + i * 0.1) + 's';
        knob.appendChild(p);
        p.addEventListener('animationend', function () {
          p.remove();
        });
      })(i);
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    });
    // Lets other scripts (e.g. cursor-color.js re-resolving its "neutral"
    // black/white pick) react to a live theme flip without theme.js needing
    // to know anything about what they do with it.
    document.dispatchEvent(new Event('themechange'));
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
    document.querySelectorAll('.theme-toggle .theme-toggle__knob').forEach(function (knob) {
      spawnParticles(knob);
    });
  }

  // Exposed so other entry points (e.g. the pull-cord switch) can trigger
  // the exact same theme flip + persistence + particle burst, instead of
  // re-implementing it and risking the two falling out of sync.
  window.__toggleTheme = toggleTheme;

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getPreferredTheme());
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
  });
})();
