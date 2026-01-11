<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig, posts, pics, animations, storeManager } from '$lib/stores';
	import type { SiteConfig, Post, PicsItem, Animation, AnimationsResponse } from '$lib/stores';
	import { page } from '$app/stores';
	import '../app.scss';
	import '$lib/assets/fonts/space-mono.css';
	import '$lib/assets/fonts/space-grotesk.css';
	import 'iconify-icon';
	import Logo from '$lib/components/Logo.svelte';
	import PageHead from '$lib/components/PageHead.svelte';
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';

	export let data: {
		siteConfig?: SiteConfig;
		posts?: Post[];
		pics?: PicsItem[];
		animations?: Animation[];
		pathname: string;
	};

	// Comprehensive logging of incoming data
//	$: if (browser) {
		// console.group('Layout Data Debug');
		// console.log('🔄 Full data object:', data);
		// console.log('📝 Posts:', {
		// 	count: data.posts?.length || 0,
		// 	posts: data.posts,
		// 	publishedCount: data.posts?.filter(p => p.published)?.length || 0
		// });
		// console.log('⚙️ Site Config:', {
		// 	config: data.siteConfig,
		// 	navLinks: data.siteConfig?.nav_links
		// });
		// console.log('🖼️ Pics:', {
		// 	count: data.pics?.length || 0,
		// 	items: data.pics
		// });
		// console.log('🎨 Animations:', {
		// 	count: data.animations?.length || 0,
		// 	items: data.animations
		// });
		// console.log('🔍 Current pathname:', data.pathname);
		// console.groupEnd();
//	}
	
	export const form: unknown = undefined;

	// Update stores with data
	$: if (data.siteConfig) siteConfig.set(data.siteConfig);
	$: if (data.posts) {
		console.log('Setting posts with show_date values:', data.posts.map(p => ({ 
			id: p.id, 
			title: p.title, 
			show_date: p.show_date 
		})));
		posts.set(data.posts);
	}
	$: if (data.pics) pics.set(data.pics);
	$: if (data.animations) animations.set(data.animations);

	// Add a check to ensure lottie_animation is set to 'default' if empty
	$: if ($siteConfig && !$siteConfig.lottie_animation) {
		siteConfig.update(config => ({
			...config,
			lottie_animation: 'default'
		}));
	}

	// Add a check to ensure the default animation is in the animations store
	$: if ($animations && $siteConfig?.lottie_animation === 'default' && !$animations.find(a => a.name === 'default')) {
		console.warn('Default animation not found in animations store');
	}

	// Static array for transitions
	const pages = [
	//	{ name: 'projects', path: '/projects' },
		{ name: 'blog', path: '/blog' },
		{ name: 'pics', path: '/pics' },
		{ name: 'about', path: '/about' },
		{ name: 'contact', path: '/contact' }
	];

	// Simplified navigation check
	$: visiblePages = pages.filter(page => 
		$siteConfig?.nav_links?.[page.name]
	);

	let prevTwoPages = ['', ''];
	$: {
		prevTwoPages = [prevTwoPages[1], data.pathname];
	}

	function xy(path: string, isIn: boolean = true) {
		if (path === prevTwoPages[0]) {
			return { x: 0, y: 0 };
		}

		let currDepth = path.split('/').length;
		let prevDepth = prevTwoPages[0].split('/').length;
		const getParentPath = (p: string) => '/' + p.split('/')[1];
		const currParent = getParentPath(path);
		const prevParent = getParentPath(prevTwoPages[0]);
		let currParentIdx = pages.findIndex((page) => page.path === currParent);
		let prevParentIdx = pages.findIndex((page) => page.path === prevParent);

		if (path === '/') {
			currParentIdx = prevParentIdx;
			currDepth = 1;
		}
		if (prevTwoPages[0] === '/') {
			prevParentIdx = currParentIdx;
			prevDepth = 1;
		}

		const xDiff = currParentIdx - prevParentIdx;
		const yDiff = currDepth - prevDepth;

		return { x: `${isIn ? '' : '-'}${xDiff * 20}vh`, y: `${isIn ? '' : '-'}${yDiff * 20}vh` };
	}

	// WebSocket connection is managed by storeManager (initialized in stores.ts)
	// No need to create a separate connection here
</script>

<svelte:head>
	<script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" async={false}></script>
</svelte:head>

<PageHead
	title={$page.error ? $page.status : $siteConfig?.title ?? 'Loading...'}
	description={$page.error ? $page.error.message : $siteConfig?.description ?? 'Loading...'}
	type={$page.data?.meta?.type ?? 'website'}
	image={$page.data?.meta?.image ?? ''}
/>

<header class:home={$page.url.pathname === '/'}>
    <div class="row">
        <a class="pfp" href="/" aria-label="homepage">
            <Logo header={true} --width="2rem" --height="2rem" />
        </a>
        <a href="/"><h1>{$siteConfig?.title || 'default title'}</h1></a>
    </div>
    <nav>
        {#each visiblePages as { name, path }}
            <a class="nav" href={path}>
                <span class="arrow">-></span><span class="slash">/</span>{name}
            </a>
        {/each}
    </nav>
</header>
<div class="container">
	{#key data.pathname}
		<div
			class="transition"
			in:fly={{
				duration: 100,
				delay: 50,
				...xy(data.pathname)
			}}
			out:fly={{
				duration: 100,
				...xy(data.pathname, false)
			}}
		>
			<slot />
		</div>
	{/key}
</div>

<style lang="scss">
	@use '../lib/styles/mixins';
	
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 5rem;
		height: 6rem;
		overflow: hidden;
		transition: transform 0.1s ease;
		transform: translateY(0);
		flex-shrink: 0;

		&.home {
			transform: translateY(-70%);
		}

		.row {
			@include mixins.flex(row, null, center);
			gap: 1.5rem;

			.pfp {
				display: flex;
			}

			h1 {
				font-size: 1.4rem;
				color: var(--txt);
				margin: 0;
			}
		}

		nav {
			display: flex;
			gap: 2.5rem;

			a {
				font-size: 1.4rem;
				font-family: 'Space Mono', monospace;
			}

			.slash &::after {
				top: -6px;
				left: 1.4px;
			}
		}
	}

	.container {
		height: 100%;
		display: grid;
	}

	.transition {
		grid-column-start: 1;
		grid-column-end: 2;
		grid-row-start: 1;
		grid-row-end: 2;
	}

	@media (max-width: 850px) {
		header {
			padding: 0 1.5rem;
			gap: 1.5rem;

			nav {
				gap: 1.5rem;
			}
		}
	}

	@media (max-width: 700px) {
		header nav {
			display: none;
		}
	}
</style>
