<script lang="ts">
  import { onMount } from 'svelte';
  
  let files: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }> = [];

  let loading = true;
  let error: string | null = null;
  let media: any[] = [];

  async function loadMedia() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8787/api/media', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    // console.log('Loaded media:', data); // Debug log
    files = data;
  }

  async function handleDelete(mediaKey: string) {
  // console.log('Delete requested for media key:', mediaKey);
  
  if (!confirm('Are you sure you want to delete this media?')) {
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`http://localhost:8787/api/media/${mediaKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete media');
    }
    
    // Update UI using the key instead of id
    files = files.filter(file => !file.url.includes(mediaKey));
    // console.log('Media deleted successfully, remaining files:', files);
  } catch (error) {
    // console.error('Delete error:', error);
    alert(error instanceof Error ? error.message : 'Failed to delete media');
  }
}

  onMount(async () => {
    loadMedia();
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8787/api/media', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch media');
      const data = await response.json();
      files = Array.isArray(data) ? data : [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  });

  const handleUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const formData = new FormData();
    formData.append('file', input.files[0]);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:8787/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      const newFile = await response.json();
      files = [...files, newFile];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
    }
  };

</script>

<div class="container mx-auto p-4 space-y-4">
  <div class="flex justify-between items-center">
    <h2 class="h2">Media Library</h2>
    <label class="btn variant-filled-primary">
      Upload File
      <input 
        type="file" 
        class="hidden" 
        on:change={handleUpload}
        accept="image/*,video/*"
      />
    </label>
  </div>

  {#if loading}
    <div class="card p-4">Loading media files...</div>
  {:else if error}
    <div class="card p-4 variant-filled-error">{error}</div>
  {:else if files.length === 0}
    <div class="card p-4">No media files found. Upload your first file!</div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {#each files as file (file.id)}
      <!-- Activating the '{@debug file}' will help debug CRUD operations on media uploads to cloudflare' -->  
      <!-- {@debug file} --> 
        <div class="card p-4">
          {#if file.type.startsWith('image/')}
            <img src={file.url} alt={file.name} class="w-full aspect-square object-cover mb-2" />
          {:else}
            <div class="w-full aspect-square bg-surface-400 flex items-center justify-center mb-2">
              <span class="text-4xl">📁</span>
            </div>
          {/if}
          <p class="truncate">{file.name}</p>
          <p class="text-sm opacity-70">{Math.round(file.size / 1024)}KB</p>
          <div class="flex justify-end mt-2">
            <button 
              class="btn btn-sm variant-ghost-error" 
              on:click={() => {
                // console.log('Delete clicked for file:', file); // Debug log
                const key = file.url.split('/').pop(); // Get last part of URL
                if (key) {
                  handleDelete(key);  // Use key instead of id
                } else {
                  console.error('File or file key is undefined:', file);
                }
              }}
            >
              Delete
            </button>
          </div>
          
        </div>
      {/each}
    </div>
  {/if}
</div>