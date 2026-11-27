import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths, so the built game runs from any folder (GitHub Pages serves it under /guildbound/).
  base: './',
  // 5180 by default; if it is busy, Vite moves to the next free port and prints the address.
  server: { port: 5180, strictPort: false },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
