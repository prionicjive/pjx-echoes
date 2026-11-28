import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DESCRIPTION = 'Guide a glowing orb through procedurally generated mazes using only light and LIDAR.';

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest', // custom src/sw.ts: Range-request-aware music caching
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // registered explicitly from src/main.ts (production only)
      devOptions: { enabled: false }, // never run a service worker under `npm run dev`
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,json,png,ttf,mp3,webmanifest}'],
        globIgnores: [
          '**/og-image.png',          // link-preview image, not needed to play
          '**/README.txt',
          '**/particles*',            // particle previewer dev tool (separate entry)
          'public/**',
          'audio/music/**',           // cached by sw.ts with Range request support instead
        ],
      },
      manifest: {
        id: '/',
        name: 'Echoes',
        short_name: 'Echoes',
        description: DESCRIPTION,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        theme_color: '#000000',
        background_color: '#000000',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 800, // vendor-pixi (PIXI.js + pixi-filters) is ~763 KB — expected
    rollupOptions: {
      input: {
        main: 'index.html',
        particles: 'public/particles.html'
      },
      output: {
        manualChunks: {
          'vendor-pixi': ['pixi.js', 'pixi-filters'],
          'vendor-planck': ['planck'],
          'vendor-gsap': ['gsap'],
          'vendor-howler': ['howler'],
        }
      }
    }
  }
});
