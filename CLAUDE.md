# AIRO — site vitrine de la borne de nettoyage de casques

Site statique (GitHub Pages, pas de build), en français. Dépôt `airocasque/airo-site`, on pousse sur `main`.
Client : AIRO (Mohammed MAYER, Marseille). Devis → airo.casque@gmail.com via FormSubmit (`script.js`).

## Carte du code
- `index.html` : une page. Hero + scène 3D défilante (`.xp`, 7 `.xp-step`), puis sections probleme, programmes, technologie, professionnels, rentabilite (simulateur, section claire), fiche, faq (+ FAQPage JSON-LD), secteurs, bandeau Instagram, devis. Barre d'appel fixe sur mobile (`#mbar`). Aucun prix de machine sur le site. La table d'import doit rester AVANT les `modulepreload`.
- `style.css` : jetons dans `:root` (noir, `--airo` #2f6bff, police Archivo auto-hébergée). Mobile ≤ 900 px.
- `script.js` : intro (désactivée ≤ 900 px), menu, formulaire (champs facultatifs repliés dans `.form__more`), simulateur, barre mobile. `assets/js/motion.js` : Lenis + GSAP (révélations, scrollspy).
- `assets/js/experience.js` : borne 3D procédurale (textures `tex-front-hd`/`tex-side-hd`), caméra liée au défilement (`B[]`), portes, vapeur, casques, post-traitement (bloom + grain), qualité adaptative. Démarre sur `requestIdleCallback`.
- `assets/js/showroom.js` : `buildConcession()` = photo de la concession remise en relief (2 calques : fond sans motos + motos découpées, qui s'effacent loin du point de vue). Repère : dessus du socle y = 0, borne au centre, œil de la photo sur +z. `loadModel()` pour les casques GLB des casiers.
- `assets/scene/` : textures 4k/2k, profondeurs 16 bits, `scene.json` (matrice, cibles caméra). Chaîne de fabrication : `tools/scene-pipeline/`.
- Parcours caméra : la scène 3D est fixe derrière toute la page ; les sections `.gap` s'ouvrent sur une fenêtre transparente, `legs` dans `experience.js` associe chaque section à un arrêt (mur de casques, écrans, comptoir, enseigne…). Rester près de l'axe œil → cible (sinon étirements).
- `assets/showroom/helmet-a|b.glb` : casques CC BY (crédits dans `mentions-legales.html`).
- `assets/vendor/` : three r170 (+ addons utilisés), GSAP 3.12.5, Lenis 1.1.0 (option `prevent` obligatoire).

## Outils (`tools/`)
- `build-preview.sh [sortie]` : aperçu autonome en un fichier (`inline.py` embarque tout, y compris les GLB via `window.__AIRO_FILES`).
- `texgen.html` + `texgen-export.js` : redessine les textes/pictos nets de la borne par-dessus la photo.
- `still.js <w> <h> <fraction> <png>` : rendu fixe de la scène sans textes (images des sections technologie et professionnels).
- `journey.js <w> <h> <tag>` : une capture par arrêt du parcours caméra.
- `viewer.html?m=assets/showroom/x.glb` : inspecter un modèle. `capture.js <w> <h> <tag> <fractions>` : captures de la scène 3D (Playwright, reducedMotion).
- Tests locaux : `python3 -m http.server 8765`. Chromium logiciel = 3D très lente : prévoir de longs délais, Lighthouse plante quand la 3D tourne (utiliser `--disable-gpu` pour mesurer le chargement).

## Règles de travail
- Changements chirurgicaux, pas de refonte non demandée ; vérifier (captures desktop 1280×800 + mobile 390×844) avant d'annoncer « fini ».
- Commits : `-c user.name="Claude" -c user.email="noreply@anthropic.com"`, messages en français.
- Fichiers `_*.html` et `_glbtest/` : brouillons locaux exclus du dépôt.
- Ne pas afficher le prix (6 000 € HT) sans accord du client. Domaine prévu : airoclean.fr (pas encore de CNAME).

## Style de réponse (accord du client)
- Mode court par défaut (skill `caveman`) : en français, réponse d'abord, sans politesses ni récapitulatif, phrases courtes ; tous les faits techniques gardés. « mode normal » pour revenir aux explications détaillées.
- Une grosse tâche = une nouvelle session : ce fichier redonne le contexte.
