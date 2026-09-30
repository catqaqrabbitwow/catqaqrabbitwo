// Visual QA helper: node tools/shot.mjs <url> <out.png> [actions json]
import { chromium } from 'playwright';
const [,, url = 'http://localhost:5173/', out = 'tools/shots/shot.png', actionsJson = '[]'] = process.argv;
const actions = JSON.parse(actionsJson);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(url, { waitUntil: 'load' });
for (const a of actions) {
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.click) await page.mouse.click(a.click[0], a.click[1]);
  if (a.move) await page.mouse.move(a.move[0], a.move[1], { steps: 4 });
  if (a.key) await page.keyboard.press(a.key);
  if (a.down) await page.keyboard.down(a.down);
  if (a.up) await page.keyboard.up(a.up);
  if (a.eval) logs.push('[eval] ' + JSON.stringify(await page.evaluate(a.eval)));
  if (a.shot) await page.screenshot({ path: a.shot, timeout: 180000 });
}
await page.screenshot({ path: out, timeout: 180000 });
console.log(logs.join('\n'));
await browser.close();
