<script lang="ts">
    import { onMount } from 'svelte';
    import type { Project } from '$lib/types';
    import { siteConfig } from '$lib/stores';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import { marked } from 'marked';
    import { API_VSN, API_BASE, getRequestInit, getDomain } from '$lib/config';
    import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Badge, Spinner } from 'flowbite-svelte';

    const DOMAIN = getDomain();
    let isLoading = true;
    let isAuthenticated = false;
    let projects: Project[] = [];
    let error: string | null = null;

    function handleUnauthorized() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    function isAdminSubdomain(): boolean {
        if (!browser) return false;
        return window.location.hostname.startsWith('admin.');
    }

    async function loadProjects() {
        error = null;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                handleUnauthorized();
                return;
            }

            const response = await fetch(`${API_BASE}${API_VSN}/projects`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Site-Domain': DOMAIN
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                throw new Error('Failed to load projects');
            }

            projects = await response.json() as Project[];
        } catch (err) {
            console.error('Error loading projects:', err);
            error = err instanceof Error ? err.message : 'Failed to load projects';
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${API_BASE}${API_VSN}/projects/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Site-Domain': DOMAIN
                }
            });

            if (!response.ok) throw new Error('Failed to delete project');

            projects = projects.filter(project => project.id !== id);
        } catch (err) {
            console.error('Error deleting project:', err);
            error = err instanceof Error ? err.message : 'Failed to delete project';
        }
    }

    onMount(async () => {
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
                await loadProjects();
            } catch {
                handleUnauthorized();
            }
        } else {
            isAuthenticated = true;
            await loadProjects();
        }
        
        isLoading = false;
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

{#if isLoading}
    <div class="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="12" />
    </div>
{:else if isAuthenticated}
    <div class="container mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-white">Projects</h1>
            <Button color="blue" href="/projects/new">
                <span class="material-icons mr-2">add</span>
                New Project
            </Button>
        </div>

        {#if error}
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{error}</p>
            </div>
        {/if}

        {#if projects.length === 0}
            <div class="bg-gray-800 text-gray-300 rounded-lg p-8 text-center">
                <p class="text-lg mb-4">No projects found</p>
                <Button color="blue" href="/projects/new">Create your first project</Button>
            </div>
        {:else}
            <div class="bg-gray-800 overflow-hidden rounded-lg shadow">
                <Table divClass="relative overflow-x-auto" color="custom" class="text-gray-100">
                    <TableHead class="bg-gray-700">
                        <TableHeadCell class="text-gray-100">Name</TableHeadCell>
                        <TableHeadCell class="text-gray-100">Slug</TableHeadCell>
                        <TableHeadCell class="text-gray-100">Status</TableHeadCell>
                        <TableHeadCell class="text-gray-100">Actions</TableHeadCell>
                    </TableHead>
                    <TableBody class="divide-y divide-gray-700">
                        {#each projects as project}
                            <TableBodyRow>
                                <TableBodyCell class="text-gray-100">{project.name}</TableBodyCell>
                                <TableBodyCell class="font-mono text-sm text-gray-300">{project.slug}</TableBodyCell>
                                <TableBodyCell>
                                    <Badge
                                        color={project.published ? 'green' : 'yellow'}
                                        class="px-2.5 py-0.5 text-xs font-medium"
                                    >
                                        {project.published ? 'Published' : 'Draft'}
                                    </Badge>
                                </TableBodyCell>
                                <TableBodyCell>
                                    <div class="flex items-center gap-2">
                                        <Button size="xs" color="blue" href="/projects/{project.id}">
                                            <span class="material-icons text-sm mr-1">edit</span>
                                            Edit
                                        </Button>
                                        <Button size="xs" color="red" on:click={() => handleDelete(project.id)}>
                                            <span class="material-icons text-sm mr-1">delete</span>
                                            Delete
                                        </Button>
                                    </div>
                                </TableBodyCell>
                            </TableBodyRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>
        {/if}
    </div>
{/if}

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

    :global(.material-icons) {
        font-size: 1.2em;
        vertical-align: middle;
    }
</style> 