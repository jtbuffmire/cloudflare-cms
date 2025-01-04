<script lang="ts">
  import { getDrawerStore } from '@skeletonlabs/skeleton';
  
  export let value: string = 'ph:pencil-simple';
  export let onChange: (icon: string) => void;

  const commonIcons = [
    'ph:pencil-simple',
    'ph:code',
    'ph:book',
    'ph:lightbulb',
    'ph:heart',
    'ph:star',
    'ph:coffee',
    'ph:rocket',
    'ph:brain',
    'ph:gear',
    'ph:globe',
    'ph:music-note',
    'ph:camera',
    'ph:game-controller',
    'ph:paint-brush',
    'ph:terminal',
  ];

  let dropdownOpen = false;

  function handleSelect(icon: string) {
    value = icon;
    onChange(icon);
    dropdownOpen = false;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.icon-selector')) {
      dropdownOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="icon-selector relative">
  <button
    type="button"
    class="btn variant-ghost"
    on:click|stopPropagation={() => dropdownOpen = !dropdownOpen}
  >
    <iconify-icon {value} width="24" height="24" />
    <span class="ml-2">Select Icon</span>
  </button>

  {#if dropdownOpen}
    <div 
      class="card p-4 w-72 absolute top-full left-0 mt-1 z-50 bg-surface-100-800-token"
      role="menu"
      tabindex="0"
    >
      <div class="grid grid-cols-4 gap-2">
        {#each commonIcons as icon}
          <button
            type="button"
            class="btn variant-ghost aspect-square {value === icon ? 'variant-filled-primary' : ''}"
            on:click|stopPropagation={() => handleSelect(icon)}
            role="menuitem"
          >
            <iconify-icon icon={icon} width="24" height="24" />
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .icon-selector {
    display: inline-block;
  }
</style> 