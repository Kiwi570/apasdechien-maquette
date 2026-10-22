/* À pas de chien — fonctionnalités propres aux pages :
   prochain cours, planning, calculateur, demande de bilan, témoignages, galeries,
   sections horizontales, parcours, balle, herbes, feuilles, carte, horloge, figures. */
(() => {
  const d = document;
  const E = window.APDC_ETAT || { calme: true, tactile: true, ok: false };
  const G = window.gsap, ST = window.ScrollTrigger;
  const ok = E.ok;
  const calme = E.calme;
  const DATA = window.APDC || { cours: [], tarifs: {}, temoignages: [] };
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const chf = n => `CHF ${n}.–`;
  const visible = (el, cb, opts) => {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(([en]) => cb(en.isIntersecting), opts || { rootMargin: '80px' }).observe(el);
  };

  /* ---------- prochain cours (heure de Lausanne) ---------- */
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const maintenant = () => {
    try {
      const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
      return { jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: (+p.hour % 24) * 60 + +p.minute };
    } catch (e) { const n = new Date(); return { jour: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; }
  };
  const enMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const heure = h => { const [a, b] = h.split(':').map(Number); return b ? `${a} h ${String(b).padStart(2, '0')}` : `${a} h`; };
  const prochain = () => {
    const n = maintenant(), now = n.jour * 1440 + n.min;
    let best = null;
    DATA.cours.forEach(c => {
      const deb = c.jour * 1440 + enMin(c.debut), fin = c.jour * 1440 + enMin(c.fin);
      if (now >= deb && now < fin) { best = { c, enCours: true, delta: 0, reste: fin - now }; return; }
      const delta = (deb - now + 10080) % 10080;
      if (!best || (!best.enCours && delta < best.delta)) best = best && best.enCours ? best : { c, enCours: false, delta };
    });
    return { best, jour: n.jour };
  };
  const formatDelta = m => {
    const j = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    if (j > 0) return `dans ${j} j ${h} h`;
    if (h > 0) return `dans ${h} h ${String(mi).padStart(2, '0')}`;
    return `dans ${mi} min`;
  };
  const majProchain = () => {
    const { best, jour } = prochain();
    if (!best) return;
    const c = best.c, quand = `${JOURS[c.jour]} ${heure(c.debut)}`;
    $$('[data-prochain-nom]').forEach(el => { el.textContent = `${c.nom} · ${quand}`; });
    $$('[data-prochain-decompte]').forEach(el => { el.textContent = best.enCours ? `en cours, encore ${best.reste} min` : formatDelta(best.delta); });
    $$('[data-prochain-court]').forEach(el => { el.textContent = best.enCours ? `En ce moment : ${c.nom.toLowerCase()}` : `Prochain cours : ${quand}, ${c.nom.toLowerCase()} · ${formatDelta(best.delta)}`; });
    $$('[data-prochain-pastille]').forEach(el => { el.dataset.etat = best.enCours ? 'encours' : 'avenir'; });
    $$('[data-planning]').forEach(pl => {
      $$('.jour', pl).forEach(j => j.classList.toggle('aujourdhui', +j.dataset.jour === jour));
      $$('.creneau', pl).forEach(cr => cr.classList.toggle('prochain', cr.dataset.creneau === `${c.jour}-${c.debut}`));
    });
  };
  if (DATA.cours.length) { majProchain(); setInterval(majProchain, 30000); }
  if (ok && !calme) $$('[data-planning]').forEach(pl => G.from($$('.creneau', pl), { scaleY: 0, autoAlpha: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(2)', scrollTrigger: { trigger: pl, start: 'top 80%', once: true } }));

  /* ---------- calculateur de budget ---------- */
  const calc = $('[data-calcul]');
  if (calc) {
    const T = DATA.tarifs;
    const q = { bilan: 1, abo8: 1, groupe: 0, suivi: 0 };
    const prix = { bilan: T.bilan, abo8: T.abo8, groupe: T.groupe, suivi: T.suivi };
    const total = $('[data-total]', calc), info = $('[data-calc-info]', calc);
    let affiche = 0;
    const maj = () => {
      Object.keys(q).forEach(k => { const o = $(`[data-q="${k}"]`, calc); if (o) o.textContent = q[k]; });
      const t = Object.keys(q).reduce((s, k) => s + q[k] * prix[k], 0);
      if (ok && !calme) { const o = { v: affiche }; G.to(o, { v: t, duration: 0.5, ease: 'power2.out', onUpdate: () => { total.textContent = chf(Math.round(o.v)); } }); } else total.textContent = chf(t);
      affiche = t;
      let msg = '';
      if (q.groupe >= 7 && q.abo8 === 0) msg = `À partir de 7 cours, l'abonnement de 8 cours (${chf(T.abo8)}) revient moins cher.`;
      else if (q.abo8 > 0) msg = `Avec l'abonnement, un cours en groupe revient à ${chf(T.abo8 / 8)} au lieu de ${chf(T.groupe)}.`;
      info.textContent = msg;
    };
    calc.addEventListener('click', e => {
      const p = e.target.closest('[data-plus]'), m = e.target.closest('[data-moins]');
      if (p) q[p.dataset.plus] = Math.min(20, q[p.dataset.plus] + 1);
      if (m) q[m.dataset.moins] = Math.max(0, q[m.dataset.moins] - 1);
      if (p || m) maj();
    });
    maj();
  }

  /* ---------- demande de bilan simulée ---------- */
  $$('[data-demande]').forEach(form => {
    const etapes = $$('fieldset[data-etape]', form);
    const puces = $$('.demande-etapes li', form);
    const prec = $('[data-prec]', form), suiv = $('[data-suiv]', form), env = $('[data-envoyer]', form);
    const succes = $('[data-succes]', form), actions = $('[data-actions]', form);
    let i = 0;
    const montrer = n => {
      etapes.forEach((f, k) => { f.hidden = k !== n; });
      puces.forEach((p, k) => { p.classList.toggle('actif', k === n); p.classList.toggle('fait-ok', k < n); });
      prec.hidden = n === 0; suiv.hidden = n === etapes.length - 1; env.hidden = n !== etapes.length - 1;
      if (n === etapes.length - 1) recap();
      if (ok && !calme) G.from(etapes[n], { x: 30, autoAlpha: 0, duration: 0.5, ease: 'expo.out' });
      const premier = etapes[n].querySelector('input, textarea');
      if (premier && n > 0) premier.focus({ preventScroll: true });
      i = n;
    };
    const err = (champ, on) => { const e = champ.closest('.champ') && champ.closest('.champ').querySelector('.erreur'); if (e) e.hidden = !on; champ.setAttribute('aria-invalid', on ? 'true' : 'false'); };
    const valider = n => {
      if (n === 0) { const c = form.elements.chien; const bon = c.value.trim().length > 0; err(c, !bon); if (!bon) c.focus(); return bon; }
      if (n === 3) {
        const p = form.elements.prenom, t = form.elements.tel, m = form.elements.email, a = form.elements.accord;
        const bonP = p.value.trim().length > 0; err(p, !bonP);
        const bonContact = /^[+\d][\d\s.]{7,}$/.test(t.value.trim()) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.value.trim()); err(m, !bonContact);
        const ea = $('[data-err-accord]', form); ea.hidden = a.checked;
        const premier = !bonP ? p : !bonContact ? m : !a.checked ? a : null;
        if (premier) premier.focus();
        return !premier;
      }
      return true;
    };
    const recap = () => {
      const f = form.elements;
      const besoins = $$('input[name="besoin"]:checked', form).map(x => x.value);
      const dispos = $$('input[name="dispo"]:checked', form).map(x => x.value);
      const age = (form.querySelector('input[name="age"]:checked') || {}).value || '';
      $('[data-recap]', form).innerHTML = `<strong>Récapitulatif</strong>
        <span>Chien : ${esc(f.chien.value || '…')} · ${esc(age)}${f.race.value ? ' · ' + esc(f.race.value) : ''}</span>
        <span>Besoin : ${besoins.length ? besoins.map(esc).join(', ') : 'à préciser avec Anne'}</span>
        <span>Disponibilités : ${dispos.length ? dispos.length + ' créneau' + (dispos.length > 1 ? 'x' : '') : 'à convenir'}</span>
        <span>Premier rendez-vous : bilan à domicile, 1 h 30, ${chf(DATA.tarifs.bilan)}</span>`;
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    suiv.addEventListener('click', () => { if (valider(i)) montrer(Math.min(etapes.length - 1, i + 1)); });
    prec.addEventListener('click', () => montrer(Math.max(0, i - 1)));
    form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && i < etapes.length - 1) { e.preventDefault(); suiv.click(); } });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!valider(3)) return;
      etapes.forEach(f => { f.hidden = true; });
      actions.hidden = true;
      $('[data-succes-chien]', form).textContent = form.elements.chien.value.trim() || 'votre chien';
      succes.hidden = false;
      succes.focus();
      puces.forEach(p => p.classList.add('fait-ok'));
      if (ok && !calme) G.fromTo($('.tampon', succes), { scale: 2.4, rotate: -30, autoAlpha: 0 }, { scale: 1, rotate: -8, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.2)' });
    });
    $('[data-recommencer]', form).addEventListener('click', () => { form.reset(); succes.hidden = true; actions.hidden = false; puces.forEach(p => p.classList.remove('fait-ok')); montrer(0); });
    montrer(0);
    if (ok && !calme) G.set(etapes[0], { clearProps: 'all' });
  });

  /* ---------- témoignages en pile ---------- */
  const pile = $('[data-pile]');
  if (pile) {
    let cartes = $$('[data-avis]', pile);
    const n = cartes.length, compte = $('[data-pile-compte]');
    let index = 0;
    const ranger = (anim = true) => {
      cartes.forEach((c, k) => {
        const pos = cartes.length - 1 - k;
        const props = { y: pos * 14, rotate: pos === 0 ? 0 : (pos % 2 ? -3 : 2.5) * Math.min(pos, 2), scale: 1 - pos * 0.04, zIndex: k + 1, autoAlpha: pos > 3 ? 0 : 1 };
        if (ok && anim && !calme) G.to(c, { ...props, duration: 0.6, ease: 'expo.out' }); else if (ok) G.set(c, props);
        c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      });
      if (compte) compte.textContent = `${index + 1} / ${n}`;
    };
    const suivant = (dir = 1) => {
      if (n < 2) {
        const c = cartes[cartes.length - 1];
        if (ok && !calme) G.fromTo(c, { x: 0 }, { keyframes: [{ x: dir * 24, duration: 0.12 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }] });
        return;
      }
      const haut = cartes[cartes.length - 1];
      const fin = () => {
        if (dir > 0) { cartes.pop(); cartes.unshift(haut); pile.prepend(haut); index = (index + 1) % n; }
        else { const bas = cartes.shift(); cartes.push(bas); pile.append(bas); index = (index - 1 + n) % n; }
        if (ok) G.set(haut, { x: 0 });
        ranger();
      };
      if (ok && !calme && dir > 0) G.to(haut, { x: 520, rotate: 18, autoAlpha: 0, duration: 0.45, ease: 'power2.in', onComplete: fin }); else fin();
    };
    const bp = $('[data-pile-prec]'), bs = $('[data-pile-suiv]');
    if (n < 2) { const nav = $('.pile-nav'); nav && nav.setAttribute('data-seul', ''); }
    bp && bp.addEventListener('click', () => suivant(-1));
    bs && bs.addEventListener('click', () => suivant(1));
    pile.addEventListener('pointerdown', e => {
      const haut = cartes[cartes.length - 1];
      if (!haut.contains(e.target) || !ok) return;
      const x0 = e.clientX;
      haut.setPointerCapture(e.pointerId);
      const bouger = ev => G.set(haut, { x: ev.clientX - x0, rotate: (ev.clientX - x0) / 24 });
      const lacher = ev => {
        haut.removeEventListener('pointermove', bouger);
        haut.removeEventListener('pointerup', lacher);
        haut.removeEventListener('pointercancel', lacher);
        const dx = ev.clientX - x0;
        if (Math.abs(dx) > 110 && n > 1) suivant(1);
        else G.to(haut, { x: 0, rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      };
      haut.addEventListener('pointermove', bouger);
      haut.addEventListener('pointerup', lacher);
      haut.addEventListener('pointercancel', lacher);
    });
    ranger(false);
  }

  /* ---------- bande de photos ---------- */
  const bande = $('[data-bande]');
  if (bande && ok) {
    const piste = $('.bande-piste', bande);
    if (calme) { bande.style.overflowX = 'auto'; }
    else {
      piste.innerHTML += piste.innerHTML;
      $$('[data-flair]', piste).slice(piste.children.length / 2).forEach(f => { f.setAttribute('aria-hidden', 'true'); $$('img', f).forEach(i => { i.alt = ''; }); });
      const largeur = () => piste.scrollWidth / 2;
      const tw = G.to(piste, { x: () => -largeur(), duration: 60, ease: 'none', repeat: -1, modifiers: { x: x => `${parseFloat(x) % largeur()}px` } });
      let vitesse = 1;
      ST.create({ trigger: bande, start: 'top bottom', end: 'bottom top', onUpdate: s => { vitesse = 1 + Math.min(6, Math.abs(s.getVelocity()) / 300); } });
      G.ticker.add(() => { const cible = bande.matches(':hover') ? 0.15 : vitesse; tw.timeScale(tw.timeScale() + (cible - tw.timeScale()) * 0.08); vitesse += (1 - vitesse) * 0.05; });
      visible(bande, v => (v ? tw.play() : tw.pause()));
      // attraper la bande au doigt
      let x0 = 0, t0 = 0, glisse = false;
      bande.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; glisse = true; x0 = e.clientX; t0 = tw.totalTime(); });
      bande.addEventListener('pointermove', e => { if (!glisse) return; tw.totalTime(Math.max(0, t0 - (e.clientX - x0) / (largeur() / 60))); });
      bande.addEventListener('pointerup', () => { glisse = false; });
    }
  }

  /* ---------- sections horizontales épinglées ---------- */
  $$('[data-horizontal]').forEach(sec => {
    const piste = $('[data-piste]', sec), barre = $('[data-progression]', sec);
    const tuiles = $$('.tuile', piste);
    const dessinerTrajet = (t, on) => {
      const p = t.querySelector('[data-trajet]');
      if (!p || !ok) return;
      const L = p.getTotalLength();
      if (calme) { p.style.strokeDasharray = 'none'; return; }
      G.to(p, { strokeDashoffset: on ? 0 : L, duration: on ? 1.6 : 0.4, ease: on ? 'power2.inOut' : 'power1.in', overwrite: true });
    };
    $$('[data-trajet]', piste).forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = calme ? 0 : L; });
    if (!ok || calme || window.innerWidth < 900) {
      tuiles.forEach(t => visible(t, v => dessinerTrajet(t, v), { threshold: 0.55 }));
      if (barre && ok) piste.addEventListener('scroll', () => { barre.style.transform = `scaleX(${piste.scrollLeft / Math.max(1, piste.scrollWidth - piste.clientWidth)})`; }, { passive: true });
      return;
    }
    const distance = () => Math.max(0, piste.scrollWidth - window.innerWidth);
    const anim = G.to(piste, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: sec, start: 'top top', end: () => '+=' + distance(), pin: true, pinType: 'transform', scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: s => {
          if (barre) barre.style.transform = `scaleX(${s.progress})`;
          const k = Math.round(s.progress * (tuiles.length - 1));
          const amb = tuiles[k] && tuiles[k].dataset.ambianceTuile;
          if (amb && window.APDC_AMBIANCE) window.APDC_AMBIANCE.scene(amb);
        },
      },
    });
    tuiles.forEach(t => {
      ST.create({ trigger: t, containerAnimation: anim, start: 'left 70%', end: 'right 20%', onToggle: s => dessinerTrajet(t, s.isActive) });
      const v = t.querySelector('.visuel img');
      if (v) G.fromTo(v, { scale: 1.18, xPercent: -6 }, { scale: 1.02, xPercent: 6, ease: 'none', scrollTrigger: { trigger: t, containerAnimation: anim, start: 'left right', end: 'right left', scrub: true } });
    });
  });

  /* ---------- parcours en trois étapes ---------- */
  const etapes = $('[data-etapes]');
  if (etapes && ok) {
    const cartesE = $$('[data-etape-parcours]', etapes);
    const trace = $('[data-etapes-trace]', etapes);
    const L = trace.getTotalLength();
    trace.style.strokeDasharray = `${L}`;
    trace.style.strokeDashoffset = calme ? 0 : L;
    if (calme) cartesE.forEach(c => c.classList.add('is-active'));
    else ST.create({
      trigger: etapes, start: 'top 75%', end: 'bottom 55%', scrub: 0.5,
      onUpdate: s => {
        trace.style.strokeDashoffset = L * (1 - s.progress);
        cartesE.forEach((c, k) => c.classList.toggle('is-active', s.progress >= k / cartesE.length - 0.02));
      },
    });
  }

  /* ---------- portrait d'Anne révélé par un trait ---------- */
  const pinceau = $('[data-pinceau]');
  if (pinceau && ok && !calme) {
    pinceau.style.webkitMaskImage = pinceau.style.maskImage = 'linear-gradient(105deg, #000 45%, transparent 55%)';
    pinceau.style.webkitMaskSize = pinceau.style.maskSize = '320% 100%';
    const o = { p: 100 };
    const set = () => { pinceau.style.webkitMaskPosition = pinceau.style.maskPosition = `${o.p}% 0`; };
    set();
    ST.create({ trigger: pinceau, start: 'top 80%', once: true, onEnter: () => G.to(o, { p: 0, duration: 1.8, ease: 'power2.inOut', onUpdate: set, onComplete: () => { pinceau.style.webkitMaskImage = pinceau.style.maskImage = 'none'; } }) });
    G.fromTo($('img', pinceau), { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: pinceau, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- la balle qu'on lance dans l'ouverture ---------- */
  const toileBalles = $('[data-balles]');
  if (toileBalles) {
    const hero = toileBalles.closest('[data-hero]');
    const ctx = toileBalles.getContext('2d');
    const bouton = $('[data-lancer]');
    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const balles = [];
    const taille = () => { const r = hero.getBoundingClientRect(); W = r.width; H = r.height; toileBalles.width = W * dpr; toileBalles.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    taille(); window.addEventListener('resize', taille);
    let raf = 0, tPrec = 0;
    const R = 15;
    const dessiner = b => {
      const sol = H - 22;
      const haut = Math.max(0, Math.min(1, (sol - b.y) / 400));
      ctx.fillStyle = `rgba(0,0,0,${0.28 - haut * 0.2})`;
      ctx.beginPath(); ctx.ellipse(b.x, sol + R - 2, R * (1 - haut * 0.5), 4 * (1 - haut * 0.5), 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = b.alpha; ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      ctx.fillStyle = '#F2BF1A'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.beginPath(); ctx.arc(3, 3, R - 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-R * 1.25, 0, R * 0.95, -0.7, 0.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(R * 1.25, 0, R * 0.95, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke();
      ctx.restore();
    };
    const pas = now => {
      raf = 0;
      const dt = Math.min(0.033, (now - (tPrec || now)) / 1000); tPrec = now;
      ctx.clearRect(0, 0, W, H);
      const sol = H - 22 - R;
      for (let k = balles.length - 1; k >= 0; k--) {
        const b = balles[k];
        if (b.rappel) {
          b.t += dt / 0.9;
          const t = Math.min(1, b.t), e = t * (2 - t);
          b.x = b.x0 + (b.cx - b.x0) * e; b.y = b.y0 + (b.cy - b.y0) * e - Math.sin(Math.PI * t) * 120; b.rot -= 0.2; b.alpha = 1 - Math.max(0, t - 0.75) * 4;
          if (t >= 1) { balles.splice(k, 1); continue; }
        } else {
          b.vy += 2300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt / R;
          if (b.y > sol) { b.y = sol; b.vy *= -0.62; b.vx *= 0.86; if (Math.abs(b.vy) < 60) b.vy = 0; }
          if (b.x < R) { b.x = R; b.vx *= -0.7; } if (b.x > W - R) { b.x = W - R; b.vx *= -0.7; }
          if (b.y >= sol && Math.abs(b.vx) < 12 && b.vy === 0) { b.repos += dt; b.vx *= 0.9; } else b.repos = 0;
          if (b.repos > 1.4) {
            b.rappel = true; b.t = 0; b.x0 = b.x; b.y0 = b.y;
            const r = (bouton || hero).getBoundingClientRect(), rh = hero.getBoundingClientRect();
            b.cx = r.left - rh.left + 10; b.cy = r.top - rh.top + r.height / 2;
          }
        }
        dessiner(b);
      }
      if (balles.length) raf = requestAnimationFrame(pas); else { ctx.clearRect(0, 0, W, H); tPrec = 0; }
    };
    const lancer = (x, y, vx, vy) => {
      if (balles.length >= 4) balles.shift();
      balles.push({ x, y, vx, vy, rot: 0, alpha: 1, repos: 0, rappel: false });
      if (!raf) raf = requestAnimationFrame(pas);
    };
    if (bouton) bouton.addEventListener('click', e => {
      e.stopPropagation();
      const r = bouton.getBoundingClientRect(), rh = hero.getBoundingClientRect();
      lancer(r.left - rh.left + 12, r.top - rh.top, 520 + Math.random() * 420, -(900 + Math.random() * 300));
    });
    if (!E.tactile) hero.addEventListener('click', e => {
      if (e.target.closest('a, button, .carnet, input, label')) return;
      const rh = hero.getBoundingClientRect(), x = e.clientX - rh.left, y = e.clientY - rh.top;
      lancer(x, y, (x < W / 2 ? 1 : -1) * (240 + Math.random() * 380), -(700 + Math.random() * 400));
    });
  }

  /* ---------- herbes qui ondulent (balade éducative) ---------- */
  const herbes = $('[data-herbes]');
  if (herbes) {
    const c = herbes.getContext('2d');
    let W, H, brins = [], souris = { x: -999, f: 0 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const init = () => {
      const r = herbes.getBoundingClientRect(); W = r.width; H = r.height;
      herbes.width = W * dpr; herbes.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      brins = [];
      const n = Math.round(W / 4.5);
      for (let i = 0; i < n; i++) brins.push({ x: Math.random() * W, h: H * (0.35 + Math.random() * 0.65), w: 2 + Math.random() * 3, ph: Math.random() * 6.28, teinte: Math.random() });
      brins.sort((a, b) => b.h - a.h);
    };
    init(); window.addEventListener('resize', init);
    herbes.parentElement.addEventListener('pointermove', e => { const r = herbes.getBoundingClientRect(); souris.x = e.clientX - r.left; souris.f = 1; });
    herbes.parentElement.addEventListener('pointerleave', () => { souris.f = 0; });
    let vis = true, raf = 0;
    const dessin = t => {
      raf = 0; c.clearRect(0, 0, W, H);
      const temps = t / 1000;
      for (const b of brins) {
        const vent = Math.sin(temps * 1.1 + b.x * 0.012 + b.ph) * 0.22 + Math.sin(temps * 2.3 + b.x * 0.05) * 0.06;
        const ds = b.x - souris.x, pousse = souris.f * Math.max(0, 1 - Math.abs(ds) / 120) * Math.sign(ds) * 0.6;
        const a = calme ? 0.04 : vent + pousse;
        const tx = b.x + Math.sin(a) * b.h, ty = H - Math.cos(a) * b.h;
        const g = Math.round(28 + b.teinte * 30);
        c.fillStyle = `rgba(${g - 10},${g + 30},${g + 4},${0.75 + b.teinte * 0.25})`;
        c.beginPath(); c.moveTo(b.x - b.w, H); c.quadraticCurveTo(b.x + Math.sin(a) * b.h * 0.5, H - b.h * 0.55, tx, ty); c.quadraticCurveTo(b.x + Math.sin(a) * b.h * 0.5 + b.w * 0.4, H - b.h * 0.5, b.x + b.w, H); c.fill();
      }
      if (vis && !calme) raf = requestAnimationFrame(dessin);
    };
    visible(herbes, v => { vis = v; if (v && !raf) raf = requestAnimationFrame(dessin); });
    raf = requestAnimationFrame(dessin);
  }

  /* ---------- feuilles qui tombent (témoignages) ---------- */
  const feuilles = $('[data-feuilles]');
  if (feuilles) {
    const c = feuilles.getContext('2d');
    let W, H, fs = [], raf = 0, vis = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const couleurs = ['#C27526', '#A85C1A', '#7A925C', '#D99A3E', '#8A4A10'];
    const init = () => {
      const r = feuilles.getBoundingClientRect(); W = r.width; H = r.height;
      feuilles.width = W * dpr; feuilles.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      fs = Array.from({ length: Math.round(W / 70) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 7 + Math.random() * 10, v: 18 + Math.random() * 30, r: Math.random() * 6, vr: (Math.random() - 0.5) * 1.6, ph: Math.random() * 6, c: couleurs[Math.floor(Math.random() * couleurs.length)] }));
    };
    const feuille = f => {
      c.save(); c.translate(f.x, f.y); c.rotate(f.r); c.globalAlpha = 0.5; c.fillStyle = f.c;
      c.beginPath(); c.moveTo(0, -f.s); c.quadraticCurveTo(f.s * 0.8, 0, 0, f.s); c.quadraticCurveTo(-f.s * 0.8, 0, 0, -f.s); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -f.s); c.lineTo(0, f.s); c.stroke(); c.restore();
    };
    let tp = 0;
    const boucle = t => {
      raf = 0; const dt = Math.min(0.05, (t - (tp || t)) / 1000); tp = t;
      c.clearRect(0, 0, W, H);
      for (const f of fs) {
        if (!calme) { f.y += f.v * dt; f.x += Math.sin(t / 900 + f.ph) * 14 * dt; f.r += f.vr * dt; if (f.y > H + 20) { f.y = -20; f.x = Math.random() * W; } }
        feuille(f);
      }
      if (vis && !calme) raf = requestAnimationFrame(boucle);
    };
    init(); window.addEventListener('resize', init);
    visible(feuilles, v => { vis = v; if (v && !raf) { tp = 0; raf = requestAnimationFrame(boucle); } });
    requestAnimationFrame(boucle);
  }

  /* ---------- carte du Léman ---------- */
  $$('[data-carte]').forEach(carte => {
    if (!ok) return;
    const lac = $('[data-lac]', carte), chemin = $('[data-chemin]', carte), halo = $('[data-halo]', carte), pulse = $('[data-pulse]', carte);
    if (calme) return;
    const L = lac.getTotalLength();
    G.set(lac, { strokeDasharray: L, strokeDashoffset: L, fillOpacity: 0 });
    G.set(halo, { scale: 0, transformOrigin: '50% 50%' });
    const tl = G.timeline({ scrollTrigger: { trigger: carte, start: 'top 78%', once: true } });
    tl.to(lac, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' })
      .to(lac, { fillOpacity: 1, duration: 0.6 }, 0.7)
      .to(halo, { scale: 1, duration: 1, ease: 'expo.out' }, 0.8)
      .from(chemin, { strokeDashoffset: 300, duration: 1.6, ease: 'none' }, 0.9)
      .from($$('text', carte), { autoAlpha: 0, y: 8, stagger: 0.06, duration: 0.4 }, 0.5);
    G.to(pulse, { attr: { r: 40 }, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out' });
    G.to(chemin, { strokeDashoffset: -120, duration: 6, repeat: -1, ease: 'none' });
  });

  /* ---------- horloge de la balade ---------- */
  const bloc = $('[data-horloge-bloc]');
  if (bloc) {
    const arc = $('[data-arc]', bloc), arcMax = $('[data-arc-max]', bloc), aig = $('[data-aiguille]', bloc), txt = $('[data-duree]', bloc);
    const cx = 120, cy = 120, r = 86;
    const pt = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    const arcD = (m0, m1) => {
      const a0 = m0 / 120 * Math.PI * 2, a1 = Math.min(m1, 119.9) / 120 * Math.PI * 2;
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    };
    arcMax.setAttribute('d', arcD(90, 120));
    const maj = m => {
      arc.setAttribute('d', m > 0.5 ? arcD(0, m) : '');
      aig.setAttribute('transform', `rotate(${(m / 120 * 360).toFixed(1)} 120 120)`);
      const h = Math.floor(m / 60), mi = Math.round(m % 60);
      txt.textContent = m >= 119 ? '1 h 30 à 2 h' : `${h} h ${String(mi).padStart(2, '0')}`;
      txt.style.fontSize = m >= 119 ? '21px' : '';
    };
    const momentsEls = $$('[data-moment]');
    if (!ok || calme) maj(120);
    else {
      maj(0);
      ST.create({ trigger: '.temps', start: 'top 60%', end: 'bottom 60%', scrub: 0.4, onUpdate: s => maj(s.progress * 120) });
      momentsEls.forEach(m => G.from($('.moment-img', m), { clipPath: 'inset(100% 0 0 0 round 18px)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: m, start: 'top 80%', once: true } }));
    }
  }

  /* ---------- collage qui se compose ---------- */
  if (ok && !calme) $$('[data-collage]').forEach(c => {
    const fs = $$('figure', c);
    const depart = [{ x: -120, y: 60, rotate: -14 }, { x: 140, y: -40, rotate: 12 }, { x: 60, y: 140, rotate: -8 }];
    G.from(fs, { x: i => depart[i % 3].x, y: i => depart[i % 3].y, rotate: i => depart[i % 3].rotate, autoAlpha: 0, duration: 1.3, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 78%', once: true } });
    fs.forEach((f, i) => G.to(f, { y: (i - 1) * -26, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } }));
  });

  /* ---------- bandeau de photos en parallaxe ---------- */
  if (ok && !calme) $$('[data-bandeau] figure').forEach((f, i) => {
    G.fromTo($('img', f), { yPercent: -8 - i * 3 }, { yPercent: 2 + i * 3, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    G.from(f, { y: 80 + i * 30, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 92%', once: true } });
  });

  /* ---------- troupe de pastilles ---------- */
  $$('[data-troupe]').forEach(t => {
    const ps = $$('.p', t);
    if (!ok) return;
    const place = () => {
      const W = t.clientWidth, H = t.clientHeight, cx = W * 0.5, cy = H * 0.45;
      ps.forEach((p, k) => {
        const a = (k / ps.length) * Math.PI * 2;
        G.to(p, { x: cx + Math.cos(a) * 44 + G.utils.random(-14, 14) - 11, y: cy + Math.sin(a) * 34 + G.utils.random(-10, 10) - 11, duration: calme ? 0 : 2.2, ease: 'sine.inOut' });
      });
    };
    ps.forEach(p => G.set(p, { x: G.utils.random(10, t.clientWidth - 30), y: G.utils.random(10, t.clientHeight - 50) }));
    ST.create({ trigger: t, start: 'top 75%', once: true, onEnter: () => { place(); if (!calme) setInterval(() => { if (!d.hidden) place(); }, 2600); } });
  });

  /* ---------- exercices animés ---------- */
  if (ok && !calme) {
    $$('[data-exercice]').forEach(ex => {
      const k = ex.dataset.exercice;
      const tl = G.timeline({ repeat: -1, paused: true, repeatDelay: 0.6 });
      if (k === 'rappel') {
        const tr = $('[data-rappel-trace]', ex), ch = $('[data-rappel-chien]', ex);
        const L = tr.getTotalLength();
        G.set(tr, { strokeDasharray: '5 7' });
        const o = { t: 0 };
        tl.to(o, { t: 1, duration: 2.2, ease: 'power1.inOut', onUpdate: () => { const p = tr.getPointAtLength(L * o.t); G.set(ch, { x: p.x - 246, y: p.y - 108 }); } }).to(ch, { y: '-=6', yoyo: true, repeat: 3, duration: 0.12 }).set(ch, { x: 0, y: 0 });
      } else if (k === 'laisse') {
        const corde = $('[data-laisse-corde]', ex);
        tl.to(corde, { attr: { d: 'M74 92 Q 140 96 200 104' }, duration: 0.6, ease: 'power2.out' }).to(corde, { attr: { d: 'M74 92 Q 140 130 200 104' }, duration: 1.2, ease: 'elastic.out(1, 0.35)', delay: 0.8 });
      } else if (k === 'attention') {
        tl.fromTo($$('[data-regard] path', ex), { opacity: 0.1 }, { opacity: 1, stagger: 0.15, duration: 0.5, yoyo: true, repeat: 1 });
      } else if (k === 'croisements') {
        tl.fromTo($('[data-velo]', ex), { x: 180 }, { x: -260, duration: 3, ease: 'none' });
      }
      visible(ex, v => (v ? tl.play() : tl.pause()));
    });
    const pts = $('[data-points]');
    if (pts) G.from($$('circle', pts), { y: -16, opacity: 0, stagger: 0.12, ease: 'bounce.out', duration: 0.9, scrollTrigger: { trigger: pts, start: 'top 85%', once: true } });
  }

  /* ---------- sentier qui se dédouble ---------- */
  const fourche = $('[data-fourche]');
  if (fourche && ok && !calme) {
    const ps = $$('path', fourche);
    ps.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    const tl = G.timeline({ scrollTrigger: { trigger: fourche, start: 'top 80%', once: true } });
    tl.to(ps[0], { strokeDashoffset: 0, duration: 0.9, ease: 'power2.in' }).to([ps[1], ps[2]], { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' }).from($$('text', fourche), { autoAlpha: 0, x: -10, stagger: 0.15, duration: 0.5 }, 0.3);
  }

  /* ---------- DogParkour : la balle saute d'un mot à l'autre ---------- */
  const obst = $('[data-obstacles]');
  if (obst && ok) {
    const svg = $('[data-saut]', obst), trace = $('[data-saut-trace]', obst), balle = $('[data-saut-balle]', obst);
    const mots = $$('.obstacle', obst);
    let L = 0;
    const construire = () => {
      const r0 = obst.getBoundingClientRect();
      const rs = mots.map(m => { const r = m.getBoundingClientRect(); return { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height }; });
      if (!rs.length) return;
      let dd = `M${rs[0].x - 40} ${rs[0].y + rs[0].h * 0.85}`;
      rs.forEach((r, k) => {
        const sommet = r.y - 26, fin = k < rs.length - 1 ? (r.x + r.w + rs[k + 1].x) / 2 : r.x + r.w + 40;
        const baseY = k < rs.length - 1 && rs[k + 1].y > r.y + r.h * 0.5 ? r.y + r.h * 0.85 : r.y + r.h * 0.85;
        dd += ` Q ${r.x + r.w / 2} ${sommet - r.h * 0.35} ${fin} ${baseY}`;
      });
      trace.setAttribute('d', dd);
      L = trace.getTotalLength();
      trace.style.strokeDasharray = '3 8';
    };
    const placer = p => {
      if (!L) return;
      const pt = trace.getPointAtLength(L * p);
      balle.setAttribute('x', pt.x - 17); balle.setAttribute('y', pt.y - 17);
    };
    construire(); placer(calme ? 1 : 0);
    window.addEventListener('resize', () => { construire(); placer(prog); });
    let prog = 0;
    if (!calme) {
      ST.create({ trigger: obst, start: 'top 80%', end: 'bottom 30%', scrub: 0.6, onUpdate: s => { prog = s.progress; placer(prog); } });
      mots.forEach(m => m.addEventListener('pointerenter', () => G.fromTo(m, { y: 0 }, { y: 8, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' })));
      mots.forEach(m => { m.style.display = 'inline-block'; });
    }
  }

  /* ---------- forêt ou ville ---------- */
  const decors = $('[data-decors]');
  if (decors) {
    const poignee = $('[data-poignee]', decors);
    let pos = 50;
    const set = p => { pos = Math.max(0, Math.min(100, p)); decors.style.setProperty('--pos', pos + '%'); poignee.setAttribute('aria-valuenow', Math.round(pos)); };
    const depuis = e => { const r = decors.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    decors.addEventListener('pointerdown', e => {
      decors.setPointerCapture(e.pointerId); depuis(e);
      const m = ev => depuis(ev), u = () => { decors.removeEventListener('pointermove', m); decors.removeEventListener('pointerup', u); };
      decors.addEventListener('pointermove', m); decors.addEventListener('pointerup', u);
    });
    poignee.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { set(pos - 5); e.preventDefault(); } if (e.key === 'ArrowRight') { set(pos + 5); e.preventDefault(); } });
    if (ok && !calme) { const o = { p: 50 }; G.timeline({ scrollTrigger: { trigger: decors, start: 'top 70%', once: true } }).to(o, { p: 18, duration: 1, ease: 'power2.inOut', onUpdate: () => set(o.p) }).to(o, { p: 82, duration: 1.4, ease: 'power2.inOut', onUpdate: () => set(o.p) }).to(o, { p: 50, duration: 0.9, ease: 'power2.inOut', onUpdate: () => set(o.p) }); }
  }

  /* ---------- visionneuse de la galerie ---------- */
  const boite = $('[data-visionneuse-boite]');
  if (boite) {
    const items = $$('[data-visionneuse]');
    const im = $('[data-v-img]', boite), leg = $('[data-v-legende]', boite);
    let k = 0, retour = null;
    const grand = el => { const i = el.querySelector('.f-base'); const ss = (i.getAttribute('srcset') || '').split(',').map(s => s.trim().split(' ')[0]); return ss[ss.length - 1] || i.src; };
    const montrer = n => { k = (n + items.length) % items.length; const it = items[k]; const i = it.querySelector('.f-base'); im.src = grand(it); im.alt = i.alt; leg.textContent = `${i.alt} · ${k + 1} / ${items.length}`; };
    const ouvrir = n => { retour = d.activeElement; montrer(n); boite.hidden = false; E.lenis && E.lenis.stop(); $('[data-v-fermer]', boite).focus(); if (ok && !calme) G.from(im, { scale: 0.92, autoAlpha: 0, duration: 0.5, ease: 'expo.out' }); };
    const fermer = () => { boite.hidden = true; E.lenis && E.lenis.start(); retour && retour.focus(); };
    items.forEach((it, n) => it.addEventListener('click', () => ouvrir(n)));
    $('[data-v-fermer]', boite).addEventListener('click', fermer);
    $('[data-v-prec]', boite).addEventListener('click', () => montrer(k - 1));
    $('[data-v-suiv]', boite).addEventListener('click', () => montrer(k + 1));
    boite.addEventListener('click', e => { if (e.target === boite) fermer(); });
    d.addEventListener('keydown', e => {
      if (boite.hidden) return;
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowLeft') montrer(k - 1);
      if (e.key === 'ArrowRight') montrer(k + 1);
      if (e.key === 'Tab') { const f = $$('button', boite); const i = f.indexOf(d.activeElement); if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); } else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); } }
    });
    let x0 = null;
    boite.addEventListener('pointerdown', e => { x0 = e.clientX; });
    boite.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 60) montrer(k + (e.clientX < x0 ? 1 : -1)); x0 = null; });
    if (ok && !calme) G.from(items, { y: 40, autoAlpha: 0, stagger: 0.04, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '[data-galerie]', start: 'top 85%', once: true } });
  }
})();
