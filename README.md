# AIRO — site vitrine

Site de présentation de la machine AIRO (nettoyage, désinfection et séchage de casques par vapeur sèche), avec formulaire de demande de devis.

## Structure

- `index.html` — page unique : expérience 3D (accueil, borne annotée à 360°, 4 étapes du cycle), problème, technologie, professionnels, fiche technique, secteurs, devis.
- `style.css` — direction « industriel premium » : noir mat, typographie Archivo ultra-condensée, un seul accent bleu AIRO ; responsive mobile.
- `assets/fonts/` — police Archivo (licence SIL OFL) hébergée avec le site.
- `script.js` — écran d'intro, menu mobile, animations au défilement, validation et envoi du formulaire.
- `assets/js/experience.js` — la borne AIRO modélisée en 3D (Three.js) : rotation à 360°, écran tactile animé, portes des casiers A et B qui s'ouvrent, casque, vapeur, fumée et néons. L'animation suit le défilement de la page ; on peut aussi faire tourner la borne à la souris ou au doigt.
- `assets/vendor/three/` — moteur 3D Three.js (r170, licence MIT) hébergé avec le site.
- `assets/js/motion.js` — défilement fluide (Lenis) et animations GSAP : titre révélé mot à mot, titres de sections, aperçu des secteurs, profondeur du pied de page.
- `assets/vendor/gsap/` (GSAP 3.12.5, licence « Standard no charge ») et `assets/vendor/lenis/` (Lenis 1.1.0, MIT).
- `confidentialite.html` — informations sur les données du formulaire (RGPD).
- `mentions-legales.html` — mentions légales (éditeur, hébergeur, propriété intellectuelle).
- `assets/docs/AIRO-CGV.pdf` — conditions générales de vente (clients professionnels).
- `assets/img/` — photos extraites de la présentation AIRO, logo et favicon.

Si le navigateur ne gère pas la 3D (WebGL), la photo de la borne s'affiche à la place. Les animations sont réduites quand le visiteur a activé « réduire les animations » sur son appareil.

## Formulaire de devis

Les demandes sont envoyées à **airo.casque@gmail.com** via [FormSubmit](https://formsubmit.co) (aucun serveur nécessaire).

**Activation (une seule fois)** : à la toute première demande envoyée depuis le site en ligne, FormSubmit envoie un e-mail « Confirm your email » à airo.casque@gmail.com. Il faut cliquer sur le lien d'activation ; ensuite chaque demande arrive directement dans la boîte mail. L'adresse de réponse est celle du client, il suffit donc de cliquer « Répondre ».

Si l'envoi échoue, le site propose au visiteur d'envoyer sa demande par e-mail (lien pré-rempli).

## Mise en ligne avec GitHub Pages

1. Dans le dépôt : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
3. Le site est disponible après une minute à l'adresse `https://airocasque.github.io/airo-site/`.

Pour un nom de domaine personnalisé (ex. `airo-casque.fr`), le renseigner dans la même page *Pages → Custom domain*.

## Aperçu en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```
