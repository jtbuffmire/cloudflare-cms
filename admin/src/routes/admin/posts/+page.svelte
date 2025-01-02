<script lang="ts">
  import { onMount } from 'svelte';
  
  let posts: Array<{
    id: number;
    title: string;
    slug: string;
    content: string;
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
      const response = await fetch('http://localhost:8787/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      posts = data.posts; 
      // console.log('Loaded posts:', posts); 
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
    // console.error('Delete error:', error);
  }
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
            <th>Slug</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each posts as post}
            <tr>
              <td>{post.title}</td>
              <td>{post.slug}</td>
              <td>
                <span class="badge {post.published ? 'variant-filled-success' : 'variant-filled-warning'}">
                  {post.published ? 'Published' : 'Draft'}
                </span>
              </td>
              <td>{new Date(post.created_at).toLocaleDateString()}</td>
              <td class="space-x-2">
                <a href="/admin/posts/{post.id}" class="btn btn-sm variant-ghost">Edit</a>
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