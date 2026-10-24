// Logo letter animation, shared by every page.
// Structure: outerY → X → innerY → outerRotZ → innerRotZ(letter)
// Every hover plays identical animation; mouse-leave resets invisibly.
// If the logo is clicked mid-animation to go to another page, that page picks the
// animation up from the same moment instead of replaying it from the start.
// Loaded right after the logo element (not deferred) so a resumed animation is
// already in place on the new page's very first frame.
(function initLogo() {
  const logoLink = document.getElementById('logo-link');
  if (!logoLink) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLogo, { once: true });
    return;
  }
  const ly1 = document.getElementById('ly1'), lx1 = document.getElementById('lx1');
  const ly2 = document.getElementById('ly2'), lr1 = document.getElementById('lr1'), lr2 = document.getElementById('lr2');
  const ry1 = document.getElementById('ry1'), rx1 = document.getElementById('rx1');
  const ry2 = document.getElementById('ry2'), rr1 = document.getElementById('rr1'), rr2 = document.getElementById('rr2');
  const allSpans = [ly1,lx1,ly2,lr1,lr2,ry1,rx1,ry2,rr1,rr2];
  const STORE_KEY = 'logoAnimElapsed';
  const TOTAL = 1100;
  let animRunning = false, shouldReset = false, startedAt = 0, waitForLeave = false, lastDist = 0;

  function resetLogo() {
    shouldReset = false;
    allSpans.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  }

  // Same three phases as before, scheduled with delays instead of chained onfinish
  // callbacks so the whole sequence can be started at any point in time.
  function play(offset, knownDist) {
    animRunning = true;
    shouldReset = false;
    resetLogo();
    startedAt = performance.now() - offset;

    // Measure horizontal distance between the two letter wrappers (a resumed
    // animation reuses the previous page's measurement so it can start before fonts load)
    const dist = knownDist || (ry1.getBoundingClientRect().left - ly1.getBoundingClientRect().left);
    lastDist = dist;

    const E1 = 'cubic-bezier(0.16,1,0.3,1)'; // spring out
    const E2 = 'cubic-bezier(0.37,0,0.63,1)'; // smooth swap
    const anims = [];
    const run = (el, frames, opts) => { anims.push(el.animate(frames, Object.assign({ fill: 'forwards' }, opts))); };

    // Inner letter spin: full 360° CW for first A, CCW for last a
    run(lr2, [{rotate:'0deg'},{rotate:'360deg'}],  {duration:800, easing:E2});
    run(rr2, [{rotate:'0deg'},{rotate:'-360deg'}], {duration:800, easing:E2});

    // Outer rotZ: subtle counter-tilt that creates the "coin-flip" feel
    run(lr1, [{rotate:'0deg'},{rotate:'-15deg'},{rotate:'0deg'}], {duration:800, easing:'ease-in-out'});
    run(rr1, [{rotate:'0deg'},{rotate:'15deg'}, {rotate:'0deg'}], {duration:800, easing:'ease-in-out'});

    // Phase 1 (0→250ms): outer Y arc — first A lifts UP, last a pushes DOWN
    run(ly1, [{transform:'translateY(0px)'},{transform:'translateY(-20px)'}], {duration:250, easing:E1});
    run(ry1, [{transform:'translateY(0px)'},{transform:'translateY(20px)'}],  {duration:250, easing:E1});

    // Phase 2 (250→800ms): horizontal swap
    run(lx1, [{transform:'translateX(0px)'},{transform:`translateX(${dist}px)`}],  {duration:550, delay:250, easing:E2});
    run(rx1, [{transform:'translateX(0px)'},{transform:`translateX(${-dist}px)`}], {duration:550, delay:250, easing:E2});

    // Inner Y: gentle downward arc during the slide to add weight
    run(ly2, [{transform:'translateY(0px)'},{transform:'translateY(6px)'},{transform:'translateY(0px)'}],  {duration:550, delay:250, easing:'ease-in-out'});
    run(ry2, [{transform:'translateY(0px)'},{transform:'translateY(-6px)'},{transform:'translateY(0px)'}], {duration:550, delay:250, easing:'ease-in-out'});

    // Phase 3 (800→1100ms): outer Y arc back down
    run(ly1, [{transform:'translateY(-20px)'},{transform:'translateY(0px)'}], {duration:300, delay:800, easing:E2});
    run(ry1, [{transform:'translateY(20px)'}, {transform:'translateY(0px)'}], {duration:300, delay:800, easing:E2});

    if (offset) anims.forEach(a => { a.currentTime = offset; });

    anims[anims.length - 1].onfinish = () => {
      animRunning = false;
      if (shouldReset || !logoLink.matches(':hover')) resetLogo();
    };
  }

  logoLink.addEventListener('mouseleave', () => {
    waitForLeave = false;
    if (animRunning) { shouldReset = true; } else { resetLogo(); }
  });

  logoLink.addEventListener('mouseenter', () => {
    if (animRunning || waitForLeave) return;
    play(0);
  });

  // Leaving the page through the logo: remember how far the animation got
  // (a finished animation counts as TOTAL, so the next page doesn't replay it)
  let leavingViaLogo = false;
  function saveProgress() {
    const elapsed = animRunning ? Math.round(performance.now() - startedAt) : TOTAL;
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ t: elapsed, dist: lastDist })); } catch (e) {}
  }
  logoLink.addEventListener('click', () => {
    if (logoLink.pathname === location.pathname) return;
    leavingViaLogo = true;
    saveProgress();
  });
  // The page keeps animating for a frame or two after the click while the next page
  // loads, so save again at the moment it actually goes away to hand off exactly.
  window.addEventListener('pagehide', () => { if (leavingViaLogo) saveProgress(); });

  // Arriving from a logo click: continue from that moment
  let resumeAt = null;
  try {
    resumeAt = sessionStorage.getItem(STORE_KEY);
    sessionStorage.removeItem(STORE_KEY);
  } catch (e) {}
  let saved = null;
  try { saved = JSON.parse(resumeAt); } catch (e) {}
  const offset = saved && typeof saved === 'object' ? Number(saved.t) : Number(saved);
  const savedDist = saved && typeof saved === 'object' ? Number(saved.dist) : 0;

  // The homepage menu bar starts hidden for its intro entrance and only gets revealed
  // once intro.js runs, a couple of frames after the page is first drawn. Arriving via
  // a logo click skips the intro, so reveal the bar right now, before the first frame.
  if (resumeAt !== null) {
    const header = logoLink.closest('header');
    if (header && header.classList.contains('spawn-target')) {
      header.style.transition = 'none';
      header.classList.add('is-visible');
      void header.offsetWidth;
      header.style.transition = '';
    }
  }

  if (resumeAt !== null && offset > 0 && offset < TOTAL) {
    waitForLeave = true;
    if (savedDist) {
      play(offset, savedDist);
    } else {
      const start = () => play(offset);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
      else start();
    }
  } else if (resumeAt !== null && offset >= TOTAL) {
    // Already played before the click: stay still until the mouse leaves the name
    waitForLeave = true;
  }
})();
