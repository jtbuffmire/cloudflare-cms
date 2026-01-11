<script>
	import { siteConfig } from '$lib/stores';

	$: sections = ($siteConfig?.about_sections || [])
		.map(section => ({
			header: section.title || '',
			content: section.content || '',
			visible: section.visible
		}))
		.filter(section => section.visible);
</script>

<main>
	<h1>about</h1>
	{#if $siteConfig?.about_description}
		<p class="description">{$siteConfig.about_description}</p>
	{/if}

	{#if sections.length > 0}
		{#each sections as { header, content }}
			{#if header || content}
				<section>
					{#if header}<h2>{header}</h2>{/if}
					{#if content}<p>{@html content}</p>{/if}
				</section>
			{/if}
		{/each}
	{/if}
</main>

<style lang="scss">
	main {
		width: 100%;
		max-width: 53rem;
		margin: 0 auto 10rem auto;
		padding: 1.5rem;
	}

	section {
		margin-bottom: 2rem;
	}

	h1 {
		margin-bottom: 2rem;
	}

	h2 {
		margin-bottom: 1rem;
		font-size: 1.5rem;
	}

	p {
		font-size: 1.2rem;
		line-height: 1.6;
	}

	.description {
		font-size: 1.2rem;
		margin-bottom: 2rem;
		font-style: italic;
		color: var(--txt-2);
	}
</style>
