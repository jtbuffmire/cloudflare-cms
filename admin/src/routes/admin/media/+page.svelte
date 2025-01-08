<script lang="ts">
  import { onMount } from 'svelte';

  const API_URL = import.meta.env.VITE_API_URL;
  
  let files: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
    published: boolean;
    hash?: string;
    show_in_blog: boolean;
    show_in_pics: boolean;
    description?: string;
    show_description?: boolean;
  }> = [];

  let loading = true;
  let error: string | null = null;
  let media: any[] = [];

  // Add new state for editing
  let editingId: string | null = null;
  let editingName: string = '';

  async function loadMedia() {
    try {
      loading = true;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 Received media data:', data); 
      files = data;
      
      // Log any potentially problematic files
      const problematicFiles = files.filter(file => !file.url || !file.id);
      if (problematicFiles.length > 0) {
        console.warn('⚠️ Found files with missing data:', problematicFiles);
      }
      
    } catch (err) {
      console.error('❌ Error loading media:', err);
      error = err instanceof Error ? err.message : 'Failed to load media';
    } finally {
      loading = false;
    }
  }

  async function handleDelete(mediaKey: string) {
    if (!confirm('Are you sure you want to delete this media?')) {
      return;
    }
    
    const token = localStorage.getItem('token');
    console.log('🗑️ Deleting media:', mediaKey);
    
    try {
      const response = await fetch(`${API_URL}/media/${mediaKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete media');
      }

      // Remove from UI
      files = files.filter(file => !file.url.includes(mediaKey));
      
      // Reload the media list to ensure sync with server
      await loadMedia();
      
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete media');
    }
  }

  onMount(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    loadMedia();
  });

  const handleUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    
    // Client-side filename check
    const isDuplicateFilename = files.some(existingFile => 
      existingFile.name.toLowerCase() === file.name.toLowerCase()
    );

    if (isDuplicateFilename) {
      if (!confirm('A file with this name already exists. Upload anyway?')) {
        return;
      }
    }

    // Client-side hash check
    try {
      const fileHash = await computeFileHash(file);
      const isDuplicateContent = files.some(existingFile => 
        existingFile.hash === fileHash
      );

      if (isDuplicateContent) {
        if (!confirm('This exact file appears to already be uploaded. Upload anyway?')) {
          return;
        }
      }
    } catch (err) {
      console.error('Error computing file hash:', err);
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      
      if (result.duplicate) {
        // Server detected a duplicate
        if (!confirm('Server found this file already exists. Use existing file?')) {
          return;
        }
        // Use existing file
        if (!files.some(f => f.id === result.file.id)) {
          files = [...files, result.file];
        }
      } else {
        // New file uploaded
        files = [...files, result];
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
    }
  };

  // Helper function to compute file hash
  async function computeFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) throw new Error('Failed to read file');
          const arrayBuffer = e.target.result as ArrayBuffer;
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function togglePublish(id: string, currentState: boolean) {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/media/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ published: !currentState })
      });

      if (!response.ok) throw new Error('Failed to update media');
      
      // Update local state
      files = files.map(file => 
        file.id === id 
          ? { ...file, published: !file.published }
          : file
      );
    } catch (error) {
      console.error('Error updating media:', error);
    }
  }

  // Add new function to handle name updates
  async function handleNameUpdate(fileId: string, newName: string) {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/media/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: newName })
      });

      if (!response.ok) throw new Error('Failed to update filename');
      
      // Update local state
      files = files.map(file => 
        file.id === id 
          ? { ...file, name: newName }
          : file
      );
      
      // Exit edit mode
      editingId = null;
    } catch (error) {
      console.error('Error updating filename:', error);
      alert('Failed to update filename');
    }
  }

  async function toggleSetting(fileId: string, setting: 'published' | 'show_in_blog' | 'show_in_pics', value: boolean) {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/media/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [setting]: value })
      });

      if (!response.ok) throw new Error('Failed to update media');
      
      // Update local state
      files = files.map(file => 
        file.id === fileId 
          ? { ...file, [setting]: value }
          : file
      );
    } catch (error) {
      console.error('Update error:', error);
    }
  }

  async function updateMediaMetadata(fileId, metadata) {
    console.log('📝 Update request data:', metadata);
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/media/${fileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text_description: metadata.description,
                text_description_visible: metadata.show_description
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Update failed:', error);
            throw new Error('Failed to update media metadata');
        }
        
        const updatedData = await response.json();
        
        // Update local state using the server's response data
        files = files.map(file => 
            file.id === fileId 
                ? { 
                    ...file,
                    text_description: updatedData.text_description,
                    text_description_visible: updatedData.text_description_visible
                }
                : file
        );
        
    } catch (error) {
        console.error('Error updating media metadata:', error);
        alert('Failed to save caption');
    }
  }

  async function updateMedia(id, updates) {
    console.log('Updating media:', id, updates);
    try {
        const response = await fetch(`${API_URL}/media/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Update failed:', error);
            throw new Error(error.error || 'Failed to update media');
        }
        
    } catch (error) {
        console.error('Failed to update media:', error);
        throw error;
    }
  }

  function handleDescriptionToggle(media) {
    console.log('Toggle description visibility for:', media.id);
    updateMedia(media.id, {
        text_description_visible: !media.text_description_visible
    });
  }

  function handleDescriptionChange(media, description) {
    updateMedia(media.id, {
      ...media,
      text_description: description
    });
  }

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
          
          <!-- Publish and Delete buttons right below image -->
          <div class="flex justify-between mb-2">
            <button 
              class="btn btn-sm {file.published ? 'variant-filled-primary' : 'variant-ghost-primary'}"
              on:click={() => togglePublish(file.id, file.published)}
            >
              {file.published ? 'Published' : 'Publish'}
            </button>
            <button 
              class="btn btn-sm variant-ghost-error" 
              on:click={() => {
                const key = file.url.split('/').pop();
                if (key) handleDelete(key);
              }}
            >
              Delete
            </button>
          </div>

          <p class="truncate">{file.name}</p>
          <p class="text-sm opacity-70">{Math.round(file.size / 1024)}KB</p>
          
          <!-- Rest of the card content remains the same -->
          <div class="flex flex-col gap-2 mt-2">
            <label class="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={file.show_in_blog}
                    on:change={(e) => toggleSetting(file.id, 'show_in_blog', e.currentTarget.checked)}
                    class="checkbox"
                />
                <span>Show in Blog</span>
            </label>
            
            <label class="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={file.show_in_pics}
                    on:change={(e) => toggleSetting(file.id, 'show_in_pics', e.currentTarget.checked)}
                    class="checkbox"
                />
                <span>Show in Pics</span>
            </label>
        </div>
        
        <div class="mt-2">
            <label class="block mb-1">Description</label>
            <textarea
                class="textarea w-full p-3"
                rows="2"
                placeholder="Add a description..."
                bind:value={file.text_description}
            ></textarea>
        </div>
        
        <div class="flex justify-end mt-2">
          <button 
            class="btn btn-sm {file.text_description && file.text_description_visible ? 'variant-filled-primary' : 'variant-ghost-primary'}"
            on:click={() => updateMediaMetadata(file.id, {
                description: file.text_description || '',
                show_description: !file.text_description_visible
            })}
          >
            {file.text_description && file.text_description_visible ? 'Caption Shown' : 'Show Caption'}
          </button>
        </div>
        </div>
      {/each}
    </div>
  {/if}
</div>