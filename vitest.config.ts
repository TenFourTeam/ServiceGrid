import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '"https://ijudkzqfriazabiosnvb.supabase.co"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '"test-anon-key"',
  },
});