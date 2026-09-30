// Writes a trimmed copy of the Noto Serif TC @font-face CSS that keeps only the
// unicode-range slices containing characters actually used in src/. Used by
// the single-file build so the double-click HTML stays small.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const used = new Set();
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(js|css|html)$/.test(f.name)) for (const ch of fs.readFileSync(p, 'utf8')) used.add(ch.codePointAt(0));
  }
};
walk(path.join(root, 'src'));
for (const ch of fs.readFileSync(path.join(root, 'index.html'), 'utf8')) used.add(ch.codePointAt(0));

const pkg = path.join(root, 'node_modules/@fontsource/noto-serif-tc');
const outDir = path.join(root, 'src/styles/generated');
fs.mkdirSync(outDir, { recursive: true });
const hits = (range) =>
  range.split(',').some((r) => {
    const [a, b] = r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16));
    const hi = b ?? a;
    for (const cp of used) if (cp >= a && cp <= hi) return true;
    return false;
  });
for (const w of [400, 600, 700]) {
  const css = fs.readFileSync(path.join(pkg, `${w}.css`), 'utf8');
  const faces = css.match(/@font-face\s*{[^}]*}/g) || [];
  const kept = faces
    .filter((f) => hits(f.match(/unicode-range:\s*([^;]+);/)[1]))
    .map((f) => f.replace(/url\(\.\/files\//g, 'url(@fontsource/noto-serif-tc/files/'));
  fs.writeFileSync(path.join(outDir, `noto-serif-tc-${w}.css`), kept.join('\n'));
  console.log(w, `${kept.length}/${faces.length} slices`);
}
