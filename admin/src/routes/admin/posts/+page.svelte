<script lang="ts">
  import { onMount } from 'svelte';

  const API_URL = import.meta.env.VITE_API_URL;
  
  let posts: Array<{
    id: number;
    title: string;
    slug: string;
    content: string;
    markdown_content: string;
    metadata: {
      description?: string;
      tags?: string[];
      coverImage?: string;
      icon?: string;
    };
    published: number;
    published_at: string | null;
    created_at: string;
  }> = [];

  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    try {
      console.log('🔄 Admin: Fetching posts...');
      const response = await fetch(`${API_URL}/posts?all=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('📝 Admin: Response status:', response.status);
      
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      
      // Parse metadata for each post
      posts = data.posts.map(post => ({
        ...post,
        metadata: typeof post.metadata === 'string' 
          ? JSON.parse(post.metadata) 
          : post.metadata
      }));
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  });

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete post');
      
      // Remove the post from the list without reloading
      posts = posts.filter(post => post.id !== id);
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  async function handlePublishToggle(id: number, currentStatus: number) {
    const token = localStorage.getItem('token');
    const newStatus = currentStatus === 1 ? 0 : 1;
    
    try {
      const response = await fetch(`${API_URL}/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ published: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update post status');
      
      // Update the post in the list without reloading
      posts = posts.map(post => 
        post.id === id 
          ? { 
              ...post, 
              published: newStatus, 
              published_at: newStatus ? new Date().toISOString() : null,
              // Preserve the parsed metadata
              metadata: typeof post.metadata === 'string' 
                ? JSON.parse(post.metadata) 
                : post.metadata
            }
          : post
      );
    } catch (error) {
      console.error('Publish toggle error:', error);
    }
  }

  // Helper function to truncate text
  function truncate(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
</script>

<div class="container mx-auto p-4">
  <div class="h-[calc(100vh-8rem)] overflow-y-auto pr-4 overscroll-contain">
    <div class="pb-16">
      <div class="flex justify-between items-center mb-4">
        <h2 class="h2">Posts</h2>
        <a href="/admin/posts/new" class="btn variant-filled-primary">New Post</a>
      </div>

      {#if loading}
        <div class="card p-4">Loading posts...</div>
      {:else if error}
        <div class="card p-4 variant-filled-error">{error}</div>
      {:else if posts.length === 0}
        <div class="card p-4">No posts found. Create your first post!</div>
      {:else}
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th class="w-[20%]">Title</th>
                  <th class="w-[25%]">Description</th>
                  <th class="w-[15%]">Tags</th>
                  <th class="w-[10%]">Status</th>
                  <th class="w-[10%]">Created</th>
                  <th class="w-[250px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each posts as post}
                  <tr>
                    <td>
                      <div class="font-medium flex items-center gap-2">
                        <iconify-icon 
                          icon={post.metadata?.icon || 'ph:pencil-simple'} 
                          width="20" 
                          height="20" 
                        />
                        {post.title}
                      </div>
                      <div class="text-sm opacity-70">{post.slug}</div>
                    </td>
                    <td class="whitespace-normal max-w-[300px] break-words">
                      {post.metadata?.description || ''}
                    </td>
                    <td>
                      {#if post.metadata?.tags?.length}
                        <div class="flex flex-wrap gap-1">
                          {#each post.metadata.tags as tag}
                            <span class="badge variant-soft">{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </td>
                    <td>
                      <span class="badge {post.published ? 'variant-filled-success' : 'variant-filled-warning'}">
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>{new Date(post.created_at).toLocaleDateString()}</td>
                    <td class="space-x-2">
                      <a 
                        href="/admin/posts/{post.id}" 
                        class="btn btn-sm variant-ghost"
                      >
                        Edit
                      </a>
                      <button 
                        class="btn btn-sm {post.published ? 'variant-ghost-warning' : 'variant-ghost-success'}" 
                        on:click={() => handlePublishToggle(post.id, post.published)}
                      >
                        {post.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button 
                        class="btn btn-sm variant-ghost-error" 
                        on:click={() => handleDelete(post.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .table-container {
    overflow-x: auto;
  }
  
  .table {
    width: 100%;
    table-layout: fixed;
  }

  .overflow-y-auto {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
</style>