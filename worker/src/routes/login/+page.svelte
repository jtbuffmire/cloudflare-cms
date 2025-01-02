<script>
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { token } from '$lib/stores/auth';
  
    onMount(() => {
      // If no token, redirect to login
      if (!$token) {
        goto('/login');
      } else {
        goto('/admin');
      }
    });
  </script>
  
  <div>
    Redirecting...
  </div>