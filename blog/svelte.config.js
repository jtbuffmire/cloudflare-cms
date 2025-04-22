import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import * as sass from 'sass';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		paths: {
			relative: false
		}
	},
	preprocess: vitePreprocess({
		style: {
			scss: {
				implementation: sass,
				prependData: '@use "src/lib/styles/_mixins";'
			}
		}
	})
};

export default config;
