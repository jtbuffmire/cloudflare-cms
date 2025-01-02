<script lang="ts">
  import { AppShell, AppBar } from '@skeletonlabs/skeleton';
  import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
  import LoginButton from '../components/LoginButton.svelte';
  import { storePopup } from '@skeletonlabs/skeleton';
  import '../app.postcss';

  storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
</script>

<AppShell>
  <svelte:fragment slot="header">
    <AppBar>
      <svelte:fragment slot="lead">
        <strong class="text-xl uppercase">Admin</strong>
      </svelte:fragment>
      <svelte:fragment slot="trail">
        <a class="btn btn-sm variant-ghost-surface" href="/admin">Dashboard</a>
        <a class="btn btn-sm variant-ghost-surface" href="/admin/posts">Posts</a>
        <a class="btn btn-sm variant-ghost-surface" href="/admin/media">Media</a>
        <LoginButton />
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  
  <slot />
</AppShell>