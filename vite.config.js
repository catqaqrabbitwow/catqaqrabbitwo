import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Single-file build only: drop the .woff fallbacks (every browser that runs
// WebGL2 reads woff2) and use the trimmed Noto Serif TC slices.
function singleFileFonts() {
  return {
    name: 'single-file-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css') || !id.includes('fontsource') && !id.includes('generated')) return null;
      return code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, '');
    },
  };
}

// `vite build --mode single` produces one self-contained HTML file that runs
// by double-clicking (file://), no server or Node required.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    server: { host: true, port: 5173 },
    resolve: single
      ? {
          alias: [400, 600, 700].map((w) => ({
            find: `@fontsource/noto-serif-tc/${w}.css`,
            replacement: here(`./src/styles/generated/noto-serif-tc-${w}.css`),
          })),
        }
      : {},
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 2000,
      ...(single ? { outDir: 'dist-single' } : {}),
    },
    plugins: single ? [singleFileFonts(), viteSingleFile()] : [],
  };
});
