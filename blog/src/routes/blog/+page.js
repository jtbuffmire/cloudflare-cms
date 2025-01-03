import { getPosts } from '$lib/js/posts.js';
import { get } from 'svelte/store';
import { posts as dbPosts } from '$lib/stores';
import { dev } from '$app/environment';

export async function load({ fetch }) {
	// First fetch API posts
	console.log('🔄 Fetching API posts...');
	const apiResponse = await fetch('http://localhost:8787/api/posts');
	const apiData = await apiResponse.json();
	const apiPosts = (apiData.posts || []).map(post => ({
		slug: post.slug,
		name: post.title,
		date: post.created_at,
		description: post.content.substring(0, 150) + '...',
		icon: post.icon || 'ph:pencil-simple',
		published: Boolean(post.published)
	}));
	console.log('📝 API posts:', apiPosts);

	// Then get file-based posts
	const modules = import.meta.glob('/src/content/blog/*/*.md');
	const fileBasedPosts = await getPosts(modules);
	console.log('📚 File-based posts:', fileBasedPosts);

	// Combine both sources
	let posts = [...fileBasedPosts, ...apiPosts];
	console.log('🔄 Combined posts:', posts);

	if (!dev) {
		posts = posts.filter(post => post.published);
	}

	posts.sort((a, b) => new Date(b.date) - new Date(a.date));

	return {
		posts,
		meta: {
			title: 'blog',
			description: 'posts about various topics.'
		}
	};
}
