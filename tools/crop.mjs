import { chromium } from 'playwright';
const [,, url, out, clipJson, actionsJson = '[]'] = process.argv;
const clip = JSON.parse(clipJson);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()); });
await page.goto(url, { waitUntil: 'load' });
for (const a of JSON.parse(actionsJson)) {
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.click) await page.mouse.click(a.click[0], a.click[1]);
  if (a.move) await page.mouse.move(a.move[0], a.move[1], { steps: 4 });
  if (a.key) await page.keyboard.press(a.key);
  if (a.eval) console.log('[eval]', JSON.stringify(await page.evaluate(a.eval)));
  if (a.shot) await page.screenshot({ path: a.shot, clip, timeout: 240000 });
}
await page.screenshot({ path: out, clip, timeout: 240000 });
await browser.close();
