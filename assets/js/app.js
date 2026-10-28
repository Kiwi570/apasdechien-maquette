/* À pas de chien — interactions communes à toutes les pages.
   Défilement fluide, curseur balle, boutons magnétiques, titres, laisse et empreintes,
   transitions de page, ouverture, son, mode calme. */
(() => {
  const d = document, html = d.documentElement;
  const site = d.querySelector('[data-page]');
  const PAGE = site ? site.dataset.page : 'index';

  const lire = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
  const ecrire = (s, k, v) => { try { s.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const SS = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
  const lireLS = k => (LS ? lire(LS, k) : null), ecrireLS = (k, v) => LS && ecrire(LS, k, v);
  const lireSS = k => (SS ? lire(SS, k) : null), ecrireSS = (k, v) => SS && ecrire(SS, k, v);

  const reduitSysteme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefCalme = lireLS('apdc-calme');
  const calme = prefCalme === '1' || (prefCalme === null && reduitSysteme);
  if (calme) html.classList.add('calm');
  const tactile = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const G = window.gsap, ST = window.ScrollTrigger;
  const ok = !!(G && ST);
  if (ok) G.registerPlugin(...[ST, window.SplitText].filter(Boolean));
  const etat = window.APDC_ETAT = { calme, tactile, ok, page: PAGE, lenis: null };

  /* ---------- défilement fluide ---------- */
  let lenis = null;
  if (ok && !calme && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    etat.lenis = lenis;
  }
  const allerA = (cible, immediat) => {
    const el = typeof cible === 'string' ? d.querySelector(cible) : cible;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70, immediate: !!immediat, duration: 1.4 });
    else el.scrollIntoView({ behavior: immediat || calme ? 'auto' : 'smooth', block: 'start' });
  };
  etat.allerA = allerA;
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = d.querySelector(id);
    if (!el) return;
    e.preventDefault();
    fermerMenu();
    allerA(el);
    const champ = el.querySelector('input, button');
    if (champ && id === '#demande') setTimeout(() => champ.focus({ preventScroll: true }), 900);
  });

  /* ---------- en-tête, menu, barre mobile ---------- */
  const header = d.querySelector('[data-header]');
  const barre = d.querySelector('[data-barre-mobile]');
  let dernierY = 0;
  const surDefilement = () => {
    const y = window.scrollY || html.scrollTop;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', y > 420 && y > dernierY + 4 && !html.classList.contains('menu-ouvert'));
      if (y < dernierY - 4) header.classList.remove('is-hidden');
    }
    if (barre && !heroObs) heroPasse = y > window.innerHeight * 0.6;
    majBarre();
    dernierY = y;
  };

  // hauteurs réelles de l'en-tête et de la barre du bas, pour les sections épinglées et le pied de page
  const mesurer = () => {
    if (header) html.style.setProperty('--entete-h', (header.offsetTop + header.offsetHeight) + 'px');
    html.style.setProperty('--barres-h', (barre && getComputedStyle(barre).display !== 'none' ? barre.offsetHeight : 0) + 'px');
  };
  mesurer();
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(mesurer); header && ro.observe(header); barre && ro.observe(barre); }
  window.addEventListener('resize', mesurer);

  // barre du bas : seulement une fois le héros dépassé, jamais sur un formulaire, le pied de page,
  // une section épinglée, le menu ouvert ou la page introuvable
  let heroPasse = false, heroObs = null;
  const genants = new Set();
  function majBarre() {
    if (!barre) return;
    barre.classList.toggle('is-visible', PAGE !== '404' && heroPasse && genants.size === 0 && !html.classList.contains('menu-ouvert'));
  }
  if (barre && 'IntersectionObserver' in window) {
    const hero = d.querySelector('[data-hero]');
    if (hero) {
      heroObs = new IntersectionObserver(es => { es.forEach(e => { heroPasse = !e.isIntersecting && e.boundingClientRect.top < 0; }); majBarre(); });
      heroObs.observe(hero);
    }
    const obs = new IntersectionObserver(es => {
      es.forEach(e => {
        const gene = e.isIntersecting && (!e.target.matches('[data-horizontal]') || e.target.classList.contains('horizontal--epingle'));
        gene ? genants.add(e.target) : genants.delete(e.target);
      });
      majBarre();
    });
    d.querySelectorAll('form.demande, footer, [data-horizontal]').forEach(el => obs.observe(el));
  }
  window.addEventListener('scroll', surDefilement, { passive: true });
  surDefilement();

  const burger = d.querySelector('[data-burger]');
  const menu = d.querySelector('[data-menu]');
  function fermerMenu() {
    if (!html.classList.contains('menu-ouvert')) return;
    html.classList.remove('menu-ouvert');
    burger && burger.setAttribute('aria-expanded', 'false');
    majBarre();
    lenis && lenis.start();
    if (menu && menu.contains(d.activeElement)) burger && burger.focus();
  }
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const ouvert = html.classList.toggle('menu-ouvert');
      burger.setAttribute('aria-expanded', String(ouvert));
      majBarre();
      if (ouvert) {
        lenis && lenis.stop();
        const premier = menu.querySelector('a, button'); if (premier) setTimeout(() => premier.focus({ preventScroll: true }), 60);
        if (ok && !calme) G.fromTo(menu.querySelectorAll('li'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: 'expo.out', delay: 0.15 });
      } else lenis && lenis.start();
    });
    d.addEventListener('keydown', e => {
      if (!html.classList.contains('menu-ouvert')) return;
      if (e.key === 'Escape') { fermerMenu(); burger.focus(); return; }
      if (e.key !== 'Tab') return;
      // piège du focus : burger + éléments du menu
      const f = [burger].concat([...menu.querySelectorAll('a[href], button')].filter(x => x.offsetParent !== null));
      const i = f.indexOf(d.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------- copier ---------- */
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-copier]');
    if (!b) return;
    const val = b.dataset.copier;
    const lbl = b.querySelector('span');
    const fini = txt => { b.classList.add('ok'); if (lbl) lbl.textContent = txt; setTimeout(() => { b.classList.remove('ok'); if (lbl) lbl.textContent = 'Copier'; }, 1800); };
    const selection = () => {
      const cible = b.parentElement.querySelector('.val');
      if (!cible) return;
      const r = d.createRange(); r.selectNodeContents(cible);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      fini('Sélectionné');
    };
    try {
      navigator.clipboard.writeText(val).then(() => fini('Copié'), selection);
    } catch (err) { selection(); }
  });

  d.querySelectorAll('[data-annee]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- mode calme ---------- */
  const btnCalme = d.querySelector('[data-calme]');
  if (btnCalme) {
    btnCalme.setAttribute('aria-pressed', String(calme));
    btnCalme.addEventListener('click', () => {
      ecrireLS('apdc-calme', calme ? '0' : '1');
      ecrireSS('apdc-scroll', String(window.scrollY));
      ecrireSS('apdc-sans-rideau', '1');
      window.location.reload();
    });
  }
  const scrollMemo = lireSS('apdc-scroll');
  if (scrollMemo !== null) {
    ecrireSS('apdc-scroll', '');
    if (scrollMemo) requestAnimationFrame(() => window.scrollTo(0, +scrollMemo));
  }

  /* ---------- son ---------- */
  const btnSon = d.querySelector('[data-son]');
  if (btnSon && window.APDC_AMBIANCE) {
    const amb = window.APDC_AMBIANCE;
    const maj = on => { btnSon.setAttribute('aria-pressed', String(on)); };
    btnSon.addEventListener('click', e => {
      e.stopPropagation();
      const on = amb.basculer();
      ecrireLS('apdc-son', on ? '1' : '0');
      maj(on);
    });
    if (lireLS('apdc-son') === '1') {
      btnSon.title = 'Touchez la page pour reprendre l\'ambiance';
      const reprendre = ev => {
        if (ev.target.closest('[data-son]')) return;
        if (!amb.actif()) { amb.demarrer(); maj(true); }
        d.removeEventListener('pointerdown', reprendre, true);
        d.removeEventListener('keydown', reprendre, true);
      };
      d.addEventListener('pointerdown', reprendre, true);
      d.addEventListener('keydown', reprendre, true);
    }
    d.querySelectorAll('[data-ambiance]').forEach(sec => {
      const scene = sec.dataset.ambiance;
      if (ok) ST.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: s => { if (s.isActive) amb.scene(scene); } });
    });
  }

  if (!ok) {
    html.classList.remove('rideau-entree');
    const ouv = d.querySelector('[data-ouverture]');
    if (ouv) ouv.hidden = true;
    return;
  }

  /* ---------- curseur balle ---------- */
  const curseur = d.querySelector('[data-curseur]');
  if (curseur && !tactile) {
    html.classList.add('has-curseur');
    const txt = curseur.querySelector('[data-curseur-txt]');
    const qx = G.quickTo(curseur, 'x', { duration: 0.35, ease: 'power3' });
    const qy = G.quickTo(curseur, 'y', { duration: 0.35, ease: 'power3' });
    let etatC = '';
    const setEtat = (e, t) => {
      if (e === etatC) return;
      curseur.classList.remove('lien', 'renifler', 'lancer');
      if (e) curseur.classList.add(e);
      if (t && txt) txt.textContent = t;
      etatC = e;
    };
    window.addEventListener('pointermove', e => {
      qx(e.clientX); qy(e.clientY);
      const t = e.target;
      if (t.closest('[data-flair]')) setEtat('renifler', 'Renifler');
      else if (t.closest('a, button, label, summary, [data-tilt], [data-poignee], .carte-avis')) setEtat('lien');
      else if (t.closest('[data-hero]') && d.querySelector('[data-balles]') && !t.closest('.carnet, input, textarea')) setEtat('lancer', 'Lancer la balle');
      else setEtat('');
    }, { passive: true });
    d.addEventListener('pointerleave', () => G.to(curseur, { autoAlpha: 0, duration: 0.2 }));
    d.addEventListener('pointerenter', () => G.to(curseur, { autoAlpha: 1, duration: 0.2 }));
  }

  /* ---------- boutons magnétiques et cartes inclinables ---------- */
  if (!tactile && !calme) {
    d.querySelectorAll('.magnet').forEach(m => {
      const qx = G.quickTo(m, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      const qy = G.quickTo(m, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      m.addEventListener('pointermove', e => {
        const r = m.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.35);
        qy((e.clientY - r.top - r.height / 2) * 0.45);
      });
      m.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
    d.querySelectorAll('[data-tilt]').forEach(c => {
      const rx = G.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = G.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3' });
      G.set(c, { transformPerspective: 900 });
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
        ry(((e.clientX - r.left) / r.width - 0.5) * 11);
      });
      c.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ---------- titres, apparitions, parallaxe, compteurs ---------- */
  const lancerTitres = () => {
    if (calme || !window.SplitText) return;
    d.querySelectorAll('[data-split]').forEach(el => {
      window.SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: self => G.from(self.lines, { yPercent: 115, duration: 1.15, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } }),
      });
    });
  };

  if (!calme) {
    G.utils.toArray('[data-reveal]').forEach((el, i) => {
      G.from(el, { y: 48, autoAlpha: 0, duration: 1, ease: 'expo.out', delay: (i % 3) * 0.08, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    G.utils.toArray('[data-parallax]').forEach(el => {
      const f = parseFloat(el.dataset.parallax) || 0.2;
      const sec = el.closest('section') || el.parentElement;
      G.fromTo(el, { y: -f * 150 }, { y: f * 150, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    G.utils.toArray('.service, .etape, .exercice, .moment, .tuile').forEach(el => {
      if (el.closest('[data-horizontal]')) return;
      G.from(el, { y: 70, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }
  G.utils.toArray('[data-count]').forEach(el => {
    const fin = parseFloat(el.dataset.count);
    if (calme) { el.textContent = fin; return; }
    const o = { v: 0 };
    el.textContent = '0';
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => G.to(o, { v: fin, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
  });

  /* panneaux jaunes qui pivotent */
  d.querySelectorAll('[data-panneaux]').forEach(g => {
    const ps = g.querySelectorAll('.panneau');
    ST.create({ trigger: g, start: 'top 80%', once: true, onEnter: () => ps.forEach((p, i) => setTimeout(() => p.classList.add('is-ouvert'), calme ? 0 : 160 * i)) });
  });

  /* hors du cadre : le chien sort progressivement du cadre */
  if (!calme) {
    d.querySelectorAll('[data-hors-cadre]').forEach(f => {
      const t = getComputedStyle(f).getPropertyValue('--t').trim() || '20%';
      G.fromTo(f, { '--t': '6%' }, { '--t': t, ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'center 45%', scrub: 0.6 } });
      const chien = f.querySelector('.hc-chien');
      G.fromTo(chien, { scale: 0.985, transformOrigin: '50% 100%' }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* le flair : la truffe révèle la couleur */
  d.querySelectorAll('[data-flair]').forEach(f => {
    const c = f.querySelector('.f-couleur');
    if (!c) return;
    if (tactile) {
      if (!f.hasAttribute('data-visionneuse')) f.addEventListener('click', () => f.classList.toggle('is-ouvert'));
      return;
    }
    const rayon = { r: 0 };
    const appliquer = () => c.style.setProperty('--r', rayon.r + 'px');
    f.addEventListener('pointerenter', () => G.to(rayon, { r: Math.max(110, f.offsetWidth * 0.32), duration: 0.6, ease: 'expo.out', onUpdate: appliquer }));
    f.addEventListener('pointerleave', () => G.to(rayon, { r: 0, duration: 0.5, ease: 'power3.in', onUpdate: appliquer }));
    f.addEventListener('pointermove', e => {
      const r = f.getBoundingClientRect();
      c.style.setProperty('--x', (e.clientX - r.left) + 'px');
      c.style.setProperty('--y', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- la laisse et les empreintes ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const laisse = () => {
    const main = d.querySelector('main');
    const sections = main ? [...main.querySelectorAll(':scope > section, :scope > .pin-spacer > section')] : [];
    if (sections.length < 3) return;
    const svg = d.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'laisse');
    svg.setAttribute('aria-hidden', 'true');
    const ombre = d.createElementNS(NS, 'path'); ombre.setAttribute('class', 'trace-ombre');
    const trace = d.createElementNS(NS, 'path'); trace.setAttribute('class', 'trace');
    const gPattes = d.createElementNS(NS, 'g');
    const mq = d.createElementNS(NS, 'g'); mq.setAttribute('class', 'mousqueton');
    mq.innerHTML = '<circle r="9" fill="#F8F3E8" stroke="#1C3A2C" stroke-width="3"/><path d="M-3 -4 L3 0 L-3 4" fill="none" stroke="#C27526" stroke-width="2.4" stroke-linecap="round"/>';
    svg.append(ombre, trace, gPattes, mq);
    main.appendChild(svg);

    let L = 0, echant = [], pattes = [], tete = 0;
    const construire = () => {
      const W = main.clientWidth, H = main.scrollHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.height = H + 'px';
      const mobile = W < 720;
      const bord = mobile ? 5 : Math.max(22, W * 0.03);
      const xs = [bord, W - bord];
      const pts = [];
      let cote = 0;
      const mr = main.getBoundingClientRect();
      sections.forEach((s, i) => {
        const bloc = s.parentElement && s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
        const rb = bloc.getBoundingClientRect();
        const top = rb.top - mr.top, h = rb.height;
        if (i === 0) { pts.push([W * 0.5, top + h - 24]); return; }
        const x = xs[cote], vague = mobile ? 0 : (cote ? -1 : 1) * W * 0.014;
        pts.push([x, top + 40]);
        pts.push([x + vague, top + h * 0.35]);
        pts.push([x - vague * 0.5, top + h * 0.7]);
        pts.push([x, top + h - 40]);
        cote = 1 - cote;
      });
      let dd = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        dd += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      trace.setAttribute('d', dd); ombre.setAttribute('d', dd);
      L = trace.getTotalLength();
      trace.style.strokeDasharray = ombre.style.strokeDasharray = L;
      echant = [];
      for (let l = 0; l <= L; l += 24) echant.push([l, trace.getPointAtLength(l).y]);
      gPattes.innerHTML = '';
      pattes = [];
      const pas = mobile ? 52 : 74, taillePatte = mobile ? 9 : 14, ecart = mobile ? 4 : 9;
      let gauche = true;
      for (let l = pas; l < L - 20; l += pas) {
        const p = trace.getPointAtLength(l), q = trace.getPointAtLength(Math.min(L, l + 2));
        const ang = Math.atan2(q.y - p.y, q.x - p.x);
        const off = (gauche ? -1 : 1) * ecart;
        const x = p.x + Math.cos(ang + Math.PI / 2) * off, y = p.y + Math.sin(ang + Math.PI / 2) * off;
        const u = d.createElementNS(NS, 'use');
        u.setAttribute('href', '#i-patte');
        u.setAttribute('width', taillePatte); u.setAttribute('height', taillePatte);
        u.setAttribute('x', -taillePatte / 2); u.setAttribute('y', -taillePatte / 2);
        u.setAttribute('class', 'empreinte');
        u.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang * 180 / Math.PI + 90).toFixed(1)})`);
        gPattes.appendChild(u);
        pattes.push({ el: u, l, o: -1 });
        gauche = !gauche;
      }
      tete = -1;
      maj(true);
    };
    const longueurPourY = y => {
      if (!echant.length) return 0;
      if (y <= echant[0][1]) return 0;
      for (let i = 1; i < echant.length; i++) if (echant[i][1] >= y) return echant[i][0];
      return L;
    };
    const maj = force => {
      if (!L) return;
      const mainTop = main.getBoundingClientRect().top;
      const yTete = -mainTop + window.innerHeight * 0.62;
      const l = calme ? L : longueurPourY(yTete);
      if (!force && Math.abs(l - tete) < 1) return;
      tete = l;
      trace.style.strokeDashoffset = ombre.style.strokeDashoffset = L - l;
      if (!calme && l > 0 && l < L) {
        const p = trace.getPointAtLength(l), q = trace.getPointAtLength(Math.max(0, l - 3));
        mq.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI).toFixed(1)})`);
        mq.style.opacity = 1;
      } else mq.style.opacity = 0;
      for (const p of pattes) {
        const dist = l - p.l;
        let o = 0;
        if (calme) o = 0.32;
        else if (dist > 0) o = dist < 260 ? 0.85 : Math.max(0.22, 0.85 - (dist - 260) / 900);
        o = Math.round(o * 20) / 20;
        if (o !== p.o) { p.el.style.opacity = o; p.o = o; }
      }
    };
    G.ticker.add(() => maj(false));
    ST.addEventListener('refresh', construire);
    construire();
    if ('ResizeObserver' in window) {
      let attente;
      new ResizeObserver(() => { clearTimeout(attente); attente = setTimeout(construire, 250); }).observe(main);
    }
  };

  /* ---------- transitions de page ---------- */
  const rideau = d.querySelector('[data-rideau]');
  const pasRideau = d.querySelector('[data-rideau-pas]');
  const pattesRideau = () => {
    if (!pasRideau) return;
    pasRideau.innerHTML = '';
    const n = 9;
    for (let i = 0; i < n; i++) {
      const s = d.createElementNS(NS, 'svg');
      s.setAttribute('class', 'patte'); s.setAttribute('viewBox', '0 0 24 24');
      s.innerHTML = '<use href="#i-patte"></use>';
      s.style.left = (6 + i * (88 / (n - 1))) + '%';
      s.style.top = (i % 2 ? 34 : 0) + 'px';
      s.style.transform = 'rotate(90deg)';
      pasRideau.appendChild(s);
    }
    G.fromTo(pasRideau.children, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, stagger: 0.05, duration: 0.25, ease: 'back.out(3)' });
  };
  const estInterne = a => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || /^(mailto|tel|sms|javascript):/i.test(href)) return false;
    try {
      const u = new URL(a.href, window.location.href);
      if (u.origin !== window.location.origin) return false;
      if (u.pathname === window.location.pathname && u.hash) return false;
      return true;
    } catch (e) { return false; }
  };
  d.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!estInterne(a) || !rideau) return;
    e.preventDefault();
    const href = a.href;
    ecrireSS('apdc-rideau', '1');
    if (calme) { window.location.href = href; return; }
    lenis && lenis.stop();
    G.timeline({ onComplete: () => { window.location.href = href; } })
      .set(rideau, { yPercent: 100, autoAlpha: 1 })
      .to(rideau, { yPercent: 0, duration: 0.6, ease: 'power3.inOut' })
      .add(pattesRideau, 0.25)
      .to({}, { duration: 0.35 });
  });
  window.addEventListener('pageshow', e => { if (e.persisted) fermerMenu(); if (e.persisted && rideau) { G.set(rideau, { autoAlpha: 0, yPercent: 100 }); lenis && lenis.start(); } });
  const leverRideau = delai => {
    G.set(rideau, { yPercent: 0, autoAlpha: 1 });
    html.classList.remove('rideau-entree');
    G.to(rideau, { yPercent: -100, duration: 0.8, ease: 'power3.inOut', delay: delai, onComplete: () => G.set(rideau, { autoAlpha: 0 }) });
  };

  /* ---------- ouverture et entrée du héros ---------- */
  const entreeHeros = (delai = 0) => {
    const tl = G.timeline({ delay: delai });
    const titre = d.querySelector('[data-hero-titre]');
    if (titre && window.SplitText && !calme) {
      const sp = window.SplitText.create(titre, { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
      tl.from(sp.words, { yPercent: 120, rotate: 4, duration: 1.1, stagger: 0.07, ease: 'expo.out' }, 0);
    }
    const items = d.querySelectorAll('[data-hero-item]:not([data-carnet])');
    if (!calme && items.length) tl.from(items, { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.2);
    const carnet = d.querySelector('[data-carnet]');
    if (carnet && !calme) tl.from(carnet, { rotate: 14, y: 80, autoAlpha: 0, duration: 1.2, ease: 'expo.out' }, 0.25);
    return tl;
  };

  const ouverture = d.querySelector('[data-ouverture]');
  const rideauEntree = lireSS('apdc-rideau') === '1' && lireSS('apdc-sans-rideau') !== '1';
  ecrireSS('apdc-rideau', '0');
  ecrireSS('apdc-sans-rideau', '0');

  const demarrer = () => {
    lancerTitres();
    laisse();
    if (ouverture) {
      const dejaVu = lireSS('apdc-vu') === '1';
      ecrireSS('apdc-vu', '1');
      if (calme || dejaVu || rideauEntree) {
        ouverture.hidden = true;
        if (rideauEntree && rideau && !calme) leverRideau(0.05);
        entreeHeros(rideauEntree ? 0.35 : 0.05);
        return;
      }
      lenis && lenis.stop();
      const t = ouverture.querySelector('[data-ouv-titre]');
      const s = ouverture.querySelector('[data-ouv-sous]');
      const l = ouverture.querySelector('[data-ouv-laisse]');
      const Ll = l.getTotalLength();
      G.set(t, { strokeDasharray: 1600, strokeDashoffset: 1600 });
      G.set(l, { strokeDasharray: Ll, strokeDashoffset: Ll });
      const tl = G.timeline({ onComplete: () => { ouverture.hidden = true; lenis && lenis.start(); } });
      tl.to(t, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut' }, 0)
        .to(l, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, 0.4)
        .to(t, { fill: '#1C3A2C', duration: 0.5 }, 0.9)
        .to(s, { opacity: 1, duration: 0.4 }, 1.0)
        .to(ouverture, { yPercent: -100, duration: 0.75, ease: 'power3.inOut' }, 1.55);
      entreeHeros(1.85);
      return;
    }
    if (rideauEntree && rideau && !calme) { leverRideau(0.05); entreeHeros(0.35); } else entreeHeros(0.05);
  };

  const pret = (d.fonts && d.fonts.ready) ? Promise.race([d.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve();
  pret.then(() => {
    demarrer();
    if (window.location.hash && d.querySelector(window.location.hash)) setTimeout(() => allerA(window.location.hash, true), 60);
    window.dispatchEvent(new CustomEvent('apdc:pret'));
    setTimeout(() => ST.refresh(), 400);
  });
  window.addEventListener('load', () => ST.refresh());
})();
