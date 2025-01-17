import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { SiteConfig } from '$lib/types';

// Temporary mock data until we connect to D1
const mockConfig: SiteConfig = {
  id: 1,
  title: 'My Blog',
  description: 'A simple blog built with SvelteKit and Cloudflare',
  navigation: [
    {
      label: 'Home',
      url: '/',
      icon: 'home'
    },
    {
      label: 'Blog',
      url: '/blog',
      icon: 'article'
    }
  ],
  nav_links: {
    projects: false,
    blog: true,
    pics: true,
    about: true,
    contact: true
  },
  about_description: 'Welcome to my personal website! Here you can learn more about me and my work.',
  about_sections: [
    {
      title: 'Background',
      visible: true,
      content: 'I am a software developer with a passion for web development and cloud technologies.'
    },
    {
      title: 'Skills',
      visible: true,
      content: 'TypeScript, Svelte, Node.js, Cloudflare Workers, and more.'
    }
  ],
  contact_description: 'Feel free to reach out to me through any of these channels!',
  contact_email: 'hello@example.com',
  contact_email_visible: true,
  contact_discord_handle: 'example#1234',
  contact_discord_url: 'https://discord.com/users/123456789',
  contact_discord_visible: true,
  contact_instagram_handle: '@example',
  contact_instagram_url: 'https://instagram.com/example',
  contact_instagram_visible: true,
  pics_description: 'A collection of my favorite photos and memories.',
  lottie_animation: null,
  updated_at: new Date().toISOString()
};

export async function GET() {
  console.log('GET /api/site called');
  return json(mockConfig);
}

interface UpdateSiteRequest extends Partial<Omit<SiteConfig, 'id' | 'updated_at'>> {}

export async function PUT({ request }: RequestEvent) {
  console.log('PUT /api/site called');
  const updates = await request.json() as UpdateSiteRequest;
  
  // In a real app, validate the updates and save to database
  Object.assign(mockConfig, {
    ...updates,
    updated_at: new Date().toISOString()
  });
  
  return json(mockConfig);
} 