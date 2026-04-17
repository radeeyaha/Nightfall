import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail fast if 5173 is taken instead of trying 5174, 5175, …
    strictPort: true,
    proxy: {
      // Dev: browser talks only to Vite; avoids CORS when page is localhost vs 127.0.0.1
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
