# Guides pratiques (SEO) : python3 tools/guides.py
# Génère guides/<slug>.html + guides/index.html à partir des textes ci-dessous et des blocs de index.html
# (pied de page, barre mobile), puis relance tools/secteurs.py pour le plan du site.
# Règle : conseils d'entretien couramment admis, renvoi systématique à la notice du fabricant, aucun chiffre inventé.
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://airocasque.github.io/airo-site/"
home = (ROOT / "index.html").read_text()

def block(start, end):
    i = home.index(start); j = home.index(end, i) + len(end)
    return home[i:j]

def up(html):
    # typographie française : espace insécable avant « : » et « ? » (jamais en début de ligne)
    html = html.replace(" :", "\u00a0:").replace(" ?", "\u00a0?")
    return re.sub(r'(href|src|poster)="(?!#|https?:|tel:|mailto:|\.\./)([^"]+)"', r'\1="../\2"', html)

foot = block('<footer class="foot"', '</footer>')
for a in ("points", "programmes", "caracteristiques", "faq"):
    foot = foot.replace(f'href="#{a}"', f'href="index.html#{a}"')
dock = block('<div class="dock" id="dock"', '</div>')

GUIDES = [
    {
        "slug": "nettoyer-casque-moto",
        "title": "Comment nettoyer un casque de moto",
        "desc": "Calotte, écran, intérieur : comment nettoyer un casque de moto sans l’abîmer, les produits à éviter et comment bien le sécher. Guide pratique AIRO.",
        "lead": "Calotte, écran, mousses : chaque partie se nettoie différemment. Voici la méthode, et les erreurs qui abîment un casque.",
        "sector": ("concession-moto", "Une borne AIRO en concession"),
        "body": """
<p>Un casque se porte au plus près du visage, souvent pendant des heures. Transpiration, poussière, insectes : il se salit vite, à l’extérieur comme à l’intérieur. Le nettoyer régulièrement le garde agréable à porter et aide à préserver ses matériaux.</p>
<p class="tip">Avant tout : lisez la notice de votre casque. Le fabricant indique les parties démontables, les produits autorisés et la façon de les laver. Ses consignes priment sur ce guide.</p>

<h2>1. L’extérieur : la calotte</h2>
<ol>
<li>Posez un chiffon humide et tiède sur la calotte quelques minutes pour ramollir les insectes collés.</li>
<li>Nettoyez à l’eau tiède avec un savon doux et un chiffon microfibre, sans frotter fort.</li>
<li>Rincez avec un chiffon propre et humide, puis essuyez avec une microfibre sèche.</li>
</ol>

<h2>2. L’écran</h2>
<ul>
<li>Utilisez de l’eau tiède savonneuse et une microfibre propre. Un grain de poussière frotté à sec suffit à rayer l’écran.</li>
<li>Si l’écran a un traitement antibuée ou un film intérieur, suivez strictement la notice : certains traitements ne supportent ni produit ni frottement.</li>
<li>Démontez l’écran seulement si le fabricant le prévoit, avec le mécanisme indiqué.</li>
</ul>

<h2>3. L’intérieur : mousses et coussinets</h2>
<p>C’est la partie qui absorbe la transpiration, et celle qui sent le plus vite.</p>
<ul>
<li><strong>Intérieur amovible :</strong> retirez-le et lavez-le comme indiqué par le fabricant, en général à la main, à l’eau tiède et au savon doux. Rincez sans tordre.</li>
<li><strong>Intérieur fixe :</strong> nettoyez avec un chiffon humide et un peu de savon doux, sans détremper la mousse, puis laissez sécher.</li>
</ul>

<h2>4. Le séchage</h2>
<p>Laissez sécher à l’air libre, dans un endroit aéré, à l’abri du soleil direct et loin des sources de chaleur. Remontez l’intérieur uniquement quand il est complètement sec.</p>

<h2>Ce qu’il faut éviter</h2>
<ul>
<li>Les solvants, l’essence, les dégraissants et les produits agressifs : ils peuvent abîmer la calotte, l’écran et les matériaux intérieurs.</li>
<li>Le nettoyeur haute pression.</li>
<li>La chaleur directe pour sécher : radiateur, sèche-cheveux chaud, soleil en plein été.</li>
</ul>

<h2>Et si l’on n’a pas le temps de tout démonter ?</h2>
<p>C’est le principe de la borne AIRO : le casque se dépose entier dans un casier, sans démontage. Le cycle combine vapeur sèche, désinfection et séchage intégré, en 3 à 10 minutes selon le programme. Selon AIRO, il élimine 99,9 % des bactéries et neutralise les odeurs.</p>
""",
    },
    {
        "slug": "hygiene-casques-pret",
        "title": "Casques de prêt : garder une hygiène irréprochable",
        "desc": "Karting, circuits, centres équestres, moto-écoles, location : comment organiser l’hygiène des casques prêtés à vos clients. Guide pratique AIRO.",
        "lead": "Karting, piste, club, école ou location : quand un casque passe de tête en tête, l’hygiène devient un sujet pour vos clients. Voici comment l’organiser.",
        "sector": ("karting", "Une borne AIRO en karting"),
        "body": """
<p>Un casque prêté est l’un des premiers objets que votre client touche. S’il sent la transpiration ou paraît négligé, c’est toute l’expérience qui en souffre. À l’inverse, un casque visiblement propre rassure, surtout les débutants et les familles.</p>

<h2>Pourquoi les casques de prêt demandent plus d’attention</h2>
<ul>
<li>Ils sont portés par des personnes différentes, parfois plusieurs fois par jour.</li>
<li>La transpiration et l’humidité s’accumulent dans les mousses intérieures.</li>
<li>Entre deux utilisations, le temps manque pour un nettoyage complet à la main.</li>
</ul>

<h2>Les bonnes pratiques</h2>
<ol>
<li><strong>Une rotation de casques.</strong> Avoir assez de casques pour qu’un casque rendu puisse sécher avant d’être prêté à nouveau.</li>
<li><strong>Un sous-casque pour chaque client.</strong> La cagoule ou charlotte individuelle, très répandue en karting, limite le contact direct avec les mousses.</li>
<li><strong>Un séchage systématique.</strong> Un casque rangé humide, dans un bac fermé, développe vite des odeurs.</li>
<li><strong>Un nettoyage régulier de l’intérieur,</strong> selon la notice du fabricant.</li>
<li><strong>Un contrôle visuel</strong> à chaque retour : sangle, boucle, écran, calotte. Un casque abîmé ou ayant subi un choc se retire du parc, conformément aux recommandations du fabricant.</li>
</ol>

<h2>Le montrer à vos clients</h2>
<p>L’hygiène rassure surtout quand elle se voit. Un casque qui sort d’un équipement de nettoyage, devant le client, en dit plus qu’une affiche.</p>

<h2>Gagner du temps entre deux utilisations</h2>
<p>La borne AIRO traite deux casques en même temps, dans deux casiers indépendants. Séchage seul en 3 minutes, nettoyage rapide en 7 minutes, nettoyage avancé en 10 minutes, sans démontage. Vos clients qui viennent avec leur propre casque peuvent aussi l’utiliser en libre-service et payer par carte sur la borne.</p>
""",
    },
    {
        "slug": "secher-casque-mouille",
        "title": "Comment sécher un casque mouillé",
        "desc": "Pluie, transpiration, neige : comment sécher correctement un casque mouillé sans l’abîmer, et pourquoi éviter la chaleur directe. Guide pratique AIRO.",
        "lead": "Après une averse ou une séance intense, un casque mouillé doit sécher vite, mais pas n’importe comment.",
        "sector": ("station-ski", "Une borne AIRO en station de ski"),
        "body": """
<p>Un casque qui reste humide devient désagréable à porter et finit par sentir mauvais. Le réflexe de le poser sur un radiateur est pourtant à éviter.</p>

<h2>La méthode</h2>
<ol>
<li><strong>Ouvrez l’écran</strong> pour laisser circuler l’air.</li>
<li><strong>Retirez l’intérieur s’il est amovible</strong> et faites sécher chaque pièce séparément.</li>
<li><strong>Épongez sans frotter :</strong> un chiffon sec ou du papier absorbant, posé à l’intérieur, retire une bonne partie de l’eau.</li>
<li><strong>Laissez sécher à l’air ambiant,</strong> dans une pièce aérée, à l’abri du soleil direct.</li>
<li><strong>Remontez l’intérieur</strong> une fois tout parfaitement sec.</li>
</ol>

<h2>Pourquoi éviter la chaleur directe</h2>
<p>Radiateur, sèche-cheveux chaud, coffre de voiture en plein soleil : une chaleur forte peut abîmer les matériaux du casque, la calotte, les mousses ou les colles. Reportez-vous à la notice du fabricant, qui précise les conditions à respecter.</p>

<h2>Et le casque rangé humide ?</h2>
<p>Un casque fermé dans un sac ou un bac alors qu’il est encore humide sèche mal et développe des odeurs. Laissez-le toujours à l’air libre après usage.</p>

<h2>Sécher en quelques minutes</h2>
<p>La borne AIRO propose un programme dédié : le séchage seul, en 3 minutes, sans démontage. Pour un casque à la fois mouillé et sale, le nettoyage avancé enchaîne vapeur sèche, désinfection et séchage en 10 minutes.</p>
""",
    },
    {
        "slug": "odeurs-casque",
        "title": "Pourquoi un casque sent mauvais, et comment l’éviter",
        "desc": "D’où viennent les mauvaises odeurs d’un casque, comment les éliminer et les gestes simples pour qu’elles ne reviennent pas. Guide pratique AIRO.",
        "lead": "Transpiration, humidité, chaleur : les mauvaises odeurs d’un casque ont des causes simples. Les éviter aussi.",
        "sector": ("location-moto", "Une borne AIRO en location"),
        "body": """
<p>Les mousses intérieures absorbent la transpiration à chaque utilisation. Si le casque n’a pas le temps de sécher, l’humidité reste piégée au chaud et les odeurs s’installent.</p>

<h2>Les causes</h2>
<ul>
<li><strong>La transpiration,</strong> absorbée par les mousses et les coussinets.</li>
<li><strong>L’humidité</strong> qui ne s’évacue pas : casque rangé fermé, dans un sac ou un top-case.</li>
<li><strong>Le manque de nettoyage</strong> de l’intérieur.</li>
</ul>

<h2>Éliminer les odeurs</h2>
<ol>
<li>Nettoyez l’intérieur selon la notice du fabricant : lavage des mousses amovibles, ou nettoyage au chiffon humide pour un intérieur fixe.</li>
<li>Séchez complètement, à l’air libre, loin des sources de chaleur.</li>
<li>Évitez de masquer l’odeur avec un parfum : elle revient tant que la cause reste.</li>
</ol>

<h2>Empêcher qu’elles reviennent</h2>
<ul>
<li>Laissez le casque ouvert et à l’air après chaque sortie.</li>
<li>Portez un sous-casque ou une cagoule, plus facile à laver que les mousses.</li>
<li>Nettoyez l’intérieur régulièrement, surtout en été ou après un effort intense.</li>
</ul>

<h2>Pour les professionnels</h2>
<p>Quand les casques passent d’un client à l’autre, il faut une solution rapide. La borne AIRO nettoie le casque entier, sans démontage, avec un cycle vapeur sèche, désinfection et séchage. Selon AIRO, elle élimine 99,9 % des bactéries et neutralise les odeurs, en 3 à 10 minutes selon le programme.</p>
""",
    },
]

def words(html):
    return len(re.sub(r"<[^>]+>", " ", html).split())

NAV = '''<header class="nav" id="nav" data-theme="light">
  <div class="nav__in">
    <a class="nav__logo" href="index.html" aria-label="AIRO, accueil"><img src="assets/img/logo-sm.webp" alt="" width="64" height="24">AIRO</a>
    <nav class="nav__links" aria-label="Sections">
      <a href="index.html">La borne</a>
      <a href="guides/">Guides</a>
      <a href="index.html#essai">Essayer</a>
      <a href="index.html#faq">FAQ</a>
    </nav>
    <a class="pill pill--sm" href="index.html#devis">Devis</a>
    <button class="nav__toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="navSheet" aria-label="Ouvrir le menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9.5 6 6 6-6"/></svg></button>
  </div>
  <div class="nav__sheet" id="navSheet" hidden>
    <a href="index.html">Découvrir la borne</a>
    <a href="guides/">Tous les guides</a>
    <a href="index.html#essai">Essayer l’écran</a>
    <a href="index.html#faq">FAQ</a>
    <a href="index.html#devis">Demander un devis</a>
  </div>
</header>'''

def head(title, desc, url, og, ld):
    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} | AIRO</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#f5f5f7">
<meta name="color-scheme" content="light">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}assets/img/og/{og}.jpg">
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
<link rel="stylesheet" href="apple/apple.css">
<script>document.documentElement.className="js"</script>
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>

{NAV}
'''

def tail():
    return f'''
{dock}

{foot}

<script src="apple/apple.js" defer></script>
</body>
</html>
'''

def guide(g):
    url = f"{SITE}guides/{g['slug']}.html"
    mins = max(2, round(words(g["body"]) / 200))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": g["title"], "description": g["desc"], "inLanguage": "fr-FR",
         "image": f"{SITE}assets/img/og/{g['slug']}.jpg", "mainEntityOfPage": url,
         "author": {"@type": "Organization", "name": "AIRO"}, "publisher": {"@type": "Organization", "name": "AIRO"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "AIRO", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": SITE + "guides/"},
            {"@type": "ListItem", "position": 3, "name": g["title"], "item": url}]},
    ]}
    sec_slug, sec_label = g["sector"]
    others = "\n".join(f'      <li><a href="../guides/{o["slug"]}.html">{o["title"]}</a></li>' for o in GUIDES if o is not g)
    html = head(g["title"], g["desc"], url, g["slug"], ld) + f'''
<main id="main">
<article class="sec art" data-theme="light">
  <div class="wrap art__wrap">
    <p class="crumb crumb--light"><a href="index.html">AIRO</a> <span aria-hidden="true">›</span> <a href="guides/">Guides</a></p>
    <h1 class="art__t">{g["title"]}</h1>
    <p class="art__lead">{g["lead"]}</p>
    <p class="art__meta">Guide pratique · {mins} min de lecture</p>
    <div class="art__body">
{g["body"]}
    </div>
    <aside class="art__cta" aria-label="La borne AIRO">
      <img src="assets/img/machine.webp" alt="" width="581" height="1000" loading="lazy">
      <div>
        <p class="art__cta-t">Casque propre. En 10 minutes.</p>
        <p>La borne AIRO nettoie, désinfecte et sèche les casques en libre-service, sans démontage.</p>
        <p class="art__cta-links"><a class="pill" href="index.html#devis">Demander un devis</a> <a class="link" href="secteurs/{sec_slug}.html">{sec_label} <span aria-hidden="true">›</span></a></p>
      </div>
    </aside>
    <nav class="art__more" aria-label="Autres guides">
      <p>Autres guides</p>
      <ul>
{others}
      </ul>
    </nav>
  </div>
</article>
</main>
''' + tail()
    return up(html)

def index():
    url = SITE + "guides/"
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Guides pratiques AIRO", "url": url,
          "hasPart": [{"@type": "Article", "headline": g["title"], "url": f"{url}{g['slug']}.html"} for g in GUIDES]}
    items = "\n".join(f'''      <li class="reveal"><a href="../guides/{g["slug"]}.html"><h2>{g["title"]}</h2><p>{g["lead"]}</p><span class="link">Lire le guide <span aria-hidden="true">›</span></span></a></li>''' for g in GUIDES)
    html = head("Guides pratiques : entretien et hygiène des casques", "Nettoyer, sécher, désodoriser un casque, organiser l’hygiène des casques de prêt : les guides pratiques AIRO.", url, "accueil", ld) + f'''
<main id="main">
<section class="sec art" data-theme="light">
  <div class="wrap">
    <p class="crumb crumb--light"><a href="index.html">AIRO</a> <span aria-hidden="true">›</span> Guides</p>
    <h1 class="art__t">Guides pratiques.</h1>
    <p class="art__lead">Entretien et hygiène des casques : les bons gestes, et les erreurs qui les abîment.</p>
    <ul class="glist">
{items}
    </ul>
  </div>
</section>
</main>
''' + tail()
    return up(html)

out = ROOT / "guides"; out.mkdir(exist_ok=True)
for g in GUIDES:
    (out / f"{g['slug']}.html").write_text(guide(g)); print(f"guides/{g['slug']}.html")
(out / "index.html").write_text(index()); print("guides/index.html")
subprocess.run([sys.executable, str(ROOT / "tools/secteurs.py")], check=True, stdout=subprocess.DEVNULL)
print("secteurs + sitemap.xml régénérés")
