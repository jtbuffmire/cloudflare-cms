<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { token } from '$lib/stores/auth';

  let username = '';
  let password = '';
  let error = '';

  async function handleSubmit() {
    try {
      const result = await api.login(username, password);
      token.set(result.token);
      goto('/admin');
    } catch (e) {
      error = 'Invalid credentials';
    }
  }
</script>

<div class="login">
  <h1>Login</h1>
  
  <form on:submit|preventDefault={handleSubmit}>
    {#if error}
      <div class="error">{error}</div>
    {/if}
    
    <div class="field">
      <label for="username">Username</label>
      <input
        id="username"
        type="text"
        bind:value={username}
        required
      />
    </div>
    
    <div class="field">
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        bind:value={password}
        required
      />
    </div>
    
    <button type="submit">Login</button>
  </form>
</div>

<style>
  .login {
    max-width: 400px;
    margin: 100px auto;
    padding: 20px;
  }
  
  .field {
    margin: 1rem 0;
  }
  
  .error {
    color: red;
    margin-bottom: 1rem;
  }
  
  input {
    width: 100%;
    padding: 8px;
  }
  
  button {
    width: 100%;
    padding: 10px;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #0052a3;
  }
</style>