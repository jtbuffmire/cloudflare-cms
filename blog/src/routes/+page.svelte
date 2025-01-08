<script>
	import { onMount, onDestroy } from 'svelte';
	import { siteConfig, animations } from '$lib/stores';
	import Logo from '$lib/components/Logo.svelte';

	// navigation links
	$: navItems = Object.entries($siteConfig.nav_links ?? {})
  		.filter(([_, enabled]) => enabled) // true check
  		.map(([name]) => ({ name, path: `/${name}` }));

</script>

<main>
	<div class="container">
		<div class="row">
			<h1>{$siteConfig.title || 'default title'}</h1>
			<Logo />
		</div>
		<p>{$siteConfig.description || 'default description'}</p>
		<nav>
			{#each navItems as { name, path }}
				<a class="nav" href={path}>
					<span class="arrow">-></span><span class="slash">/</span>{name}
				</a>
			{/each}
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

	.animation-container {
		width: 3.75rem;
		height: 3.75rem;
		
		&.animation-complete {
			/* Add any styles you want after animation completes */
		}
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

