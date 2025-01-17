<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import FileIcon from '~icons/mdi/file-document';
  import ImageIcon from '~icons/mdi/image';
  import AnimationIcon from '~icons/mdi/animation';
  import CogIcon from '~icons/mdi/cog';
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-white mb-8">Dashboard</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <a href="/posts">
      <Card class="bg-gray-800 hover:bg-gray-700 transition-colors">
        <div class="flex items-center gap-4">
          <FileIcon class="text-4xl text-blue-500" />
          <div>
            <h2 class="text-xl font-bold text-white">Posts</h2>
            <p class="text-gray-400">Manage blog posts</p>
          </div>
        </div>
      </Card>
    </a>

    <a href="/pics">
      <Card class="bg-gray-800 hover:bg-gray-700 transition-colors">
        <div class="flex items-center gap-4">
          <ImageIcon class="text-4xl text-green-500" />
          <div>
            <h2 class="text-xl font-bold text-white">Pics</h2>
            <p class="text-gray-400">Manage pictures</p>
          </div>
        </div>
      </Card>
    </a>

    <a href="/animations">
      <Card class="bg-gray-800 hover:bg-gray-700 transition-colors">
        <div class="flex items-center gap-4">
          <AnimationIcon class="text-4xl text-purple-500" />
          <div>
            <h2 class="text-xl font-bold text-white">Animations</h2>
            <p class="text-gray-400">Manage animations</p>
          </div>
        </div>
      </Card>
    </a>

    <a href="/site">
      <Card class="bg-gray-800 hover:bg-gray-700 transition-colors">
        <div class="flex items-center gap-4">
          <CogIcon class="text-4xl text-yellow-500" />
          <div>
            <h2 class="text-xl font-bold text-white">Site Config</h2>
            <p class="text-gray-400">Manage site settings</p>
          </div>
        </div>
      </Card>
    </a>
  </div>
</div>

<style>
  :global(svg) {
    width: 2em;
    height: 2em;
  }
</style>
