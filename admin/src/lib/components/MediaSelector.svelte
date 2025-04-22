<script lang="ts">
  import { onMount } from 'svelte';
  import { API_BASE, API_VSN, getRequestInit, getDomain } from '$lib/config';
  import { Button, Card } from 'flowbite-svelte';
  import { page } from '$app/stores';

  export let onSelect: (url: string, name: string) => void;

  // Get domain and token from URL params or defaults
  const urlDomain = $page.url.searchParams.get('domain');
  const urlToken = $page.url.searchParams.get('token');
  const domain = urlDomain || getDomain();

  // Update request init to include token if provided in URL
  const getPicRequestInit = () => {
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
  let images: Array<{
    id: string;
    name: string;
    url: string;
    text_description?: string;
  }> = [];

  interface PicFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
    published: boolean;
    text_description?: string;
  }

  function getAbsoluteUrl(relativeUrl: string): string {
    // If the URL is already absolute, return it as is
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    // Create URL object for the pics endpoint
    const url = new URL(`${API_BASE}${relativeUrl}`);
    
    // Add authentication and domain parameters
    if (urlToken) {
      url.searchParams.set('token', urlToken);
    }
    if (domain) {
      url.searchParams.set('domain', domain);
    }
    
    return url.toString();
  }

  async function loadPics() {
    try {
      const response = await fetch(`${API_BASE}${API_VSN}/pics`, getPicRequestInit());
      if (!response.ok) throw new Error('Failed to load pics');
      const data = await response.json() as PicFile[];
      // Convert relative URLs to absolute URLs with auth params
      images = data.map(image => ({
        ...image,
        url: getAbsoluteUrl(image.url)
      }));
      loading = false;
    } catch (err) {
      console.error('Error loading pics:', err);
      error = 'Failed to load pics';
      loading = false;
    }
  }

  function handleSelect(image: typeof images[0]) {
    onSelect(image.url, image.text_description || image.name);
  }

  onMount(loadPics);
</script>

<Card class="p-4 bg-gray-800">
  <h3 class="text-xl font-bold mb-4 text-white">Select Image</h3>
  
  {#if loading}
    <p class="text-gray-400">Loading pics...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if images.length === 0}
    <p class="text-gray-400">No images found</p>
  {:else}
    <div class="grid grid-cols-4 gap-4">
      {#each images as image}
        <button
          type="button"
          class="aspect-square relative group"
          on:click={() => handleSelect(image)}
        >
          <img
            src={image.url}
            alt={image.text_description || image.name}
            class="w-full h-full object-cover rounded-lg"
          />
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex flex-col justify-end p-2">
            <span class="text-white text-sm truncate bg-black bg-opacity-50 p-1 rounded">
              {image.text_description || image.name}
            </span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</Card> 