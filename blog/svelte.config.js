import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'; 
import { mdsvex, escapeSvelte } from 'mdsvex';
import { codeToHtml } from 'shiki';
import * as sass from 'sass';

const mdsvexOptions = {
	extensions: ['.md'],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const html = await codeToHtml(code, {
				lang,
				theme: 'catppuccin-mocha',
				colorReplacements: {
					'#1e1e2e': 'none'
				}
			});
			const escaped = escapeSvelte(html);
			return `{@html \`${escaped}\` }`;
		}
	}
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess({
			style: {
				scss: {
					implementation: sass,
				}
			}
		}),
		mdsvex(mdsvexOptions)
	],
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		outDir: 'build',
		paths: {
			relative: false
		},
		inlineStyleThreshold: Infinity
	}
};

export default config;
