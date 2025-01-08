<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = import.meta.env.VITE_API_URL;
    
    let isLoggedIn = false;

    onMount(() => {
        const token = localStorage.getItem('token');
        isLoggedIn = !!token;
    });

    async function login() {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'password'
                })
            });

            if (!response.ok) throw new Error('Login failed');
            
            const data = await response.json();
            localStorage.setItem('token', data.token);
            isLoggedIn = true;
            window.location.reload();
        } catch (error) {
            console.error('Login error:', error);
        }
    }

    function logout() {
        localStorage.removeItem('token');
        isLoggedIn = false;
        window.location.href = '/admin/login';  
    }
</script>

<div class="flex items-center">
    {#if isLoggedIn}
        <button on:click={logout} class="btn variant-filled-error">
            Logout
        </button>
    {:else}
        <a href="/admin/login" class="btn variant-filled-primary">
            Login
        </a>
    {/if}
</div>