<!-- Posts Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import type { Post } from '$lib/types';
  import { API_BASE, API_VSN, getRequestInit, getDefaultHeaders, getDomain } from '$lib/config';
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Badge, Spinner, Toggle } from 'flowbite-svelte';
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';

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

  const posts = writable<Post[]>([]);
  let loading = true;
  let error: string | null = null;

  interface PostsResponse {
    posts: Post[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }

  interface ErrorResponse {
    error: string;
    details?: string;
  }

  async function handleNewPost() {
    try {
      await goto('/posts/new');
    } catch (err) {
      console.error('Error navigating to new post page:', err);
      error = err instanceof Error ? err.message : 'Failed to open new post editor';
    }
  }

  async function handleEdit(post: Post) {
    try {
      await goto(`/posts/${post.id}`);
    } catch (err) {
      console.error('Error navigating to edit page:', err);
      error = err instanceof Error ? err.message : 'Failed to open post editor';
    }
  }

  async function loadPosts() {
    try {
      loading = true;
      const response = await fetch(`${API_BASE}${API_VSN}/posts`, getRequestInit());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const data = await response.json() as PostsResponse;
      posts.set(data.posts || []);
    } catch (err) {
      console.error('Error loading posts:', err);
      error = err instanceof Error ? err.message : 'Failed to load posts';
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`${API_BASE}${API_VSN}/posts/${id}`, {
        method: 'DELETE',
        ...getRequestInit()
      });
      
      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to delete post');
      }
      
      // Remove from store
      posts.update(currentPosts => currentPosts.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting post:', err);
      error = err instanceof Error ? err.message : 'Failed to delete post';
    }
  }

  async function handlePublishToggle(post: Post) {
    try {
      const response = await fetch(`${API_BASE}${API_VSN}/posts/${post.id}`, {
        method: 'PUT',
        ...getRequestInit({
          body: JSON.stringify({
            ...post,
            published: !post.published,
            domain: domain
          })
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to update post status');
      }

      // Update store immediately after successful request
      const updatedPost = await response.json() as Post;
      $posts = $posts.map(p => p.id === post.id ? updatedPost : p);
    } catch (err) {
      console.error('Error updating post status:', err);
      error = err instanceof Error ? err.message : 'Failed to update post status';
    }
  }

  onMount(() => {
    loadPosts();
  });
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-white">Posts</h1>
    <Button color="blue" on:click={handleNewPost}>
      <Icon icon="mdi:plus" class="mr-2" />
      New Post
    </Button>
  </div>

  {#if loading}
    <div class="flex justify-center items-center py-12">
      <Spinner size="12" />
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
      <p>{error}</p>
      <Button color="red" size="xs" on:click={loadPosts}>Retry</Button>
    </div>
  {:else if $posts.length === 0}
    <div class="bg-gray-800 text-gray-300 rounded-lg p-8 text-center">
      <p class="text-lg mb-4">No posts found</p>
      <Button color="blue" on:click={handleNewPost}>Create your first post</Button>
    </div>
  {:else}
    <div class="bg-gray-800 overflow-hidden rounded-lg shadow">
      <Table divClass="relative overflow-x-auto" color="custom" class="text-gray-100">
        <TableHead class="bg-gray-700">
          <TableHeadCell class="text-gray-100">Title</TableHeadCell>
          <TableHeadCell class="text-gray-100">Slug</TableHeadCell>
          <TableHeadCell class="text-gray-100">Status</TableHeadCell>
          <TableHeadCell class="text-gray-100">Created</TableHeadCell>
          <TableHeadCell class="text-gray-100">Actions</TableHeadCell>
        </TableHead>
        <TableBody class="divide-y divide-gray-700">
          {#each $posts as post}
            <TableBodyRow>
              <TableBodyCell class="text-gray-100">{post.title}</TableBodyCell>
              <TableBodyCell class="font-mono text-sm text-gray-300">{post.slug}</TableBodyCell>
              <TableBodyCell>
                <Toggle 
                  checked={post.published} 
                  on:change={() => handlePublishToggle(post)}
                >
                  <Badge
                    color={post.published ? 'green' : 'yellow'}
                    class="px-2.5 py-0.5 text-xs font-medium ml-2"
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </Badge>
                </Toggle>
              </TableBodyCell>
              <TableBodyCell class="text-gray-300">
                {new Date(post.created_at).toLocaleDateString()}
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex items-center gap-2">
                  <Button size="xs" color="blue" on:click={() => handleEdit(post)}>
                    <Icon icon="mdi:pencil" class="mr-1" />
                    Edit
                  </Button>
                  <Button size="xs" color="red" on:click={() => handleDelete(post.id)}>
                    <Icon icon="mdi:delete" class="mr-1" />
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

<style>
  :global(.iconify) {
    font-size: 1.2em;
    vertical-align: middle;
  }
</style> 