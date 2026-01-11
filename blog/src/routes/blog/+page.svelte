<script lang="ts">
	import { formatDate } from '$lib/js/utils';
	import { posts } from '$lib/stores';
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { API_BASE, API_VSN } from '$lib/config';
	import 'iconify-icon';
	import type { Post } from '$lib/types';

	// Post display type with proper show_date handling
	interface DisplayPost {
		slug: string;
		date: string;
		name: string;
		icon: string;
		description: string;
		id: string;
		show_date: boolean; // Always a boolean in the display
	}

	// Pagination state
	let currentPage = 1;
	let isLoading = false;
	let hasMorePosts = true;
	let allPosts: Post[] = [];
	let observer: IntersectionObserver;

	// Map API posts to blog format directly from store
    $: displayPosts = (allPosts || [])
        .filter(post => post.published)  // Only show published posts
        .map(post => {
		const metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
		
		// Explicitly convert show_date to boolean - handle all possible types
		const showDate = !(post.show_date === 0 || post.show_date === false);
		
		console.log(`Post ${post.id} (${post.title}) - show_date value:`, {
			original: post.show_date,
			type: typeof post.show_date,
			converted: showDate
		});
		
		return {
			slug: post.slug,
			date: post.published_at || post.created_at,
			name: post.title,
			icon: metadata.icon || 'mdi:file-document',
			description: metadata.description,
			id: post.id,
			show_date: showDate
		} as DisplayPost;
	});

	// Initialize intersection observer
	function setupObserver() {
		if (observer) {
			observer.disconnect();
		}
		
		observer = new IntersectionObserver((entries) => {
			const entry = entries[0];
			if (entry && entry.isIntersecting && hasMorePosts && !isLoading) {
				console.log('Loading more posts from observer trigger');
				loadMorePosts();
			}
		}, { 
			threshold: 0.1,
			rootMargin: '0px 0px 200px 0px' // Load posts before user reaches bottom
		});
		
		const loadingElement = document.getElementById('loadMore');
		if (loadingElement) {
			console.log('Observer observing element:', loadingElement);
			observer.observe(loadingElement);
		} else {
			console.log('Loading element not found');
		}
	}

	// Initialize with posts from the store
	onMount(() => {
		const initialize = async () => {
			allPosts = [...$posts] as Post[];
			console.log('Posts from store:', allPosts.map(p => ({
				id: p.id,
				title: p.title,
				show_date: p.show_date
			})));
			
			// Need to wait for the DOM to update with the loadMore element
			await tick();
			setupObserver();
		};
		
		initialize();
		
		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});
	
	async function loadMorePosts() {
		if (isLoading || !hasMorePosts) {
			console.log('Skipping loadMorePosts - already loading or no more posts');
			return;
		}
		
		console.log('Loading more posts - page', currentPage + 1);
		isLoading = true;
		currentPage++;
		
		try {
			const domain = window.location.hostname;
			const response = await fetch(`${API_BASE}${API_VSN}/posts?published=true&page=${currentPage}&limit=10`, {
				headers: {
					'X-Site-Domain': domain
				}
			});
			
			const data = await response.json();
			console.log('Fetched additional posts:', data);
			
			if (data.posts && data.posts.length > 0) {
				allPosts = [...allPosts, ...data.posts as Post[]];
				
				// If we got fewer posts than requested, no more are available
				if (data.posts.length < 10) {
					hasMorePosts = false;
				}
				
				// Reset observer after content changes
				await tick();
				setupObserver();
			} else {
				hasMorePosts = false;
			}
		} catch (error) {
			console.error('Failed to load more posts:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Function to manually load more for button click fallback
	function handleLoadMoreClick() {
		if (!isLoading && hasMorePosts) {
			loadMorePosts();
		}
	}
</script>

<main>
	<h1>blog</h1>

	<div class="posts">
		{#if displayPosts.length > 0}
			{#each displayPosts as post}
				<a href={'/blog/' + post.slug} class="link" data-sveltekit-preload="on">
					{#if !(post.show_date === 0 || post.show_date === false)}
						<div class="date">{formatDate(post.date)}</div>
					{/if}
					<h2>
						<iconify-icon icon={post.icon}></iconify-icon>
						{post.name}
						<span class="arrow">-></span>
					</h2>
					<div class="description">{post.description}</div>
				</a>
			{/each}
			
			<!-- Loading indicator with fallback button -->
			<div id="loadMore" class="loading-indicator">
				{#if isLoading}
					<p>Loading more posts...</p>
				{:else if hasMorePosts}
					<button on:click={handleLoadMoreClick} class="load-more-button">
						Load more posts
					</button>
				{:else}
					<p></p>
				{/if}
			</div>
		{:else}
            <p>No posts available.</p>
        {/if}
	</div>
</main>

<style lang="scss">
	@use '../../lib/styles/mixins';
	
	main {
		width: 100%;
		max-width: 53rem;
		margin: 0 auto 10rem auto;
		padding: 1.5rem;
	}

	.posts {
		@include mixins.flex(column);
		gap: 1.5rem;
		max-width: 100%;
	}

	h2 {
		font-size: 1.5rem;
		margin: 0;
		color: var(--txt);
		display: flex;
		align-items: center;
		gap: 0.5rem;

		:global(iconify-icon) {
			font-size: 1.2em;
		}
	}

	.date {
		font-size: 1.2rem;
		font-family: 'Space Mono', monospace;
		color: var(--txt-2);
		margin-top: 0.2rem;
	}

	a {
		display: grid;
		grid-template-columns: auto auto;
		justify-content: left;
		gap: 0.8rem 2rem;
	}

	.description {
		grid-column: 2;
	}
	
	.loading-indicator {
		text-align: center;
		padding: 1rem;
		color: var(--txt-2);
		font-family: 'Space Mono', monospace;
		margin-top: 1rem;
	}
	
	.load-more-button {
		background: var(--surface-2);
		border: none;
		padding: 0.5rem 1rem;
		font-family: 'Space Mono', monospace;
		font-size: 1rem;
		color: var(--txt);
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
		
		&:hover {
			background: var(--surface-3, #444);
		}
	}

	@media (max-width: 600px) {
		a {
			grid-template-columns: auto;
			gap: 0.8rem;

			.description {
				grid-column: 1;
			}
		}
	}
</style>
