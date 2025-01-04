<script>
	import { formatDate } from '$lib/js/utils.js';
	import { posts } from '$lib/stores';
	import { onMount } from 'svelte';

	export let data;
	
	// Use the store value when available, fallback to initial data
	$: displayPosts = $posts.length ? $posts : data.posts.filter(post => post.published === 1);
</script>

<main>
	<h1>blog</h1>

	<div class="posts">
		{#each displayPosts as post}
			<a href={'/blog/' + post.slug} class="link" data-sveltekit-preload="off">
				<div class="date">{formatDate(post.date)}</div>
				<h2><iconify-icon icon={post.icon} />{post.name}<span class="arrow">-></span></h2>
				<div class="description">{post.description}</div>
			</a>
		{/each}
	</div>
</main>

<style lang="scss">
	main {
		width: 100%;
		max-width: 53rem;
		margin: 0 auto 10rem auto;
		padding: 1.5rem;
	}

	.posts {
		@include flex(column);
		gap: 1.5rem;
		max-width: 100%;
	}

	h2 {
		font-size: 1.5rem;
		margin: 0;
		color: var(--txt);
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
