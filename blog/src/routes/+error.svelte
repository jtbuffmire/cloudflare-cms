<script>
	import { page } from '$app/stores';
	import { posts } from '$lib/stores';
</script>

<main>
	<h1>{$page.status}</h1>
	{#if $page.status === 404 && $posts.length === 0}
		<p>Loading posts...</p>
	{:else}
		<p>{$page.error?.message || 'An error occurred'}</p>
	{/if}
	<a href="/blog">← Back to blog</a>
</main>

<style>
	main {
		width: 100%;
		max-width: 53rem;
		margin: 0 auto;
		padding: 1.5rem;
		text-align: center;
	}

	h1 {
		font-size: 4rem;
		margin: 2rem 0;
	}

	p {
		font-size: 1.2rem;
		margin: 1rem 0 2rem;
	}

	a {
		font-family: 'Space Mono', monospace;
		font-size: 1.2rem;
	}
</style>
