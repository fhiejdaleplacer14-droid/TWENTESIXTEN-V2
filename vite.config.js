import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig } from 'vite';

function stampWorker() {
  return {
    name: 'stamp-worker',
    apply: 'build',
    closeBundle() {
      const all = readdirSync('dist', { recursive: true, withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => relative('dist', join(f.parentPath, f.name)).replaceAll('\\', '/'))
        .filter((f) => f !== 'sw.js')
        .sort();
      const hash = createHash('sha256');
      for (const f of all) hash.update(f).update(readFileSync(join('dist', f)));
      const keep = all.filter((f) => !f.endsWith('.mp4') && !f.startsWith('music/') && !f.split('/').pop().startsWith('.'));
      const worker = readFileSync('dist/sw.js', 'utf8')
        .replace('__BUILD__', hash.digest('hex').slice(0, 12))
        .replace("['__FILES__']", JSON.stringify(keep));
      writeFileSync('dist/sw.js', worker);
    },
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  return {
    base: './',
    server: { port: 5173, open: true },
    plugins: offline ? [fromAFile()] : [stampWorker()],
    build: {
      chunkSizeWarningLimit: offline ? 3000 : 1400,
      ...(offline
        ? {
            outDir: 'dist-offline',
            modulePreload: false,
            assetsInlineLimit: () => true,
            rolldownOptions: { output: { format: 'iife' } },
          }
        : {
            rolldownOptions: {
              output: {
                codeSplitting: {
                  groups: [
                    { name: 'phaser', test: /node_modules[\\/]phaser/ },
                    { name: 'three', test: /node_modules[\\/]three/ },
                  ],
                },
              },
            },
          }),
    },
  };
});

function fromAFile() {
  return {
    name: 'twentesixten-offline',
    transform(code, id) {
      if (!/[\\/]src[\\/].*\.js$/.test(id)) return null;
      const packed = code.replace(/(['"])assets\/images\/([\w.-]+\.png)\1/g, (all, quote, file) => {
        const data = readFileSync(new URL(`./public/assets/images/${file}`, import.meta.url)).toString('base64');
        return `${quote}data:image/png;base64,${data}${quote}`;
      });
      return packed === code ? null : { code: packed, map: null };
    },
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html
          .replace(/<script type="module" crossorigin/g, '<script defer')
          .replace(/ crossorigin(?=[\s>])/g, '')
          .replace(/\s*<link rel="manifest"[^>]*>/, ''),
    },
  };
}
