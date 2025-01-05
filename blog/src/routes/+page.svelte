<script>
	import pfpin from '$lib/assets/pfpin.json';
	import { onMount } from 'svelte';
	import { siteConfig } from '$lib/stores';

	let lottie;

	onMount(async () => {
		lottie = await import('lottie-web/build/player/lottie_light.min.js');
		let node = document.querySelector('.pfpstart');
		const animation = lottie.loadAnimation({
			name: 'pfp',
			container: node,
			renderer: 'svg',
			loop: false,
			autoplay: true,
			animationData: pfpin
		});
		animation.addEventListener('complete', () => {
			node.classList.add('pfp');
		});
	});

	// Default nav links as fallback
	const defaultNavLinks = {
		projects: 0,
		blog: 1,
		pics: 1,
		about: 1,
		contact: 1
	};
</script>

<main>
	<div class="container">
		<div class="row">
			<h1>{$siteConfig.title || 'mealz on wheels'}</h1>
			<div class="pfpstart"></div>
		</div>
		<p>{$siteConfig.description || "a travelin girl."}</p>
		<nav>
			{#if ($siteConfig.nav_links?.projects ?? defaultNavLinks.projects)}
				<a class="nav" href="/projects">
					<span class="arrow">-></span><span class="slash">/</span>projects
				</a>
			{/if}
			{#if ($siteConfig.nav_links?.blog ?? defaultNavLinks.blog)}
				<a class="nav" href="/blog">
					<span class="arrow">-></span><span class="slash">/</span>blog
				</a>
			{/if}
			{#if ($siteConfig.nav_links?.pics ?? defaultNavLinks.pics)}
				<a class="nav" href="/pics">
					<span class="arrow">-></span><span class="slash">/</span>pics
				</a>
			{/if}
			{#if ($siteConfig.nav_links?.about ?? defaultNavLinks.about)}
				<a class="nav" href="/about">
					<span class="arrow">-></span><span class="slash">/</span>about
				</a>
			{/if}
			{#if ($siteConfig.nav_links?.contact ?? defaultNavLinks.contact)}
				<a class="nav" href="/contact">
					<span class="arrow">-></span><span class="slash">/</span>contact
				</a>
			{/if}
		</nav>
	</div>
</main>

<style lang="scss">
	main {
		@include flex(row, center, center);

		height: 100%;
		max-height: calc(100vh - 12rem);
		margin: 0 1.5rem;
	}

	.row {
		@include flex(row, null, center);
		gap: 2rem;
	}

	.pfpstart,
	.pfp {
		width: 3.75rem;
		height: 3.75rem;
	}

	h1 {
		font-size: 3.2rem;
		margin: 0;
	}

	nav {
		display: flex;
		gap: 2rem;

		a {
			font-size: 1.5rem;
			font-family: 'Space Mono', monospace;
		}
	}

	p {
		font-size: 1.2rem;
		margin: 1.25rem 0;
	}

	@media (max-width: 600px) {
		nav {
			flex-direction: column;
			gap: 1rem;
		}
		.row {
			flex-direction: column-reverse;
			gap: 0.5rem;
			align-items: flex-start;
		}
	}
</style>

