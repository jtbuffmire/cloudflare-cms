<script lang="ts">
    let title = '';
    let slug = '';
    let content = '';
    let loading = false;
    let error: string | null = null;
    let success: boolean = false;
    let newPostUrl: string = '';

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
  
    async function handleSubmit() {
      loading = true;
      error = null;
      success = false;
      const token = localStorage.getItem('token');
  
      try {
        const response = await fetch('http://localhost:8787/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            slug,
            content
          })
        });
  
        if (!response.ok) {
            throw new Error('Failed to create post');
        }

        const post = await response.json();
        success = true;
        newPostUrl = `http://localhost:8788/blog/${slug}`; // Adjust URL based on your blog's domain
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/admin/posts';
        }, 2000);

      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to create post';
      } finally {
        loading = false;
      }
    }
</script>
  
  <div class="container mx-auto p-4 space-y-4">
    <h2 class="h2">New Post</h2>
  
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      {#if error}
        <div class="alert variant-filled-error">{error}</div>
      {/if}
  
      <label class="label">
        <span>Title</span>
        <input
          type="text"
          bind:value={title}
          class="input"
          required
        />
      </label>

      <label class="label">
        <span>Slug</span>
        <input
            type="text"
            bind:value={slug}
            class="input"
            pattern="[a-z0-9\-]+"
            title="Lowercase letters, numbers, and hyphens only"
            required
        />
        <span class="text-sm opacity-70">URL-friendly version of the title</span>
      </label>
  
      <label class="label">
        <span>Content</span>
        <textarea
          bind:value={content}
          class="textarea"
          rows="10"
          required
        ></textarea>
      </label>
  
      <div class="flex justify-end space-x-2">
        <a href="/admin/posts" class="btn variant-ghost">Cancel</a>
        <button type="submit" class="btn variant-filled-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </div>
    </form>
  </div>