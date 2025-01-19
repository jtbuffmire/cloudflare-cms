<!-- Root Layout -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Button, Spinner } from 'flowbite-svelte';
  import LoginButton from '$lib/components/LoginButton.svelte';
  import { getDomain, API_BASE, API_VSN } from '$lib/config';
  import { storeManager } from '$lib/stores';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser, dev } from '$app/environment';
  import '../app.css';
  import 'iconify-icon';

  const DOMAIN = getDomain();
  const publicRoutes = ['/', '/login', '/blog', '/pics', '/animations', '/projects', '/site', '/posts'];
  
  let isAdminDomain = false;
  let mainDomain = `https://${DOMAIN}`;
  let isLoading = true;
  let isAuthenticated = false;
  let isNavigating = false;

  // Format domain for display
  const siteName = DOMAIN.split('.')[0]
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  async function verifyToken(token: string | null) {
    if (!token) return false;
    try {
      const response = await fetch(`${API_BASE}${API_VSN}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        }
      });
      return response.ok;
    } catch (err) {
      console.error('Token verification failed:', err);
      return false;
    }
  }

  async function checkAuth() {
    if (!browser || isNavigating) return;
    
    const token = localStorage?.getItem('token');
    const isPublicRoute = publicRoutes.includes($page.url.pathname);
    
    isAuthenticated = await verifyToken(token);
    
    if (!isAuthenticated && !isPublicRoute) {
      isNavigating = true;
      localStorage?.removeItem('token');
      await goto('/login');
      isNavigating = false;
    }
    
    isLoading = false;
  }

  onMount(() => {
    // Check domain after component is mounted
    if (dev) {
      isAdminDomain = window.location.port === '5174';
      mainDomain = 'http://localhost:5173';
    } else {
      isAdminDomain = window.location.hostname.startsWith('admin.');
      mainDomain = `https://${DOMAIN}`;
    }

    if (isAdminDomain) {
      storeManager.init();
      checkAuth();
    } else {
      window.location.href = mainDomain;
    }
  });

  // Watch route changes
  $: if (browser && !isLoading && !isNavigating) {
    const isPublicRoute = publicRoutes.includes($page.url.pathname);
    if (!isAuthenticated && !isPublicRoute) {
      checkAuth();
    }
  }
</script>

{#if !browser}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <Spinner size="12" />
  </div>
{:else if isLoading}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <Spinner size="12" />
  </div>
{:else if isAuthenticated || publicRoutes.includes($page.url.pathname)}
  <div class="min-h-screen bg-gray-900">
    <Navbar class="bg-gray-800 border-gray-700 px-4">
      <NavBrand href="/">
        <span class="self-center text-xl font-semibold whitespace-nowrap text-white">
          {siteName} Admin
        </span>
      </NavBrand>
      <NavHamburger />
      <NavUl>
        <NavLi>
          <Button href="/" color="dark" class="mx-1 text-lg px-6">Dashboard</Button>
        </NavLi>
        <NavLi>
          <Button href="/posts" color="dark" class="mx-1 text-lg px-6">Posts</Button>
        </NavLi>
        <NavLi>
          <Button href="/pics" color="dark" class="mx-1 text-lg px-6">Pics</Button>
        </NavLi>
        <NavLi>
          <Button href="/animations" color="dark" class="mx-1 text-lg px-6">Animations</Button>
        </NavLi>
        <NavLi>
          <Button href="/projects" color="dark" class="mx-1 text-lg px-6 opacity-50" disabled>Projects</Button>
        </NavLi>
        <NavLi>
          <Button href="/site" color="dark" class="mx-1 text-lg px-6">Site Config</Button>
        </NavLi>
        <NavLi>
          <LoginButton />
        </NavLi>
      </NavUl>
    </Navbar>

    <main class="container mx-auto p-4">
      <slot />
    </main>
  </div>
{:else}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-white">
      Redirecting to login...
    </div>
  </div>
{/if}

<style>
  :global(iconify-icon) {
    font-size: 1.2em;
    vertical-align: middle;
  }
</style> 