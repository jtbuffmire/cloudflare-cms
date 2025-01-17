<script lang="ts">
    import { onMount } from 'svelte';
    import type { Project } from '$lib/types';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import { marked } from 'marked';
    import { API_VSN, API_BASE, getRequestInit } from '$lib/config';

    const STORAGE_KEY = 'project_draft';

    let project: Project = {
        name: '',
        description: '',
        thumbnail: '',
        images: [],
        content: '',
        published: false,
        slug: ''
    };
    
    let loading = true;
    let saving = false;
    let error: string | null = null;
    let isNew = $page.params.id === 'new';

    // Load saved draft if it exists
    function loadDraft(): void {
        if (browser && isNew) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                project = JSON.parse(saved);
            }
        }
    }

    // Save current form state
    function saveDraft(): void {
        if (browser && isNew) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        }
    }

    // Clear draft after successful submission
    function clearDraft(): void {
        if (browser) {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // Watch for changes and save draft
    $: if (browser && isNew) {
        saveDraft();
    }

    onMount(async () => {
        if (!isNew) {
            try {
                const response = await fetch(`${API_BASE}${API_VSN}/projects/${$page.params.id}`, getRequestInit());
                if (!response.ok) throw new Error('Failed to fetch project');
                project = await response.json() as Project;
            } catch (e) {
                error = e instanceof Error ? e.message : 'Unknown error';
            } finally {
                loading = false;
            }
        } else {
            loadDraft();
            loading = false;
        }
    });

    async function handleSubmit() {
        error = '';
        saving = true;
        try {
            const init = getRequestInit();
            const response = await fetch(`${API_BASE}${API_VSN}/projects`, {
                ...init,
                method: 'POST',
                headers: {
                    ...init.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(project)
            });

            if (!response.ok) {
                const data = await response.json() as { error?: string };
                if (data.error === 'A project with this slug already exists') {
                    error = 'A project with this URL slug already exists. Please choose a different name or modify the slug.';
                } else {
                    error = data.error || 'Failed to create project';
                }
                return;
            }

            clearDraft();
            goto('/projects');
        } catch (e) {
            console.error('Error creating project:', e);
            error = 'Failed to create project. Please try again.';
        } finally {
            saving = false;
        }
    }

    function handleSlugChange() {
        if (!project.slug && project.name) {
            project.slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
    }
</script>

<main>
    <div class="header">
        <h1>{isNew ? 'New Project' : 'Edit Project'}</h1>
    </div>

    {#if error}
        <div class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span class="block sm:inline">{error}</span>
        </div>
    {/if}

    {#if loading}
        <div class="loading">Loading...</div>
    {:else}
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            <div class="form-group">
                <label for="name">Name</label>
                <input
                    type="text"
                    id="name"
                    bind:value={project.name}
                    on:input={handleSlugChange}
                    required
                />
            </div>

            <div class="form-group">
                <label for="slug">Slug</label>
                <input
                    type="text"
                    id="slug"
                    bind:value={project.slug}
                    required
                />
            </div>

            <div class="form-group">
                <label for="description">Description</label>
                <textarea
                    id="description"
                    bind:value={project.description}
                    required
                ></textarea>
            </div>

            <div class="form-group">
                <label for="screenshot">Screenshot</label>
                {#if project.thumbnail}
                    <div class="screenshot-preview">
                        <img src={`${API_BASE}/pics/${project.thumbnail}`} alt="Project screenshot" />
                        <button type="button" on:click={() => project.thumbnail = ''}>Remove</button>
                    </div>
                {/if}
                <input
                    type="file"
                    id="screenshot"
                    accept="image/*"
                    on:change={async (e) => {
                        const target = e.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (!file) return;
                        
                        try {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('type', 'screenshot');
                            
                            const init = getRequestInit();
                            const { 'Content-Type': _, ...headers } = init.headers as Record<string, string>;
                            
                            const response = await fetch(`${API_BASE}${API_VSN}/pics`, {
                                ...init,
                                method: 'POST',
                                headers,
                                body: formData
                            });
                            
                            if (!response.ok) throw new Error('Failed to upload screenshot');
                            
                            const result = await response.json() as { r2_key: string };
                            project.thumbnail = result.r2_key;
                        } catch (e) {
                            error = e instanceof Error ? e.message : 'Failed to upload screenshot';
                        }
                    }}
                />
                <small>Upload a screenshot for your project. This will be used as the thumbnail.</small>
            </div>

            <div class="form-group">
                <label for="github">GitHub URL (optional)</label>
                <input
                    type="url"
                    id="github"
                    bind:value={project.github}
                />
            </div>

            <div class="form-group">
                <label for="website">Website URL (optional)</label>
                <input
                    type="url"
                    id="website"
                    bind:value={project.website}
                />
            </div>

            <div class="form-group">
                <label for="content">Content (Markdown)</label>
                <textarea
                    id="content"
                    bind:value={project.content}
                    rows="10"
                    required
                ></textarea>
            </div>

            <div class="form-group">
                <label>
                    <input
                        type="checkbox"
                        bind:checked={project.published}
                    />
                    Published
                </label>
            </div>

            <div class="form-actions">
                <button type="button" on:click={() => goto('/projects')}>Cancel</button>
                <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Project'}
                </button>
            </div>
        </form>
    {/if}
</main>

<style lang="scss">
    main {
        padding: 2rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    form {
        max-width: 800px;
    }

    .form-group {
        margin-bottom: 1.5rem;

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }

        input[type="text"],
        input[type="url"],
        textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--surface-1);
            color: var(--text-1);

            &:focus {
                outline: none;
                border-color: var(--accent);
            }
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }
    }

    .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;

        button {
            padding: 0.5rem 1rem;
            border-radius: 4px;
            
            &[type="submit"] {
                background: var(--accent);
                color: white;

                &:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
            }

            &[type="button"] {
                background: var(--surface-3);
            }
        }
    }

    .error {
        color: var(--error);
        margin-bottom: 1rem;
    }

    .loading {
        color: var(--text-2);
    }

    .screenshot-preview {
        margin: 1rem 0;
        position: relative;
        display: inline-block;

        img {
            max-width: 300px;
            max-height: 200px;
            border-radius: 4px;
            border: 1px solid var(--border);
        }

        button {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: var(--surface-1);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 0.25rem 0.5rem;
            opacity: 0.8;

            &:hover {
                opacity: 1;
            }
        }
    }

    small {
        display: block;
        margin-top: 0.5rem;
        color: var(--text-2);
    }
</style> 