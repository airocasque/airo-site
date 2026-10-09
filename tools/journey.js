// Captures du parcours caméra : node tools/journey.js <w> <h> <tag>
// Une image par « arrêt » (section dont la fenêtre transparente est à l'écran) + le début de la scène.
const { chromium } = require('playwright');
(async () => {
  const [w, h, tag] = [+process.argv[2] || 1280, +process.argv[3] || 800, process.argv[4] || 'j'];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  p.setDefaultTimeout(600000); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => /is-live|no-webgl/.test(document.getElementById('xpStage').className), null, { timeout: 600000 });
  await p.waitForTimeout(6000);
  const stops = await p.evaluate(() => [['hero', 0], ['xp-fin', document.getElementById('xp').offsetHeight - innerHeight * 1.1]].concat(
    ['probleme', 'programmes', 'technologie', 'professionnels', 'rentabilite', 'fiche', 'faq', 'devis'].map(id => [id, document.getElementById(id).getBoundingClientRect().top + scrollY - innerHeight * 0.32])));
  for (const [name, y] of stops) {
    await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(y));
    await p.waitForTimeout(7000);
    await p.screenshot({ path: `jr_${tag}_${name}.jpg`, quality: 70 });
  }
  console.log('errors', JSON.stringify(errs.slice(0, 6))); await b.close();
})();
