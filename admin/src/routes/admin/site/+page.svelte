<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    
    const API_URL = import.meta.env.VITE_API_URL;

    // Animation-related state
    let showUploadModal = false;
    let newAnimationName = '';
    let animationFile: File | null = null;
    let availableAnimations: Array<{ name: string }> = [];

    // Update the interface to use booleans
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
        about_description: string | null;
        about_sections: Array<{
            title: string;
            visible: boolean;
            content: string;
        }>;
        contact_description: string | null;
        contact_email: string | null;
        contact_email_visible: boolean;
        contact_discord_handle: string | null;
        contact_discord_url: string | null;
        contact_discord_visible: boolean;
        contact_instagram_handle: string | null;
        contact_instagram_url: string | null;
        contact_instagram_visible: boolean;
        pics_description: string | null;
        lottie_animation: string | null;
    }

    // Update default state to use booleans
    const defaultState: SiteConfig = {
        title: '',
        description: '',
        nav_links: {
            projects: false,
            blog: true,
            pics: true,
            about: true,
            contact: true
        },
        about_description: null,
        about_sections: [],
        contact_description: null,
        contact_email: null,
        contact_email_visible: false,
        contact_discord_handle: null,
        contact_discord_url: null,
        contact_discord_visible: false,
        contact_instagram_handle: null,
        contact_instagram_url: null,
        contact_instagram_visible: false,
        pics_description: null,
        lottie_animation: null
    };

    let formState = { ...defaultState };
    let isSaving = false;
    let saveMessage = '';

    function handleUnauthorized() {
        if (browser) {
            localStorage.removeItem('token');
            window.location.href = '/admin/login';
        }
    }

    

    onMount(async () => {
        try {
            const response = await fetch(`${API_URL}/site/config`);
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            if (response.ok) {
                const data = await response.json();
                formState = { ...data };
            }

            const animationsResponse = await fetch(`${API_URL}/animations`);
            if (animationsResponse.ok) {
                availableAnimations = await animationsResponse.json();
            }
        } catch (error) {
            console.error('Failed to load site configuration or animations:', error);
        }
    });

    async function handleSubmit() {
        isSaving = true;
        saveMessage = '';

        try {
            const response = await fetch(`${API_URL}/site/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState)
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            if (response.ok) {
                const data = await response.json();

                // data.config is assumed to be the final shape from the Worker
                const configData = data.config;
                formState = {
                    ...configData,
                    about_sections: configData.about_sections || [],
                    nav_links: configData.nav_links || {}
                };
                saveMessage = 'Configuration saved successfully!';
            } else {
                const errorData = await response.json();
                console.error('❌ Server error:', errorData);
                saveMessage = `Error saving configuration: ${errorData.message || 'Unknown error'}`;
            }
        } catch (error) {
            console.error('❌ Error saving:', error);
            saveMessage = 'Error saving configuration';
        } finally {
            isSaving = false;
        }
    }

    function addNewSection() {
        formState.about_sections = [
            ...formState.about_sections,
            { title: '', visible: true, content: '' }
        ];
    }

    function removeLastSection() {
        if (formState.about_sections.length > 0) {
            formState.about_sections = formState.about_sections.slice(0, -1);
        }
    }

    // Update visibility toggle handlers to use booleans
    async function toggleVisibility(field: string) {
        formState[field] = !formState[field];
        await handleSubmit();
    }

    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            animationFile = input.files[0];
        }
    }

    async function uploadNewAnimation() {
        if (!animationFile || !newAnimationName) return;

        const formData = new FormData();
        formData.append('file', animationFile);
        formData.append('name', newAnimationName);

        try {
            const response = await fetch(`${API_URL}/animations/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const newAnimation = await response.json();
                availableAnimations = [...availableAnimations, newAnimation];
                formState.lottie_animation = newAnimationName;
                await handleSubmit();
            }
        } catch (error) {
            console.error('Failed to upload animation:', error);
        }
    }
</script>

<div class="p-4">
    <h2 class="h2 mb-4 pl-12">Site Configuration</h2>
    
    <form on:submit|preventDefault={handleSubmit}>
        <!-- Basic Info and Pics Description Section -->
        <div class="grid grid-cols-2 gap-8 max-w-4xl pl-12">
            <div class="space-y-6">
                <div>
                    <span class="block mb-2">Site Title</span>
                    <input
                        type="text"
                        id="title"
                        bind:value={formState.title}
                        class="input w-full h-12 px-4"
                        required
                    />
                </div>

                <div>
                    <span class="block mb-2">Tagline</span>
                    <input
                        type="text"
                        id="description"
                        bind:value={formState.description}
                        class="input w-full h-12 px-4"
                    />
                </div>
            </div>

            <div class="space-y-6">
                <div>
                    <span class="block mb-2">Pics Description</span>
                    <input
                        type="text"
                        bind:value={formState.pics_description}
                        class="input w-full h-12 px-4"
                    />
                </div>

                <div>
                    <span class="block mb-2">Animation</span>
                    <div class="flex gap-4 items-center">
                        <select
                            bind:value={formState.lottie_animation}
                            class="select w-3/4 h-12"
                            on:change={(e) => {
                                if (e.target.value === 'upload') {
                                    e.preventDefault();
                                    e.target.value = formState.lottie_animation || '';
                                    showUploadModal = true;
                                }
                            }}
                        >
                            <option value="">No Animation</option>
                            <option value="default-pin">default-pin</option>
                            {#each availableAnimations as anim}
                                <option value={anim.name}>{anim.name}</option>
                            {/each}
                            <option value="upload">Upload New Animation...</option>
                        </select>
                        <button 
                            class="btn variant-filled-primary"
                            on:click={handleSubmit}
                        >
                            Send it
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation and Animation Section -->
        <div class="mt-6 pl-12 max-w-4xl">
            <div>
                <!-- Navigation Links -->
                <div>
                    <span class="block mb-2">Navigation Links</span>
                    <div class="flex flex-wrap gap-4">
                        {#each Object.entries(formState.nav_links).filter(([path]) => path !== 'projects') as [path, enabled]}
                            <button 
                                class="btn variant-filled-{enabled ? 'primary' : 'surface'}"
                                on:click={async () => {
                                    formState.nav_links[path] = !enabled;
                                    await handleSubmit();
                                }}
                            >
                                {path}: {enabled ? 'Visible' : 'Hidden'}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <!-- Upload Animation Modal -->
        {#if showUploadModal}
            <div class="fixed inset-0 bg-surface-900/80 flex items-center justify-center z-50">
                <div class="bg-surface-100 p-6 rounded-lg shadow-xl w-96 space-y-4">
                    <h3 class="h3">Upload New Animation</h3>
                    <div class="space-y-4">
                        <!-- Animation File first -->
                        <div>
                            <label for="animation-file" class="block mb-2">Animation File</label>
                            <input
                                id="animation-file"
                                type="file"
                                accept=".json"
                                on:change={handleFileSelect}
                                class="input w-full"
                            />
                        </div>
                        <!-- Animation Name second -->
                        <div>
                            <label for="animation-name" class="block mb-2">Animation Name</label>
                            <input
                                id="animation-name"
                                type="text"
                                bind:value={newAnimationName}
                                placeholder="Enter animation name"
                                class="input w-full h-12 px-4"
                            />
                        </div>
                        <div class="flex justify-end gap-2">
                            <button
                                class="btn variant-ghost"
                                on:click={() => showUploadModal = false}
                            >
                                Cancel
                            </button>
                            <button
                                class="btn variant-filled-primary"
                                on:click={async () => {
                                    await uploadNewAnimation();
                                    showUploadModal = false;
                                }}
                                disabled={!animationFile || !newAnimationName}
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <style>
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .modal-content {
                background: var(--color-surface-100);
                border-radius: var(--theme-border-radius);
            }
        </style>

        <!-- Contact Section -->
        <div class="space-y-6 mt-8 pl-12">
            <h3 class="h3">Contact Methods</h3>
            
            <!-- Contact Description Row -->
            <div class="grid grid-cols-2 gap-8 max-w-4xl">
                <div class="space-y-4">
                    <span>Contact Description</span>
                    <input
                        type="text"
                        bind:value={formState.contact_description}
                        class="input w-full h-12 px-4"
                    />
                </div>

                <!-- Email -->
                <div class="space-y-4">
                    <span>Email Address</span>
                    <div class="flex gap-4 items-center">
                        <input
                            type="email"
                            bind:value={formState.contact_email}
                            class="input w-3/4 h-12 px-4"
                        />
                        <button 
                            class="btn variant-filled-{formState.contact_email_visible ? 'primary' : 'surface'}"
                            on:click={() => toggleVisibility('contact_email_visible')}
                        >
                            {formState.contact_email_visible ? 'Visible' : 'Hidden'}
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Social Media Row -->
            <div class="grid grid-cols-2 gap-8 max-w-4xl">
                <!-- Instagram -->
                <div class="space-y-4">
                    <span>Instagram</span>
                    <div class="flex gap-4 items-center">
                        <input
                            type="text"
                            bind:value={formState.contact_instagram_handle}
                            placeholder="@username"
                            class="input w-3/4 h-12 px-4"
                        />
                        <button 
                            class="btn variant-filled-{formState.contact_instagram_visible ? 'primary' : 'surface'}"
                            on:click={() => toggleVisibility('contact_instagram_visible')}
                        >
                            {formState.contact_instagram_visible ? 'Visible' : 'Hidden'}
                        </button>
                    </div>
                    <input
                        type="url"
                        bind:value={formState.contact_instagram_url}
                        placeholder="https://instagram.com/..."
                        class="input w-full h-12 px-4"
                    />
                </div>

                <!-- Discord -->
                <div class="space-y-4">
                    <span>Discord</span>
                    <div class="flex gap-4 items-center">
                        <input
                            type="text"
                            bind:value={formState.contact_discord_handle}
                            placeholder="Username#1234"
                            class="input w-3/4 h-12 px-4"
                        />
                        <button 
                            class="btn variant-filled-{formState.contact_discord_visible ? 'primary' : 'surface'}"
                            on:click={() => toggleVisibility('contact_discord_visible')}
                        >
                            {formState.contact_discord_visible ? 'Visible' : 'Hidden'}
                        </button>
                    </div>
                    <input
                        type="url"
                        bind:value={formState.contact_discord_url}
                        placeholder="https://discord.gg/..."
                        class="input w-full h-12 px-4"
                    />
                </div>
            </div>

        <!-- About Section -->
        <div class="space-y-6 mt-8 pl-12 max-w-2xl">
            <h3 class="h3">About Page</h3>
            
            <!-- About Page Description -->
            <div class="space-y-4">
                <span class="block">About Page Description</span>
                <textarea
                    bind:value={formState.about_description}
                    placeholder="Main description for the About page..."
                    class="textarea w-full h-32 px-4 py-2"
                />
            </div>

            <!-- About sections -->
            <div class="space-y-4">
                <span class="block">About Page Sections</span>
                {#if Array.isArray(formState.about_sections)}
                    {#each formState.about_sections as section, i}
                        <div class="card p-4 space-y-4">
                            <input
                                type="text"
                                bind:value={section.title}
                                placeholder="Section Title"
                                class="input w-full h-12 px-4"
                            />
                            <textarea
                                bind:value={section.content}
                                placeholder="Section Content"
                                class="textarea w-full h-32 px-4 py-2"
                            />
                        </div>
                    {/each}
                {/if}
                
                <div class="flex gap-4 items-center">
                    <button class="btn variant-filled" on:click={addNewSection}>
                        Add Section
                    </button>
                    <button class="btn variant-filled-warning" on:click={removeLastSection}>
                        Remove Last Section
                    </button>
                    <button 
                        class="btn variant-filled-primary"
                        on:click={handleSubmit}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Publishing...' : 'Publish About Updates'}
                    </button>
                </div>
            </div>
        </div>
    </form>
</div>