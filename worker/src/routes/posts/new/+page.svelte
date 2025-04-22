<script lang="ts">
    import IconSelector from '$components/IconSelector.svelte';
    import { marked } from 'marked';
    import { onMount } from 'svelte';
    import { API_VSN } from '$lib/config';
    import PicSelector from '$components/PicSelector.svelte';

    const API_URL = import.meta.env.VITE_API_URL;
    
    let title = '';
    let slug = '';
    let content = '';
    let markdown_content = '';
    let metadata = {
        description: '',
        tags: [] as string[],
        coverImage: '',
        icon: 'ph:article'
    };
    let loading = false;
    let error: string | null = null;
    let success: boolean = false;
    let newPostUrl: string = '';
    let imageUploading = false;
    let uploadError: string | null = null;
    let showPicSelector = false;
    let showPreview = false;
    let previewHtml = '';
    let previewContainer: HTMLElement;

    // Auto-generate slug from title
    function generateSlug(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-');
    }

    // Update slug when title changes
    $: {
        if (title && !slug) {
            slug = generateSlug(title);
        }
    }

    // Validate slug on input
    function validateSlug(event: Event) {
        const input = event.target as HTMLInputElement;
        const newValue = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (input.value !== newValue) {
            input.value = newValue;
            slug = newValue;
        }
    }

    // Add icon change handler
    function handleIconChange(icon: string) {
        metadata.icon = icon;
    }

    onMount(() => {
        // Load saved form data
        const savedData = localStorage.getItem('newPostDraft');
        if (savedData) {
            const data = JSON.parse(savedData);
            title = data.title || '';
            slug = data.slug || '';
            markdown_content = data.markdown_content || '';
            metadata = {
                ...metadata,
                ...data.metadata
            };
        }
    });

    // Save form data when it changes
    $: {
        if (title || markdown_content || metadata.description || metadata.tags.length > 0) {
            localStorage.setItem('newPostDraft', JSON.stringify({
                title,
                slug,
                markdown_content,
                metadata
            }));
        }
    }

    // Clear form data on successful submit or cancel
    function clearDraft() {
        localStorage.removeItem('newPostDraft');
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

            const response = await fetch(`${API_URL}${API_VSN}/posts`, {
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
                    metadata,
                    published: true
                })
            });
  
            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to create post');
            }

            const post = await response.json();
            success = true;
            newPostUrl = `${API_URL}/blog/${slug}`;
            
            // Clear draft after successful submission
            clearDraft();
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = '/posts';
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
            const draftResponse = await fetch(`${API_URL}${API_VSN}/posts`, {
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
                    metadata,
                    published: true
                })
            });

            if (!draftResponse.ok) throw new Error('Failed to create draft post');
            const draft = await draftResponse.json() as { id: string };
            // Then upload the image to this draft post
            const response = await fetch(`${API_URL}${API_VSN}/posts/${draft.id}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload image');
            
            const result = await response.json() as { r2_key: string };
            const imageUrl = `${API_URL}/post-images/${result.r2_key}`;
            const imageMarkdown = `![${file.name}](${imageUrl})`;
            
            const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
            
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

    async function handleImageSelect(url: string, name: string) {
        console.log('🖼️ handleImageSelect called with:', { url, name });
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return;
        }

        try {
            const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
            // Ensure we have the full API URL for the picture
            const imageUrl = url.startsWith('/') ? `${API_URL}${url}` : url;
            console.log('🔗 Constructed image URL:', imageUrl);
            
            const imageMarkdown = `![${name}](${imageUrl})`;
            console.log('📝 Generated markdown:', imageMarkdown);
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            markdown_content = 
                markdown_content.substring(0, start) + 
                imageMarkdown + 
                markdown_content.substring(end);
                
            showPicSelector = false;
        } catch (error) {
            console.error('Failed to insert image:', error);
        }
    }

    async function togglePreview() {
        console.log('🔄 togglePreview called, current state:', { showPreview, contentLength: markdown_content.length });
        
        if (!showPreview && !markdown_content.trim()) {
            console.log('Cannot preview empty content');
            return;
        }

        showPreview = !showPreview;
        if (showPreview) {
            try {
                let previewContent = markdown_content;
                console.log('📄 Original content:', previewContent);

                // Fix any duplicated API URLs
                const duplicatedUrlRegex = new RegExp(`${API_URL}${API_URL}`, 'g');
                previewContent = previewContent.replace(duplicatedUrlRegex, API_URL);
                console.log('📄 Processed content:', previewContent);

                const response = await fetch(`${API_URL}${API_VSN}/preview`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        markdown: previewContent
                    })
                });
                
                if (!response.ok) throw new Error('Preview generation failed');
                const result = await response.json();
                console.log('📥 Preview response:', result);
                const previewResult = result as { html: string };
                previewHtml = previewResult.html;
            } catch (error) {
                console.error('Preview generation failed:', error);
                previewHtml = await marked(markdown_content) as string;
            }
        }
    }

    // Add action directive for preview image loading
    function previewImageLoader(node: HTMLElement): { destroy: () => void } {
        console.log('🖼️ previewImageLoader initialized');
        const token = localStorage.getItem('token');
        if (!token) return { destroy: () => {} };

        const objectUrls: string[] = [];

        function loadImage(img: HTMLImageElement) {
            console.log('🔍 Processing image:', img.src);
            if (img.src.includes(`${API_VSN}/pics/`)) {
                const apiUrl = img.src.includes(API_URL) ? img.src : `${API_URL}${new URL(img.src).pathname}`;
                console.log('🔗 Constructed API URL:', apiUrl);
                
                // Fix any duplicated API URLs
                const fixedUrl = apiUrl.replace(new RegExp(`${API_URL}${API_URL}`, 'g'), API_URL);
                console.log('🔧 Fixed URL:', fixedUrl);
                
                fetch(fixedUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(response => {
                    console.log('📥 Image fetch response:', response.status, response.statusText);
                    if (!response.ok) throw new Error('Failed to load image');
                    return response.blob();
                })
                .then(blob => {
                    console.log('📦 Created blob:', blob.type, blob.size);
                    const objectUrl = URL.createObjectURL(blob);
                    objectUrls.push(objectUrl);
                    img.src = objectUrl;
                    console.log('✅ Set image src to:', objectUrl);
                })
                .catch(error => {
                    console.error('❌ Failed to load image:', error, {
                        originalSrc: img.src,
                        fixedUrl
                    });
                    img.style.border = '2px solid red';
                    img.style.padding = '1rem';
                    img.alt = 'Failed to load image';
                });
            } else {
                console.log('⏭️ Skipping non-picture:', img.src);
            }
        }

        // Initial load of existing images
        const images = node.getElementsByTagName('img');
        console.log('🔍 Found images:', images.length);
        Array.from(images).forEach(loadImage);

        // Set up observer for dynamically added images
        const observer = new MutationObserver((mutations) => {
            console.log('👀 DOM mutation detected');
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node instanceof HTMLImageElement) {
                        console.log('🆕 New image added directly');
                        loadImage(node);
                    } else if (node instanceof Element) {
                        const images = node.getElementsByTagName('img');
                        console.log('🔍 Found nested images:', images.length);
                        Array.from(images).forEach(loadImage);
                    }
                });
            });
        });

        observer.observe(node, {
            childList: true,
            subtree: true
        });

        return {
            destroy() {
                console.log('🧹 Cleaning up previewImageLoader');
                observer.disconnect();
                objectUrls.forEach(URL.revokeObjectURL);
            }
        };
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
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens are allowed"
                    required
                    on:input={validateSlug}
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
                <span class="block mb-2">Optional Pictures</span>
                <div class="flex items-center space-x-2 ml-2">
                    <IconSelector 
                        value={metadata.icon} 
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
                        disabled={!markdown_content.trim() && !showPreview}
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
                    <div 
                        class="prose max-w-none p-4 bg-surface-100-800-token rounded-container-token"
                        bind:this={previewContainer}
                        use:previewImageLoader
                    >
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
            <a href="/posts" class="btn variant-ghost" on:click={clearDraft}>Cancel</a>
            <button type="submit" class="btn variant-filled-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Post'}
            </button>
        </div>
    </form>
</div>