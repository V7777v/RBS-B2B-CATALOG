import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          name: 'RBS Catalog',
          short_name: 'RBS',
          description: 'קטלוג B2B - RBS Telecom',
          theme_color: '#0c2d57',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'he',
          dir: 'rtl',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallbackDenylist: [
            /^\/api/,
            /sheets\.googleapis\.com/,
            /docs\.google\.com/,
            /script\.google\.com/,
            /opensheet/,
            /sheetdb/
          ],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.hostname.includes('sheets.googleapis.com') ||
                url.hostname.includes('docs.google.com') ||
                url.hostname.includes('script.google.com') ||
                url.hostname.includes('opensheet') ||
                url.hostname.includes('sheetdb.io') ||
                url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
              options: { cacheName: 'no-cache-dynamic' }
            },
            {
              urlPattern: ({ request, url }) =>
                request.destination === 'image' &&
                !url.hostname.includes('googleusercontent.com') &&
                !url.hostname.includes('drive.google.com'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 2592000 }
              }
            },
            {
              urlPattern: ({ url }) =>
                url.hostname === 'fonts.googleapis.com' ||
                url.hostname === 'fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 31536000 }
              }
            }
          ],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true
        },
        devOptions: { enabled: false }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
