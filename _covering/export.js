// Export du covering : node _covering/export.js
//  - textures 3D (PNG) : out-side.png, out-sideL.png, out-front.png
//  - fichiers d'impression vectoriels à l'échelle 1:1 (PDF, mm) : print-*.pdf  (cotes issues du modèle 3D, À CONFIRMER)
const { chromium } = require('playwright');
const path = require('path');
const DIR = __dirname, URL = 'http://localhost:8765/_covering/covering.html';
const PANELS = { side: [1280, 4071, 588, 1870], sideL: [1280, 4071, 588, 1870], front: [1536, 4224, 680, 1870] };
(async () => {
  const b = await chromium.launch();
  for (const [id, [w, h, mmW, mmH]] of Object.entries(PANELS)) {
    for (const print of [false, true]) {
      const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(`${URL}?panel=${id}${print ? '&print' : ''}`, { waitUntil: 'networkidle' });
      await p.waitForSelector('body[data-ready]'); await p.evaluate(() => document.fonts.ready);
      if (!print) await p.locator('#' + id).screenshot({ path: path.join(DIR, `out-${id}.png`) });
      else {
        await p.emulateMedia({ media: 'screen' });
        await p.pdf({ path: path.join(DIR, `print-${id}.pdf`), width: mmW + 'mm', height: mmH + 'mm', printBackground: true,
          scale: (mmW / 25.4 * 96) / w, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
      }
      console.log(id, print ? 'pdf' : 'png', errs); await p.close();
    }
  }
  await b.close();
})();
