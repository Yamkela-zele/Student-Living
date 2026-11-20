import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:5000',
    },
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['student-living.onrender.com'],
    port: parseInt(process.env.PORT || '4173'),
  },
})
