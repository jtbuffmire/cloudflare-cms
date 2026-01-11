import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { posts } from '$lib/stores';

export const load: PageLoad = ({ params }) => {
  const postsData = get(posts);
  
  // If store is empty, return a loading state
  if (!postsData || postsData.length === 0) {
    return {
      post: null,
      meta: {
        title: 'Loading...',
        description: '',
        type: 'article'
      }
    };
  }

  const post = postsData.find(p => p.slug === params.slug);
  
  if (!post) {
    console.warn('⚠️ Post not found for slug:', params.slug);
    throw error(404, 'Post not found');
  }

  // Parse metadata if it's a string
  const metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;

  return { 
    post,
    meta: {
      title: post.title,
      description: metadata?.description || '',
      type: 'article'
    }
  };
}; 