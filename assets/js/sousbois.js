/* Le sous-bois : lumière tachetée qui passe à travers le feuillage, bouge avec le vent et suit le curseur.
   WebGL (OGL). Sans WebGL, ou en mode calme, une version CSS prend le relais. */
(() => {
  const d = document;
  const lancer = () => {
    const etat = window.APDC_ETAT || {};
    const toiles = d.querySelectorAll('canvas[data-sousbois]');
    if (!toiles.length) return;
    if (etat.calme || !window.OGL) { toiles.forEach(c => c.remove()); return; }
    const { Renderer, Program, Mesh, Triangle } = window.OGL;

    const vertex = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`;
    const fragment = `precision highp float;
      uniform float uTime; uniform vec2 uRes; uniform vec2 uSouris; uniform float uForce;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float bruit(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * bruit(p); p = p * 2.02 + 3.1; a *= .5; } return v; }
      void main(){
        vec2 asp = vec2(uRes.x / uRes.y, 1.);
        vec2 p = vUv * asp * 3.4;
        float t = uTime * .05;
        vec2 vent = vec2(fbm(p * .6 + t * 1.3), fbm(p * .6 - t)) * .9;
        float feuillage = fbm(p + vent + vec2(t * 1.4, -t * .5));
        float taches = smoothstep(.60, .74, feuillage);
        taches *= .55 + .45 * smoothstep(0., 1., vUv.y);
        float ds = distance(vUv * asp, uSouris * asp);
        float halo = smoothstep(.55, 0., ds) * uForce;
        float rayons = pow(max(0., 1. - abs(vUv.x * .8 + vUv.y * .5 - .9 - sin(t * 3.) * .05)), 9.) * .25;
        vec3 chaud = vec3(1., .80, .50);
        vec3 col = chaud * (taches * .42 + halo * .16 + taches * halo * .55 + rayons);
        gl_FragColor = vec4(col, 1.);
      }`;

    toiles.forEach(toile => {
      let renderer;
      try {
        renderer = new Renderer({ canvas: toile, dpr: 0.5, alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: 'low-power' });
      } catch (e) { toile.remove(); return; }
      const gl = renderer.gl;
      if (!gl) { toile.remove(); return; }
      const css = toile.parentElement.querySelector('.sousbois-css');
      if (css) css.style.display = 'none';
      const programme = new Program(gl, {
        vertex, fragment,
        uniforms: { uTime: { value: 0 }, uRes: { value: [1, 1] }, uSouris: { value: [0.6, 0.6] }, uForce: { value: 0 } },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program: programme });
      const taille = () => {
        const r = toile.getBoundingClientRect();
        renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
        programme.uniforms.uRes.value = [r.width, r.height];
      };
      taille();
      window.addEventListener('resize', taille);
      const cible = { x: 0.6, y: 0.6, f: 0 }, actuel = { x: 0.6, y: 0.6, f: 0 };
      const hote = toile.parentElement;
      hote.addEventListener('pointermove', e => {
        const r = toile.getBoundingClientRect();
        cible.x = (e.clientX - r.left) / r.width;
        cible.y = 1 - (e.clientY - r.top) / r.height;
        cible.f = 1;
      });
      hote.addEventListener('pointerleave', () => { cible.f = 0; });
      let visible = true, raf = 0;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(boucle); }).observe(toile);
      }
      const t0 = performance.now();
      function boucle(now) {
        raf = 0;
        if (!visible || d.hidden) return;
        actuel.x += (cible.x - actuel.x) * 0.06;
        actuel.y += (cible.y - actuel.y) * 0.06;
        actuel.f += (cible.f - actuel.f) * 0.04;
        programme.uniforms.uTime.value = (now - t0) / 1000;
        programme.uniforms.uSouris.value = [actuel.x, actuel.y];
        programme.uniforms.uForce.value = actuel.f;
        renderer.render({ scene: mesh });
        raf = requestAnimationFrame(boucle);
      }
      d.addEventListener('visibilitychange', () => { if (!d.hidden && visible && !raf) raf = requestAnimationFrame(boucle); });
      raf = requestAnimationFrame(boucle);
    });
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', lancer); else lancer();
})();
