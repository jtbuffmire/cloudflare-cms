<!-- Login Button Component -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from 'flowbite-svelte';
  import { getDomain, API_BASE, API_VSN } from '$lib/config';

  const DOMAIN = getDomain();
  let isLoggedIn = false;

  onMount(() => {
    const token = localStorage.getItem('token');
    isLoggedIn = !!token;
  });

  function logout() {
    localStorage.removeItem('token');
    isLoggedIn = false;
    window.location.href = '/login';  
  }
</script>

<div class="flex items-center">
  {#if isLoggedIn}
    <Button color="dark" on:click={logout}>
      Logout
    </Button>
  {:else}
    <Button color="dark" href="/login">
      Login
    </Button>
  {/if}
</div> 