import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // 1MB limit for vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // UI Libraries - Radix UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
          ],
          // Data & Query Libraries
          'data-vendor': [
            '@supabase/supabase-js',
            '@tanstack/react-query',
            '@tanstack/react-query-devtools'
          ],
          // Chart Libraries
          'chart-vendor': [
            'recharts'
          ],
          // Utility Libraries
          'utils-vendor': [
            'date-fns',
            'libphonenumber-js',
            'papaparse',
            'zod'
          ],
          // Form & Validation
          'form-vendor': [
            'react-hook-form',
            '@hookform/resolvers'
          ],
          // React Router
          'router-vendor': [
            'react-router-dom'
          ]
        }
      }
    }
  }
}));
