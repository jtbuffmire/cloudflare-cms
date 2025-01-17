<script lang="ts">
    import { onMount } from 'svelte';
    import IconSelector from '$components/IconSelector.svelte';
    import { marked } from 'marked';
    import { API_VSN } from '$lib/config';
    import PicSelector from '$components/PicSelector.svelte';

    const API_URL = import.meta.env.VITE_API_URL;

    
    let post: {
        id: number;
        title: string;
        slug: string;
        content: string;
        markdown_content: string;
        html_content: string;
        metadata: {
            description?: string;
            tags?: string[];
            coverImage?: string;
            icon: string;
            [key: string]: any;
        };
        published: number;
    } | null = null;
    
    let loading = true;
    let error: string | null = null;
    let success = false;
    let imageUploading = false;
    let uploadError: string | null = null;
    let showPicSelector = false;
    let showPreview = false;

    onMount(async () => {
        const id = window.location.pathname.split('/').pop();
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`${API_URL}${API_VSN}/posts/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch post');
            post = await response.json();
            // Initialize metadata if it doesn't exist or preserve existing icon
            post!.metadata = {
                ...post?.metadata,
                tags: post?.metadata?.tags || [],
                icon: post?.metadata?.icon || 'ph:article'
            };
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load post';
        } finally {
            loading = false;
        }
    });

    async function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        
        const file = input.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        imageUploading = true;
        uploadError = null;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}${API_VSN}/posts/${post?.id}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload image');
            
            const result = await response.json() as { r2_key: string };
            const imageUrl = `${API_URL}${API_VSN}/pics/${result.r2_key}`;
            const imageMarkdown = `![${file.name}](${imageUrl})`;
            
            // Insert image URL into markdown content at cursor position
            const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            if (post) {
                post.markdown_content = 
                    post.markdown_content.substring(0, start) + 
                    imageMarkdown + 
                    post.markdown_content.substring(end);
            }

        } catch (err) {
            uploadError = err instanceof Error ? err.message : 'Failed to upload image';
        } finally {
            imageUploading = false;
            // Clear the input
            input.value = '';
        }
    }

    async function handleSubmit() {
        if (!post) return;
        
        loading = true;
        error = null;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}${API_VSN}/posts/${post.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...post,
                    metadata: {
                        description: post.metadata.description,
                        tags: post.metadata.tags,
                        coverImage: post.metadata.coverImage,
                        icon: post.metadata.icon
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to update post');
            success = true;
            setTimeout(() => {
                window.location.href = '/posts';
            }, 100);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to update post';
        } finally {
            loading = false;
        }
    }

    function handleImageSelect(url: string) {
        // Insert the image URL at cursor position
        const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
        const imageMarkdown = `![](${url})`;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        if (post) {
            post.markdown_content = 
                post.markdown_content.substring(0, start) + 
                imageMarkdown + 
                post.markdown_content.substring(end);
        }
        
        showPicSelector = false;
    }

    function handleIconChange(icon: string) {
        if (post) {
            post.metadata.icon = icon;
        }
    }

    async function togglePreview() {
        if (post) {
            post.html_content = await marked(post.markdown_content);
            showPreview = !showPreview;
        }
    }

    $: isPublished = Boolean(post?.published);
</script>

<div class="container mx-auto p-4">
    <h2 class="h2">Edit Post</h2>
    
    <div class="h-[calc(100vh-8rem)] overflow-y-auto pr-4">
        {#if loading}
            <div class="card p-4">Loading post...</div>
        {:else if error}
            <div class="alert variant-filled-error">{error}</div>
        {:else if !post}
            <div class="alert variant-filled-error">Post not found</div>
        {:else}
            <form on:submit|preventDefault={handleSubmit}>
                {#if success}
                    <div class="alert variant-filled-success">
                        Post updated successfully! Redirecting...
                    </div>
                {/if}

                {#if uploadError}
                    <div class="alert variant-filled-error">
                        {uploadError}
                    </div>
                {/if}

                <div class="grid grid-cols-2 gap-x-8">
                    <div class="mt-6 pl-6">
                        <span class="block mb-2">Title</span>
                        <input
                            type="text"
                            bind:value={post.title}
                            class="input w-full h-12 px-4"
                            required
                        />
                    </div>

                    <div class="mt-6 pl-6">
                        <span class="block mb-2">Description</span>
                        <input
                            type="text"
                            bind:value={post.metadata.description}
                            class="input w-full h-12 px-4"
                        />
                    </div>

                    <div class="mt-6 pl-6">
                        <span class="block mb-2">Slug</span>
                        <input
                            type="text"
                            bind:value={post.slug}
                            class="input w-full h-12 px-4"
                            pattern="[a-z0-9\-]+"
                            title="Lowercase letters, numbers, and hyphens only"
                            required
                        />
                    </div>

                    <div class="mt-6 pl-6">
                        <span class="block mb-2">Tags (comma-separated)</span>
                        <input
                            type="text"
                            value={post.metadata.tags?.join(', ') || ''}
                            class="input w-full h-12 px-4"
                            on:input={(e) => {
                                if (post) {
                                    post.metadata.tags = e.currentTarget.value
                                        .split(',')
                                        .map(tag => tag.trim());
                                }
                            }}
                        />
                    </div>
                </div>

                <div class="mt-6 pl-6">
                    <div class="flex flex-col gap-2">
                        <span class="block mb-2">Optional Pictures</span>
                        <div class="flex items-center space-x-2 ml-2">
                            <IconSelector 
                                value={post?.metadata?.icon || 'ph:pencil-simple'} 
                                onChange={handleIconChange}
                            />
                            <button 
                                type="button"
                                class="btn variant-ghost"
                                on:click={() => showPicSelector = !showPicSelector}
                            >
                                Insert Image
                            </button>
                            <button 
                                type="button" 
                                class="btn variant-ghost"
                                on:click={togglePreview}
                            >
                                {showPreview ? 'Edit' : 'Preview'}
                            </button>
                        </div>
                    </div>
                    
                    {#if showPicSelector}
                        <PicSelector onSelect={handleImageSelect} />
                    {/if}
                    
                    <div class="space-y-1">
                        <span class="block mt-6">Blog Post Content</span>
                        {#if showPreview}
                            <div class="prose max-w-none p-4 bg-surface-100-800-token rounded-container-token">
                                {@html post.html_content}
                            </div>
                        {:else}
                            <textarea
                                name="markdown_content"
                                bind:value={post.markdown_content}
                                class="textarea font-mono px-4 py-3"
                                rows="15"
                                required
                            ></textarea>
                        {/if}
                    </div>
                </div>

                <div class="flex justify-end space-x-2 mt-4">
                    <a href="/posts" class="btn variant-ghost">Cancel</a>
                    <button type="submit" class="btn variant-filled-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        {/if}
    </div>
</div>