<script>
	import pfpin from '$lib/assets/pfpin.json';
	import { onMount, onDestroy } from 'svelte';
	import { siteConfig, animations } from '$lib/stores';

	export let header = false;
	let node;
	let currentAnimation;

	onMount(async () => {
		if (!header) {  // Only do initial animation for non-header logo
			const lottie = (await import('lottie-web/build/player/lottie_light.min.js')).default;
			
			// Determine which animation to use
			let animationData = pfpin;
			if ($siteConfig?.lottie_animation && $siteConfig.lottie_animation !== 'default-pin') {
				const customAnimation = $animations.find(a => a.name === $siteConfig.lottie_animation);
				if (customAnimation) {
					const response = await fetch(`/animations/file/${encodeURIComponent(customAnimation.r2_key)}`);
					if (response.ok) {
						animationData = await response.json();
					}
				}
			}

			// Store reference for cleanup
			currentAnimation = lottie.loadAnimation({
				container: node,
				renderer: 'svg',
				loop: false,
				autoplay: true,
				animationData
			});
			
			currentAnimation.addEventListener('complete', () => {
				node.classList.add('pfp');
			});
		}
	});

	onDestroy(() => {
		if (currentAnimation) {
			currentAnimation.destroy();
		}
	});
</script>

<div 
	class={header ? 'pfp header' : 'pfpstart'} 
	bind:this={node}
>
	{#if header}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14.06 2.36 292.69 259.89">
			<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="19.844">
				<path d="m71.107 238.27 122.37-211.95" stroke="#bd63ee" />
				<path d="M193.48 238.27 71.11 26.32" stroke="#6262ee" />
				<path d="M9.9219 132.29h244.74" stroke="#26bbd9" />
			</g>
		</svg>
	{/if}
</div>

<style>
	.pfp {
		width: var(--width, 3.75rem);
		height: var(--height, 3.75rem);
		transition: transform 1.5s;
	}

	.pfpstart {
		width: var(--width, 3.75rem);
		height: var(--height, 3.75rem);
	}

	.pfp.header {
		width: 2rem;
		height: 2rem;
	}

	.pfp:hover {
		cursor: pointer;
		transform: rotate(360deg);
	}

	svg {
		width: 100%;
		height: 100%;
	}
</style>
