import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Isolate Vanilla Three.js to keep the main bundle lightweight
            if (id.includes('three')) {
              return 'three-vendor';
            }
            // Isolate Framer Motion animations
            if (id.includes('framer-motion')) {
              return 'motion-vendor';
            }
            // Isolate Lucide React icon tree
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 750,
  },
})
