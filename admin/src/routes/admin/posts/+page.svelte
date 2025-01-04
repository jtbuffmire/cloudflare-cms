<script lang="ts">
  import { onMount } from 'svelte';
  
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
      const response = await fetch('http://localhost:8787/api/posts?all=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('📝 Admin: Response status:', response.status);
      
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      console.log('📝 Admin: Posts data:', data);
      
      // Parse metadata for each post
      posts = data.posts.map(post => ({
        ...post,
        metadata: typeof post.metadata === 'string' 
          ? JSON.parse(post.metadata) 
          : post.metadata
      }));
      
      console.log('📝 Admin: Processed posts:', posts);
    } catch (err) {
      console.error('❌ Admin: Error fetching posts:', err);
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  });

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:8787/api/posts/${id}`, {
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
      const response = await fetch(`http://localhost:8787/api/posts/${id}`, {
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

<div class="container mx-auto p-4 space-y-4">
  <div class="flex justify-between items-center">
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
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Tags</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
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
              <td>
                {#if post.metadata?.description}
                  {truncate(post.metadata.description, 100)}
                {/if}
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
  {/if}
</div>