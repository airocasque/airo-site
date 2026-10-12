const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1080,height:1920}});
 for (const f of ['a-061','b-018','c-100']) { await p.goto('http://localhost:8765/video/airo-promo/stills/'+f+'.html'); await p.waitForTimeout(800); await p.screenshot({path:f+'.png'}); }
 await b.close(); })();
