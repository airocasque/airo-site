# Aperçu autonome du site (version Apple, à la racine) : python3 tools/inline-apple.py <sortie.html>
import base64, json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent; out = pathlib.Path(sys.argv[1])
SITE = 'https://airocasque.github.io/airo-site/'
MIME = {'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2'}
def uri(rel):
    p = root / rel
    return f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()
html = (root/'index.html').read_text()
css = (root/'apple/apple.css').read_text()
css = re.sub(r'url\("\.\./(assets/[^"]+)"\)', lambda m: f'url("{uri(m.group(1))}")', css)
js = (root/'apple/apple.js').read_text()
files = {f'assets/{d}/{p.name}': uri(f'assets/{d}/{p.name}') for d in ('film/d','film/m') for p in sorted((root/'assets'/d).glob('*.webp'))}
js = re.sub(r'function src\(i\) \{ return (.*?); \}', r'function src(i) { var k = \1; return window.__AIRO_FILES[k] || k; }', js, count=1)
assert '__AIRO_FILES' in js
html = re.sub(r'<link rel="preload"[^>]*>\n?', '', html)
html = html.replace('<link rel="stylesheet" href="apple/apple.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<source src="assets/video/airo-clip.webm" type="video/webm">\n', '')
html = html.replace('<script src="apple/apple.js" defer></script>', '<script>window.__AIRO_FILES=' + json.dumps(files) + ';</script>\n<script>\n' + js.replace('</script', '<\\/script') + '\n</script>')
html = re.sub(r'(src|poster)="(assets/(?:img|film|video)/[^"]+)"', lambda m: f'{m.group(1)}="{uri(m.group(2))}"', html)
html = re.sub(r'href="((?:assets/img/(?:favicon|apple-touch)[^"]*))"', lambda m: f'href="{uri(m.group(1))}"', html)
html = re.sub(r'href="(?!#|https?:|tel:|mailto:|data:)([^"]+)"', lambda m: f'href="{SITE}{m.group(1)}"', html)
bad = re.findall(r'(?:src|poster)="(?!data:|https?:)[^"]*"', html)
assert not bad, bad[:5]
out.write_text(html)
print(out, round(out.stat().st_size/1e6, 2), 'Mo')
