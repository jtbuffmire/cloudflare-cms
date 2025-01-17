<!-- Root Layout -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Button, Spinner } from 'flowbite-svelte';
  import LoginButton from '$lib/components/LoginButton.svelte';
  import { getDomain, API_BASE, API_VSN } from '$lib/config';
  import { storeManager } from '$lib/stores';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import '../app.css';
  import 'iconify-icon';

  const DOMAIN = getDomain();
  
  // List of routes that don't require authentication
  const publicRoutes = ['/login'];
  
  let isLoading = true;
  let isAuthenticated = false;
  let isNavigating = false;

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
    
    const token = localStorage.getItem('token');
    const isPublicRoute = publicRoutes.includes($page.url.pathname);
    
    isAuthenticated = await verifyToken(token);
    
    if (!isAuthenticated && !isPublicRoute) {
      isNavigating = true;
      localStorage.removeItem('token'); // Clear invalid token
      await goto('/login');
      isNavigating = false;
    } else if (isAuthenticated && $page.url.pathname === '/login') {
      isNavigating = true;
      await goto('/');
      isNavigating = false;
    }
    
    isLoading = false;
  }

  onMount(() => {
    // Initialize store manager which sets up WebSocket connection
    storeManager.init();
    checkAuth();
  });

  // Watch route changes
  $: if (browser && !isLoading && !isNavigating) {
    const isPublicRoute = publicRoutes.includes($page.url.pathname);
    if (!isAuthenticated && !isPublicRoute) {
      checkAuth();
    }
  }
</script>

<svelte:head>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
</svelte:head>

{#if isLoading}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <Spinner size="12" />
  </div>
{:else if isAuthenticated || publicRoutes.includes($page.url.pathname)}
  <div class="min-h-screen bg-gray-900">
    <Navbar class="bg-gray-800 border-gray-700 px-4">
      <NavBrand href="/">
        <span class="self-center text-xl font-semibold whitespace-nowrap text-white">Admin Panel</span>
      </NavBrand>
      <NavHamburger />
      <NavUl>
        <NavLi>
          <Button href="/" color="dark" class="mx-1">Dashboard</Button>
        </NavLi>
        <NavLi>
          <Button href="/posts" color="dark" class="mx-1">Posts</Button>
        </NavLi>
        <NavLi>
          <Button href="/pics" color="dark" class="mx-1">Pics</Button>
        </NavLi>
        <NavLi>
          <Button href="/animations" color="dark" class="mx-1">Animations</Button>
        </NavLi>
        <NavLi>
          <Button href="/projects" color="dark" class="mx-1 opacity-50" disabled>Projects</Button>
        </NavLi>
        <NavLi>
          <Button href="/site" color="dark" class="mx-1">Site Config</Button>
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