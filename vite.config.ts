import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'logger-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/log' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                fs.appendFileSync(path.join(__dirname, 'browser.log'), body + '\n');
                res.writeHead(200);
                res.end('ok');
              });
            } else {
              next();
            }
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'BoardsNote',
          short_name: 'BoardsNote',
          description: 'A single place to write structured notes and sketch visual ideas',
          theme_color: '#ff6127',
          background_color: '#0e0d0c',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
            {
              src: '/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
// Trigger re-optimization: 1
