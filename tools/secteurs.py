# Pages par secteur (SEO) : python3 tools/secteurs.py
# Génère secteurs/<slug>.html à partir des blocs de index.html (formulaire, pied de page, barre mobile)
# et des textes ci-dessous. Relancer après toute modification de ces blocs dans index.html.
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://airocasque.github.io/airo-site/"
home = (ROOT / "index.html").read_text()

def block(start, end):
    i = home.index(start); j = home.index(end, i) + len(end)
    return home[i:j]

def up(html):
    # typographie française : espace insécable avant « : » et « ? » (jamais en début de ligne)
    html = html.replace(" :", "\u00a0:").replace(" ?", "\u00a0?")
    # chemins relatifs depuis secteurs/
    html = re.sub(r'(href|src|poster)="(?!#|https?:|tel:|mailto:|\.\./)([^"]+)"', r'\1="../\2"', html)
    return html

SECTEURS = [
    {
        "slug": "karting",
        "option": "Karting ou centre de loisirs",
        "menu": "Karting",
        "title": "Borne de nettoyage de casques pour karting",
        "desc": "Borne AIRO pour pistes de karting : les casques prêtés aux pilotes sont nettoyés, désinfectés et séchés à la vapeur sèche en 3 à 10 minutes. Deux casiers, paiement par carte.",
        "h1": "Des casques prêtés.<br>Toujours frais.",
        "sub": "La borne AIRO nettoie, désinfecte et sèche les casques de karting à la vapeur sèche, entre deux sessions.",
        "why_t": "Sur une piste, le casque passe de tête en tête.",
        "why": [
            ("Hygiène visible", "Un casque prêté qui sent la transpiration, vos pilotes le remarquent. Un casque qui sort de la borne, ils le remarquent aussi."),
            ("Deux casiers en parallèle", "Deux casques se nettoient en même temps, indépendamment. Le séchage seul ne prend que 3 minutes."),
            ("Un service en plus", "Vos clients qui viennent avec leur propre casque peuvent aussi le nettoyer, en libre-service, au tarif que vous fixez."),
        ],
        "img": ("film/m/080.webp", "Deux casques de karting dans les casiers A et B de la borne AIRO"),
        "faq": [
            ("Les casques de karting sont-ils compatibles ?", "Oui. Intégraux, jets et casques de karting passent dans les casiers, ainsi que les casques équipés d’intercom."),
            ("Combien de temps entre deux pilotes ?", "Séchage seul en 3 minutes, nettoyage rapide en 7 minutes, nettoyage avancé en 10 minutes. Les deux casiers fonctionnent en même temps."),
        ],
    },
    {
        "slug": "concession-moto",
        "option": "Concession ou magasin moto",
        "menu": "Concession moto",
        "title": "Borne de nettoyage de casques pour concession moto",
        "desc": "Borne AIRO pour concessions et magasins moto : nettoyage, désinfection et séchage des casques à la vapeur sèche pendant que vos clients attendent. Deux casiers, paiement par carte.",
        "h1": "Un service de plus<br>en concession.",
        "sub": "Pendant l’entretien de la moto, le casque du client ressort propre, désinfecté et sec.",
        "why_t": "Le casque, c’est ce que vos clients portent tous les jours.",
        "why": [
            ("Pendant l’attente", "Un passage à l’atelier, un essai, un achat : le client lance le nettoyage et repart avec un casque frais."),
            ("Casques d’essai", "Les casques essayés en magasin passent de client en client. La borne les remet au propre en quelques minutes."),
            ("Revenu sans personnel", "Le client paie par carte sur la borne. Vous fixez le tarif, la borne fait le reste."),
        ],
        "img": ("img/pros-showroom.webp", "La borne AIRO installée dans un espace d’accueil"),
        "faq": [
            ("Quels casques moto sont compatibles ?", "Intégral, modulable, jet et trail. Les casques équipés d’intercom sont compatibles."),
            ("Faut-il un vendeur pour l’utiliser ?", "Non. Le client choisit son programme sur l’écran tactile et paie par carte, directement sur la borne."),
        ],
    },
    {
        "slug": "centre-equestre",
        "option": "Centre équestre",
        "menu": "Centre équestre",
        "title": "Borne de nettoyage de casques d’équitation",
        "desc": "Borne AIRO pour centres équestres et poney-clubs : les casques d’équitation prêtés aux cavaliers sont nettoyés, désinfectés et séchés à la vapeur sèche en 3 à 10 minutes.",
        "h1": "Des casques d’équitation<br>propres à chaque reprise.",
        "sub": "La borne AIRO nettoie, désinfecte et sèche les casques prêtés aux cavaliers, à la vapeur sèche.",
        "why_t": "Au club, les casques de prêt changent de tête à chaque reprise.",
        "why": [
            ("Rassurer les familles", "Les parents voient que le casque prêté à leur enfant a été nettoyé et désinfecté."),
            ("Après la pluie", "Le programme séchage seul remet un casque mouillé en état en 3 minutes."),
            ("Pour les cavaliers aussi", "Les propriétaires de leur casque peuvent le nettoyer en libre-service, au tarif que vous fixez."),
        ],
        "img": ("film/m/125.webp", "Écran « Casque prêt » de la borne AIRO"),
        "faq": [
            ("Les casques d’équitation sont-ils compatibles ?", "Oui, les casques d’équitation font partie des casques acceptés, comme les casques de ski, de vélo ou de moto."),
            ("La vapeur abîme-t-elle le casque ?", "Le cycle utilise de la vapeur sèche, suivie d’un séchage intégré. Le casque ressort sec, prêt à être porté."),
        ],
    },
    {
        "slug": "station-ski",
        "option": "Station de ski ou club sportif",
        "menu": "Station de ski",
        "title": "Borne de nettoyage de casques de ski",
        "desc": "Borne AIRO pour stations de ski et loueurs : les casques de ski de location sont nettoyés, désinfectés et séchés à la vapeur sèche entre deux clients, en 3 à 10 minutes.",
        "h1": "Des casques de ski<br>propres, de location en location.",
        "sub": "La borne AIRO nettoie, désinfecte et sèche les casques de ski à la vapeur sèche, en libre-service.",
        "why_t": "En location, un casque change de client chaque jour.",
        "why": [
            ("Entre deux clients", "Nettoyage rapide en 7 minutes, deux casiers en parallèle : le casque rendu repart propre."),
            ("Séchage intégré", "Neige, transpiration : le cycle se termine par un séchage, le casque est prêt à être reloué."),
            ("Libre-service en station", "Les skieurs qui ont leur propre casque le nettoient eux-mêmes et paient par carte sur la borne."),
        ],
        "img": ("film/m/100.webp", "Cycle de nettoyage en cours dans la borne AIRO"),
        "faq": [
            ("Les casques de ski sont-ils compatibles ?", "Oui, les casques de ski font partie des casques acceptés, tout comme les casques de vélo et d’équitation."),
            ("Qui fixe le prix pour les skieurs ?", "Vous. Les tarifs et les programmes proposés se règlent selon votre activité."),
        ],
    },
    {
        "slug": "circuit",
        "option": "Circuit ou sport automobile",
        "menu": "Circuit",
        "title": "Borne de nettoyage de casques pour circuits et stages de pilotage",
        "desc": "Borne AIRO pour circuits, écoles et stages de pilotage : les casques auto et moto prêtés aux participants sont nettoyés, désinfectés et séchés à la vapeur sèche en 3 à 10 minutes.",
        "h1": "Des casques de piste<br>propres à chaque roulage.",
        "sub": "Stages, baptêmes, journées de roulage : la borne AIRO remet les casques prêtés au propre entre deux participants.",
        "why_t": "Sur circuit, un casque prêté sert plusieurs fois par jour.",
        "why": [
            ("Entre deux participants", "Nettoyage rapide en 7 minutes ou séchage seul en 3 minutes. Deux casiers fonctionnent en même temps."),
            ("Casques auto et moto", "Intégraux, jets, casques de sport automobile : les casques acceptés couvrent vos usages de piste."),
            ("Pour les pilotes aussi", "Les pilotes qui roulent avec leur propre casque le nettoient en libre-service et paient par carte."),
        ],
        "img": ("film/m/145.webp", "La borne AIRO sur son socle"),
        "faq": [
            ("Les casques de sport automobile sont-ils compatibles ?", "Oui, les casques automobile font partie des casques acceptés, avec les intégraux, modulables, jets et casques de karting."),
            ("Les casques avec intercom passent-ils ?", "Oui, les casques équipés d’intercom sont compatibles."),
        ],
    },
    {
        "slug": "moto-ecole",
        "option": "Auto-école ou centre de formation",
        "menu": "Moto-école",
        "title": "Borne de nettoyage de casques pour moto-école",
        "desc": "Borne AIRO pour moto-écoles et centres de formation : les casques prêtés aux élèves sont nettoyés, désinfectés et séchés à la vapeur sèche entre deux leçons, en 3 à 10 minutes.",
        "h1": "Des casques d’élèves<br>propres à chaque leçon.",
        "sub": "La borne AIRO nettoie, désinfecte et sèche les casques prêtés à vos élèves, à la vapeur sèche.",
        "why_t": "En moto-école, les casques de prêt changent d’élève à chaque leçon.",
        "why": [
            ("Rassurer les élèves", "Un élève qui débute est plus à l’aise avec un casque qui sort de la borne, propre et sans odeur."),
            ("Entre deux leçons", "Nettoyage rapide en 7 minutes, deux casiers en parallèle : le casque est prêt pour l’élève suivant."),
            ("Sans y passer du temps", "Le casque se dépose, le cycle se lance sur l’écran, la borne s’occupe du reste."),
        ],
        "img": ("film/m/055.webp", "Écran de sélection du programme de la borne AIRO"),
        "faq": [
            ("Quels casques de moto-école sont compatibles ?", "Intégral, modulable, jet et trail. Les casques équipés d’intercom sont compatibles."),
            ("Faut-il former le personnel ?", "La prise en main est incluse lorsqu’elle figure au devis. L’utilisation se fait sur l’écran tactile, en quelques gestes."),
        ],
    },
    {
        "slug": "location-moto",
        "option": "Atelier, garage ou loueur",
        "menu": "Location moto et scooter",
        "title": "Borne de nettoyage de casques pour location de motos et scooters",
        "desc": "Borne AIRO pour loueurs de motos et scooters : les casques fournis avec la location sont nettoyés, désinfectés et séchés à la vapeur sèche entre deux clients, en 3 à 10 minutes.",
        "h1": "Le casque de location,<br>propre à chaque client.",
        "sub": "La borne AIRO nettoie, désinfecte et sèche les casques fournis avec vos locations, à la vapeur sèche.",
        "why_t": "En location, le casque change de client à chaque retour.",
        "why": [
            ("Au retour du véhicule", "Le casque rendu passe dans la borne : nettoyage rapide en 7 minutes, avancé en 10 minutes."),
            ("Une image soignée", "Vos clients voient que le casque qu’on leur remet a été nettoyé et désinfecté."),
            ("Un service en plus", "Les clients qui ont leur propre casque peuvent aussi le nettoyer, en libre-service, au tarif que vous fixez."),
        ],
        "img": ("img/tech-locker.webp", "Casier de la borne AIRO"),
        "faq": [
            ("Quels casques sont compatibles ?", "Intégral, modulable, jet, trail et casques de vélo, entre autres. Les casques équipés d’intercom sont compatibles."),
            ("Deux casques à la fois ?", "Oui, les casiers A et B fonctionnent indépendamment et en même temps."),
        ],
    },
]

COMMON_FAQ = [
    ("Comment les clients paient-ils ?", "Directement sur la borne, par carte bancaire, grâce au terminal de paiement intégré. Aucun personnel n’est nécessaire."),
    ("L’installation et la formation sont-elles comprises ?", "Livraison, installation et prise en main sont incluses lorsqu’elles figurent au devis."),
    ("Quelle garantie, et qui assure le SAV ?", "La borne est garantie 12 mois pièces et main-d’œuvre. Le service après-vente est assuré par AIRO dans les Bouches-du-Rhône ; ailleurs, les modalités sont fixées au devis."),
]

form = block('<form class="form reveal" id="quoteForm"', '</form>')
sent = block('<div class="sent" id="formSent"', '</div>\n')
contact = block('<ul class="contact reveal">', '</ul>')
foot = block('<footer class="foot"', '</footer>')
dock = block('<div class="dock" id="dock"', '</div>')
foot = foot.replace('href="#points"', 'href="index.html#points"').replace('href="#programmes"', 'href="index.html#programmes"') \
           .replace('href="#caracteristiques"', 'href="index.html#caracteristiques"').replace('href="#faq"', 'href="index.html#faq"')

def page(s):
    url = f"{SITE}secteurs/{s['slug']}.html"
    faq = s["faq"] + COMMON_FAQ
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "AIRO", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": s["menu"], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]}
    f = form.replace('id="quoteForm"', f'id="quoteForm" data-sector="{s["option"]}"')
    why = "\n".join(f'        <div class="why__i reveal"><h3>{h}</h3><p>{p}</p></div>' for h, p in s["why"])
    faqh = "\n".join(f'      <details><summary>{q}</summary><div><p>{a}</p></div></details>' for q, a in faq)
    others = "\n".join(f'        <li><a href="../secteurs/{o["slug"]}.html">{o["menu"]}</a></li>' for o in SECTEURS if o is not s)
    img, alt = s["img"]
    body = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{s["title"]} | AIRO</title>
<meta name="description" content="{s["desc"]}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{s["title"]} | AIRO">
<meta property="og:description" content="{s["desc"]}">
<meta property="og:image" content="{SITE}assets/img/og/{s["slug"]}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="AIRO">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=1)}
</script>
<link rel="icon" href="assets/img/favicon.png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preload" as="image" href="assets/img/machine.webp" fetchpriority="high">
<link rel="stylesheet" href="apple/apple.css">
<script>document.documentElement.className="js"</script>
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>

<header class="nav" id="nav" data-theme="dark">
  <div class="nav__in">
    <a class="nav__logo" href="index.html" aria-label="AIRO, accueil"><img src="assets/img/logo-sm.webp" alt="" width="64" height="24">AIRO</a>
    <nav class="nav__links" aria-label="Sections">
      <a href="index.html">La borne</a>
      <a href="#pourquoi">Pourquoi</a>
      <a href="#programmes">Programmes</a>
      <a href="#faq">FAQ</a>
    </nav>
    <a class="pill pill--sm" href="#devis">Devis</a>
    <button class="nav__toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="navSheet" aria-label="Ouvrir le menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9.5 6 6 6-6"/></svg></button>
  </div>
  <div class="nav__sheet" id="navSheet" hidden>
    <a href="index.html">Découvrir la borne</a>
    <a href="#pourquoi">Pourquoi</a>
    <a href="#programmes">Programmes</a>
    <a href="#faq">FAQ</a>
    <a href="#devis">Demander un devis</a>
  </div>
</header>

<main id="main">

<section class="hero" id="top" data-theme="dark">
  <p class="crumb in-1"><a href="index.html">AIRO</a> <span aria-hidden="true">›</span> {s["menu"]}</p>
  <h1 class="hero__title hero__title--sm in-1">{s["h1"]}</h1>
  <p class="hero__sub in-2">{s["sub"]}</p>
  <div class="hero__cta in-3">
    <a class="pill" href="#devis">Demander un devis</a>
    <a class="link" href="index.html">Découvrir la borne <span aria-hidden="true">›</span></a>
  </div>
  <figure class="hero__machine in-4">
    <img src="assets/img/machine.webp" alt="La borne AIRO : écran tactile, deux casiers vitrés A et B" width="581" height="1000" fetchpriority="high">
  </figure>
</section>

<section class="sec" id="pourquoi" data-theme="light" aria-labelledby="why-t">
  <div class="wrap">
    <h2 class="h2 reveal" id="why-t">{s["why_t"]}</h2>
    <div class="why">
{why}
    </div>
  </div>
</section>

<section class="sec sec--dark" id="borne" data-theme="dark" aria-labelledby="borne-t">
  <div class="wrap feature">
    <figure class="feature__img reveal"><img src="assets/{img}" alt="{alt}" loading="lazy"></figure>
    <div class="feature__txt">
      <h2 class="h2 reveal" id="borne-t">Vapeur sèche.<br>Désinfection.<br>Séchage.</h2>
      <p class="lead reveal">99,9 % des bactéries éliminées et les odeurs neutralisées. Deux casiers indépendants, un écran tactile, un terminal de paiement par carte.</p>
      <p class="reveal"><a class="link" href="index.html#essai">Essayer l’écran de la borne <span aria-hidden="true">›</span></a></p>
    </div>
  </div>
</section>

<section class="sec sec--light" id="programmes" data-theme="light" aria-labelledby="prog-t">
  <div class="wrap">
    <h2 class="h2 reveal" id="prog-t">Trois programmes.</h2>
    <div class="prog">
      <article class="prog__i reveal"><p class="prog__n">10<small>min</small></p><h3>Nettoyage avancé</h3><p>Vapeur sèche, désinfection et séchage complet.</p></article>
      <article class="prog__i reveal"><p class="prog__n">7<small>min</small></p><h3>Nettoyage rapide</h3><p>Pour un casque porté au quotidien.</p></article>
      <article class="prog__i reveal"><p class="prog__n">3<small>min</small></p><h3>Séchage seul</h3><p>Après la pluie ou une séance intense.</p></article>
    </div>
    <p class="note reveal">Programmes et tarifs réglables par l’exploitant. <a class="link" href="index.html#rentabilite">Estimer vos revenus <span aria-hidden="true">›</span></a></p>
  </div>
</section>

<section class="sec" id="faq" data-theme="light" aria-labelledby="faq-t">
  <div class="wrap wrap--narrow">
    <h2 class="h2 reveal" id="faq-t">Questions fréquentes.</h2>
    <div class="faq">
{faqh}
    </div>
  </div>
</section>

<section class="sec sec--light" id="devis" data-theme="light" aria-labelledby="devis-t">
  <div class="wrap wrap--narrow">
    <h2 class="h2 h2--center reveal" id="devis-t">Parlons de votre projet.</h2>
    <p class="lead lead--center reveal">Dites-nous où vous voulez installer la borne. Nous répondons avec une proposition adaptée.</p>
    <p class="dl reveal"><a href="assets/docs/AIRO-brochure.pdf" download><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/></svg>Télécharger la brochure <span>PDF, 4 pages</span></a></p>

    {f}

    {sent}
    {contact}

    <nav class="others reveal" aria-label="Autres secteurs">
      <p>La borne AIRO, ailleurs :</p>
      <ul>
{others}
      </ul>
    </nav>
  </div>
</section>

</main>

{dock}

{foot}

<script src="apple/apple.js" defer></script>
</body>
</html>
'''
    return up(body)

out = ROOT / "secteurs"; out.mkdir(exist_ok=True)
for s in SECTEURS:
    (out / f"{s['slug']}.html").write_text(page(s))
    print("secteurs/" + s["slug"] + ".html")

# Plan du site (accueil, secteurs, guides présents sur le disque, pages légales)
def sitemap():
    urls = [SITE] + [f"{SITE}secteurs/{p.name}" for p in sorted((ROOT / "secteurs").glob("*.html"))]
    if (ROOT / "guides").is_dir():
        urls += [f"{SITE}guides/"] + [f"{SITE}guides/{p.name}" for p in sorted((ROOT / "guides").glob("*.html")) if p.name != "index.html"]
    urls += [SITE + "mentions-legales.html", SITE + "confidentialite.html"]
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    print("sitemap.xml")

if __name__ == "__main__":
    sitemap()
