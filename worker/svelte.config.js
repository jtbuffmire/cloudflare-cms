import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html',
			pages: 'dist/admin',
			assets: 'dist/admin',
			precompress: false
		}),
		paths: {
			base: '/admin',
			relative: false
		},
		alias: {
			$lib: './src/lib',
			$components: './src/components'
		},
		prerender: {
			handleMissingId: 'ignore'
		}
	},
	preprocess: vitePreprocess()
};

export default config;
