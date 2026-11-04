import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Testler saf yardımcılar için; Worker ve Start eklentileri burada gereksiz.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
