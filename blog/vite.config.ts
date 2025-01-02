import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
	  port: 5175, // Different from admin port (5174)
	},
	// Add environment variables for API
	define: {
	  'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:8787')
	}
});
