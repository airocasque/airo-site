import base64, re, sys, pathlib
root = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); bundle = pathlib.Path(sys.argv[3]).read_text()
def uri(rel):
    p = root / rel
    mime = {'.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.webp':'image/webp','.pdf':'application/pdf','.glb':'model/gltf-binary','.json':'application/json'}[p.suffix]
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
html = (root/'index.html').read_text()
css = (root/'style.css').read_text()
css = re.sub(r'url\("(assets/(?:fonts|scene)/[^"]+)"\)', lambda m: f'url("{uri(m.group(1))}")', css)
html = re.sub(r'<link rel="(preload|modulepreload|preconnect)"[^>]*>\n?', '', html)
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
for t in ('assets/img/tex-front-hd.webp','assets/img/tex-side-hd.webp'): bundle = bundle.replace(t, uri(t))
files = {f'assets/{d}/{p.name}': uri(f'assets/{d}/{p.name}') for d in ('showroom', 'world') for p in sorted((root/'assets'/d).iterdir())}
import json
bundle = 'window.__AIRO_FILES=' + json.dumps(files) + ';\n' + bundle
def inline_classic(m):
    code = (root/m.group(1)).read_text()
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="([^"]+)" defer></script>', inline_classic, html)
html = re.sub(r'<script type="importmap">.*?</script>\s*', '', html, flags=re.S)
html = html.replace('<script type="module" src="assets/js/experience.js"></script>', '<script>\n' + bundle.replace('</script', '<\\/script') + '\n</script>')
html = re.sub(r'(src|href|data-img|content)="(assets/(?:img|docs)/[^"]+)"', lambda m: f'{m.group(1)}="{uri(m.group(2))}"', html)
assert not re.search(r'(src|href|url\()=?"?assets/', html), [l for l in html.splitlines() if 'assets/' in l and 'data:' not in l][:5]
out.write_text(html)
print(out, round(out.stat().st_size/1e6, 2), 'Mo')
