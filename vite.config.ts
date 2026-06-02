import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  base: './',

  server: {
    port: 5173,
    strictPort: true,
  },

  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 3003,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
