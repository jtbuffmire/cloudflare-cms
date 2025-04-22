import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    manifest: true,
    outDir: '.svelte-kit/output/client',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/app.html'
    }
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true
  },
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      $components: fileURLToPath(new URL('./src/components', import.meta.url))
    }
  }
}); 