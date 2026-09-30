import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'load' });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return 'no game';
    return { scene: g.scenes.key, calls: g.renderer.info.render.calls, frame: g.renderer.info.render.frame, t: g.time.elapsed.toFixed(2) };
  });
  console.log(JSON.stringify(r));
}
await browser.close();
