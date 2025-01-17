<script>
	import { formatDate } from '$lib/js/utils';
	import { posts } from '$lib/stores';
	import 'iconify-icon';

	// Map API posts to blog format directly from store
    $: displayPosts = ($posts || [])
        .filter(post => post.published)  // Only show published posts
        .map(post => {
		const metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
		
		return {
			slug: post.slug,
			date: post.published_at || post.created_at,
			name: post.title,
			icon: metadata.icon || 'mdi:file-document',
			description: metadata.description
		};
	});
</script>

<main>
	<h1>blog</h1>

	<div class="posts">
		{#if displayPosts.length > 0}
			{#each displayPosts as post}
				<a href={'/blog/' + post.slug} class="link" data-sveltekit-preload="on">
					<div class="date">{formatDate(post.date)}</div>
					<h2>
						<iconify-icon icon={post.icon}></iconify-icon>
						{post.name}
						<span class="arrow">-></span>
					</h2>
					<div class="description">{post.description}</div>
				</a>
			{/each}
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
