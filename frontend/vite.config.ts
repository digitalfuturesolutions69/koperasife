import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Saat development, request /api diteruskan ke backend lokal
    proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:3000' },
  },
});
