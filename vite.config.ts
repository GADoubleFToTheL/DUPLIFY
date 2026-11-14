import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Originalmodelle der Standardteile: sofort offline verfügbar (alle anderen nach dem ersten Laden).
const CORE_MODELS = [
  '3437', '87084', '3011', '2300', '4199', '2291', '4066a', '31110', '31111', '6474', '70676',
  '2302b', '98223b', 'x-door', 'x-window', '11198', '18652', '10715', '14639',
].map((id) => `ldraw/parts/${id}.dpl`);

export default defineConfig({
  // Relative Pfade: die App läuft auf jedem statischen Hosting und in jedem Unterordner.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'ldraw/CREDITS.txt', ...CORE_MODELS],
      manifest: {
        name: 'Duplify – Bauen mit Noppi',
        short_name: 'Duplify',
        description: 'Bau-Ideen und animierte Bauanleitungen aus euren großen Bausteinen.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#8fd3ff',
        theme_color: '#8fd3ff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/ldraw\/parts\/[^/]+\.dpl$/,
            handler: 'CacheFirst',
            options: { cacheName: 'duplify-teile', expiration: { maxEntries: 700 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
  preview: { host: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
