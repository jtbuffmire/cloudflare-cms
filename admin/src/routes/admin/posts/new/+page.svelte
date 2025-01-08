<script lang="ts">
    import MediaSelector from '$components/MediaSelector.svelte';
    import IconSelector from '$components/IconSelector.svelte';
    import { marked } from 'marked';
    import { API_URL } from '$lib/config';
    
    let title = '';
    let slug = '';
    let content = '';
    let markdown_content = '';
    let metadata = {
        description: '',
        tags: [] as string[],
        coverImage: '',
        icon: 'ph:pencil-simple'
    };
    let loading = false;
    let error: string | null = null;
    let success: boolean = false;
    let newPostUrl: string = '';
    let imageUploading = false;
    let uploadError: string | null = null;
    let showMediaSelector = false;
    let showPreview = false;
    let previewHtml = '';

    // Auto-generate slug from title
    function generateSlug(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    // Update slug when title changes
    $: {
        if (title && !slug) {
            slug = generateSlug(title);
        }
    }
  
    // Add icon change handler
    function handleIconChange(icon: string) {
        metadata.icon = icon;
    }

    async function handleSubmit() {
        loading = true;
        error = null;
        success = false;
        const token = localStorage.getItem('token');
  
        try {
            console.log('Submitting post:', {
                title,
                slug,
                content,
                markdown_content,
                metadata
            });

            const response = await fetch('http://localhost:8787/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    slug,
                    content: marked(markdown_content),
                    markdown_content,
                    metadata
                })
            });
  
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create post');
            }

            const post = await response.json();
            success = true;
            newPostUrl = `http://localhost:8788/blog/${slug}`;
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = '/admin/posts';
            }, 100);

        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to create post';
        } finally {
            loading = false;
        }
    }

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
            // First create a draft post to get an ID
            const draftResponse = await fetch('http://localhost:8787/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: title || 'Draft Post',
                    slug: slug || 'draft-post',
                    content: content || '',
                    markdown_content: markdown_content || '',
                    metadata
                })
            });

            if (!draftResponse.ok) throw new Error('Failed to create draft post');
            const draft = await draftResponse.json();

            // Then upload the image to this draft post
            const response = await fetch(`http://localhost:8787/api/posts/${draft.id}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload image');
            
            const result = await response.json();
            
            // Insert image URL into markdown content at cursor position
            const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
            const imageUrl = `http://localhost:8787/post-images/${result.r2_key}`;
            const imageMarkdown = `![${file.name}](${imageUrl})`;
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            markdown_content = 
                markdown_content.substring(0, start) + 
                imageMarkdown + 
                markdown_content.substring(end);

        } catch (err) {
            uploadError = err instanceof Error ? err.message : 'Failed to upload image';
        } finally {
            imageUploading = false;
            // Clear the input
            input.value = '';
        }
    }

    function handleImageSelect(url: string, name: string) {
        // Insert image markdown at cursor position
        const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
        const imageMarkdown = `![${name}](${url})`;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        markdown_content = 
            markdown_content.substring(0, start) + 
            imageMarkdown + 
            markdown_content.substring(end);
            
        showMediaSelector = false;
    }

    async function togglePreview() {
        // If switching to preview mode and no content, show message and prevent switch
        if (!showPreview && !markdown_content.trim()) {
            // Optional: Show a toast or message
            console.log('Cannot preview empty content');
            return;
        }

        showPreview = !showPreview;
        if (showPreview) {
            try {
                const response = await fetch(`${API_URL}/api/preview`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        markdown: markdown_content
                    })
                });
                
                if (!response.ok) throw new Error('Preview generation failed');
                const result = await response.json();
                previewHtml = result.html;
            } catch (error) {
                // Fallback to client-side rendering if API fails
                previewHtml = marked(markdown_content);
            }
        }
    }
</script>
  
<div class="container mx-auto p-4">
    <h2 class="h2">New Post</h2>
    
    <form on:submit|preventDefault={handleSubmit} class="h-[calc(100vh-8rem)] overflow-y-auto pr-4">
        {#if error}
            <div class="alert variant-filled-error">{error}</div>
        {/if}

        {#if uploadError}
            <div class="alert variant-filled-error">{uploadError}</div>
        {/if}

        <div class="grid grid-cols-2 gap-x-8">
            <div class="mt-6 pl-6">
                <span class="block mb-2">Title</span>
                <input
                    type="text"
                    bind:value={title}
                    class="input w-full h-12 px-4"
                    required
                />
            </div>

            <div class="mt-6 pl-6">
                <span class="block mb-2">Description</span>
                <input
                    type="text"
                    bind:value={metadata.description}
                    class="input w-full h-12 px-4"
                />
            </div>

            <div class="mt-6 pl-6">
                <span class="block mb-2">Slug</span>
                <input
                    type="text"
                    bind:value={slug}
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
                    value={metadata.tags.join(', ')}
                    class="input w-full h-12 px-4"
                    on:input={(e) => {
                        metadata.tags = e.currentTarget.value
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag);
                    }}
                />
            </div>
        </div>

        <div class="mt-6 pl-6">
            <div class="flex flex-col gap-2">
                <span class="block mb-2">Optional Media</span>
                <div class="flex items-center space-x-2 ml-2">
                    <IconSelector 
                        value={metadata.icon} 
                        onChange={handleIconChange}
                    />
                    <button 
                        type="button"
                        class="btn variant-ghost"
                        on:click={() => showMediaSelector = !showMediaSelector}
                    >
                        Insert Image
                    </button>
                    <button 
                        type="button" 
                        class="btn variant-ghost"
                        on:click={togglePreview}
                        disabled={!markdown_content.trim() && !showPreview}
                    >
                        {showPreview ? 'Edit' : 'Preview'}
                    </button>
                </div>
            </div>
            
            {#if showMediaSelector}
                <MediaSelector onSelect={handleImageSelect} />
            {/if}
            
            <div class="space-y-1">
                <span class="block mt-6">Blog Post Content</span>
                {#if showPreview}
                    <div class="prose max-w-none p-4 bg-surface-100-800-token rounded-container-token">
                        {@html previewHtml}
                    </div>
                {:else}
                    <textarea
                        name="markdown_content"
                        bind:value={markdown_content}
                        class="textarea font-mono px-4 py-3"
                        rows="15"
                        required
                    ></textarea>
                {/if}
            </div>
        </div>

        <div class="flex justify-end space-x-2 mt-4">
            <a href="/admin/posts" class="btn variant-ghost">Cancel</a>
            <button type="submit" class="btn variant-filled-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Post'}
            </button>
        </div>
    </form>
</div>