import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/categories': 'http://localhost:3001',
      '/products': 'http://localhost:3001',
      '/cart': 'http://localhost:3001',
      '/orders': 'http://localhost:3001',
      '/seller': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/api': 'http://localhost:3001'
    }
  }
});
