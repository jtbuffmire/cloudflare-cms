import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { nameFromPath } from '$lib/js/posts.js';

export async function load({ params, fetch }) {
	try {
		// First try API
		console.log('🔍 Fetching all posts to find:', params.slug);
		const response = await fetch('http://localhost:8787/api/posts');
		const apiData = await response.json();
		
		// Find the specific post in the API data
		const apiPost = apiData.posts?.find(p => p.slug === params.slug);
		
		if (apiPost) {
			console.log('📝 Found post in API:', apiPost);
			
			if (!apiPost.published && !dev) {
				throw error(404, 'post not found');
			}

			return {
				post: {
					metadata: {
						name: apiPost.title,
						date: apiPost.created_at,
						description: apiPost.content.substring(0, 150) + '...',
						published: Boolean(apiPost.published)
					},
					content: apiPost.content,
					isApiPost: true
				},
				meta: {
					title: apiPost.title,
					description: apiPost.content.substring(0, 150) + '...',
					type: 'article'
				}
			};
		}

		// If not found in API, try file system
		console.log('🔍 Trying file system for slug:', params.slug);
		const modules = import.meta.glob([
			'/src/content/blog/*/*.md',
			'/src/content/blog/*/*.{png,jpg,jpeg,gif,webp}',
		], { eager: true });
		
		// console.log('📁 All module paths:', Object.keys(modules));
		
		let matchedPath = null;
		let matchedModule = null;
		let images = {};

		for (const [path, mod] of Object.entries(modules)) {
			if (path.endsWith('.md') && nameFromPath(path) === params.slug) {
				matchedPath = path;
				matchedModule = mod;
				console.log('📝 Found markdown at:', path);
			} else if (path.includes(`/${params.slug}/`)) {
				const fileName = path.split('/').pop();
				images[fileName] = mod;
				console.log('🖼️ Found image:', fileName, mod);
			}
		}

		if (!matchedModule) {
			throw error(404, 'post not found');
		}

		if (!matchedModule.metadata.published && !dev) {
			throw error(404, 'post not found');
		}

		return {
			post: matchedModule,
			images,
			meta: {
				title: matchedModule.metadata.name,
				description: matchedModule.metadata.description,
				type: 'article'
			}
		};

	} catch (err) {
		console.error('❌ Failed to load post:', err);
		throw error(404, 'post not found');
	}
}
