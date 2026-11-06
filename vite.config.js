import {controlledPenflow} from './scripts/penflow-controlled.mjs';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins:[controlledPenflow()],
  optimizeDeps:{exclude:['penflow'],include:['typr.js','react/jsx-runtime']},
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        components: fileURLToPath(new URL('./components.html', import.meta.url)),
      },
    },
  },
});
