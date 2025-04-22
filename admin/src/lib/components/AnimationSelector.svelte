<script lang="ts">
  import { onMount } from 'svelte';
  import { API_BASE, API_VSN, getRequestInit, getDomain } from '$lib/config';
  import { Button, Card } from 'flowbite-svelte';
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';

  export let onSelect: (data: any, name: string) => void;

  // Get domain and token from URL params or defaults
  const urlDomain = $page.url.searchParams.get('domain');
  const urlToken = $page.url.searchParams.get('token');
  const domain = urlDomain || getDomain();

  interface ErrorResponse {
    error: string;
  }

  interface AnimationsResponse {
    animations: Array<{
      id: string;
      name: string;
      data: any;
    }>;
  }

  // Update request init to include token if provided in URL
  const getAnimationRequestInit = () => {
    const init = getRequestInit();
    if (urlToken) {
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${urlToken}`
      };
    }
    return init;
  };

  let loading = true;
  let error: string | null = null;
  let animations: Array<{
    id: string;
    name: string;
    data: any;
  }> = [];

  async function loadAnimations() {
    loading = true;
    error = null;

    try {
      const response = await fetch(`${API_BASE}${API_VSN}/animations`, {
        ...getAnimationRequestInit()
      });

      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to load animations');
      }

      const data = await response.json() as AnimationsResponse;
      animations = data.animations || [];
    } catch (err) {
      console.error('Error loading animations:', err);
      error = err instanceof Error ? err.message : 'Failed to load animations';
    } finally {
      loading = false;
    }
  }

  function handleSelect(animation: typeof animations[0]) {
    onSelect(animation.data, animation.name);
  }

  onMount(loadAnimations);
</script>

<Card class="p-4 bg-gray-800">
  <h3 class="text-xl font-bold mb-4 text-white">Select Animation</h3>
  
  {#if loading}
    <p class="text-gray-400">Loading animations...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if animations.length === 0}
    <p class="text-gray-400">No animations found</p>
  {:else}
    <div class="grid grid-cols-3 gap-4">
      {#each animations as animation}
        <button
          type="button"
          class="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          on:click={() => handleSelect(animation)}
        >
          <div class="flex items-center gap-2">
            <Icon icon="mdi:animation" class="text-2xl" />
            <span class="text-white truncate">{animation.name}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</Card>

<style>
  :global(.iconify) {
    font-size: 1.5em;
  }
</style> 