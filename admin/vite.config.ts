import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import Icons from 'unplugin-icons/vite';

const workerUrl = process.env.API_URL || 'http://localhost:8787';

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			defaultStyle: 'vertical-align: middle;'
		})
	],
	server: {
		port: 5174,
		strictPort: true,
		host: true,
		proxy: {
			'/api': {
				target: workerUrl,
				changeOrigin: true,
				ws: true
			}
		}
	},
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	define: {
		'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
	}
});
