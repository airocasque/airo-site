# Prépare le film pour le site : python3 tools/film-pack.py <dossier rendu> <d|m> [qualité]
# PNG → WebP (assets/film/<d|m>/NNN.webp), fusion des hs-*.json en hotspots.json, copie de meta.json.
import json, sys, pathlib
from PIL import Image
src = pathlib.Path(sys.argv[1]); s = sys.argv[2]; q = int(sys.argv[3]) if len(sys.argv) > 3 else 72
out = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'film' / s
out.mkdir(parents=True, exist_ok=True)
total = 0
for p in sorted(src.glob('[0-9][0-9][0-9].png')):
    d = out / (p.stem + '.webp')
    Image.open(p).convert('RGB').save(d, 'WEBP', quality=q, method=6)
    total += d.stat().st_size
spots = {}
for f in src.glob('hs-*.json'): spots.update(json.loads(f.read_text()))
n = json.loads((src / 'meta.json').read_text())['N']
(out / 'hotspots.json').write_text(json.dumps([spots.get(str(i)) for i in range(n)], separators=(',', ':')))
(out / 'meta.json').write_text((src / 'meta.json').read_text())
print(out, len(list(out.glob('*.webp'))), 'images', round(total / 1e6, 2), 'Mo')
