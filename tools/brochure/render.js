// Brochure PDF : node tools/brochure/render.js  →  assets/docs/AIRO-brochure.pdf
// Le QR code (qr.svg) pointe vers https://airocasque.github.io/airo-site/#devis : le refaire (segno) si le domaine change.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = __dirname, root = path.resolve(dir, '../..');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(dir, 'brochure.html'), { waitUntil: 'networkidle' });
  const qr = fs.readFileSync(path.join(dir, 'qr.svg'), 'utf8');
  await p.evaluate(svg => { const el = document.querySelector('.qr'); el.innerHTML = svg + el.innerHTML.replace('<!--QR-->', ''); }, qr);
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(root, 'assets/docs/AIRO-brochure.pdf');
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], fullPage: true });
  await b.close();
  console.log(out, (fs.statSync(out).size / 1e6).toFixed(2), 'Mo');
})();
