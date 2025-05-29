// front-end/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/webapp-frontend/',
  server: { 
    proxy: {
      '/api': {
        target: 'https://fnki5rlndb.execute-api.us-east-1.amazonaws.com',
        changeOrigin: true, 
      }
    }
  },
  build: {
    outDir: 'dist'
  },
  define: {
    // This will be replaced at build time
    'process.env.API_URL': JSON.stringify('https://fnki5rlndb.execute-api.us-east-1.amazonaws.com')
  }
})