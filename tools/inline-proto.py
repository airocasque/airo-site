# Maquette « Électrique » en un seul fichier : python3 tools/inline-proto.py <sortie.html>
import base64, json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
MIME = {'.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2'}
uri = lambda rel: f"data:{MIME[pathlib.Path(rel).suffix]};base64," + base64.b64encode((root / rel).read_bytes()).decode()
html = (root / 'proto/electrique.html').read_text()
html = re.sub(r'<link rel="preload"[^>]*>\n?', '', html)
html = re.sub(r'url\("\.\./(assets/fonts/[^"]+)"\)', lambda m: f'url("{uri(m.group(1))}")', html)
html = re.sub(r'(src|href)="\.\./(assets/img/[^"]+)"', lambda m: f'{m.group(1)}="{uri(m.group(2))}"', html)
files = {f'../assets/film/{s}/{i:03d}.webp': uri(f'assets/film/{s}/{i:03d}.webp') for s in 'dm' for i in range(0, 45, 2)}
html = html.replace('<script>\n(function () {', '<script>window.__AIRO_FILES=' + json.dumps(files) + ';</script>\n<script>\n(function () {', 1)
html = html.replace('href="../', 'href="https://airocasque.github.io/airo-site/')
pathlib.Path(sys.argv[1]).write_text(html)
print(sys.argv[1], round(len(html) / 1e6, 2), 'Mo')
