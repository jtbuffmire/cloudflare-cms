<script lang="ts">
    import { onMount } from 'svelte';
    import type { Project } from '$lib/types';
    import { siteConfig } from '$lib/stores';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import { marked } from 'marked';
    import { API_VSN, API_BASE, getRequestInit } from '$lib/config';

    let projects: Project[] = [];
    let loading = true;
    let error: string | null = null;

    onMount(async () => {
        try {
            const response = await fetch(`${API_BASE}${API_VSN}/projects`, getRequestInit());
            if (!response.ok) throw new Error('Failed to fetch projects');
            projects = await response.json() as Project[];
        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
        } finally {
            loading = false;
        }
    });

    async function createProject() {
        goto('/projects/new');
    }

    async function editProject(id: number) {
        goto(`/projects/${id}`);
    }

    async function deleteProject(id: number) {
        if (!confirm('Are you sure you want to delete this project?')) return;
        
        try {
            const response = await fetch(`${API_BASE}${API_VSN}/projects/${id}`, {
                ...getRequestInit(),
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete project');
            
            projects = projects.filter(p => p.id !== id);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
        }
    }

    async function togglePublished(project: Project) {
        try {
            const init = getRequestInit();
            const response = await fetch(`${API_BASE}${API_VSN}/projects/${project.id}`, {
                ...init,
                method: 'PATCH',
                headers: {
                    ...init.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    published: !project.published
                })
            });
            
            if (!response.ok) throw new Error('Failed to update project');
            
            const updatedProject = await response.json() as Project;
            projects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
        }
    }
</script>

<main>
    <div class="header">
        <h1>Projects</h1>
        <button on:click={createProject}>New Project</button>
    </div>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    {#if loading}
        <div class="loading">Loading...</div>
    {:else}
        <div class="projects">
            {#each projects as project (project.id)}
                <div class="project">
                    <div class="project-header">
                        <h2>{project.name}</h2>
                        <div class="actions">
                            <button 
                                class="toggle-published" 
                                class:published={project.published}
                                on:click={() => togglePublished(project)}
                            >
                                {project.published ? 'Published' : 'Draft'}
                            </button>
                            <button on:click={() => editProject(project.id!)}>Edit</button>
                            <button class="delete" on:click={() => deleteProject(project.id!)}>Delete</button>
                        </div>
                    </div>
                    <p class="description">{project.description}</p>
                    {#if project.thumbnail}
                        <img src={project.thumbnail} alt={project.name} />
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</main>

<style lang="scss">
    main {
        padding: 2rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .projects {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
    }

    .project {
        background: var(--surface-2);
        border-radius: 8px;
        padding: 1.5rem;
        
        img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 4px;
            margin-top: 1rem;
        }
    }

    .project-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;

        h2 {
            margin: 0;
            font-size: 1.5rem;
        }
    }

    .actions {
        display: flex;
        gap: 0.5rem;
    }

    .description {
        color: var(--text-2);
        margin: 0 0 1rem 0;
    }

    .toggle-published {
        background: var(--surface-3);
        &.published {
            background: var(--accent);
            color: white;
        }
    }

    .delete {
        background: var(--error);
        color: white;
    }

    .error {
        color: var(--error);
        margin-bottom: 1rem;
    }

    .loading {
        color: var(--text-2);
    }
</style> 