import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        reader: './reader.html',
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.DOCKER_ENV ? 'http://backend:8080' : 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
