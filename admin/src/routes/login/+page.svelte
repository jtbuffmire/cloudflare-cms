<script lang="ts">
  import { goto } from '$app/navigation';
  import { API_BASE, API_VSN, getRequestInit, getDomain } from '$lib/config';
  import { onMount } from 'svelte';
  import type { LoginResponse } from '$lib/types';

  const DOMAIN = getDomain();

  let email = '';
  let password = '';
  let error = '';

  onMount(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Optional: You could validate the token here with your API
      goto('/');
    }
  });

  async function handleSubmit() {
    try {
      // Create base64 encoded credentials
      const credentials = btoa(`${email}:${password}`);
      
      const response = await fetch(`${API_BASE}${API_VSN}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN,
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({ domain: DOMAIN }) // Only send domain, not credentials
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json() as LoginResponse;
      if (!data.token) {
        throw new Error('No token received');
      }
      localStorage.setItem('token', data.token);
      goto('/');
    } catch (err) {
      console.error('Login error:', err);
      error = err instanceof Error ? err.message : 'Login failed';
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
  <div class="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
    <div>
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
        Sign in to your account
      </h2>
    </div>
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
      <div class="-space-y-px rounded-md shadow-sm">
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            bind:value={email}
            class="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Email address"
          />
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            bind:value={password}
            class="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Password"
          />
        </div>
      </div>

      {#if error}
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div>
        <button
          type="submit"
          class="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Sign in
        </button>
      </div>
    </form>
  </div>
</div> 