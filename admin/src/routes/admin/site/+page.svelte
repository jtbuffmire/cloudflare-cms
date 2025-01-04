<script lang="ts">
    import { onMount } from 'svelte';
    import { API_URL } from '$lib/config';

    interface NavLink {
        path: string;
        enabled: boolean;
    }

    interface SiteConfig {
        title: string;
        description: string;
        nav_links: {
            projects: boolean;
            blog: boolean;
            pics: boolean;
            about: boolean;
            contact: boolean;
        };
    }

    let config: SiteConfig = {
        title: '',
        description: '',
        nav_links: {
            projects: false,
            blog: true,
            pics: true,
            about: true,
            contact: true
        }
    };

    let isSaving = false;
    let saveMessage = '';

    onMount(async () => {
        try {
            const response = await fetch(`${API_URL}/api/site/config`);
            if (response.ok) {
                const data = await response.json();
                // Merge with defaults
                config = {
                    ...config,
                    ...data,
                    nav_links: {
                        ...config.nav_links,
                        ...data.nav_links
                    }
                };
            }
        } catch (error) {
            console.error('Failed to load site configuration:', error);
        }
    });

    async function handleSubmit() {
        isSaving = true;
        saveMessage = '';
        
        try {
            const response = await fetch(`${API_URL}/api/site/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                saveMessage = 'Configuration saved successfully!';
            } else {
                throw new Error('Failed to save configuration');
            }
        } catch (error) {
            saveMessage = 'Error saving configuration';
            console.error(error);
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="p-4">
    <h2 class="h2 mb-4 pl-12">Site Configuration</h2>
    
    <form on:submit|preventDefault={handleSubmit}>
        {#if saveMessage}
            <div class="alert {saveMessage.includes('Error') ? 'variant-filled-error' : 'variant-filled-success'} ml-12">
                {saveMessage}
            </div>
        {/if}

        <!-- Single column for basic info -->
        <div class="max-w-2xl">
            <div class="mt-6 pl-12">
                <span class="block mb-2">Site Title</span>
                <input
                    type="text"
                    id="title"
                    bind:value={config.title}
                    class="input w-full h-12 px-4"
                    required
                />
            </div>

            <div class="mt-6 pl-12">
                <span class="block mb-2">Tagline</span>
                <input
                    type="text"
                    id="description"
                    bind:value={config.description}
                    class="input w-full h-12 px-4"
                />
            </div>
        </div>

        <!-- Navigation Links Section - Single Row -->
        <div class="mt-12 pl-12">
            <span class="block mb-2">Navigation Links</span>
            <div class="flex flex-wrap gap-4">
                {#each Object.entries(config.nav_links).filter(([path]) => path !== 'projects') as [path, enabled]}
                    <div class="flex items-center gap-2 p-2 card">
                        <input
                            type="checkbox"
                            id="nav-{path}"
                            bind:checked={config.nav_links[path]}
                            class="checkbox"
                        />
                        <label for="nav-{path}" class="text-sm capitalize">
                            {path}
                        </label>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="max-w-2xl pl-12">
            <div class="flex justify-end space-x-2 mt-8">
                <a href="/admin" class="btn variant-ghost">Cancel</a>
                <button type="submit" class="btn variant-filled-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    </form>
</div>