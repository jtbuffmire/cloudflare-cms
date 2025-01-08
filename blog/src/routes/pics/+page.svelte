<script>
	import { onMount } from 'svelte';
	import { siteConfig, media } from '$lib/stores';

	// Debug raw media data
	// $: console.log('🔍 Raw media store data:', $media);
	// Debug siteConfig data for pics description
	// $: console.log('📝 Pics description:', $siteConfig?.pics_description);

	// Filter media items
    $: images = ($media || [])
        .filter(item => item.published && item.show_in_pics)
        .map(function(item) {
            return {
				sources: {
					avif: item.avif_url || null,
					webp: item.webp_url || null
				},
				img: { 
					src: item.url, 
					w: item.width,
					h: item.height
				},
				text_description: item.text_description,
				text_description_visible: item.text_description_visible
			}
    	});


</script>

<main>
	<h1>pics</h1>
	{#if $siteConfig?.pics_description}
		<p class="description">{$siteConfig.pics_description}</p>
	{/if}
	<br />
	{#each images as image}
		<picture>
			{#if image.sources.avif}
				<source srcset={image.sources.avif} type="image/avif" />
			{/if}
			{#if image.sources.webp}
				<source srcset={image.sources.webp} type="image/webp" />
			{/if}
			<img
				src={image.img.src}
				alt={image.text_description || ''}
				loading="lazy"
				onload="this.style.opacity=1"
				width={image.img.w}
				height={image.img.h}
			/>
		</picture>
		{#if image.text_description && image.text_description_visible}
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
	img {
		transition: opacity 0.2s;
		opacity: 0;
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
