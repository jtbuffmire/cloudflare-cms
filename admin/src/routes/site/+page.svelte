<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Button, Input, Textarea, Alert, Toggle, Modal, Label } from 'flowbite-svelte';
  import { siteConfig } from '$lib/stores';
  import type { SiteConfig } from '$lib/types';
  import { API_BASE, API_VSN, getDomain } from '$lib/config';
  import { browser } from '$app/environment';
  // Needed for real-time updates through StoreManager
  import { websocket } from '$lib/websocket';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AnimationSelector from '$lib/components/AnimationSelector.svelte';
  import 'iconify-icon';

  let loading = false;
  let error = '';
  let success = '';

  const DOMAIN = getDomain();

  // Animation state
  let showAnimationModal = false;
  let showScaleWarning = false;
  let newAnimationName = '';
  let animationFile: File | null = null;
  let availableAnimations: Array<{ name: string; scale_factor: number; r2_key: string }> = [];
  const DEFAULT_ANIMATION = 'default-pin';

  // Initialize with empty values
  let localConfig: SiteConfig = $siteConfig || {
    domain: '',
    title: '',
    description: '',
    nav_links: {
      projects: false,
      blog: true,
      pics: false,
      about: true,
      contact: true
    },
    about_sections: [],
    about_description: '',
    contact_description: '',
    contact_email: '',
    contact_discord_handle: '',
    contact_discord_url: '',
    contact_instagram_handle: '',
    contact_instagram_url: '',
    contact_email_visible: false,
    contact_discord_visible: false,
    contact_instagram_visible: false,
    pics_description: '',
    lottie_animation: '',
    lottie_animation_r2_key: '',
    scale_factor: $siteConfig?.scale_factor || 100,
    web3forms_key: '',
    show_email: false,
    show_discord: false,
    show_instagram: false
  };

  // Subscribe to store changes
  let isLocalUpdate = false;
  $: {
    if ($siteConfig && !isLocalUpdate) {
      localConfig = {
        ...$siteConfig,
        nav_links: $siteConfig.nav_links || {
          projects: false,
          blog: true,
          pics: false,
          about: true,
          contact: true
        },
        scale_factor: $siteConfig.scale_factor || 100
      };
    }
  }

  const STORAGE_KEY = 'site_config_draft';

  function saveDraft() {
    if (browser && localConfig) {
      const draftData = {
        ...localConfig,
        about_sections: Array.isArray(localConfig.about_sections) 
          ? localConfig.about_sections 
          : []
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      console.log('Saved draft about_sections:', draftData.about_sections);
    }
  }

  function loadDraft(): boolean {
    if (browser) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge the draft with existing config, preserving all fields
          localConfig = {
            ...localConfig,  // Keep existing defaults
            ...parsed,       // Apply saved changes
            nav_links: {
              ...localConfig.nav_links,
              ...parsed.nav_links
            },
            scale_factor: parsed.scale_factor || localConfig.scale_factor || 100,
            about_sections: parsed.about_sections || localConfig.about_sections || [],
          };
          return true;
        } catch (e) {
          console.error('Error loading draft:', e);
        }
      }
    }
    return false;
  }

  function clearDraft() {
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function handleSubmit(event?: Event) {
    event?.preventDefault();
    loading = true;
    error = '';
    success = '';
    isLocalUpdate = true;  // Set flag before update

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/site/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN
        },
        body: JSON.stringify(localConfig)
      });

      if (!response.ok) {
        throw new Error('Failed to update site configuration');
      }

      // Clear the draft after successful save
      clearDraft();
      success = 'Configuration updated successfully';
      error = '';
    } catch (err) {
      console.error('Error updating site config:', err);
      error = err instanceof Error ? err.message : 'Failed to update site configuration';
      success = '';
    } finally {
      loading = false;
      isLocalUpdate = false;  // Reset flag after update
    }
  }

  async function uploadAnimation() {
    if (!animationFile || !newAnimationName) return;

    // More permissive file type checking
    if (!animationFile.name.endsWith('.json')) {
      error = 'Please upload a valid Lottie animation file (.json)';
      return;
    }

    try {
      // Validate file content
      const fileContent = await animationFile.text();
      try {
        const parsed = JSON.parse(fileContent);
        // More specific Lottie validation
        if (!parsed.v || !parsed.assets || !parsed.layers || typeof parsed.fr !== 'number') {
          error = 'Invalid Lottie animation file format';
          return;
        }
      } catch {
        error = 'Invalid JSON file format';
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const formData = new FormData();
      formData.append('file', animationFile);
      formData.append('name', newAnimationName);
      formData.append('domain', DOMAIN);

      const response = await fetch(`${API_BASE}${API_VSN}/animations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to upload animation');
      }

      showAnimationModal = false;
      animationFile = null;
      newAnimationName = '';
      
      // Refresh animations list
      await fetchAnimations();
      
      // Update success message
      success = 'Animation uploaded successfully';
      error = '';
    } catch (err) {
      console.error('Error uploading animation:', err);
      error = err instanceof Error ? err.message : 'Failed to upload animation';
      success = '';
    }
  }

  async function fetchAnimations() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/animations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch animations');
      }

      const data = await response.json() as { animations: Array<{ name: string; scale_factor: number; r2_key: string }> };
      availableAnimations = data.animations || [];

      // Update scale factor if this is the current animation
      const currentAnim = availableAnimations.find(a => a.name === localConfig.lottie_animation);
      if (currentAnim && typeof currentAnim.scale_factor === 'number') {
        isLocalUpdate = true;
        localConfig.scale_factor = currentAnim.scale_factor;
        // Ensure the server has the correct scale factor
        await handleScaleUpdate({ 
          target: { 
            value: currentAnim.scale_factor.toString() 
          } 
        } as unknown as Event);
        isLocalUpdate = false;
      }
    } catch (err) {
      console.error('Error fetching animations:', err);
      error = err instanceof Error ? err.message : 'Failed to fetch animations';
    }
  }

  async function handleAnimationSelect(animationName: string) {
    isLocalUpdate = true;  // Set flag before update
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            error = 'Not authenticated';
            return;
        }

        // For default animation, set default values
        if (animationName === DEFAULT_ANIMATION) {
            localConfig = {
                ...localConfig,
                lottie_animation: DEFAULT_ANIMATION,
                lottie_animation_r2_key: '',
                scale_factor: 100
            };
        } else {
            // Fetch the animation details to get the R2 key
            const animResponse = await fetch(`${API_BASE}${API_VSN}/animations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Site-Domain': DOMAIN
                }
            });

            if (!animResponse.ok) {
                throw new Error('Failed to fetch animation details');
            }

            const animData = await animResponse.json() as { animations: Array<{ name: string, r2_key: string, scale_factor: number }> };
            const animation = animData.animations.find(a => a.name === animationName);
            if (!animation) {
                throw new Error('Animation not found');
            }

            localConfig = {
                ...localConfig,
                lottie_animation: animation.name,
                lottie_animation_r2_key: animation.r2_key,
                scale_factor: animation.scale_factor || 100
            };
        }

        // Save changes
        await handleSubmit();
    } catch (err) {
        console.error('Error selecting animation:', err);
        error = err instanceof Error ? err.message : 'Failed to select animation';
    } finally {
        isLocalUpdate = false;  // Reset flag after update
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      animationFile = input.files[0];
    }
  }

  // Add functions for about sections
  function addNewSection() {
    localConfig.about_sections = [
      ...localConfig.about_sections,
      { title: '', visible: true, content: '' }
    ];
  }

  function removeLastSection() {
    if (localConfig.about_sections.length > 0) {
      localConfig.about_sections = localConfig.about_sections.slice(0, -1);
    }
  }

  // Handle nav link toggle with real-time update
  async function toggleNavLink(key: string) {
    // Update local state first
    localConfig.nav_links[key as keyof typeof localConfig.nav_links] = !localConfig.nav_links[key as keyof typeof localConfig.nav_links];
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/site/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN
        },
        body: JSON.stringify({
          domain: DOMAIN,
          nav_links: localConfig.nav_links
        })
      });

      if (!response.ok) {
        // Revert local state if update fails
        localConfig.nav_links[key as keyof typeof localConfig.nav_links] = !localConfig.nav_links[key as keyof typeof localConfig.nav_links];
        throw new Error('Failed to update navigation link');
      }

      const data = await response.json() as { config?: { nav_links: Record<string, boolean> } };
      if (data?.config?.nav_links) {
        // Only update nav_links in the store
        siteConfig.update(config => {
          if (config) {
            return {
              ...config,
              nav_links: data.config!.nav_links as {
                projects: boolean;
                blog: boolean;
                pics: boolean;
                about: boolean;
                contact: boolean;
              }
            };
          }
          return config;
        });
      }
    } catch (err) {
      console.error('Error updating nav link:', err);
      error = err instanceof Error ? err.message : 'Failed to update navigation link';
    }
  }

  async function fetchSiteConfig() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      const response = await fetch(`${API_BASE}${API_VSN}/site/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch site configuration');
      }

      const data = await response.json();
      
      // First initialize with database values
      // Ensure about_sections is properly initialized from data
      localConfig = {
        ...data,
        nav_links: data.nav_links || {
          projects: false,
          blog: true,
          pics: false,
          about: true,
          contact: true
        },
        scale_factor: data.scale_factor || 100,
        about_sections: Array.isArray(data.about_sections) ? data.about_sections : [],
        about_description: data.about_description || '',
        contact_description: data.contact_description || '',
        contact_email: data.contact_email || '',
        contact_discord_handle: data.contact_discord_handle || '',
        contact_instagram_handle: data.contact_instagram_handle || '',
        contact_instagram_url: data.contact_instagram_url || '',
        web3forms_key: data.web3forms_key || '',
        show_email: data.show_email ?? false,
        show_discord: data.show_discord ?? false,
        show_instagram: data.show_instagram ?? false
      };

      // Log the initial state for debugging
      console.log('Initial data from API:', data.about_sections);
      console.log('Initial localConfig:', localConfig.about_sections);

      // Update the store with the fetched data
      siteConfig.update(config => ({
        ...config,
        ...localConfig
      }));

      // Then check for any draft changes
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const draftData = JSON.parse(saved);
          // Ensure about_sections from draft is properly handled
          const draftAboutSections = Array.isArray(draftData.about_sections) 
            ? draftData.about_sections 
            : localConfig.about_sections;

          // Merge draft data while preserving existing values
          localConfig = {
            ...localConfig,
            ...draftData,
            nav_links: {
              ...localConfig.nav_links,
              ...draftData.nav_links
            },
            // Ensure about_sections is always an array
            about_sections: draftAboutSections,
            scale_factor: draftData.scale_factor || localConfig.scale_factor
          };

          // Log the state after draft merge for debugging
          console.log('Draft data loaded:', draftData.about_sections);
          console.log('Final localConfig:', localConfig.about_sections);
        } catch (e) {
          console.error('Error loading draft:', e);
        }
      }
      
    } catch (err) {
      console.error('Error fetching site config:', err);
      error = err instanceof Error ? err.message : 'Failed to fetch site configuration';
    }
  }

  async function removeAnimation() {
    isLocalUpdate = true;  // Set flag before update
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            error = 'Not authenticated';
            return;
        }

        // Remove animation from site config first
        localConfig = {
            ...localConfig,
            lottie_animation: '',
            lottie_animation_r2_key: '',
            scale_factor: 100
        };

        // Save changes
        await handleSubmit();
        
        success = 'Animation removed successfully';
        error = '';
    } catch (err) {
        console.error('Error removing animation:', err);
        error = err instanceof Error ? err.message : 'Failed to remove animation';
        success = '';
    } finally {
        isLocalUpdate = false;  // Reset flag after update
    }
  }

  async function handleScaleUpdate(event: Event) {
    const input = event.target as HTMLInputElement;
    const scale_factor = Math.max(100, Math.min(500, parseInt(input.value) || 100));
    
    isLocalUpdate = true;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        error = 'Not authenticated';
        return;
      }

      // Update both scale endpoint and full config to ensure consistency
      const scaleResponse = await fetch(`${API_BASE}${API_VSN}/site/config/animation-scale`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Site-Domain': DOMAIN
        },
        body: JSON.stringify({ scale_factor })
      });

      if (!scaleResponse.ok) {
        throw new Error('Failed to update animation scale');
      }

      // Update local state
      localConfig = {
        ...localConfig,
        scale_factor
      };

      // Update store to ensure all components get the update
      siteConfig.update(config => {
        if (config) {
          return {
            ...config,
            scale_factor
          };
        }
        return config;
      });
      
    } catch (err) {
      console.error('Error updating animation scale:', err);
      error = err instanceof Error ? err.message : 'Failed to update animation scale';
      // Revert to previous value on error
      localConfig = { ...localConfig };
    } finally {
      isLocalUpdate = false;
    }
  }

  async function updateBasicInfo() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}${API_VSN}/site/basic-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        },
        body: JSON.stringify({
          title: localConfig.title,
          description: localConfig.description
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update basic info: ${response.statusText}`);
      }

      const result = await response.json();
      // console.log('Basic info updated:', result);
    } catch (error) {
      console.error('Error updating basic info:', error);
    }
  }

  function handleScaleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (localConfig.lottie_animation === DEFAULT_ANIMATION) {
      target.value = '100';
      showScaleWarning = true;
      setTimeout(() => {
        showScaleWarning = false;
      }, 2000);
      return;
    }
    localConfig.scale_factor = parseInt(target.value);
  }

  // Close warning when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.scale-warning')) {
      showScaleWarning = false;
    }
  }

  // Add function to handle unauthorized access
  function handleUnauthorized() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  // Add function to check if we're on admin subdomain
  function isAdminSubdomain(): boolean {
    if (!browser) return false;
    return window.location.hostname.startsWith('admin.');
  }

  // Replace the existing onMount with this version
  onMount(() => {
    if (isAdminSubdomain()) {
      const token = localStorage.getItem('token');
      if (!token) {
        handleUnauthorized();
        return;
      }

      // Verify token first
      fetch(`${API_BASE}${API_VSN}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Site-Domain': DOMAIN
        }
      }).then(response => {
        if (!response.ok) {
          handleUnauthorized();
          return;
        }
        fetchSiteConfig();
        fetchAnimations();
      }).catch(() => {
        handleUnauthorized();
      });
    } else {
      // Not on admin subdomain, just load data
      fetchSiteConfig();
      fetchAnimations();
    }

    if (browser) {
      document.addEventListener('click', handleClickOutside);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
    }
  });

  // Set projects to false in initial config
  $: if (localConfig?.nav_links) {
      localConfig.nav_links.projects = false;
  }

  // Add a watcher to save draft when localConfig changes
  $: if (browser && localConfig) {
    saveDraft();
  }

  // Add a watcher specifically for about_sections
  $: if (browser && localConfig?.about_sections) {
    console.log('about_sections changed:', localConfig.about_sections);
    saveDraft();
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6 text-white">Site Configuration</h1>

  {#if error}
    <Alert color="red" class="mb-4">{error}</Alert>
  {/if}

  {#if success}
    <Alert color="green" class="mb-4">{success}</Alert>
  {/if}

  <form on:submit={handleSubmit} class="space-y-6">
    <div class="border p-4 rounded-lg">
      <h2 class="text-xl font-bold mb-4">Basic Information</h2>
      <p class="text-sm text-gray-400 mb-4">Changes save automatically when you click outside the field</p>
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="site-title">
          Site Title
        </label>
        <input
          id="site-title"
          type="text"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          bind:value={localConfig.title}
          on:blur={updateBasicInfo}
        />
      </div>
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="site-description">
          Site Description
        </label>
        <textarea
          id="site-description"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          bind:value={localConfig.description}
          on:blur={updateBasicInfo}
        ></textarea>
      </div>
    </div>

    <div class="border p-4 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">Navigation Links</h2>
      <div class="grid grid-cols-2 gap-4">
        {#each Object.entries(localConfig.nav_links) as [key, value]}
          {@const isProjects = key === 'projects'}
          <Button
            color={value ? 'green' : 'dark'}
            class="w-full flex justify-between items-center {isProjects ? 'opacity-50' : ''}"
            disabled={isProjects}
            on:click={() => toggleNavLink(key)}
          >
            <span class="capitalize">{key}</span>
            <span class="flex items-center gap-2">
              <iconify-icon icon={value ? "mdi:check-circle" : "mdi:radio-button-unchecked"}></iconify-icon>
            </span>
          </Button>
        {/each}
      </div>
    </div>

    <div class="border p-4 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">Animations</h2>
      <div class="space-y-4">
        <div class="flex flex-col gap-4">
            <h3 class="text-lg font-semibold">Current Animation: {localConfig.lottie_animation || 'None'}</h3>

            <div class="flex flex-col gap-2">
                <div class="flex justify-between">
                    <Label for="animation-scale" class="text-sm font-medium">Animation Scale</Label>
                    <span class="text-sm font-medium">{localConfig.scale_factor || 100}%</span>
                </div>
                <input
                    type="range"
                    id="animation-scale"
                    min="100"
                    max="500"
                    step="1"
                    class="w-full"
                    value={localConfig.scale_factor}
                    on:input={handleScaleChange}
                    on:change={handleScaleUpdate}
                    disabled={localConfig.lottie_animation === DEFAULT_ANIMATION}
                />
            </div>

            <div class="flex gap-2">
                <Button color="blue" on:click={() => showAnimationModal = true}>
                    <iconify-icon icon="mdi:animation" class="mr-2"></iconify-icon>
                    Select Animation
                </Button>
                {#if localConfig.lottie_animation && localConfig.lottie_animation !== DEFAULT_ANIMATION}
                    <Button color="red" on:click={removeAnimation}>Remove Animation</Button>
                {/if}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Default Animation -->
          <Button 
            color={!localConfig.lottie_animation || localConfig.lottie_animation === DEFAULT_ANIMATION ? 'green' : 'dark'}
            class="w-full flex items-center justify-between"
            on:click={() => handleAnimationSelect(DEFAULT_ANIMATION)}
          >
            <div class="flex items-center">
              <iconify-icon icon="mdi:animation" class="mr-2"></iconify-icon>
              <span>{DEFAULT_ANIMATION} (default)</span>
            </div>
            {#if !localConfig.lottie_animation || localConfig.lottie_animation === DEFAULT_ANIMATION}
              <iconify-icon icon="mdi:check-circle"></iconify-icon>
            {/if}
          </Button>
          
          <!-- User Uploaded Animations -->
          {#each availableAnimations as animation}
            <Button 
              color={localConfig.lottie_animation === animation.name ? 'green' : 'dark'}
              class="w-full flex items-center justify-between"
              on:click={() => handleAnimationSelect(animation.name)}
            >
              <div class="flex items-center">
                <iconify-icon icon="mdi:animation" class="mr-2"></iconify-icon>
                <span>{animation.name}</span>
              </div>
              {#if localConfig.lottie_animation === animation.name}
                <iconify-icon icon="mdi:check-circle"></iconify-icon>
              {/if}
            </Button>
          {/each}
        </div>
      </div>
    </div>

    <!-- About Section -->
    <div class="border p-4 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">About Page</h2>
      <p class="text-sm text-gray-400 mb-4">Changes save automatically when you click outside the field</p>
      
      <!-- About Page Description -->
      <div class="space-y-4 mb-6">
        <label for="about_description" class="block">About Page Description</label>
        <Textarea
          id="about_description"
          bind:value={localConfig.about_description}
          placeholder="Main description for the About page..."
          rows={4}
          on:blur={() => handleSubmit()}
        />
      </div>

      <!-- About sections -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium">About Page Sections</h3>
        {#if Array.isArray(localConfig.about_sections)}
          {#each localConfig.about_sections as section, i}
            <div class="border p-4 rounded-lg space-y-4">
              <div class="flex items-center justify-between">
                <Input
                  type="text"
                  bind:value={section.title}
                  placeholder="Section Title"
                  class="flex-grow mr-4"
                  on:blur={() => handleSubmit()}
                />
                <Toggle bind:checked={section.visible} on:change={() => handleSubmit()} />
              </div>
              <Textarea
                bind:value={section.content}
                placeholder="Section Content"
                rows={4}
                on:blur={() => handleSubmit()}
              />
            </div>
          {/each}
        {/if}
        
        <div class="flex gap-4 items-center">
          <Button color="blue" on:click={addNewSection}>
            <iconify-icon icon="mdi:plus" class="mr-2"></iconify-icon>
            Add Section
          </Button>
          <Button color="red" on:click={removeLastSection}>
            <iconify-icon icon="mdi:minus" class="mr-2"></iconify-icon>
            Remove Last Section
          </Button>
        </div>
      </div>
    </div>

    <!-- Contact Section -->
    <div class="border p-4 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">Contact Information</h2>
      <p class="text-sm text-gray-400 mb-4">Changes save automatically when you click outside the field</p>
      
      <!-- Contact Description -->
      <div class="space-y-4 mb-6">
        <label for="contact_description" class="block">Contact Description</label>
        <Textarea
          id="contact_description"
          bind:value={localConfig.contact_description}
          placeholder="Main description for the Contact page..."
          rows={3}
          on:blur={() => handleSubmit()}
        />
      </div>

      <!-- Web3Forms API Key -->
      <div class="space-y-4 mb-6">
        <label for="web3forms_key" class="block">Web3Forms API Key</label>
        <div class="space-y-2">
          <Input
            id="web3forms_key"
            bind:value={localConfig.web3forms_key}
            placeholder="Enter your Web3Forms API key"
            on:blur={() => handleSubmit()}
          />
          <p class="text-sm text-gray-500">Get your API key at <a href="https://web3forms.com/" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">web3forms.com</a></p>
        </div>
      </div>

      <!-- Email -->
      <div class="space-y-4 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex-grow mr-4">
            <label for="contact_email" class="block mb-2">Email Address</label>
            <Input
              id="contact_email"
              bind:value={localConfig.contact_email}
              placeholder="your@email.com"
              on:blur={() => handleSubmit()}
            />
          </div>
          <div class="flex items-center">
            <span class="mr-2">Show Email</span>
            <Toggle bind:checked={localConfig.show_email} on:change={() => handleSubmit()} />
          </div>
        </div>
      </div>

      <!-- Discord -->
      <div class="space-y-4 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex-grow mr-4">
            <label for="contact_discord" class="block mb-2">Discord Handle</label>
            <Input
              id="contact_discord"
              bind:value={localConfig.contact_discord_handle}
              placeholder="username#1234"
              on:blur={() => handleSubmit()}
            />
          </div>
          <div class="flex items-center">
            <span class="mr-2">Show Discord</span>
            <Toggle bind:checked={localConfig.show_discord} on:change={() => handleSubmit()} />
          </div>
        </div>
      </div>

      <!-- Instagram -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex-grow mr-4">
            <label for="contact_instagram" class="block mb-2">Instagram Handle</label>
            <Input
              id="contact_instagram"
              bind:value={localConfig.contact_instagram_handle}
              placeholder="@username"
              on:blur={() => handleSubmit()}
            />
          </div>
          <div class="flex items-center">
            <span class="mr-2">Show Instagram</span>
            <Toggle bind:checked={localConfig.show_instagram} on:change={() => handleSubmit()} />
          </div>
        </div>
        <div>
          <label for="contact_instagram_url" class="block mb-2">Instagram URL</label>
          <Input
            id="contact_instagram_url"
            bind:value={localConfig.contact_instagram_url}
            placeholder="https://instagram.com/username"
            on:blur={() => handleSubmit()}
          />
        </div>
      </div>
    </div>

    <!-- Pics Section -->
    <div class="border p-4 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">Pictures Page</h2>
      <p class="text-sm text-gray-400 mb-4">Changes save automatically when you click outside the field</p>
      
      <!-- Pics Description -->
      <div class="space-y-4">
        <label for="pics_description" class="block">Pictures Page Description</label>
        <Textarea
          id="pics_description"
          bind:value={localConfig.pics_description}
          placeholder="Description for your pictures gallery..."
          rows={3}
          on:blur={() => handleSubmit()}
        />
      </div>
    </div>

  </form>
</div>

<!-- Animation Upload Modal -->
<Modal bind:open={showAnimationModal} size="md">
  <div class="space-y-4">
    <h3 class="text-xl font-bold">Upload New Animation</h3>
    <div>
      <label for="animationName" class="block mb-2">Animation Name</label>
      <Input id="animationName" bind:value={newAnimationName} placeholder="Enter animation name" />
    </div>
    <div>
      <label for="animationFile" class="block mb-2">Animation File (Lottie JSON only)</label>
      <Input 
        id="animationFile" 
        type="file" 
        on:change={handleFileSelect} 
        accept=".json"
      />
      <p class="text-sm text-gray-500 mt-1">Only Lottie animation files (.json) are supported</p>
    </div>
    <div class="flex justify-end gap-4">
      <Button color="dark" on:click={() => showAnimationModal = false}>Cancel</Button>
      <Button color="blue" on:click={uploadAnimation}>Upload</Button>
    </div>
  </div>
</Modal> 

{#if showScaleWarning}
  <div class="scale-warning fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white p-6 rounded-lg shadow-xl z-50 border border-gray-600">
    <p class="text-lg">Scale factor cannot be adjusted for the default animation</p>
  </div>
{/if}

<style>
  :global(iconify-icon) {
    font-size: 1.2em;
    vertical-align: middle;
  }

  .scale-warning {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
</style> 