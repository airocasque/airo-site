// Rendu fixe de la scène 3D sans textes ni menu : node tools/still.js <w> <h> <fraction> <sortie.png> [x,y,w,h]
const { chromium } = require('playwright');
(async () => {
  const [w, h, f, out, clip] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5], process.argv[6]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(600000); p.on('console', m => { if (/error|lost/i.test(m.text())) console.log('console:', m.text().slice(0, 160)); });
  await p.goto('http://localhost:8765/index.html');
  await p.addStyleTag({ content: '.xp__steps{visibility:hidden!important}.nav,.xp__hint,.xp-dots,.xp-callouts,.intro,.mbar{display:none!important}.xp__stage::after{display:none!important}' });
  await p.waitForFunction(() => document.getElementById('xpStage').classList.contains('is-live'), null, { timeout: 600000 });
  await p.waitForTimeout(30000);
  const total = await p.evaluate(() => document.getElementById('xp').offsetHeight - innerHeight);
  await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(total * f));
  await p.waitForTimeout(20000);
  const o = { path: out };
  if (clip) { const [x, y, cw, ch] = clip.split(',').map(Number); o.clip = { x, y, width: cw, height: ch }; }
  await p.screenshot(o); await b.close();
})();
