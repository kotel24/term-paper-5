import { defineConfig, type Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const compatShim = fileURLToPath(new URL('./src/ar/three-compat.ts', import.meta.url));

function mindarThreeCompat(): Plugin {
  return {
    name: 'mindar-three-compat',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'three' && importer && importer.includes('mind-ar')) return compatShim;
      return null;
    },
  };
}

function saveMarkerFiles(): Plugin {
  const allowed = new Set(['marker.png', 'marker.mind']);
  return {
    name: 'save-marker-files',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const name = new URL(req.url ?? '', 'http://local').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !allowed.has(name)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const dir = path.resolve(__dirname, 'public/targets');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [mindarThreeCompat(), saveMarkerFiles(), ...(process.env.HTTPS ? [basicSsl()] : [])],
  optimizeDeps: { exclude: ['mind-ar'] },
  server: { host: true },
  build: { chunkSizeWarningLimit: 4000 },
});
