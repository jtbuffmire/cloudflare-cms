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
            projects: true,
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

<div class="container mx-auto p-6">
    <h1 class="text-2xl font-bold mb-2">Site Configuration</h1>
    <h2 class="text-xl mb-6">Main Splash Page</h2>

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div class="space-y-4">
            <!-- Basic Info -->
            <div>
                <label for="title" class="block text-sm font-medium">Site Title</label>
                <input
                    type="text"
                    id="title"
                    bind:value={config.title}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                />
            </div>

            <div>
                <label for="description" class="block text-sm font-medium">Tagline</label>
                <input
                    type="text"
                    id="description"
                    bind:value={config.description}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
            </div>

            <!-- Navigation Links -->
            <fieldset class="space-y-4">
                <legend class="text-sm font-medium">Navigation Links</legend>
                
                <div class="space-y-2">
                    {#each Object.entries(config.nav_links) as [path, enabled]}
                        <div class="flex items-center gap-2 p-3 border rounded-md">
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
            </fieldset>

            {#if config.nav_links.projects}
                <fieldset class="space-y-4 border-t pt-4">
                    <legend class="text-lg font-medium">Projects Configuration</legend>
                    
                    <!-- Project entries will go here in the next step -->
                    <div class="text-sm text-gray-500">
                        Project configuration options will appear here.
                    </div>
                </fieldset>
            {/if}
        </div>

        <div class="flex items-center justify-between">
            <button
                type="submit"
                class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                disabled={isSaving}
            >
                {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            
            {#if saveMessage}
                <p class={saveMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                    {saveMessage}
                </p>
            {/if}
        </div>
    </form>
</div>