<script lang="ts">
    import { onMount } from 'svelte';
    
    let post: {
        id: number;
        title: string;
        slug: string;
        content: string;
        published: number;
    } | null = null;
    
    let loading = true;
    let error: string | null = null;
    let success = false;

    onMount(async () => {
        const id = window.location.pathname.split('/').pop();
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`http://localhost:8787/api/posts/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch post');
            post = await response.json();
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load post';
        } finally {
            loading = false;
        }
    });

    async function handleSubmit() {
        if (!post) return;
        
        loading = true;
        error = null;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`http://localhost:8787/api/posts/${post.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(post)
            });

            if (!response.ok) throw new Error('Failed to update post');
            success = true;
            setTimeout(() => {
                window.location.href = '/admin/posts';
            }, 100);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to update post';
        } finally {
            loading = false;
        }
    }
    $: isPublished = Boolean(post?.published);
</script>

<div class="container mx-auto p-4 space-y-4">
    <h2 class="h2">Edit Post</h2>

    {#if loading}
        <div class="card p-4">Loading post...</div>
    {:else if error}
        <div class="alert variant-filled-error">{error}</div>
    {:else if !post}
        <div class="alert variant-filled-error">Post not found</div>
    {:else}
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            {#if success}
                <div class="alert variant-filled-success">
                    Post updated successfully! Redirecting...
                </div>
            {/if}

            <label class="label">
                <span>Title</span>
                <input
                    type="text"
                    bind:value={post.title}
                    class="input"
                    required
                />
            </label>

            <label class="label">
                <span>Slug</span>
                <input
                    type="text"
                    bind:value={post.slug}
                    class="input"
                    pattern="[a-z0-9\-]+"
                    title="Lowercase letters, numbers, and hyphens only"
                    required
                />
            </label>

            <label class="label">
                <span>Content</span>
                <textarea
                    bind:value={post.content}
                    class="textarea"
                    rows="10"
                    required
                ></textarea>
            </label>

            <label class="label flex items-center space-x-2">
                <input
                    type="checkbox"
                    bind:checked={isPublished}
                    on:change={() => {
                        isPublished = !isPublished;
                        post.published = isPublished ? 1 : 0;
                    }}
                    class="checkbox"
                />
                <span>Published</span>
            </label>

            <div class="flex justify-end space-x-2">
                <a href="/admin/posts" class="btn variant-ghost">Cancel</a>
                <button type="submit" class="btn variant-filled-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    {/if}
</div>