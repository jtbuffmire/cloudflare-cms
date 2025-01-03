<script lang="ts">
    import { onMount } from 'svelte';
    
    onMount(() => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
    }
    });
  </script>
  
  <div class="container mx-auto p-4">
    <h2 class="h2 mb-4">Let's do stuff</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <a class="card p-4" href="/admin/posts">
        <h3 class="h3">Posts</h3>
        <p>Manage your blog posts</p>
      </a>
      
      <a class="card p-4" href="/admin/media">
        <h3 class="h3">Pictures</h3>
        <p>Manage your pictures</p>
      </a>
    </div>
  </div>