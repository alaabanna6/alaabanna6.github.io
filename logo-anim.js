// Logo letter animation, shared by every page.
// Structure: outerY → X → innerY → outerRotZ → innerRotZ(letter)
// Every hover plays identical animation; mouse-leave resets invisibly.
// If the logo is clicked mid-animation to go to another page, that page picks the
// animation up from the same moment instead of replaying it from the start.
document.addEventListener('DOMContentLoaded', () => {
  const logoLink = document.getElementById('logo-link');
  if (!logoLink) return;
  const ly1 = document.getElementById('ly1'), lx1 = document.getElementById('lx1');
  const ly2 = document.getElementById('ly2'), lr1 = document.getElementById('lr1'), lr2 = document.getElementById('lr2');
  const ry1 = document.getElementById('ry1'), rx1 = document.getElementById('rx1');
  const ry2 = document.getElementById('ry2'), rr1 = document.getElementById('rr1'), rr2 = document.getElementById('rr2');
  const allSpans = [ly1,lx1,ly2,lr1,lr2,ry1,rx1,ry2,rr1,rr2];
  const STORE_KEY = 'logoAnimElapsed';
  const TOTAL = 1100;
  let animRunning = false, shouldReset = false, startedAt = 0;

  function resetLogo() {
    shouldReset = false;
    allSpans.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  }

  // Same three phases as before, scheduled with delays instead of chained onfinish
  // callbacks so the whole sequence can be started at any point in time.
  function play(offset) {
    animRunning = true;
    shouldReset = false;
    resetLogo();
    startedAt = performance.now() - offset;

    // Measure horizontal distance between the two letter wrappers
    const dist = ry1.getBoundingClientRect().left - ly1.getBoundingClientRect().left;

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
    if (animRunning) { shouldReset = true; } else { resetLogo(); }
  });

  logoLink.addEventListener('mouseenter', () => {
    if (animRunning) return;
    play(0);
  });

  // Leaving the page through the logo: remember how far the animation got
  logoLink.addEventListener('click', () => {
    if (!animRunning || logoLink.pathname === location.pathname) return;
    try { sessionStorage.setItem(STORE_KEY, String(Math.round(performance.now() - startedAt))); } catch (e) {}
  });

  // Arriving from a logo click: continue from that moment
  let resumeAt = null;
  try {
    resumeAt = sessionStorage.getItem(STORE_KEY);
    sessionStorage.removeItem(STORE_KEY);
  } catch (e) {}
  const offset = Number(resumeAt);
  if (resumeAt !== null && offset > 0 && offset < TOTAL) {
    const start = () => play(offset);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
    else start();
  }
});
