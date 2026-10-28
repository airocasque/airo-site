// Tournage du film de la borne : node tools/film.js <w> <h> <dossier> <images> [de] [à]
// Rend la présentation (rotation, portes, casque, vapeur) image par image dans le studio (index.html?studio)
// et enregistre des PNG + la position des points interactifs (hs-<de>.json, à fusionner en hotspots.json).
// Plusieurs tranches peuvent tourner en parallèle (de / à).
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [w, h, dir, n] = [+process.argv[2], +process.argv[3], process.argv[4], +process.argv[5]];
  const from = +(process.argv[6] || 0), to = +(process.argv[7] || n - 1);
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: +(process.env.FILM_DPR || 1) });   // FILM_DPR=1.5 → images 1,5× plus nettes
  p.setDefaultTimeout(900000); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__seqP = 0; window.__seqT = 0; });
  await p.goto('http://localhost:8765/film.html?studio' + (process.env.STUDIO_QS || ''));   // STUDIO_QS : ex. « &side=… » (textures d'aperçu)
  await p.addStyleTag({ content: '.nav,.intro,.mbar,.xp-dots,.xp__hint,.xp-callouts,.xp-hotspots,.xp__stage::after{display:none!important} .xp__steps{visibility:hidden!important} .xp__stage canvas{opacity:1!important}' });
  await p.waitForFunction(() => /is-live/.test(document.getElementById('xpStage').className));
  await p.waitForTimeout(5000);
  const spots = {};
  for (let i = from; i <= to; i++) {
    await p.evaluate(([i, n]) => { window.__seqP = i / (n - 1); window.__seqT = i / 12; }, [i, n]);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    await p.locator('#xpCanvas').screenshot({ path: `${dir}/${String(i).padStart(3, '0')}.png` });
    spots[i] = await p.evaluate(() => window.__hsFrame || null);
    if (i % 10 === 0) console.log('image', i);
  }
  fs.writeFileSync(`${dir}/hs-${from}.json`, JSON.stringify(spots));   // fusionnés ensuite (rendus en parallèle)
  fs.writeFileSync(`${dir}/meta.json`, JSON.stringify({ N: n, B: await p.evaluate(() => window.__B.map((x) => +x.toFixed(5))) }));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
