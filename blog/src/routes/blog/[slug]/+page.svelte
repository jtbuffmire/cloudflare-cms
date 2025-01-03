<script>
	import { formatDate } from '$lib/js/utils.js';

	export let data;

	$: post = data.post;
	$: meta = data.meta;
	$: images = data.images;
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta property="og:type" content={meta.type} />
	{#if meta.image}
		<meta property="og:image" content={meta.image} />
	{/if}
</svelte:head>

<article class="post">
	<header>
		<div class="date">{formatDate(post.metadata.date)}</div>
		<h1>{post.metadata.name}</h1>
	</header>

	<div class="content">
		{#if post.isApiPost}
			{@html post.content}
		{:else}
			<svelte:component this={post.default} {images} />
		{/if}
	</div>
</article>

<style>
	.post {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		margin-bottom: 2rem;
	}

	.date {
		color: var(--text-2);
		margin-bottom: 0.5rem;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		line-height: 1.3;
	}

	.content {
		line-height: 1.6;
	}

	.content :global(h2) {
		margin-top: 2rem;
	}

	.content :global(pre) {
		background: var(--surface-2);
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
	}

	.content :global(img) {
		max-width: 100%;
		height: auto;
	}
</style>
