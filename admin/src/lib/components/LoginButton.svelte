<!-- Login Button Component -->
<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let isLoggedIn = false;
  
  function handleLogout() {
    localStorage.removeItem('token');
    goto('/login');
  }

  onMount(() => {
    isLoggedIn = !!localStorage.getItem('token');
  });
</script>

<Button 
  color="dark" 
  on:click={isLoggedIn ? handleLogout : () => goto('/login')}
>
  {isLoggedIn ? 'Logout' : 'Login'}
</Button> 