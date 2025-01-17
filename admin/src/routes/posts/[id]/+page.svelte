<!-- Edit Post Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { posts } from '$lib/stores';
  import type { Post } from '$lib/types';
  import { API_BASE, API_VSN, getRequestInit, getDomain } from '$lib/config';
  import { Button, Label, Input, Textarea, Checkbox, Card, Spinner, Modal, Toggle } from 'flowbite-svelte';
  import IconSelector from '$lib/components/IconSelector.svelte';
  import { marked } from 'marked';
  import PicSelector from '$lib/components/PicSelector.svelte';
  import 'iconify-icon';

  // Get domain and token from URL params or defaults
  const urlDomain = $page.url.searchParams.get('domain');
  const urlToken = $page.url.searchParams.get('token');
  const domain = urlDomain || getDomain();

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

  let post: Post = {
    id: '',
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    markdown_content: '',
    html_content: '',
    published: false,
    created_at: '',
    updated_at: '',
    metadata: {
      description: '',
      tags: [],
      coverImage: '',
      icon: 'mdi:file-document'
    },
    domain
  };
  let loading = true;
  let error: string | null = null;
  let isSaving = false;
  let showPicSelector = false;
  let showPreview = false;
  let previewHtml = '';
  let showIconSelector = false;
  let imageUploading = false;
  let uploadError: string | null = null;

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  // Update slug when title changes
  $: {
    if (post.title && !post.slug) {
      post.slug = generateSlug(post.title);
    }
  }

  function validateSlug(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (input.value !== newValue) {
      input.value = newValue;
      post.slug = newValue;
    }
  }

  async function loadPost() {
    loading = true;
    error = null;
    try {
      const response = await fetch(`${API_BASE}${API_VSN}/posts/${$page.params.id}`, getPageRequestInit());
      if (!response.ok) throw new Error('Failed to load post');
      const data = await response.json() as Post;
      post = {
        ...data,
        metadata: {
          description: data.metadata?.description || '',
          tags: data.metadata?.tags || [],
          coverImage: data.metadata?.coverImage || '',
          icon: data.metadata?.icon || 'mdi:file-document'
        },
        domain
      };
    } catch (err) {
      console.error('Error loading post:', err);
      error = 'Failed to load post';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!post) return;

    isSaving = true;
    error = null;
    try {
      // Convert markdown to HTML if markdown content exists
      if (post.markdown_content) {
        post.html_content = await marked(post.markdown_content);
      }

      const response = await fetch(`${API_BASE}${API_VSN}/posts/${$page.params.id}`, {
        method: 'PUT',
        ...getPageRequestInit(),
        body: JSON.stringify(post)
      });

      if (!response.ok) throw new Error('Failed to update post');
      
      // Update store - WebSocket will handle the update
      posts.update(currentPosts => 
        currentPosts.map(p => p.id === post.id ? post : p)
      );

      // Navigate back with the same params
      const url = new URL('/posts', window.location.origin);
      if (urlDomain) url.searchParams.set('domain', urlDomain);
      if (urlToken) url.searchParams.set('token', urlToken);
      goto(url.toString());
    } catch (err) {
      console.error('Error updating post:', err);
      error = 'Failed to update post';
    } finally {
      isSaving = false;
    }
  }

  function handleImageSelect(url: string, name: string) {
    const imageMarkdown = `![${name}](${url})`;
    const textarea = document.querySelector('textarea[name="markdown_content"]') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    post.markdown_content = 
      (post.markdown_content || '').substring(0, start) + 
      imageMarkdown + 
      (post.markdown_content || '').substring(end);
    
    showPicSelector = false;
  }

  function handleIconSelect(event: CustomEvent<{ icon: string }>) {
    if (!post.metadata) {
      post.metadata = {};
    }
    post.metadata.icon = event.detail.icon;
    showIconSelector = false;
  }

  async function togglePreview() {
    if (!showPreview && !post.markdown_content?.trim()) {
      return;
    }

    showPreview = !showPreview;
    if (showPreview) {
      try {
        // Convert markdown to HTML
        previewHtml = await marked(post.markdown_content || '');
      } catch (err) {
        console.error('Preview error:', err);
        error = 'Failed to generate preview';
        return;
      }
    }
  }

  onMount(() => {
    loadPost();
  });
</script>

<div class="max-w-[95%] mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-white">Edit Post</h1>
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

  {#if loading}
    <div class="flex justify-center items-center py-12">
      <Spinner size="12" />
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{error}</p>
      <Button color="red" size="xs" on:click={loadPost}>Retry</Button>
    </div>
  {:else}
    <Card class="bg-gray-800 !max-w-none w-full">
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <Label for="title" class="mb-2 text-lg font-medium text-gray-100">Title</Label>
            <div class="flex items-center gap-4">
              {#if post.metadata?.icon}
                <div class="flex items-center gap-2">
                  <iconify-icon icon={post.metadata.icon} class="text-2xl text-gray-400"></iconify-icon>
                </div>
              {/if}
              <Input
                id="title"
                type="text"
                bind:value={post.title}
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
              bind:value={post.slug}
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
              bind:value={post.metadata!.description}
              placeholder="Brief description of the post..."
              class="h-24 w-full"
            />
          </div>

          <div>
            <Label class="mb-2 text-lg font-medium text-gray-100">Post Icon</Label>
            <div class="flex items-center gap-2">
              {#if post.metadata?.icon}
                <div class="flex items-center gap-2">
                  <iconify-icon icon={post.metadata.icon} class="text-2xl text-gray-400"></iconify-icon>
                </div>
              {/if}
              <Button color="dark" on:click={() => showIconSelector = !showIconSelector}>
                Change Icon
              </Button>
            </div>
          </div>
        </div>

        {#if showPicSelector}
          <div class="w-full">
            <PicSelector onSelect={handleImageSelect} />
          </div>
        {/if}

        {#if showIconSelector}
          <IconSelector on:select={handleIconSelect} />
        {/if}

        <div>
          <Label for="content" class="mb-2 text-lg font-medium text-gray-100">Content</Label>
          {#if showPreview}
            <div class="prose prose-invert max-w-none bg-gray-900 p-6 rounded-lg">
              <div class="flex items-center gap-3 mb-4">
                <iconify-icon icon={post.metadata?.icon || 'mdi:file-document'} class="text-3xl"></iconify-icon>
                <h1 class="m-0">{post.title}</h1>
              </div>
              {@html previewHtml}
            </div>
          {:else}
            <Textarea
              id="content"
              name="markdown_content"
              class="h-96 font-mono w-full resize p-4 bg-gray-900 border-gray-600 text-white rounded-lg min-h-[16rem]"
              bind:value={post.markdown_content}
              placeholder="Write your post content here using Markdown..."
              required
            />
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <Checkbox
            id="published"
            bind:checked={post.published}
          />
          <Label for="published" class="text-lg font-medium text-gray-100">Published</Label>
        </div>

        <div class="flex justify-end gap-2">
          <Button type="submit" color="blue" disabled={isSaving}>
            {#if isSaving}
              <Spinner class="mr-2" size="4" />
              Saving...
            {:else}
              Save Changes
            {/if}
          </Button>
        </div>
      </form>
    </Card>
  {/if}
</div> 

<style>
  :global(iconify-icon) {
    font-size: 2em;
    vertical-align: middle;
  }

  :global(.text-3xl iconify-icon) {
    font-size: 2em;
  }
</style> 