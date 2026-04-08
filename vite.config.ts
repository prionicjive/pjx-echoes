import { defineConfig } from 'vite';

export default defineConfig({
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
        }
      }
    }
  }
});