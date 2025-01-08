<script>
	import { formatDate } from '$lib/js/utils.js';
	import { posts } from '$lib/stores';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Get the current slug from the URL params
	$: currentSlug = $page.params.slug;

	// Find the matching post from our posts store
	$: post = ($posts || []).find(p => p.slug === currentSlug);

	// Watch for post changes that affect visibility
	$: {
		if (post) {
			// If post is unpublished, redirect to blog index
			if (!post.published) {
				goto('/blog');
			}
		}
	}

	// Parse metadata once when post changes
	$: metadata = post?.metadata ? JSON.parse(post.metadata) : {};

	// Derive page metadata for head
	$: meta = {
		title: post?.title || 'Post not found',
		description: metadata.description || '',
		type: 'article',
		image: metadata.image || ''
	};
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta property="og:type" content={meta.type} />
	{#if meta.image}
		<meta property="og:image" content={meta.image} />
	{/if}
</svelte:head>

{#if post && post.published}
	<main>
		<article class="post">
			<header>
				<h1>
					{#if metadata.icon}<iconify-icon icon={metadata.icon} />{/if}
					{post.title}
				</h1>
				<p class="date">{formatDate(post.published_at || post.created_at)}</p>
				{#if metadata.description}
					<p class="description">{metadata.description}</p>
				{/if}
			</header>

			<div class="content">
				{@html post.content}
			</div>
		</article>
	</main>
{:else}
	<main>
		<h1>Post not found</h1>
		<p>The requested post could not be found.</p>
	</main>
{/if}

<style lang="scss">
	main {
		width: 100%;
		max-width: 53rem;
		margin: 0 auto 10rem auto;
		padding: 1.5rem;
	}

	.post {
		width: 100%;
	}

	header {
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 2rem 0;
		line-height: 1.3;
		display: flex;
		align-items: center;
		gap: 0.5rem;

		:global(iconify-icon) {
			font-size: 1.2em;
		}
	}

	.date {
		margin: 1rem 0;
		font-size: 1.4rem;
		font-family: 'Space Mono', monospace;
		color: var(--txt-2);
	}

	.description {
		font-size: 1.2rem;
		margin: 1rem 0 2rem 0;
		font-style: italic;
		color: var(--txt-2);
	}

	.content {
		line-height: 1.6;

		:global(h2) {
			margin-top: 2rem;
		}

		:global(pre) {
			background: var(--surface-2);
			padding: 1rem;
			border-radius: 4px;
			overflow-x: auto;
		}

		:global(img) {
			max-width: 100%;
			height: auto;
		}
	}
</style>
