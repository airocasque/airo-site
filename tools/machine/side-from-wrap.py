# Texture des flancs de la borne à partir de la maquette d'habillage du client.
#   python3 tools/machine/side-from-wrap.py [sortie.webp]   (défaut : assets/img/tex-side-hd.webp)
# Source : tools/machine/wrap-side.png (flanc découpé dans wrap-capture.png, capture d'écran ~285×854 px).
# Le fond (éclairs, pilote) est agrandi ; le logo et les pictos sont redessinés nets par seuillage ;
# les textes sont réécrits en Montserrat (police de la maquette), tels qu'imprimés sur la borne.
import sys, pathlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets/img/tex-side-hd.webp"
FONT = str(HERE / "fonts/Montserrat-VF.ttf")

src = Image.open(HERE / "wrap-side.png").convert("RGB")
# bord clair de la capture sur le pourtour : on le remplace par les pixels voisins
_a = np.asarray(src).copy(); _a[:3] = _a[3]; _a[-2:] = _a[-3]; _a[:, :2] = _a[:, 2:3]; _a[:, -2:] = _a[:, -3:-2]
src = Image.fromarray(_a)
W = 1280
S = W / src.width                       # ≈ 4,49
H = round(src.height * S)
# proportions du flanc dans la 3D (profondeur 0,588 m × hauteur texturée 1,87 m) : on rallonge le haut
# (zone masquée par l'arrondi du sommet) au lieu d'étirer la maquette
H_TEX = round(W * 1.87 / 0.588)
PAD = H_TEX - H

big = np.asarray(src.resize((W, H), Image.LANCZOS)).astype(np.float32)
lum = big.mean(2)
r, g, b = big[..., 0], big[..., 1], big[..., 2]

def box(x0, y0, x1, y1, m=2):
    """zone de la maquette (coordonnées source) → tranche dans l'image agrandie"""
    return slice(int((y0 - m) * S), int((y1 + m) * S)), slice(int((x0 - m) * S), int((x1 + m) * S))

BLUE = (82, 136, 184)
LOGO = box(105, 48, 166, 258)
COLS = box(114, 264, 168, 389)
ICONS = box(91, 634, 113, 826)
TEXT = box(114, 636, 212, 825)

# 1) masque de tout ce qui est texte/logo/picto, puis effacement (inpainting) pour retrouver le fond
mask = np.zeros(lum.shape, np.uint8)
for sl in (LOGO, COLS, TEXT):
    sub = lum[sl]; mask[sl] = (sub > 70).astype(np.uint8) * 255
isblue = (b > 95) & (b - r > 45)
mask[ICONS] = np.maximum(mask[ICONS], (isblue[ICONS] | (lum[ICONS] > 70)).astype(np.uint8) * 255)
blue_cols = np.zeros_like(mask); blue_cols[COLS] = isblue[COLS].astype(np.uint8) * 255
mask = np.maximum(mask, blue_cols)
mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
bg = cv2.inpaint(np.clip(big, 0, 255).astype(np.uint8), mask, 9, cv2.INPAINT_TELEA).astype(np.float32)

def smooth(x, a, c):
    t = np.clip((x - a) / (c - a), 0, 1); return t * t * (3 - 2 * t)

# 2) logo : seuillage doux de la version agrandie (bords nets, anticrénelés)
out = bg.copy()
lg = cv2.GaussianBlur(lum, (0, 0), 1.2)
alpha = np.zeros_like(lum); alpha[LOGO] = smooth(lg[LOGO], 105, 150)
out = out * (1 - alpha[..., None]) + np.array([248, 249, 252], np.float32) * alpha[..., None]

# 3) pictos : même principe sur le bleu
bl = cv2.GaussianBlur((b - r), (0, 0), 1.0)
alpha = np.zeros_like(lum); alpha[ICONS] = smooth(bl[ICONS], 40, 80) * smooth(cv2.GaussianBlur(b, (0, 0), 1.0)[ICONS], 90, 130)
out = out * (1 - alpha[..., None]) + np.array(BLUE, np.float32) * alpha[..., None]

img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def font(px, wght):
    f = ImageFont.truetype(FONT, px)
    f.set_variation_by_axes([wght])
    return f

# 4) colonne verticale : NETTOYAGE / PAR VAPEUR (bleu) + NOUVELLE GÉNÉRATION (blanc), lue de haut en bas
L = (385 - 268) * S                                  # longueur de la colonne
def fit(text, wght, length):
    px = 40
    while font(px + 1, wght).getlength(text) <= length: px += 1
    return font(px, wght)
f1 = fit("PAR VAPEUR", 800, L)
f3 = fit("NOUVELLE GÉNÉRATION", 600, L)
asc1 = f1.getbbox("NETTOYAGE")[3] - f1.getbbox("NETTOYAGE")[1]
asc3 = f3.getbbox("NOUVELLE")[3] - f3.getbbox("NOUVELLE")[1]
gap = 0.18 * asc1
colw = int(2 * asc1 + 2 * gap + asc3 + 4)
strip = Image.new("RGBA", (int(L) + 8, colw + 8), (0, 0, 0, 0))
d = ImageDraw.Draw(strip)
y = 2
for t in ("NETTOYAGE", "PAR VAPEUR"):
    d.text((2, y - f1.getbbox(t)[1]), t, font=f1, fill=BLUE + (255,)); y += asc1 + gap
d.text((2, y + 0.4 * gap - f3.getbbox("NOUVELLE")[1]), "NOUVELLE GÉNÉRATION", font=f3, fill=(240, 242, 246, 255))
col = strip.rotate(-90, expand=True)                 # sens horaire : le haut des lettres regarde vers la droite
img.paste(col, (int(166 * S) - col.width + 4, int(268 * S) - 2), col)

# 5) six lignes de pictos, texte réécrit tel qu'imprimé sur la borne
LINES = [("VAPEUR SÈCHE", "HAUTE PERFORMANCE"), ("DÉSINFECTION", "PROUVÉE"), ("ÉLIMINE 99.9%", "DES BACTÉRIES"),
         ("NEUTRALISE", "LES ODEURS"), ("SECHAGE RAPIDE", "INTÉGRÉ"), ("COMPATIBLE TOUS", "CASQUES")]
TOPS = [640, 673.5, 707, 740.5, 774, 808]            # haut des capitales de la 1re ligne (source)
cap = 5 * S
ft = font(10, 700)
px = 10
while (ft.getbbox("H")[3] - ft.getbbox("H")[1]) < cap: px += 1; ft = font(px, 700)
d = ImageDraw.Draw(img)
for (l1, l2), top in zip(LINES, TOPS):
    for k, t in enumerate((l1, l2)):
        yy = (top + k * 9) * S
        d.text((116 * S, yy - ft.getbbox("H")[1]), t, font=ft, fill=(244, 245, 248))

# 6) haut rallongé (caché par l'arrondi du sommet) : miroir de la bande supérieure
top = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).crop((0, 0, W, PAD)).transpose(Image.FLIP_TOP_BOTTOM)
final = Image.new("RGB", (W, H_TEX)); final.paste(top, (0, 0)); final.paste(img, (0, PAD))
final.save(OUT, "WEBP", quality=90)
print(OUT, final.size)
