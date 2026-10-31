import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the game works under any sub-path (e.g. /playroom/<slug>/).
  base: './',
  server: { port: 5353, strictPort: true },
});
