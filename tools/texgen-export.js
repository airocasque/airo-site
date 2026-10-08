// Régénère assets/img/tex-*-hd.webp depuis tools/texgen.html (serveur local requis : python3 -m http.server 8765 à la racine).
// Usage : node tools/texgen-export.js   (nécessite playwright et pillow pour la conversion WebP)
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/tools/texgen.html'); await p.waitForFunction(() => window.out, null, { timeout: 60000 });
  const o = await p.evaluate(() => window.out);
  for (const k of ['front', 'side']) {
    const png = `/tmp/tex-${k}.png`; fs.writeFileSync(png, Buffer.from(o[k].split(',')[1], 'base64'));
    execSync(`python3 -c "from PIL import Image; Image.open('${png}').convert('RGB').save('assets/img/tex-${k}-hd.webp', quality=90, method=6)"`);
  }
  await b.close();
})();
