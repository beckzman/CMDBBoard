import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Allow access from any host (needed for Docker)
        port: 5173,
        strictPort: true,
        watch: {
            usePolling: true, // Needed for Docker on Windows
        },
        hmr: {
            clientPort: 5173,
        },
        proxy: {
            '/api': {
                target: process.env.VITE_API_TARGET || 'http://localhost:8000',
                changeOrigin: true,
            }
        }
    }
})
