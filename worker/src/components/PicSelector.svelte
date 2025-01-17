<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { API_VSN } from '../lib/config';
    
    interface PicFile {
        id: string;
        name: string;
        url: string;
        displayUrl?: string;  // For blob URLs
        type: string;
        show_in_blog: boolean;
        text_description?: string;
    }
    
    export let onSelect: (url: string, name: string) => void;
    
    let images: PicFile[] = [];
    let loading = true;
    let error: string | null = null;

    const API_URL = import.meta.env.VITE_API_URL;

    onMount(async () => {
        loading = true;
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`${API_URL}${API_VSN}/pics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch pictures');
            const data: PicFile[] = await response.json();
            // Only show images marked for blog use
            images = data.filter(file => 
                file.type.startsWith('image/') && 
                file.show_in_blog
            );

            // Preload images with authorization but keep original URLs
            await Promise.all(images.map(async (image) => {
                try {
                    const response = await fetch(`${API_URL}${image.url}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!response.ok) throw new Error('Failed to load image');
                    const blob = await response.blob();
                    image.displayUrl = URL.createObjectURL(blob);
                } catch (error) {
                    console.error('Failed to load image:', error);
                }
            }));
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load picture';
        } finally {
            loading = false;
        }
    });

    // Cleanup object URLs on component destroy
    onDestroy(() => {
        images.forEach(image => {
            if (image.displayUrl) {
                URL.revokeObjectURL(image.displayUrl);
            }
        });
    });

    async function handleSelect(file: PicFile) {
        try {
            // Pass the original API URL, not the blob URL
            onSelect(file.url, file.text_description || file.name);
        } catch (error) {
            console.error('Error selecting file:', error);
        }
    }
</script>

<div class="card p-4">
    <h3 class="mb-4">Select Image</h3>
    
    {#if loading}
        <p>Loading pictures...</p>
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
                    on:click={() => handleSelect(image)}
                    on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleSelect(image);
                        }
                    }}
                    aria-label="Select image"
                >
                    <img
                        src={image.displayUrl || image.url}
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
</div> 