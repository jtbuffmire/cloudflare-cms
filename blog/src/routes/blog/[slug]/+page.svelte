<script lang="ts">
	import { formatDate } from '$lib/js/utils';
	import { posts } from '$lib/stores';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import 'iconify-icon';
	import { onDestroy } from 'svelte';
	import { API_BASE, API_VSN } from '$lib/config';
	import { browser } from '$app/environment';
	import DOMPurify from 'isomorphic-dompurify';
	import { marked } from 'marked';  
	import type { Post } from '$lib/types';

	// Get the current slug from the URL params
	$: currentSlug = $page.params.slug;

	// Find the matching post from our posts store
	$: post = ($posts || []).find((p) => p.slug === currentSlug) as unknown as Post;
	
	// Find the next post for navigation
	$: {
		const sortedPosts = [...($posts || [])].filter(p => p.published).sort((a, b) => {
			const dateA = new Date(a.published_at || a.created_at).getTime();
			const dateB = new Date(b.published_at || b.created_at).getTime();
			return dateB - dateA; // Descending order (newest first)
		});
		
		// Find current post index
		const currentIndex = sortedPosts.findIndex(p => p.slug === currentSlug);
		
		// Find next post (if any)
		if (currentIndex !== -1 && currentIndex < sortedPosts.length - 1) {
			nextPost = sortedPosts[currentIndex + 1] as Post;
		} else {
			nextPost = null;
		}
	}
	
	let nextPost: Post | null = null;

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
	$: metadata = typeof post?.metadata === 'string' ? JSON.parse(post.metadata) : post?.metadata || {};

	// Parse the content when post changes
	$: parsedContent = post?.markdown_content ? DOMPurify.sanitize(marked.parse(post.markdown_content, { async: false })) : '';
	
	// Derive page metadata for head
	$: meta = {
		title: post?.title || 'Post not found',
		description: metadata.description || '',
		type: 'article',
		image: metadata.image || ''
	};

	function getPicUrl(url: string): string {
		// If the URL is already absolute, return it as is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}

		const finalUrl = `${API_BASE}${API_VSN}${url}`;
		
		// Add domain from current hostname
		const picUrl = new URL(finalUrl);
		const domain = browser ? window.location.hostname.split(':')[0] : '';
		picUrl.searchParams.set('domain', domain);
		
		return picUrl.toString();
	}

	// Image loader directive
	function imageLoader(node: HTMLElement) {
		const images = node.getElementsByTagName('img');
		const objectUrls: string[] = [];

		function loadImage(img: HTMLImageElement) {
			const originalSrc = img.src;
			console.log('Processing image:', { 
				originalSrc,
				includesCheck: {
					postImages: originalSrc.includes('/post-images/'),
					pics: originalSrc.includes('/pics/')
				},
				isAbsolute: originalSrc.startsWith('http')
			});

			// Only process if it's a relative URL
			if ((originalSrc.includes('/post-images/') || originalSrc.includes('/pics/')) && 
				!originalSrc.startsWith('http')) {
				// Convert the relative URL to an absolute URL with proper domain
				const fullUrl = getPicUrl(originalSrc);
				console.log('Converting URL:', { originalSrc, fullUrl });
				
				fetch(fullUrl)
					.then(response => {
						if (!response.ok) throw new Error('Failed to load image');
						return response.blob();
					})
					.then(blob => {
						const objectUrl = URL.createObjectURL(blob);
						objectUrls.push(objectUrl);
						img.src = objectUrl;
						img.style.opacity = '1';
					})
					.catch(error => {
						console.error('Failed to load image:', error);
						img.style.border = '2px solid red';
						img.style.padding = '1rem';
						img.alt = 'Failed to load image';
					});
			} else {
				// For absolute URLs, just set opacity
				img.style.opacity = '1';
			}
		}

		// Add fade-in effect CSS
		const style = document.createElement('style');
		style.textContent = `
			.content img {
				transition: opacity 0.2s;
				opacity: 0;
			}
		`;
		document.head.appendChild(style);

		Array.from(images).forEach(loadImage);

		// Watch for dynamically added images
		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => {
					if (node instanceof HTMLImageElement) {
						loadImage(node);
					} else if (node instanceof Element) {
						const newImages = node.getElementsByTagName('img');
						Array.from(newImages).forEach(loadImage);
					}
				});
			});
		});

		observer.observe(node, {
			childList: true,
			subtree: true
		});

		return {
			destroy() {
				observer.disconnect();
				objectUrls.forEach(URL.revokeObjectURL);
				document.head.removeChild(style);
			}
		};
	}
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta property="og:type" content={meta.type} />
	{#if meta.image}
		<meta property="og:image" content={meta.image} />
	{/if}
</svelte:head>

{#if !post}
	<main>
		<div class="loading">Loading post...</div>
	</main>
{:else if post.published}
	<main>
		<a href="/blog" class="nav-link back-link">
			<span class="arrow">&lt;-</span> blog
		</a>
		
		<article class="post">
			<header>
				<h1>
					{#if metadata.icon}<iconify-icon icon={metadata.icon} />{/if}
					{post.title}
				</h1>
				{#if !(post.show_date === 0 || post.show_date === false)}
					<time datetime={post.published_at || post.created_at} class="date">
						{formatDate(post.published_at || post.created_at)}
					</time>
				{/if}
				{#if metadata.description}
					<p class="description">{metadata.description}</p>
				{/if}
			</header>
			<div class="content" use:imageLoader>
				{@html parsedContent}
			</div>
			
			{#if nextPost}
				<footer class="post-navigation">
					<a href={`/blog/${nextPost.slug}`} class="nav-link next-link">
						next <span class="arrow">-&gt;</span>
					</a>
				</footer>
			{/if}
		</article>
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

	.loading {
		text-align: center;
		padding: 2rem;
		font-size: 1.2rem;
		color: var(--txt);
	}
	
	.post-navigation {
		display: flex;
		justify-content: space-between;
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 1px solid var(--surface-2);
	}
	
	.nav-link {
		font-family: 'Space Mono', monospace;
		font-size: 1.2rem;
		color: var(--txt);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background-color 0.2s;
		
		&:hover {
			background-color: var(--surface-2);
		}
	}
	
	.arrow {
		display: inline-block;
	}
</style>
