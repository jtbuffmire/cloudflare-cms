<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { API_BASE, API_VSN, getDomain, getRequestInit } from '$lib/config';
  import type { PicsItem } from '$lib/types';
  import { Button, Spinner } from 'flowbite-svelte';
  import { browser } from '$app/environment';

  const DOMAIN = getDomain();
  
  let picsItems: PicsItem[] = [];
  let error: string | null = null;
  let isLoading = true;
  let editingTagline: string | null = null;
  let imageUrls: Record<string, string> = {};
  let isAuthenticated = false;
  let loadingImages: Set<string> = new Set();
  let observer: IntersectionObserver | null = null;
  let imageElements: Map<string, HTMLElement> = new Map();

  async function loadImageWithAuth(url: string): Promise<string> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const headers = new Headers({
      'Authorization': `Bearer ${token}`,
      'X-Site-Domain': `${DOMAIN}`
    });

    const response = await fetch(`${API_BASE}${API_VSN}${url}`, { headers });
    if (!response.ok) throw new Error('Failed to load image');
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async function loadPics(): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleUnauthorized();
        return;
      }

      const headers = new Headers({
        'Authorization': `Bearer ${token}`,
        'X-Site-Domain': DOMAIN
      });
      const response = await fetch(`${API_BASE}${API_VSN}/pics?domain=${DOMAIN}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error('Failed to load pics');
      }

      const data = await response.json() as PicsItem[];
      picsItems = data;
      isLoading = false;
      // Images will be lazy-loaded by IntersectionObserver as they scroll into view
    } catch (err) {
      console.error('Error loading pics:', err);
      error = 'Failed to load pics';
      isLoading = false;
    }
  }
  
  // Lazy load a single image when it becomes visible
  async function lazyLoadImage(id: string, url: string): Promise<void> {
    if (imageUrls[id] || loadingImages.has(id)) return;
    
    loadingImages.add(id);
    loadingImages = loadingImages; // trigger reactivity
    
    try {
      const blobUrl = await loadImageWithAuth(url);
      imageUrls = { ...imageUrls, [id]: blobUrl };
    } catch (e) {
      console.error(`Failed to load image ${id}:`, e);
    } finally {
      loadingImages.delete(id);
      loadingImages = loadingImages;
    }
  }

  // Setup IntersectionObserver for lazy loading
  function setupObserver(): void {
    if (!browser) return;
    
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-pic-id');
            const url = entry.target.getAttribute('data-pic-url');
            if (id && url) {
              lazyLoadImage(id, url);
              observer?.unobserve(entry.target);
            }
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before visible
    );
  }

  // Register an image element for observation
  function observeImage(node: HTMLElement, { id, url }: { id: string; url: string }) {
    node.setAttribute('data-pic-id', id);
    node.setAttribute('data-pic-url', url);
    observer?.observe(node);
    
    return {
      destroy() {
        observer?.unobserve(node);
      }
    };
  }

  async function handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', DOMAIN);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const headers = new Headers({
        'Authorization': `Bearer ${token}`,
        'X-Site-Domain': DOMAIN
      });

      const response = await fetch(`${API_BASE}${API_VSN}/pics`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json() as PicsItem;
      
      // Load the image immediately
      try {
        imageUrls[result.id] = await loadImageWithAuth(result.url);
      } catch (e) {
        console.error(`Failed to load image for ${result.filename}:`, e);
      }

      // Update local state
      picsItems = [...picsItems, result];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error uploading file:', e);
    }
  }

  async function handleImageError(event: Event): Promise<void> {
    const img = event.target as HTMLImageElement;
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${token}`);
        headers.append('X-Site-Domain', 'localhost');
        
        const response = await fetch(img.src, { headers });
        if (!response.ok) throw new Error('Failed to load image');
        const blob = await response.blob();
        img.src = URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to load image:', err);
      }
    }
  }

  function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  async function togglePublish(id: string, currentState: boolean): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const picsItem = picsItems.find(item => item.id === id);
      if (!picsItem) throw new Error('Pic item not found');
      const r2Key = picsItem.url.split('/').pop();
      if (!r2Key) throw new Error('Invalid picture URL');

      const newPublishedState = !currentState;
      // If we're unpublishing, also turn off show_in_pics
      const newShowInPics = newPublishedState ? picsItem.show_in_pics : false;
      
      const response = await fetch(`${API_BASE}${API_VSN}/pics/${r2Key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN
        },
        body: JSON.stringify({
          domain: DOMAIN,
          published: newPublishedState,
          show_in_pics: newShowInPics,
          broadcast: {
            domain: DOMAIN,
            type: 'PIC_UPDATED',
            data: { 
              id: r2Key, 
              published: newPublishedState,
              show_in_pics: newShowInPics 
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to update pics');

      // Update local state
      picsItems = picsItems.map(item => 
        item.id === id ? { 
          ...item, 
          published: newPublishedState,
          show_in_pics: newShowInPics 
        } : item
      );
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error updating pic:', e);
    }
  }

  async function toggleVisibility(id: string, field: 'show_in_pics' | 'show_in_blog', currentState: boolean): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      // Find the pic item and extract the r2_key from its URL
      const picsItem = picsItems.find(item => item.id === id);
      if (!picsItem) {
        throw new Error('Pic item not found');
      }
      const r2Key = picsItem.url.split('/').pop();
      if (!r2Key) {
        throw new Error('Invalid pic URL');
      }

      // Don't allow turning on show_in_pics if the item is not published
      if (field === 'show_in_pics' && !picsItem.published && !currentState) {
        error = 'Cannot show in Pics when item is not published';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/pics/${r2Key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN
        },
        body: JSON.stringify({
          domain: DOMAIN,
          [field]: !currentState,
          broadcast: {
            domain: DOMAIN,
            type: 'PIC_UPDATED',
            data: { id: r2Key, [field]: !currentState }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update pic');
      }

      // Update local state
      picsItems = picsItems.map(item => 
        item.id === id 
          ? { ...item, [field]: !item[field] }
          : item
      );
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error updating pic:', e);
    }
  }

  async function updateTagline(id: string, tagline: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      // Find the pic item and extract the r2_key from its URL
      const picsItem = picsItems.find(item => item.id === id);
      if (!picsItem) {
        throw new Error('Pic item not found');
      }
      const r2Key = picsItem.url.split('/').pop();
      if (!r2Key) {
        throw new Error('Invalid pic URL');
      }

      const response = await fetch(`${API_BASE}${API_VSN}/pics/${r2Key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': 'localhost'
        },
        body: JSON.stringify({
          domain: 'localhost',
          text_description: tagline,
          broadcast: {
            domain: 'localhost',
            type: 'PIC_UPDATED',
            data: { id: r2Key, text_description: tagline }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update Pic');
      }

      // Update local state
      picsItems = picsItems.map(item => 
        item.id === id 
          ? { ...item, text_description: tagline }
          : item
      );
      editingTagline = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error updating pic:', e);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this picture?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      // Find the picture and extract the r2_key from its URL
      const picsItem = picsItems.find(item => item.id === id);
      if (!picsItem) {
        throw new Error('Pic item not found');
      }
      const r2Key = picsItem.url.split('/').pop();
      if (!r2Key) {
        throw new Error('Invalid pic URL');
      }

      const response = await fetch(`${API_BASE}${API_VSN}/pics/${r2Key}?domain=${DOMAIN}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete picture');
      }

      // Update local state
      picsItems = picsItems.filter(item => item.id !== id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error deleting picture:', e);
    }
  }

  // Add function to handle unauthorized access
  function handleUnauthorized() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  // Add function to check if we're on admin subdomain
  function isAdminSubdomain(): boolean {
    if (!browser) return false;
    return window.location.hostname.startsWith('admin.');
  }

  onMount(async () => {
    setupObserver();
    
    if (isAdminSubdomain()) {
      const token = localStorage.getItem('token');
      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        const response = await fetch(`${API_BASE}${API_VSN}/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Site-Domain': DOMAIN
          }
        });
        
        if (!response.ok) {
          handleUnauthorized();
          return;
        }
        
        isAuthenticated = true;
        await loadPics();
      } catch {
        handleUnauthorized();
      }
    } else {
      isAuthenticated = true;
      await loadPics();
    }
    
    isLoading = false;
  });

  onDestroy(() => {
    // Cleanup observer
    observer?.disconnect();
    // Revoke blob URLs to prevent memory leaks
    Object.values(imageUrls).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  });
</script>

{#if isLoading}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <Spinner size="12" />
  </div>
{:else if isAuthenticated}
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-white">Picture Library</h2>
      <label class="btn variant-filled-primary">
        Upload File
        <input 
          type="file" 
          class="hidden"
          on:change={handleFileUpload}
          accept="image/*"
        />
      </label>
    </div>

    {#if error}
      <div class="alert variant-filled-error">{error}</div>
    {/if}

    {#if picsItems.length === 0}
      <div class="text-center py-8">
        <p>No Pics found</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each picsItems as item (item.id)}
          <div class="card p-4">
            {#if item.url}
              <div 
                class="w-full h-48 rounded overflow-hidden bg-gray-700 relative"
                use:observeImage={{ id: item.id, url: item.url }}
              >
                {#if imageUrls[item.id]}
                  <img 
                    src={imageUrls[item.id]}
                    alt={item.filename}
                    class="w-full h-48 object-cover"
                    loading="lazy"
                  />
                {:else if loadingImages.has(item.id)}
                  <div class="absolute inset-0 flex items-center justify-center">
                    <Spinner size="6" />
                  </div>
                {:else}
                  <div class="absolute inset-0 flex items-center justify-center text-gray-500">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                {/if}
              </div>
            {/if}
            <div class="mt-2">
              <p class="font-semibold">{item.filename}</p>
              <p class="text-sm text-gray-600">{formatFileSize(item.size)}</p>
              
              {#if editingTagline === item.id}
                <div class="mt-2">
                  <input 
                    type="text"
                    class="input"
                    value={item.text_description || ''}
                    placeholder="Enter tagline..."
                    on:blur={(e) => updateTagline(item.id, (e.currentTarget as HTMLInputElement).value)}
                    on:keydown={(e) => e.key === 'Enter' && updateTagline(item.id, (e.currentTarget as HTMLInputElement).value)}
                  />
                </div>
              {:else}
                <button 
                  type="button"
                  class="text-sm text-gray-600 mt-2 cursor-pointer hover:text-gray-800 text-left w-full"
                  on:click={() => editingTagline = item.id}
                  on:keydown={(e) => e.key === 'Enter' && (editingTagline = item.id)}
                >
                  {item.text_description || 'Add tagline...'}
                </button>
              {/if}

              <div class="flex gap-2 mt-2">
                <button 
                  class="btn btn-sm {item.published ? 'font-bold variant-filled-primary' : 'variant-ghost-primary'}"
                  on:click={() => togglePublish(item.id, item.published)}
                  title={item.published ? 'Published' : 'Not Published'}
                >
                  Publish
                </button>
                <button 
                  class="btn btn-sm {item.show_in_pics ? 'font-bold variant-filled-secondary' : item.published ? 'variant-ghost-secondary' : 'variant-ghost-secondary opacity-50'}"
                  on:click={() => toggleVisibility(item.id, 'show_in_pics', item.show_in_pics)}
                  disabled={!item.published}
                  title={!item.published ? 'Publish the image first to enable Pics' : item.show_in_pics ? 'Remove from Pics' : 'Add to Pics'}
                >
                  Pics
                </button>
                <button 
                  class="btn btn-sm variant-ghost-error"
                  on:click={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
