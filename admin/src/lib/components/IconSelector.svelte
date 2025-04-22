# svelte-ts
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ArticleIcon from '~icons/mdi/file-document';
  import CodeIcon from '~icons/mdi/code-braces';
  import BookIcon from '~icons/mdi/book-open-variant';
  import LightbulbIcon from '~icons/mdi/lightbulb';
  import BrainIcon from '~icons/mdi/brain';
  import FlaskIcon from '~icons/mdi/flask';
  import RobotIcon from '~icons/mdi/robot';
  import CloudIcon from '~icons/mdi/cloud';
  import BugIcon from '~icons/mdi/bug';
  import PaletteIcon from '~icons/mdi/palette';
  import MusicIcon from '~icons/mdi/music-note';
  import GamepadIcon from '~icons/mdi/gamepad-variant';
  import CoffeeIcon from '~icons/mdi/coffee';
  import CameraIcon from '~icons/mdi/camera';
  import StarIcon from '~icons/mdi/star';
  import SchoolIcon from '~icons/mdi/school';
  import TrophyIcon from '~icons/mdi/trophy';
  import HeartIcon from '~icons/mdi/heart';
  import EarthIcon from '~icons/mdi/earth';
  
  const dispatch = createEventDispatcher<{
    select: { icon: string };
  }>();

  const icons = [
    { component: ArticleIcon, name: 'mdi:file-document', label: 'Article' },
    { component: CodeIcon, name: 'mdi:code-braces', label: 'Code' },
    { component: BookIcon, name: 'mdi:book-open-variant', label: 'Book' },
    { component: LightbulbIcon, name: 'mdi:lightbulb', label: 'Idea' },
    { component: BrainIcon, name: 'mdi:brain', label: 'Brain' },
    { component: FlaskIcon, name: 'mdi:flask', label: 'Science' },
    { component: RobotIcon, name: 'mdi:robot', label: 'Robot' },
    { component: CloudIcon, name: 'mdi:cloud', label: 'Cloud' },
    { component: BugIcon, name: 'mdi:bug', label: 'Bug' },
    { component: PaletteIcon, name: 'mdi:palette', label: 'Art' },
    { component: MusicIcon, name: 'mdi:music-note', label: 'Music' },
    { component: GamepadIcon, name: 'mdi:gamepad-variant', label: 'Gaming' },
    { component: CoffeeIcon, name: 'mdi:coffee', label: 'Coffee' },
    { component: CameraIcon, name: 'mdi:camera', label: 'Photo' },
    { component: StarIcon, name: 'mdi:star', label: 'Star' },
    { component: SchoolIcon, name: 'mdi:school', label: 'Education' },
    { component: TrophyIcon, name: 'mdi:trophy', label: 'Achievement' },
    { component: HeartIcon, name: 'mdi:heart', label: 'Love' },
    { component: EarthIcon, name: 'mdi:earth', label: 'Earth' }
  ];

  function selectIcon(icon: string) {
    dispatch('select', { icon });
  }
</script>

<div class="grid grid-cols-5 gap-4 p-4">
  {#each icons as { component: Icon, name, label }}
    <button
      type="button"
      class="flex flex-col items-center justify-center p-2 hover:bg-gray-700 rounded transition-colors"
      on:click={() => selectIcon(name)}
    >
      <svelte:component this={Icon} class="text-2xl mb-1 text-gray-100" />
      <span class="text-xs text-gray-400">{label}</span>
    </button>
  {/each}
</div>

<style>
  :global(svg) {
    width: 1.5em;
    height: 1.5em;
  }
</style> 