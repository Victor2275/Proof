import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Files that exist. The previous list named favicon.ico and friends,
      // none of which were ever in public/, so the installed app had no icon.
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Proof',
        short_name: 'Proof',
        description: 'A private digital laboratory for recipe formulation.',
        theme_color: '#fbf7f0',
        // Paper is the default theme; the splash matches it.
        background_color: '#fbf7f0',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // The default glob omits woff2, which would leave the self-hosted faces
        // uncached — the one asset class this app cannot refetch in a kitchen
        // with no signal — and webp, which is the landing page's photograph.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/recipes/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-recipes-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Keep the big, rarely-changing libraries in their own long-lived chunks
        // instead of one 2.7 MB entry bundle.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
          if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('canvg') || id.includes('dompurify')) return 'export-vendor';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion-vendor';
          if (id.includes('html5-qrcode')) return 'qr-vendor';
          if (id.includes('@dnd-kit')) return 'dnd-vendor';
          if (id.includes('fuse.js')) return 'search-vendor';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Whole screens against a real in-memory IndexedDB, typed into by a
    // simulated user: under a full parallel run some take longer than the
    // 5 s default without anything being wrong.
    testTimeout: 20_000,
  },
  base: '/',
})
