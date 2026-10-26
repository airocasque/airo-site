// Dossier de présentation PDF : node _covering/present.js  →  _covering/AIRO-x-BMW-Motorrad-covering.pdf
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/_covering/presentation.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('body[data-ready]'); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(__dirname, 'AIRO-x-BMW-Motorrad-covering.pdf'), width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  console.log('ok', errs); await b.close();
})();
