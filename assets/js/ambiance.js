/* Ambiance sonore de balade, générée en direct (aucun fichier audio) :
   vent, feuillage, oiseaux, clapotis du lac, rumeur de la ville.
   Démarre uniquement après un geste du visiteur. Le mélange suit la section affichée. */
window.APDC_AMBIANCE = (() => {
  let ctx = null, maitre = null, couches = {}, oiseauxNiv = 0, minuteurOiseaux = 0, on = false, sceneActuelle = 'foret';
  const SCENES = {
    foret: { vent: 0.55, feuilles: 0.6, lac: 0, rumeur: 0, oiseaux: 1 },
    lac: { vent: 0.35, feuilles: 0.15, lac: 1, rumeur: 0, oiseaux: 0.35 },
    campagne: { vent: 0.7, feuilles: 0.3, lac: 0, rumeur: 0, oiseaux: 0.8 },
    ville: { vent: 0.2, feuilles: 0.05, lac: 0.15, rumeur: 0.8, oiseaux: 0.2 },
  };

  const tampon = (couleur) => {
    const n = ctx.sampleRate * 4, b = ctx.createBuffer(1, n, ctx.sampleRate), data = b.getChannelData(0);
    let dernier = 0;
    for (let i = 0; i < n; i++) {
      const blanc = Math.random() * 2 - 1;
      if (couleur === 'brun') { dernier = (dernier + 0.02 * blanc) / 1.02; data[i] = dernier * 3.5; } else data[i] = blanc * 0.5;
    }
    return b;
  };
  const source = (couleur) => { const s = ctx.createBufferSource(); s.buffer = tampon(couleur); s.loop = true; s.start(); return s; };
  const lfo = (freq, ampli, cible, base) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = ampli; o.connect(g).connect(cible);
    if (base !== undefined) cible.value = base;
    o.start(); return o;
  };

  const construire = () => {
    maitre = ctx.createGain(); maitre.gain.value = 0; maitre.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(maitre);

    const mk = (nom, couleur, filtres, niveau) => {
      const s = source(couleur);
      let n = s;
      filtres.forEach(f => { n.connect(f); n = f; });
      const mod = ctx.createGain(); mod.gain.value = 1;
      const g = ctx.createGain(); g.gain.value = 0;
      n.connect(mod).connect(g).connect(comp);
      couches[nom] = { g, mod, niveau };
    };
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6;
    mk('vent', 'brun', [bp], 0.55);
    lfo(0.07, 260, bp.frequency, 520);
    lfo(0.11, 0.35, couches.vent.mod.gain, 0.75);

    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2800;
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 5200; pk.gain.value = 5;
    mk('feuilles', 'blanc', [hp, pk], 0.05);
    lfo(0.23, 0.6, couches.feuilles.mod.gain, 0.5);

    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    mk('lac', 'brun', [lp], 0.5);
    lfo(0.16, 0.7, couches.lac.mod.gain, 0.45);
    lfo(0.31, 0.25, couches.lac.mod.gain);

    const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 180;
    mk('rumeur', 'brun', [lp2], 0.45);
  };

  const chant = () => {
    if (!on || !ctx) return;
    if (oiseauxNiv > 0.05 && Math.random() < 0.85) {
      const t = ctx.currentTime + 0.05;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const g = ctx.createGain(); g.gain.value = 0;
      const o = ctx.createOscillator(); o.type = 'sine';
      const base = 2400 + Math.random() * 2200, notes = 2 + Math.floor(Math.random() * 4), vol = 0.035 * oiseauxNiv;
      for (let k = 0; k < notes; k++) {
        const t0 = t + k * (0.09 + Math.random() * 0.06);
        o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t0);
        o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), t0 + 0.045);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.08);
      }
      if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; o.connect(g).connect(pan).connect(maitre); } else o.connect(g).connect(maitre);
      o.start(t); o.stop(t + notes * 0.16 + 0.2);
    }
    minuteurOiseaux = setTimeout(chant, 900 + Math.random() * 3200);
  };

  const scene = (nom) => {
    sceneActuelle = SCENES[nom] ? nom : 'foret';
    if (!ctx) return;
    const s = SCENES[sceneActuelle], t = ctx.currentTime;
    Object.keys(couches).forEach(k => {
      const c = couches[k];
      c.g.gain.cancelScheduledValues(t);
      c.g.gain.setTargetAtTime(s[k] * c.niveau, t, 1.2);
    });
    oiseauxNiv = s.oiseaux;
  };

  const demarrer = () => {
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ctx = new AC(); construire(); }
      if (ctx.state === 'suspended') ctx.resume();
      on = true;
      maitre.gain.cancelScheduledValues(ctx.currentTime);
      maitre.gain.setTargetAtTime(0.8, ctx.currentTime, 0.8);
      scene(sceneActuelle);
      clearTimeout(minuteurOiseaux); chant();
      return true;
    } catch (e) { on = false; return false; }
  };
  const arreter = () => {
    on = false; clearTimeout(minuteurOiseaux);
    if (ctx && maitre) { maitre.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 1600); }
  };
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); });

  return { demarrer, arreter, scene, basculer: () => (on ? (arreter(), false) : demarrer()), actif: () => on };
})();
