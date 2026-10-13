import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  output: 'static',
  vite: { plugins: [tailwind()] },
  devToolbar: { enabled: false },
});
