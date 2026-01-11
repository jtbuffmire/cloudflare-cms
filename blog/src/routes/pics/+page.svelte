<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig, pics } from '$lib/stores';
	import { API_BASE, API_VSN, getDefaultHeaders } from '$lib/config';
	import { browser } from '$app/environment';

	// Get the current domain from the browser URL
	const getCurrentDomain = () => {
		if (browser) {
			const hostname = window.location.hostname;
			// If localhost, return the port as well to differentiate between admin and blog
			if (hostname === 'localhost') {
				return `${hostname}:${window.location.port}`;
			}
			return hostname;
		}
		return '';
	};

	function getPicUrl(url: string): string {
		console.log('🔗 Input URL:', url);

		// If the URL is already absolute, return it as is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}

		const finalUrl = `${API_BASE}${API_VSN}${url}`;
		console.log('🔗 Final URL:', finalUrl);
		
		// Add domain from default headers
		const picUrl = new URL(finalUrl);
		const domain = window.location.hostname.split(':')[0];
		picUrl.searchParams.set('domain', domain);
		
		return picUrl.toString();
	}

	// Handle image load event - fade in loaded images
	function handleImageLoad(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		img.classList.add('loaded');
	}

	// Debug raw picture data
	$: console.log('🔍 Raw Picture store data:', $pics);

	// Filter pictures 
    $: images = ($pics || [])
        .filter(item => {
            console.log(`Filtering item ${item.id}:`, {
                published: item.published,
                show_in_pics: item.show_in_pics,
                passes_filter: item.published && item.show_in_pics
            });
            return item.published && item.show_in_pics;
        })
        .map(function(item) {
            return {
				sources: {
					avif: item.avif_url ? getPicUrl(item.avif_url) : null,
					webp: item.webp_url ? getPicUrl(item.webp_url) : null
				},
				img: { 
					src: getPicUrl(item.url), 
					w: item.width,
					h: item.height
				},
				text_description: item.text_description,
				text_description_visible: item.text_description_visible
			}
    	});

    $: console.log('📸 Filtered images:', images.length);
</script>

<svelte:head>
	{#if images[0]}
		<!-- Preload LCP image for faster rendering -->
		<link 
			rel="preload" 
			as="image" 
			href={images[0].sources.webp || images[0].sources.avif || images[0].img.src}
			type={images[0].sources.webp ? 'image/webp' : images[0].sources.avif ? 'image/avif' : undefined}
		/>
	{/if}
</svelte:head>

<main>
	<h1>pics</h1>
	{#if $siteConfig?.pics_description}
		<p class="description">{$siteConfig.pics_description}</p>
	{/if}
	<br />
	{#each images as image, index}
		<picture>
			{#if image.sources.avif}
				<source srcset={image.sources.avif} type="image/avif" />
			{/if}
			{#if image.sources.webp}
				<source srcset={image.sources.webp} type="image/webp" />
			{/if}
			<!-- First 2 images load eagerly for LCP, rest lazy load -->
			<img
				src={image.img.src}
				alt={image.text_description || ''}
				loading={index < 2 ? 'eager' : 'lazy'}
				fetchpriority={index === 0 ? 'high' : 'auto'}
				decoding={index < 2 ? 'sync' : 'async'}
				on:load={handleImageLoad}
				width={image.img.w}
				height={image.img.h}
			/>
		</picture>
		{#if image.text_description}
			<p class="image-description">{image.text_description}</p>
		{/if}
	{/each}
</main>

<style>
	main {
		width: 100%;
		max-width: 63rem;
		margin: 0 auto 10rem auto;
		padding: 0 5rem;
	}

	h1 {
		margin-bottom: 2rem;
	}

	picture {
		display: block;
		margin-bottom: 0.5rem;
	}
	/* First 2 images show immediately for better LCP */
	picture:nth-child(-n+2) img {
		opacity: 1;
	}
	/* Lazy-loaded images fade in */
	picture:nth-child(n+3) img {
		transition: opacity 0.2s;
		opacity: 0;
	}
	picture:nth-child(n+3) img.loaded {
		opacity: 1;
	}
	img {
		width: 100%;
		height: auto;
	}

	@media (max-width: 850px) {
		main {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}

	.image-description {
		font-size: 0.9em;
		color: var(--txt-2);
		margin-top: 0.25rem;
		margin-bottom: 1.5rem;
		font-style: italic;
		text-align: right;
		padding-right: 0.5rem;
	}

	.description {
		font-size: 1.1rem;
		color: var(--txt-2);
		margin-bottom: 2rem;
		font-style: italic;
	}
</style>
