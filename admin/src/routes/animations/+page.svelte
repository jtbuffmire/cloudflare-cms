<script lang="ts">
  import { onMount } from 'svelte';
  import { API_BASE, API_VSN, getRequestInit, getDomain } from '$lib/config';
  import { Button, Card, Modal, Label, Input } from 'flowbite-svelte';
  import { page } from '$app/stores';

  interface Animation {
    id: string;
    name: string;
    data: any;
    domain: string;
    scale_factor: number;
    r2_key: string;
    hash: string;
  }

  // Get domain and token from URL params or defaults
  const urlDomain = $page.url.searchParams.get('domain');
  const urlToken = $page.url.searchParams.get('token');
  const DOMAIN = urlDomain || getDomain();
  
  let animations: Animation[] = [];
  let error: string | null = null;
  let isLoading = false;
  let uploadError: string | null = null;
  let showUploadModal = false;
  let animationName = '';
  let selectedFile: File | null = null;

  async function loadAnimations() {
    isLoading = true;
    error = null;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/animations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load animations');
      }

      const data = await response.json() as { animations: Animation[] };
      animations = data.animations || [];
    } catch (err) {
      console.error('Error loading animations:', err);
      error = err instanceof Error ? err.message : 'Failed to load animations';
    } finally {
      isLoading = false;
    }
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    selectedFile = input.files?.[0] || null;
    if (selectedFile) {
      // Default name to file name without extension
      animationName = selectedFile.name.replace(/\.[^/.]+$/, "");
      showUploadModal = true;
    }
  }

  async function handleUpload() {
    if (!selectedFile || !animationName.trim()) {
      uploadError = 'Both file and name are required';
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      error = 'Not authenticated';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', animationName.trim());
      formData.append('domain', DOMAIN);

      const response = await fetch(`${API_BASE}${API_VSN}/animations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to upload animation');
      }

      // Reset form
      selectedFile = null;
      animationName = '';
      showUploadModal = false;

      // Refresh animations list
      await loadAnimations();
    } catch (err) {
      console.error('Error uploading animation:', err);
      uploadError = err instanceof Error ? err.message : 'Failed to upload animation';
    }
  }

  async function handleDelete(hash: string) {
    if (!confirm('Are you sure you want to delete this animation?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/animations/${encodeURIComponent(hash)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete animation');
      }

      // Remove the deleted animation from the list
      animations = animations.filter(animation => animation.hash !== hash);
    } catch (err) {
      console.error('Error deleting animation:', err);
      error = err instanceof Error ? err.message : 'Failed to delete animation';
    }
  }

  onMount(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiamFtZXNvbkBidWZmbWlyZS5jb20iLCJkb21haW4iOiJsb2NhbGhvc3QiLCJleHAiOjE3MzY4ODk1ODQsImlhdCI6MTczNjgwMzE4NH0.0vtiASQ6gmKnOmabHbIf7L7m7GGNpUIaanNFXtO1TCI';
      localStorage.setItem('token', devToken);
    }
    loadAnimations();
  });
</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-2xl font-bold text-white">Animations</h2>
    <label class="btn variant-filled-primary">
      Upload Animation
      <input 
        type="file" 
        class="hidden"
        on:change={handleFileSelect}
        accept=".json,.lottie"
      />
    </label>
  </div>

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{error}</p>
    </div>
  {/if}

  {#if uploadError}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{uploadError}</p>
    </div>
  {/if}

  <Modal bind:open={showUploadModal} size="xs" autoclose={false}>
    <div class="p-4">
      <h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">Upload Animation</h3>
      <form class="space-y-6" on:submit|preventDefault={handleUpload}>
        <div>
          <Label for="name" class="mb-2">Animation Name</Label>
          <Input
            type="text"
            id="name"
            placeholder="Enter animation name"
            required
            bind:value={animationName}
          />
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          File selected: {selectedFile?.name || 'No file selected'}
        </div>
        <div class="flex justify-end gap-4">
          <Button color="alternative" on:click={() => {
            showUploadModal = false;
            selectedFile = null;
            animationName = '';
          }}>Cancel</Button>
          <Button type="submit" color="primary">Upload</Button>
        </div>
      </form>
    </div>
  </Modal>

  {#if isLoading}
    <div class="flex justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  {:else if animations.length === 0}
    <div class="text-center py-8">
      <p class="text-gray-400">No animations found</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each animations as animation (animation.hash)}
        <Card class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-icons text-2xl">animation</span>
              <h3 class="text-lg font-semibold">{animation.name}</h3>
            </div>
            <Button color="red" on:click={() => handleDelete(animation.hash)}>
              <span class="material-icons">delete</span>
            </Button>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div> 