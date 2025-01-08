<script lang="ts">
    import { onMount } from 'svelte';
    
    export let onSelect: (url: string) => void;
    
    let images: string[] = [];
    let loading = true;
    let error: string | null = null;

    const API_URL = import.meta.env.VITE_API_URL;

    onMount(async () => {
        loading = true;
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`${API_URL}/media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch media');
            const data = await response.json();
            // Only show images marked for blog use
            images = data.filter(file => 
                file.type.startsWith('image/') && 
                file.show_in_blog
            ).map(file => file.url);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load media';
        } finally {
            loading = false;
        }
    });
</script>

<div class="card p-4">
    <h3 class="mb-4">Select Image</h3>
    
    {#if loading}
        <p>Loading media...</p>
    {:else if error}
        <p class="text-error-500">{error}</p>
    {:else if images.length === 0}
        <p>No images found</p>
    {:else}
        <div class="grid grid-cols-4 gap-4">
            {#each images as image}
                <button
                    type="button"
                    class="aspect-square relative group"
                    on:click={() => onSelect(image)}
                    on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            onSelect(image);
                        }
                    }}
                    aria-label="Select image"
                >
                    <img
                        src={image}
                        alt="Uploaded media"
                        class="w-full h-full object-cover rounded-lg"
                    />
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
                </button>
            {/each}
        </div>
    {/if}
</div> 