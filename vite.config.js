// front-end/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [react()],
    base: isDevelopment ? '/' : '/webapp-frontend/',
    server: { 
      proxy: isDevelopment ? {
        '/api': {
          target: 'http://localhost:5000', // Local backend URL
          changeOrigin: true, 
        }
      } : {
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
      // This will be replaced at build time based on environment
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.API_URL': JSON.stringify(
        isDevelopment 
          ? 'http://localhost:5000' 
          : 'https://fnki5rlndb.execute-api.us-east-1.amazonaws.com'
      )
    }
  }
})