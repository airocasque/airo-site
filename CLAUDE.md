# AIRO — site vitrine de la borne de nettoyage de casques

Site statique (GitHub Pages, pas de build), en français. Dépôt `airocasque/airo-site`, on pousse sur `main`.
Client : AIRO (Mohammed MAYER, Marseille). Devis → airo.casque@gmail.com via FormSubmit (`script.js`).

## Carte du code
- `index.html` : une page. Hero + film de la borne défilant (`.xp`, 7 `.xp-step`), puis sections probleme, programmes, technologie, professionnels, rentabilite (simulateur, section claire), fiche, faq (+ FAQPage JSON-LD), secteurs, clip vidéo `#clip` (assets/video, webm + mp4, lu sans le son à l'écran, bouton son ; source : video/airo-promo, HyperFrames), bandeau Instagram, devis. Barre d'appel fixe sur mobile (`#mbar`). Aucun prix de machine sur le site. La table d'import doit rester AVANT les `modulepreload`.
- `style.css` : jetons dans `:root` (noir, `--airo` #2f6bff, police Archivo auto-hébergée). Mobile ≤ 900 px.
- `script.js` : intro (désactivée ≤ 900 px), menu, formulaire (champs facultatifs repliés dans `.form__more`), simulateur, barre mobile. `assets/js/motion.js` : Lenis + GSAP (révélations, scrollspy).
- `assets/js/film.js` (chargé par le site) : film de la borne piloté par le défilement = images pré-calculées `assets/film/d|m/NNN.webp` (150, ordinateur 1280×720 / mobile 576×1024), chargement du grossier au fin, `meta.json` (repères `B` du tournage, remappés sur ceux de la page), `hotspots.json` (positions des 5 points interactifs par image, fiche en verre `#hsCard`). Aucune 3D en direct pour les visiteurs.
- `assets/js/experience.js` : borne 3D procédurale (textures `tex-front-hd`/`tex-side-hd`), portes, vapeur, casques, post-traitement. Ne sert plus qu'au tournage : `index.html?studio` (studio noir `buildStudio()`, image pilotée par `window.__seqP`/`__seqT`).
- `assets/js/world.js` : `buildStudio()` (studio de tournage : sol miroir, socle, lignes de lumière, contre-jours) ; `buildWorld()` = ancienne concession 3D, plus utilisée. `assets/js/showroom.js` : `loadModel()` (GLB).
- `assets/world/` : textures CC0 Poly Haven (béton, noyer, mur). `assets/showroom/*.glb` : casques (CC BY) + mobilier/plantes CC0 Poly Haven (optimisés gltf-transform : meshopt + webp 1k). `assets/scene/shop-poster.webp` : image de secours sans WebGL.
- `assets/showroom/helmet-a|b.glb` : casques CC BY (crédits dans `mentions-legales.html`).
- `assets/vendor/` : three r170 (+ addons utilisés), GSAP 3.12.5, Lenis 1.1.0 (option `prevent` obligatoire).

## Outils (`tools/`)
- `film.js <w> <h> <dossier> <N> [de] [à]` : tournage du film (Playwright, tranches parallélisables) ; puis `python3 tools/film-pack.py <dossier> d|m` → `assets/film/`. ~7 s/image en Chromium logiciel.
- `build-preview.sh [sortie]` : aperçu autonome en un fichier (`inline.py` embarque tout, y compris le film via `window.__AIRO_FILES`).
- `texgen.html` + `texgen-export.js` : redessine les textes/pictos nets de la borne par-dessus la photo.
- `still.js <w> <h> <fraction> <png>` : rendu fixe de la scène sans textes (images des sections technologie et professionnels).
- `journey.js <w> <h> <tag>` : une capture par arrêt du parcours caméra.
- `viewer.html?m=assets/showroom/x.glb` : inspecter un modèle. `capture.js <w> <h> <tag> <fractions>` : captures de la scène 3D (Playwright, reducedMotion).
- Tests locaux : `python3 -m http.server 8765`. Chromium logiciel = 3D très lente : prévoir de longs délais, Lighthouse plante quand la 3D tourne (utiliser `--disable-gpu` pour mesurer le chargement).

## Direction visuelle
- Style « film de course » (type Ducati) choisi par le client : noir profond, titres en capitales serrées, chapitres numérotés (`01 —`), accents bleu AIRO. Matières verre dépoli (skill `apple-design`).

## Règles de travail
- Changements chirurgicaux, pas de refonte non demandée ; vérifier (captures desktop 1280×800 + mobile 390×844) avant d'annoncer « fini ».
- Commits : `-c user.name="Claude" -c user.email="noreply@anthropic.com"`, messages en français.
- Fichiers `_*.html` et `_glbtest/` : brouillons locaux exclus du dépôt.
- Ne pas afficher le prix (6 000 € HT) sans accord du client. Domaine prévu : airoclean.fr (pas encore de CNAME).

## Style de réponse (accord du client)
- Mode court par défaut (skill `caveman`) : en français, réponse d'abord, sans politesses ni récapitulatif, phrases courtes ; tous les faits techniques gardés. « mode normal » pour revenir aux explications détaillées.
- Une grosse tâche = une nouvelle session : ce fichier redonne le contexte.
