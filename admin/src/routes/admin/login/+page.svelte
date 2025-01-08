<script lang="ts">
    let username = '';
    let password = '';
    let error: string | null = null;

    const API_URL = import.meta.env.VITE_API_URL;

    async function handleSubmit() {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error('Invalid credentials');
            
            const data = await response.json();
            localStorage.setItem('token', data.token);
            window.location.href = '/admin';
        } catch (err) {
            error = err instanceof Error ? err.message : 'Login failed';
        }
    }
</script>

<div class="container h-full mx-auto flex justify-center items-center">
    <div class="card p-4 w-full max-w-md">
        <h2 class="h2 mb-4">Login</h2>
        
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            {#if error}
                <div class="alert variant-filled-error">{error}</div>
            {/if}

            <label class="label">
                <span>Username</span>
                <input
                    type="text"
                    bind:value={username}
                    class="input"
                    required
                />
            </label>

            <label class="label">
                <span>Password</span>
                <input
                    type="password"
                    bind:value={password}
                    class="input"
                    required
                />
            </label>

            <button type="submit" class="btn variant-filled-primary w-full">
                Login
            </button>
        </form>
    </div>
</div>