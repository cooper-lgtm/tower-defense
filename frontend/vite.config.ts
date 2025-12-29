import { defineConfig } from 'vite'

// Dev server proxy: forward /api to local backend.
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
