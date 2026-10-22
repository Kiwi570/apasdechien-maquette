# À pas de chien — maquette

Site statique (HTML, CSS, JavaScript), sans étape de construction, prêt pour Vercel.

## Modifier les contenus courants
- Horaires des cours, tarifs et témoignages : `assets/js/data.js` (le planning, le prochain cours et le calculateur s'y alimentent).
- Textes des pages : directement dans les fichiers `.html`.
- Photos : `assets/img/photos` (vraies photos du site actuel), `assets/img/grok` (images d'ambiance sans chien), `assets/img/detoures` (chiens détourés).

## Bibliothèques hébergées avec le site
GSAP 3 (ScrollTrigger, SplitText, MotionPathPlugin), Lenis, OGL. Polices Fraunces et Manrope (SIL Open Font License).

## Avant la mise en ligne définitive
La maquette est volontairement exclue des moteurs de recherche : retirer `<meta name="robots" content="noindex, nofollow">` des pages et le fichier `robots.txt`, puis remplacer l'adresse `apasdechien-maquette.vercel.app` par le vrai domaine (balise og:image et données structurées de l'accueil).

## À compléter avant la mise en ligne
Adresse postale, communes desservies, formation d'Anne, nombre de chiens par balade, mentions légales et déclaration de confidentialité, formulaire réellement relié à une messagerie.
