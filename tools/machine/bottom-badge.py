"""Façade de la borne (photo 1) : remplace le grand « AiRO » du bas de tex-front-hd par le badge officiel
et la ligne des réseaux, comme sur la vraie borne. python3 tools/machine/bottom-badge.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import pathlib
R = pathlib.Path(__file__).resolve().parents[2]
src = R / "assets/img/tex-front-hd.webp"
orig = R / "assets/img/tex-front-hd-v1.webp"
if not orig.exists(): Image.open(src).save(orig, "WEBP", quality=92)     # garde l'ancienne façade
a = Image.open(orig).convert("RGB"); w, h = a.size
y0 = int(h * 0.85)                                   # haut de la bande du bas
px0, px1, py0, py1 = 66, 1440, y0 + 30, y0 + 488     # intérieur du panneau (repéré sur la texture)
d = ImageDraw.Draw(a)
# fond du panneau : noir légèrement dégradé, comme le reste de la façade
for y in range(py0, py1):
    k = (y - py0) / (py1 - py0); c = int(15 - 5 * k)
    d.line([(px0, y), (px1, y)], fill=(c, c + 1, c + 4))
# badge officiel (logo.png, inchangé)
logo = Image.open(R / "assets/img/logo.png").convert("RGBA")
lh = 300; lw = round(logo.width * lh / logo.height); logo = logo.resize((lw, lh), Image.LANCZOS)
glow = Image.new("RGBA", (lw + 120, lh + 120), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
gd.ellipse((40, 40, lw + 80, lh + 80), fill=(47, 107, 255, 70)); glow = glow.filter(ImageFilter.GaussianBlur(30))
cx = (px0 + px1) // 2
a.paste(glow, (cx - (lw + 120) // 2, py0 + 8 - 60), glow)
a.paste(logo, (cx - lw // 2, py0 + 8), logo)
# ligne des réseaux : pictos simples + « Airo.Officiel »
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 46)
ty = py0 + lh + 52; col = (226, 230, 238)
def note(x, y, s=44):   # pictogramme note de musique (TikTok)
    d.ellipse((x, y + s * .62, x + s * .42, y + s), fill=col); d.rectangle((x + s * .32, y + s * .08, x + s * .42, y + s * .8), fill=col)
    d.polygon([(x + s * .42, y + s * .08), (x + s * .78, y + s * .22), (x + s * .78, y + s * .38), (x + s * .42, y + s * .26)], fill=col)
def insta(x, y, s=44):  # pictogramme appareil photo (Instagram)
    d.rounded_rectangle((x, y, x + s, y + s), radius=s * .28, outline=col, width=5)
    d.ellipse((x + s * .28, y + s * .28, x + s * .72, y + s * .72), outline=col, width=5)
    d.ellipse((x + s * .72, y + s * .14, x + s * .84, y + s * .26), fill=col)
label = "Airo.Officiel"; tw = d.textlength(label, font=f)
gap, ic = 120, 44; total = 2 * (ic + 18 + tw) + gap; x = cx - total / 2
note(x, ty); d.text((x + ic + 18, ty - 6), label, font=f, fill=col); x += ic + 18 + tw + gap
insta(x, ty); d.text((x + ic + 18, ty - 6), label, font=f, fill=col)
a.save(src, "WEBP", quality=90)
a.crop((0, y0 - 200, w, h)).resize((768, (h - y0 + 200) // 2)).save(R / "tools/machine/_check-bottom.jpg")
print("ok", src)
