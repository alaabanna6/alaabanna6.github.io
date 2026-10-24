// Same logo hover animation as index.html (kept in sync by hand).
// Structure: outerY → X → innerY → outerRotZ → innerRotZ(letter)
// Every hover plays identical animation; mouse-leave resets invisibly
document.addEventListener('DOMContentLoaded', () => {
  const logoLink = document.getElementById('logo-link');
  if (!logoLink) return;
  const ly1 = document.getElementById('ly1'), lx1 = document.getElementById('lx1');
  const ly2 = document.getElementById('ly2'), lr1 = document.getElementById('lr1'), lr2 = document.getElementById('lr2');
  const ry1 = document.getElementById('ry1'), rx1 = document.getElementById('rx1');
  const ry2 = document.getElementById('ry2'), rr1 = document.getElementById('rr1'), rr2 = document.getElementById('rr2');
  const allSpans = [ly1,lx1,ly2,lr1,lr2,ry1,rx1,ry2,rr1,rr2];
  let animRunning = false, shouldReset = false;

  function resetLogo() {
    shouldReset = false;
    allSpans.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  }

  logoLink.addEventListener('mouseleave', () => {
    if (animRunning) { shouldReset = true; } else { resetLogo(); }
  });

  logoLink.addEventListener('mouseenter', () => {
    if (animRunning) return;
    animRunning = true;
    shouldReset = false;
    resetLogo(); // start clean every time

    // Measure horizontal distance between the two letter wrappers
    const dist = ry1.getBoundingClientRect().left - ly1.getBoundingClientRect().left;

    const E1 = 'cubic-bezier(0.16,1,0.3,1)'; // spring out
    const E2 = 'cubic-bezier(0.37,0,0.63,1)'; // smooth swap

    // Inner letter spin: full 360° CW for first A, CCW for last a
    lr2.animate([{rotate:'0deg'},{rotate:'360deg'}],   {duration:800, easing:E2, fill:'forwards'});
    rr2.animate([{rotate:'0deg'},{rotate:'-360deg'}],  {duration:800, easing:E2, fill:'forwards'});

    // Outer rotZ: subtle counter-tilt that creates the "coin-flip" feel
    lr1.animate([{rotate:'0deg'},{rotate:'-15deg'},{rotate:'0deg'}], {duration:800, easing:'ease-in-out', fill:'forwards'});
    rr1.animate([{rotate:'0deg'},{rotate:'15deg'}, {rotate:'0deg'}], {duration:800, easing:'ease-in-out', fill:'forwards'});

    // Phase 1 (0→250ms): outer Y arc — first A lifts UP, last a pushes DOWN
    const p1f = ly1.animate([{transform:'translateY(0px)'},{transform:'translateY(-20px)'}], {duration:250, easing:E1, fill:'forwards'});
                ry1.animate([{transform:'translateY(0px)'},{transform:'translateY(20px)'}],  {duration:250, easing:E1, fill:'forwards'});

    p1f.onfinish = () => {
      // Phase 2 (250→800ms): horizontal swap
      const p2f = lx1.animate([{transform:'translateX(0px)'},{transform:`translateX(${dist}px)`}],  {duration:550, easing:E2, fill:'forwards'});
                  rx1.animate([{transform:'translateX(0px)'},{transform:`translateX(${-dist}px)`}], {duration:550, easing:E2, fill:'forwards'});

      // Inner Y: gentle downward arc during the slide to add weight
      ly2.animate([{transform:'translateY(0px)'},{transform:'translateY(6px)'},{transform:'translateY(0px)'}], {duration:550, easing:'ease-in-out', fill:'forwards'});
      ry2.animate([{transform:'translateY(0px)'},{transform:'translateY(-6px)'},{transform:'translateY(0px)'}], {duration:550, easing:'ease-in-out', fill:'forwards'});

      p2f.onfinish = () => {
        // Phase 3 (800→1100ms): outer Y arc back down
        const p3f = ly1.animate([{transform:'translateY(-20px)'},{transform:'translateY(0px)'}], {duration:300, easing:E2, fill:'forwards'});
                    ry1.animate([{transform:'translateY(20px)'}, {transform:'translateY(0px)'}], {duration:300, easing:E2, fill:'forwards'});

        p3f.onfinish = () => {
          animRunning = false;
          if (shouldReset) resetLogo();
        };
      };
    };
  });
});
