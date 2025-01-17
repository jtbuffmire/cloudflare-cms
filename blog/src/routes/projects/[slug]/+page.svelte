<script lang="ts">
	import { marked } from 'marked';
	import Image from '$lib/components/Image.svelte';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
	import type { PageData } from './$types';

	export let data: PageData;
	
	$: ({ project } = data);
	$: content = marked(project.content);

	let emblaApi: EmblaCarouselType;
	let options: EmblaOptionsType = { loop: true, align: 'start' };
	let loop = true;

	function emblaInit(event: CustomEvent<EmblaCarouselType>) {
		emblaApi = event.detail;
		loop = emblaApi.internalEngine().slideLooper.canLoop();
	}

	function emblaNext() {
		emblaApi?.scrollNext();
	}

	function emblaPrev() {
		emblaApi?.scrollPrev();
	}
</script>

<main>
	<div class="head">
		<div class="row">
			<h1>{project.name}</h1>
			<div class="links">
				{#if project.website}
					<a class="external" href={project.website} target="_blank">
						site<span class="arrow">/></span>
					</a>
				{/if}
				{#if project.github}
					<a class="external" href={project.github} target="_blank">
						github<span class="arrow">/></span>
					</a>
				{/if}
			</div>
		</div>
		<p class="description">
			{project.description}
		</p>
	</div>

	{#if project.images && project.images.length > 0}
		<div class="embla" use:emblaCarouselSvelte={{ options, plugins: [] }} on:emblaInit={emblaInit}>
			<div class="embla__container" class:loop>
				{#each project.images as image}
					<div class="embla__slide">
						<Image {image} alt={project.description} sizes="(min-width: 800px) 80vw, 100vw" />
					</div>
				{/each}
			</div>
			<button class="embla__prev" on:click={emblaPrev}><span>&lt;-</span></button>
			<button class="embla__next" on:click={emblaNext}><span>-></span></button>
		</div>
	{:else if project.thumbnail}
		<div class="single-image">
			<Image image={project.thumbnail} alt={project.description} />
		</div>
	{/if}

	<div class="content">
		{@html content}
	</div>
</main>

<style lang="scss">
	main {
		width: 100%;
		padding: 0 0rem 10rem 0rem;
		margin: auto;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		margin-right: auto;
	}

	.head {
		margin: 1rem auto 3rem auto;
		padding: 0 1.5rem;
		width: 100%;
		max-width: 53rem;

		a {
			font-family: 'Space Mono', monospace;
			font-size: 1.5rem;
		}

		.row,
		.links {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 1rem 2rem;
		}

		.description {
			font-size: 1.2rem;
			margin: 1.5rem 0 2rem 0;
			font-style: italic;
			color: var(--txt-2);
		}
	}

	.content {
		width: 100%;
		max-width: 53rem;
		margin: auto;
		margin-top: 3rem;
		padding: 0 1.5rem;
	}

	.embla {
		overflow: hidden;
		position: relative;
	}
	.embla__container {
		display: flex;
		justify-content: center;

		&.loop {
			justify-content: unset;
		}
	}
	/* svelte-ignore unused-css-selector */
	.embla__slide {
		flex: 0 0 70%;
		max-width: 80rem;
		min-width: 0;
		margin-left: 1.5rem;
		margin-right: 1.5rem;

		&.tall {
			flex: 0 0 20%;
			max-width: 20rem;
		}
	}
	.embla__prev,
	.embla__next {
		position: absolute;
		top: 0;
		bottom: 0;
		width: calc(15% - 3rem);
		background: none;

		span {
			display: inline-block;
			color: var(--txt-0);
			font-size: 3rem;
			font-family: 'Space Mono', monospace;
			transform: scale(1);
			transition: 0.2s;
			opacity: 0;
			background: var(--bg-2);
			width: 3rem;
			height: 3rem;
			line-height: 2.9rem;
		}

		&:hover span {
			opacity: 1;
			transform: scale(1.2);
		}
	}
	.embla__next {
		right: 0;
	}
	.embla__prev {
		left: 0;
	}

	@media (max-width: 850px) {
		.embla__slide {
			flex: 0 0 calc(100% - 3rem);
			max-width: 50rem;
		}
		.embla__prev,
		.embla__next {
			width: 20%;
			span {
				opacity: 1;
			}
		}
		.embla__prev {
			text-align: left;
			padding-left: 1rem;
		}
		.embla__next {
			text-align: right;
			padding-right: 1rem;
		}
	}

	@media (max-width: 650px) {
		.head {
			.row {
				flex-wrap: wrap;
			}
		}
	}
</style>
