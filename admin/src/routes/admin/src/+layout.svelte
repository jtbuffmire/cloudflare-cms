<script lang="ts">
    import { AppShell, AppBar } from '@skeletonlabs/skeleton';
    import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
    import { storePopup } from '@skeletonlabs/skeleton';
    import '../app.postcss';
    storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
  </script>
  
  <AppShell>
    <svelte:fragment slot="header">
      <AppBar>
        <svelte:fragment slot="lead">
          <strong class="text-xl">CMS Admin</strong>
        </svelte:fragment>
        <svelte:fragment slot="trail">
          <a class="btn btn-sm variant-ghost" href="/admin">Dashboard</a>
          <a class="btn btn-sm variant-ghost" href="/admin/posts">Posts</a>
          <button class="btn btn-sm variant-filled-error" on:click={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}>Logout</button>
        </svelte:fragment>
      </AppBar>
    </svelte:fragment>
  
    <div class="container mx-auto p-4">
      <slot />
    </div>
  </AppShell>