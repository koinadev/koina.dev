import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Sıra önemli: Cloudflare eklentisi SSR ortamını Worker'a çevirir, TanStack Start React'ten önce gelir.
export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tanstackStart(), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // API'nin yerel köken listesi yalnız 5173'ü tanıyor; port kayarsa oturum çerezi reddedilirdi.
  server: { port: 5173, strictPort: true },
});
