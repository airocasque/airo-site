const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1080,height:1920}});
 for (let k=1;k<=6;k++) { await p.goto('http://localhost:8765/video/airo-promo/stills/sb'+k+'.html'); await p.waitForTimeout(700); await p.screenshot({path:'sb'+k+'.png'}); }
 await b.close(); })();
