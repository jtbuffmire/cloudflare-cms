import { siteConfig } from '$lib/stores';
import { get } from 'svelte/store';


export function load() {
    const config = get(siteConfig);
    return {
        meta: {
            title: config.title || 'refact0r',
            description: config.description || 'my website/portfolio/blog.'
        }
    };
}
