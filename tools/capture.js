const { chromium } = require('playwright');
(async () => {
  const [w, h, tag] = [+process.argv[2] || 1440, +process.argv[3] || 900, process.argv[4] || 'd'];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce', isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
  const errs = []; p.setDefaultTimeout(120000); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.text().slice(0,200)); });
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => document.getElementById('xpStage').classList.contains('is-live') || document.getElementById('xpStage').classList.contains('no-webgl'), null, { timeout: 540000 });
  await p.waitForTimeout(25000);
  const info = await p.evaluate(() => ({ live: document.getElementById('xpStage').className, xpH: document.getElementById('xp').offsetHeight, vh: innerHeight }));
  console.log(JSON.stringify(info));
  const total = info.xpH - info.vh;
  const ps = (process.argv[5]||'0,0.2,0.36,0.5,0.68,0.83,0.97').split(',').map(Number);
  for (const [i, f] of ps.entries()) {
    await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(total * f));
    await p.waitForTimeout(9000);
    await p.screenshot({ path: `xp_${tag}_${i}.jpg`, quality: 70, timeout: 400000 });
  }
  console.log('errors', JSON.stringify(errs.slice(0, 8)));
  await b.close();
})();
