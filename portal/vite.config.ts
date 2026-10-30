import { defineConfig } from 'vite';
import { devGames } from './devGames.ts';

export default defineConfig({
  // Relative asset paths, so the site works under any sub-path (e.g. /playroom/).
  base: './',
  plugins: [devGames()],
});
