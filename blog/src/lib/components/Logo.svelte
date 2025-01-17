<script lang="ts">
	import pfpin from '$lib/assets/pfpin.json';
	import { onMount, onDestroy } from 'svelte';
	import { siteConfig } from '$lib/stores';
	import { API_BASE, API_VSN } from '$lib/config';
	import type { AnimationItem } from 'lottie-web';
	import type { default as LottieInstance } from 'lottie-web/build/player/lottie_light.min.js';

	export let header = false;
	let node: HTMLDivElement;
	let currentAnimation: AnimationItem | null = null;
	let isDefaultAnimation = true;
	let lastLoadedAnimation = ''; 
	let isLoading = false;
	let lastSiteConfigUpdate = '';
	let loopCount = 0;
	let isHovered = false;

	$: configKey = $siteConfig ? JSON.stringify({
		animation: $siteConfig.lottie_animation,
		r2Key: $siteConfig.lottie_animation_r2_key,
		scale: $siteConfig.scale_factor
	}) : '';

	$: if (!header && !isDefaultAnimation && node) {
		const scale = $siteConfig?.scale_factor || 100;
		node.style.transform = `scale(${scale / 100})`;
		node.style.marginLeft = `${(scale - 100) / 4.2}px`;
		node.style.marginBottom = `${(scale - 100) / 10}px`;
	}

	function handleMouseEnter() {
		if (!isDefaultAnimation && currentAnimation) {
			isHovered = true;
			currentAnimation.setDirection(1);
			currentAnimation.loop = true;
			currentAnimation.play();
		}
	}

	function handleMouseLeave() {
		if (!isDefaultAnimation && currentAnimation) {
			isHovered = false;
			currentAnimation.setDirection(-1);
			currentAnimation.loop = false;
			currentAnimation.play();
		}
	}

	type LottieOptions = {
		container: HTMLElement;
		renderer: string;
		loop: boolean;
		autoplay: boolean;
		animationData: any;
		rendererSettings?: {
			preserveAspectRatio: string;
		};
	};

	async function initAnimation() {
		if (!$siteConfig?.lottie_animation) return;

		const animationKey = $siteConfig.lottie_animation_r2_key || $siteConfig.lottie_animation;
		
		if (node) {
			if (animationKey === lastLoadedAnimation || isLoading || configKey === lastSiteConfigUpdate) {
				return;
			}

			isLoading = true;
			lastSiteConfigUpdate = configKey;
			try {
				if (currentAnimation) {
					currentAnimation.destroy();
					currentAnimation = null;
				}

				lastLoadedAnimation = animationKey;
				const lottie = (await import('lottie-web/build/player/lottie_light.min.js')).default;
				
				let animationData = pfpin;
				isDefaultAnimation = true;
				
				if ($siteConfig?.lottie_animation && $siteConfig.lottie_animation !== 'default-pin') {
					try {
						const r2Key = $siteConfig.lottie_animation_r2_key;
						if (r2Key && r2Key !== '') {
							const response = await fetch(`${API_BASE}${API_VSN}/animations/file/${encodeURIComponent(r2Key)}`, {
								headers: {
									'X-Site-Domain': window.location.hostname.split(':')[0]
								}
							});
							if (response.ok) {
								animationData = await response.json();
								isDefaultAnimation = false;
							} else {
								console.error('❌ Failed to load animation from R2:', response.status);
							}
						}
					} catch (err) {
						console.error('❌ Error loading animation:', err);
					}
				}

				if (header && isDefaultAnimation) {
					return;
				}

				currentAnimation = lottie.loadAnimation({
					container: node,
					renderer: 'svg',
					loop: false,
					autoplay: true,
					animationData,
					rendererSettings: {
						preserveAspectRatio: 'xMidYMid meet'
					}
				} as LottieOptions);

				if (isDefaultAnimation) {
					currentAnimation.setSpeed(0.85);
					currentAnimation.addEventListener('complete', () => {
						node.classList.add('pfp');
						currentAnimation?.pause();
					});
				} else {
					loopCount = 0;
					currentAnimation.addEventListener('complete', () => {
						if (!isHovered) {
							loopCount++;
							if (loopCount < 2) {
								currentAnimation?.goToAndPlay(0);
							} else {
								currentAnimation?.pause();
							}
						}
					});
				}
			} catch (err) {
				console.error('❌ Error initializing animation:', err);
			} finally {
				isLoading = false;
			}
		}
	}

	onMount(initAnimation);

	$: if ($siteConfig && 
		(($siteConfig.lottie_animation && $siteConfig.lottie_animation !== '') || 
		($siteConfig.lottie_animation_r2_key && $siteConfig.lottie_animation_r2_key !== ''))) {
		initAnimation();
	}

	onDestroy(() => {
		if (currentAnimation) {
			currentAnimation.destroy();
		}
	});
</script>

<div
	class={`${header ? 'header' : isDefaultAnimation ? 'default' : 'custom'}`}
	bind:this={node}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	role="img"
	aria-label={header ? "Site logo" : "Animated site logo"}
>
	{#if header && isDefaultAnimation}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14.06 2.36 292.69 259.89" aria-hidden="true">
			<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="19.844">
				<path d="m71.107 238.27 122.37-211.95" stroke="#bd63ee" />
				<path d="M193.48 238.27 71.11 26.32" stroke="#6262ee" />
				<path d="M9.9219 132.29h244.74" stroke="#26bbd9" />
			</g>
		</svg>
	{/if}
</div>

<style>
	div {
		display: flex;
		justify-content: center;
		align-items: center;
		transform-origin: center center;
		transition: transform 0.8s ease-out, margin-left 0.3s ease-out;
	}

	.default, .custom {
		width: 3.75rem;
		height: 3.75rem;
	}

	.header {
		width: 2rem;
		height: 2rem;
	}

	svg {
		width: 100%;
		height: 100%;
	}

	.pfp {
		transition: transform 1.5s ease;
		transform-origin: center center;
	}

	.pfp:hover {
		transform: rotate(360deg);
	}
</style>
