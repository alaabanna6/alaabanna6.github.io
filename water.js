// Water surface: a pool you can touch. The pointer leaves ripples that bend the
// light on the floor and anything printed under the surface (the hero name).
//
// Accessibility rules this file follows:
//  • The pool shimmers slowly all the time, and ripples answer the pointer.
//    The page's Calm motion button stops all of it.
//  • prefers-reduced-motion, the page's own "calm" mode, high contrast and
//    forced colors all get a still pool and the real HTML text.
//  • The real <h1> never leaves the page. When the water is live it is only
//    made transparent, so screen readers, find in page and selection all work.
//  • The loop stops when the pool is still or off screen (battery, CPU).
//
// Markup:  <div class="water" data-water data-water-text="#hero-name"><canvas></canvas></div>
//          data-water-dark  → lights on a dark surface (contact card)
// API:     window.Water.setCalm(bool) · window.Water.rain()
// No dependencies. Without WebGL the CSS background simply stays as it is.
(function () {
  const MAX = 12;       // ripples alive at once
  const LIFE = 3.4;     // seconds a ripple lives
  const AMBIENT = 4.5;  // seconds of opening swell

  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform float uAmb;uniform float uDark;uniform float uText;uniform float uFade;
uniform vec4 uRip[${MAX}];uniform sampler2D uTex;
// pool caustics: the bright net that light draws on the floor under moving water
float caus(vec2 uv,float t){vec2 p=mod(uv*6.2831853,6.2831853)-250.;vec2 i=p;float c=1.;
 for(int n=0;n<4;n++){float tt=t*(1.-3.5/float(n+1));
  i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
  c+=1./length(vec2(p.x/(sin(i.x+tt)/.005),p.y/(cos(i.y+tt)/.005)));}
 c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
float ink(vec2 p){vec2 uv=p/uRes;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return 0.;return texture2D(uTex,uv).a;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 // surface slope, summed analytically from every ripple (no finite differences)
 vec2 g=vec2(0.);
 for(int i=0;i<${MAX};i++){vec4 R=uRip[i];if(R.w>0.){
   vec2 d=p-R.xy;float r=length(d)+.001;float x=r-R.z*250.;
   float w=1500.+R.z*1400.;
   float env=R.w*exp(-R.z*.95)*exp(-x*x/w)*smoothstep(0.,.12,R.z);
   g+=(d/r)*env*(.105*cos(x*.105)-2.*x/w*sin(x*.105));
 }}
 vec2 a1=vec2(.010,.016),a2=vec2(-.018,.008);
 // The opening swell only makes the floor shimmer and the name breathe a little.
 // It is kept out of the highlights and shadows below: two straight wave fronts
 // lit from the side drew long diagonal streaks across the page.
 vec2 ga=uAmb*1.0*(cos(dot(p,a1)+uTime*1.1)*a1+.7*cos(dot(p,a2)-uTime*.8)*a2);

 g/=1.+length(g)*5.; // many ripples crossing never tear the surface apart
 vec2 L=normalize(vec2(-.45,-.85));
 float s=dot(g,L)*16.;
 float hi=clamp(s,0.,1.),lo=clamp(-s,0.,1.);
 float spec=pow(hi,2.5);
 float cs=caus((p+(g+ga)*240.)/330.,uTime*.45+2.);
 float lines=clamp(cs,0.,1.);
 // the light arrives gradually when the page opens; the name is there from the start
 lines*=uFade;hi*=uFade;lo*=uFade;spec*=uFade;

 vec3 c=vec3(0.);float a=0.;float la;
 if(uDark<.5){
   // light pool: caustic light, a cool shadow on the far side of each wave
   c=vec3(1.)*lines*.8;a=lines*.8;
   // the name, printed on the floor of the pool and bent by the surface
 if(uText>.5){
   vec2 o=(g+ga*.5)*130.;
   float tr=ink(p+o*.82),tg=ink(p+o),tb=ink(p+o*1.2);
   float ta=max(tr,max(tg,tb));
   vec3 inkc=vec3(.067,.067,.078);
   vec3 tc=(vec3(ta)-vec3(tr,tg,tb))+vec3(tr,tg,tb)*inkc;c=tc+c*(1.-ta);a=ta+a*(1.-ta);
 }
   la=lo*.34;c=vec3(.22,.3,1.)*la+c*(1.-la);a=la+a*(1.-la);
   la=clamp(hi*.5+spec*.7,0.,1.);c=vec3(1.)*la+c*(1.-la);a=la+a*(1.-la);
 }else{
   // dark pool: only the light shows
   vec3 tint=mix(vec3(.62,.56,1.),vec3(.55,.9,1.),.5+.5*sin(p.x*.004+p.y*.003));
   la=lines*.2;c=tint*la+c*(1.-la);a=la+a*(1.-la);
   la=clamp(hi*.22+spec*.5,0.,1.);c=mix(tint,vec3(1.),.6)*la+c*(1.-la);a=la+a*(1.-la);
 }
 gl_FragColor=vec4(c,a);
}`;

  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const reduceMq = mq('(prefers-reduced-motion: reduce)');
  const forcedMq = mq('(forced-colors: active)');
  const root = document.documentElement;
  const pools = [];

  // Motion is allowed only when the visitor, their system and the page all agree
  const still = () => reduceMq.matches || forcedMq.matches ||
    root.dataset.motion === 'calm' || root.dataset.contrast === 'more';

  function initGL(canvas) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const sh = (type, src) => {
      const x = gl.createShader(type);
      gl.shaderSource(x, src);
      gl.compileShader(x);
      return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ['uRes', 'uDpr', 'uTime', 'uAmb', 'uDark', 'uText', 'uFade', 'uRip', 'uTex'].forEach(n => { u[n] = gl.getUniformLocation(prog, n); });
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(u.uTex, 0);
    return { gl, u, tex };
  }

  function init(host) {
    const canvas = host.querySelector('canvas');
    if (!canvas) return;
    const glc = initGL(canvas);
    if (!glc) return;
    const { gl, u } = glc;
    const dark = host.hasAttribute('data-water-dark');
    const textEl = host.dataset.waterText ? document.querySelector(host.dataset.waterText) : null;
    const ink2d = document.createElement('canvas');
    const canInk = !!textEl && 'letterSpacing' in CanvasRenderingContext2D.prototype;

    const s = {
      w: 0, h: 0, dpr: 1, rips: [], time: 0, last: 0, raf: 0,
      ambUntil: 0, visible: false, hasInk: false, lost: false,
      px: null, py: null, travelled: 0, fade: 0, started: false,
    };
    const buf = new Float32Array(MAX * 4);

    function size() {
      const r = host.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return;
      if (w === s.w && h === s.h && dpr === s.dpr) return;
      s.w = w; s.h = h; s.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      paintInk();
      draw();
    }

    // Copy the real heading into a texture, word by word, exactly where the
    // browser laid it out, so the still pool is indistinguishable from the HTML.
    function paintInk() {
      s.hasInk = false;
      if (!canInk || !s.w) return;
      const cs = getComputedStyle(textEl);
      const hostRect = host.getBoundingClientRect();
      ink2d.width = canvas.width;
      ink2d.height = canvas.height;
      const ctx = ink2d.getContext('2d');
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000';
      const m = ctx.measureText('Hg');
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      if (!(asc > 0)) return;
      const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        const re = /\S+/g;
        let hit;
        while ((hit = re.exec(node.data))) {
          range.setStart(node, hit.index);
          range.setEnd(node, hit.index + hit[0].length);
          const rect = range.getClientRects()[0];
          if (!rect) continue;
          const baseline = rect.top - hostRect.top + (rect.height - (asc + desc)) / 2 + asc;
          ctx.fillText(hit[0], rect.left - hostRect.left, baseline);
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, glc.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ink2d);
      s.hasInk = true;
    }

    function draw() {
      if (s.lost || !s.w) return;
      const now = performance.now();
      const live = !still();
      const wet = live && s.hasInk;
      // The HTML heading hands over to the water only while the water can show it
      if (textEl) textEl.classList.toggle('is-underwater', wet);
      buf.fill(0);
      if (live) {
        s.rips.forEach((r, i) => {
          const age = (now - r.t) / 1000;
          buf[i * 4] = r.x; buf[i * 4 + 1] = r.y; buf[i * 4 + 2] = age; buf[i * 4 + 3] = r.a;
        });
      }
      // the pool is always gently alive; Calm motion and reduced motion make it still
      const amb = live ? 0.45 : 0;
      gl.uniform2f(u.uRes, s.w, s.h);
      gl.uniform1f(u.uDpr, s.dpr);
      gl.uniform1f(u.uTime, s.time);
      gl.uniform1f(u.uAmb, amb);
      gl.uniform1f(u.uFade, 1); // the water is complete from its first frame
      gl.uniform1f(u.uDark, dark ? 1 : 0);
      gl.uniform1f(u.uText, wet ? 1 : 0);
      gl.uniform4fv(u.uRip, buf);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      host.dataset.drawn = '';
    }

    function tick(now) {
      s.raf = 0;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      s.time += dt;
      s.rips = s.rips.filter(r => now - r.t < LIFE * 1000);
      draw();
      if (s.visible && !still() && !document.hidden) s.raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (s.raf || s.lost || !s.visible || still()) return;
      s.last = performance.now();
      s.raf = requestAnimationFrame(tick);
    }

    function drop(x, y, amp, delay) {
      if (still()) return;
      if (s.rips.length >= MAX) s.rips.shift();
      s.rips.push({ x, y, a: amp, t: performance.now() + (delay || 0) });
      wake();
    }
    function swell() {
      if (still()) return;
      s.ambUntil = performance.now() + AMBIENT * 1000;
      wake();
    }
    function rain() {
      for (let i = 0; i < 7; i++) drop(s.w * (0.1 + 0.8 * Math.random()), s.h * (0.15 + 0.6 * Math.random()), 0.7 + Math.random() * 0.5, i * 170);
      swell();
    }

    // ---- pointer: a trail of small ripples, a bigger one on press ----
    function local(e) {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      return (x < 0 || y < 0 || x > r.width || y > r.height) ? null : { x, y };
    }
    const solid = e => !dark && e.target && e.target.closest && !!e.target.closest('.showcase, .site-header, dialog');
    window.addEventListener('pointermove', e => {
      if (!s.visible || still()) return;
      // the card and the nav bar are solid objects above the water: no ripples under them
      const p = solid(e) ? null : local(e);
      if (!p) { s.px = null; return; }
      if (s.px !== null) {
        const d = Math.hypot(p.x - s.px, p.y - s.py);
        s.travelled += d;
        if (s.travelled > 64) {
          drop(p.x, p.y, Math.min(0.5, 0.2 + d * 0.02));
          s.travelled = 0;
        }
      }
      s.px = p.x; s.py = p.y;
    }, { passive: true });
    window.addEventListener('pointerdown', e => {
      if (!s.visible) return;
      const p = solid(e) ? null : local(e);
      if (p) drop(p.x, p.y, 1.15);
    }, { passive: true });

    // ---- lifecycle ----
    new IntersectionObserver(entries => {
      s.visible = entries[0].isIntersecting;
      if (s.visible) { size(); wake(); }
    }).observe(host);
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(host);
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { paintInk(); draw(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    const refresh = () => { if (still()) { s.rips = []; s.ambUntil = 0; } draw(); wake(); };
    reduceMq.addEventListener('change', refresh);
    forcedMq.addEventListener('change', refresh);
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      s.lost = true;
      if (textEl) textEl.classList.remove('is-underwater');
      canvas.style.display = 'none';
    });

    size();
    // Opening: the water is drawn complete, at once. The page keeps itself
    // hidden until this moment (see the "pre" class in the page head), then
    // everything on it, water included, fades in together as one picture.
    draw();
    requestAnimationFrame(() => { s.visible = true; wake(); });
    if (!dark) {
      const show = () => requestAnimationFrame(() => document.documentElement.classList.remove('pre'));
      // wait for the real font too, so the name does not change shape after it appears
      const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise(r => setTimeout(r, 700))]).then(() => { paintInk(); draw(); show(); });
    }

    pools.push({ refresh, rain, dark });
  }

  function start() { document.querySelectorAll('[data-water]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Water = {
    // Call after changing data-motion / data-contrast on <html>
    refresh() { pools.forEach(p => p.refresh()); },
    rain() { pools.forEach(p => { if (!p.dark) p.rain(); }); },
    get still() { return still(); },
  };
})();
