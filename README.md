# AIRO — site vitrine

Site de présentation de la machine AIRO (nettoyage, désinfection et séchage de casques par vapeur sèche), avec formulaire de demande de devis.

## Structure

- `index.html` — page unique : accueil, problème, solution, fonctionnement, technologie, professionnels, secteurs, devis.
- `style.css` — styles (thème sombre, accent bleu AIRO), responsive mobile.
- `script.js` — menu mobile, animations au défilement, validation et envoi du formulaire.
- `assets/img/` — photos extraites de la présentation AIRO, logo et favicon.

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
