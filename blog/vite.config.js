import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vitest/config';
import Icons from 'unplugin-icons/vite';
import path from 'path';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: '@use "src/variables" as *;'
			}
		}
	},
	define: {
		'process.env.API_URL': JSON.stringify(process.env.API_URL)
	},
});