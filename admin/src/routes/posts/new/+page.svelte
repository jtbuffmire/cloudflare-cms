<!-- New Post Page -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { posts } from '$lib/stores';
  import type { Post } from '$lib/types';
  import { API_BASE, API_VSN, getRequestInit, getDomain } from '$lib/config';
  import { Button, Label, Input, Textarea, Checkbox, Card, Spinner, Modal } from 'flowbite-svelte';
  import IconSelector from '$lib/components/IconSelector.svelte';
  import { marked } from 'marked';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import PicSelector from '$lib/components/PicSelector.svelte';

  const DOMAIN = getDomain();
  let isLoading = true;
  let isAuthenticated = false;
  let isSaving = false;
  let showPicSelector = false;
  let showPreview = false;
  let previewHtml = '';
  let showIconSelector = false;

  // Track if form has been modified
  let isFormDirty = false;

  function handleUnauthorized() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  function isAdminSubdomain(): boolean {
    if (!browser) return false;
    return window.location.hostname.startsWith('admin.');
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
        loadFormState();
      } catch {
        handleUnauthorized();
      }
    } else {
      isAuthenticated = true;
      loadFormState();
    }
    
    isLoading = false;
  });

  // Get domain and token from URL params or defaults
  const urlDomain = $page.url.searchParams.get('domain');
  const urlToken = $page.url.searchParams.get('token');
  const domain = urlDomain || DOMAIN;

  // Track if form has been modified
  let isSubmitting = false;

  // Save form state to localStorage
  function saveFormState() {
    if (browser) {
      const formState = {
        title,
        slug,
        content,
        markdown_content,
        metadata,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('newPostDraft', JSON.stringify(formState));
      isFormDirty = true;
    }
  }

  // Load form state from localStorage
  function loadFormState() {
    if (browser) {
      const savedData = localStorage.getItem('newPostDraft');
      if (savedData) {
        const data = JSON.parse(savedData);
        title = data.title || '';
        slug = data.slug || '';
        content = data.content || '';
        markdown_content = data.markdown_content || '';
        metadata = {
          ...metadata,
          ...data.metadata
        };
        isFormDirty = true;
      }
    }
  }

  // Clear form state
  function clearFormState() {
    if (browser) {
      localStorage.removeItem('newPostDraft');
      isFormDirty = false;
    }
  }

  // Handle beforeunload event
  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (isFormDirty && !isSubmitting) {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
  }

  // Handle navigation
  async function handleNavigation(url: string) {
    if (isFormDirty && !isSubmitting) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) {
        return;
      }
      // Save as draft before navigating
      saveFormState();
    }
    await goto(url);
  }

  // Watch for form changes
  $: {
    if (title || markdown_content || metadata.description || metadata.tags.length > 0) {
      saveFormState();
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  });

  interface PostResponse {
    error?: string;
    post?: Post;
  }

  interface ErrorResponse {
    error: string;
    details?: string;
  }

  let title = '';
  let slug = '';
  let content = '';
  let markdown_content = '';
  let metadata = {
    description: '',
    tags: [] as string[],
    coverImage: '',
    icon: 'article'
  };
  let error: string | null = null;
  let previewContainer: HTMLElement;

  // Update request init to include token if provided in URL
  const getPageRequestInit = () => {
    const init = getRequestInit();
    if (urlToken) {
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${urlToken}`
      };
    }
    return init;
  };

  function generateSlug(text: string) {
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

  function validateSlug(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (input.value !== newValue) {
      input.value = newValue;
      slug = newValue;
    }
  }

  async function handleSubmit() {
    isSubmitting = true;
    isSaving = true;
    error = null;
    try {
      // Convert markdown to HTML
      const html_content = await marked(markdown_content);
      
      const response = await fetch(`${API_BASE}${API_VSN}/posts`, {
        method: 'POST',
        ...getPageRequestInit(),
        body: JSON.stringify({
          title,
          slug,
          domain,
          content: html_content,
          markdown_content,
          html_content,
          metadata,
          published: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as PostResponse;
        throw new Error(errorData.error || 'Failed to create post');
      }
      
      const newPost = await response.json() as Post;
      posts.update(currentPosts => [...currentPosts, newPost]);
      
      // Clear form state after successful submission
      clearFormState();
      
      // Navigate back with the same params
      const url = new URL('/posts', window.location.origin);
      if (urlDomain) url.searchParams.set('domain', urlDomain);
      if (urlToken) url.searchParams.set('token', urlToken);
      await goto(url.toString());
    } catch (err) {
      console.error('Error creating post:', err);
      error = err instanceof Error ? err.message : 'Failed to create post';
    } finally {
      isSaving = false;
      isSubmitting = false;
    }
  }

  function handleImageSelect(url: string, name: string) {
    const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const imageMarkdown = `![${name}](${url})`;
    markdown_content = 
      markdown_content.substring(0, start) + 
      imageMarkdown + 
      markdown_content.substring(end);
    
    showPicSelector = false;
  }

  async function togglePreview() {
    if (!showPreview && !markdown_content.trim()) {
      return;
    }

    showPreview = !showPreview;
    if (showPreview) {
      try {
        // Convert markdown to HTML
        previewHtml = await marked(markdown_content);
      } catch (err) {
        console.error('Preview error:', err);
        error = 'Failed to generate preview';
        return;
      }
    }
  }

  function handleIconSelect(event: CustomEvent<{ icon: string }>) {
    metadata.icon = event.detail.icon;
    showIconSelector = false;
  }
</script>

{#if isLoading}
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <Spinner size="12" />
  </div>
{:else if isAuthenticated}
  <div class="max-w-[95%] mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-white">New Post</h1>
      <div class="flex gap-2">
        <Button href="/posts" color="dark">Back to Posts</Button>
        <Button color="blue" on:click={() => showPicSelector = !showPicSelector}>
          <iconify-icon icon="mdi:image" class="mr-2"></iconify-icon>
          Insert Image
        </Button>
        <Button color="blue" on:click={() => showIconSelector = !showIconSelector}>
          <iconify-icon icon="mdi:emoticon" class="mr-2"></iconify-icon>
          Add Icon
        </Button>
        <Button color="blue" on:click={togglePreview}>
          <iconify-icon icon={showPreview ? "mdi:pencil" : "mdi:eye"} class="mr-2"></iconify-icon>
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
    </div>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
      </div>
    {/if}

    <Card class="bg-gray-800 !max-w-none w-full">
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <Label for="title" class="mb-2 text-lg font-medium text-gray-100">Title</Label>
            <div class="flex items-center gap-4">
              <iconify-icon icon={metadata.icon} class="text-2xl text-gray-400"></iconify-icon>
              <Input
                id="title"
                type="text"
                bind:value={title}
                placeholder="Post title"
                required
                class="w-full"
              />
            </div>
          </div>

          <div>
            <Label for="slug" class="mb-2 text-lg font-medium text-gray-100">Slug</Label>
            <Input
              id="slug"
              type="text"
              bind:value={slug}
              placeholder="post-slug"
              on:input={validateSlug}
              required
              class="w-full"
            />
            <p class="mt-1 text-sm text-gray-400">URL-friendly version of the title</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <div>
            <Label for="description" class="mb-2 text-lg font-medium text-gray-100">Description</Label>
            <Textarea
              id="description"
              bind:value={metadata.description}
              placeholder="Brief description of the post..."
              class="h-24 w-full"
            />
          </div>

          <div>
            <Label class="mb-2 text-lg font-medium text-gray-100">Post Icon</Label>
            <div class="flex items-center gap-2">
              <iconify-icon icon={metadata.icon} class="text-2xl text-gray-400"></iconify-icon>
              <Button color="dark" on:click={() => showIconSelector = !showIconSelector}>
                Change Icon
              </Button>
            </div>
          </div>
        </div>

        {#if showPicSelector}
          <PicSelector onSelect={handleImageSelect} class="w-full" />
        {/if}

        {#if showIconSelector}
          <IconSelector on:select={handleIconSelect} />
        {/if}

        <div>
          <Label for="content" class="mb-2 text-lg font-medium text-gray-100">Content</Label>
          {#if showPreview}
            <div class="prose prose-invert max-w-none bg-gray-900 p-6 rounded-lg">
              {@html previewHtml}
            </div>
          {:else}
            <Textarea
              id="content"
              name="markdown_content"
              class="h-96 font-mono w-full resize p-4 bg-gray-900 border-gray-600 text-white rounded-lg min-h-[16rem]"
              bind:value={markdown_content}
              placeholder="Write your post content here using Markdown..."
              required
            />
          {/if}
        </div>

        <div class="flex justify-end gap-2">
          <Button type="submit" color="blue" disabled={isSaving}>
            {#if isSaving}
              <Spinner class="mr-2" size="4" />
              Saving...
            {:else}
              Create Post
            {/if}
          </Button>
        </div>
      </form>
    </Card>
  </div>
{/if}

<style>
  :global(iconify-icon) {
    font-size: 2em;
    vertical-align: middle;
  }

  :global(.text-3xl iconify-icon) {
    font-size: 2em;
  }
</style> 