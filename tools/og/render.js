// Images de partage (Open Graph) 1200×630 : node tools/og/render.js → assets/img/og/<page>.jpg
// Lit les pages secteurs générées (titre h1) ; l'accueil a son propre texte.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..');
const pages = [{ slug: 'accueil', k: 'Borne de nettoyage de casques', t: 'Casque propre.<br>En 10 minutes.', s: 'En libre-service. Paiement par carte sur la borne.' }];
for (const f of fs.readdirSync(path.join(root, 'secteurs')).filter(f => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(root, 'secteurs', f), 'utf8');
  const t = html.match(/<h1 class="hero__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/)[1];
  const k = html.match(/<span aria-hidden="true">›<\/span> ([^<]+)<\/p>/)[1];
  pages.push({ slug: f.replace('.html', ''), k, t, s: 'Nettoyage, désinfection et séchage en 3 à 10 minutes.' });
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(__dirname, 'og.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  for (const pg of pages) {
    await p.evaluate(pg => {
      k.textContent = pg.k; t.innerHTML = pg.t; s.textContent = pg.s;
      // le titre rétrécit jusqu'à tenir dans le bloc (550 px de haut)
      let fs = 66; t.style.fontSize = fs + 'px';
      const box = document.querySelector('.txt');
      while ((box.scrollHeight > 550 || t.scrollWidth > t.clientWidth) && fs > 40) { fs -= 2; t.style.fontSize = fs + 'px'; }
    }, pg);
    const out = path.join(root, 'assets/img/og', pg.slug + '.jpg');
    await p.screenshot({ path: out, type: 'jpeg', quality: 82 });
    console.log(path.relative(root, out), Math.round(fs.statSync(out).size / 1024) + ' Ko');
  }
  await b.close();
})();
