import { error } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { posts } from '$lib/stores';

export function load({ params }) {
	// Debug the store state
	console.log('🔍 Posts store state:', get(posts));
	
	const post = get(posts).find(p => p.slug === params.slug);
	
	if (!post) {
		console.warn('⚠️ Post not found for slug:', params.slug);
		throw error(404, 'Post not found');
	}

	return { 
		post,
		meta: {
			title: post.title,
			description: post.metadata?.description || post.text_description || '',
			type: 'article'
		}
	};
}
