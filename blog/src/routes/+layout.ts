import type { LayoutLoad } from './$types';
import type { SiteConfig, Post, PicsItem, Animation } from '$lib/stores';
import { API_BASE, API_TIMEOUT, API_VSN, getRequestInit, getDefaultHeaders } from '$lib/config';

async function fetchWithTimeout(url: string, options: RequestInit = {}, fetchFn: typeof fetch = fetch) {
    const controller = new AbortController();
    const id = setTimeout(() => {
        controller.abort();
        console.error('⏱️ Request timed out for:', url);
    }, API_TIMEOUT);

    try {
        const requestInit = getRequestInit({
            ...options,
            headers: {
                ...getDefaultHeaders(),
                ...(options.headers || {})
            }
        });

        const response = await fetchFn(url, {
            ...requestInit,
            signal: controller.signal
        });

        clearTimeout(id);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    } catch (err) {
        clearTimeout(id);
        console.error(`❌ Failed to fetch ${url}:`, err);
        throw err;
    }
}

export const load: LayoutLoad = async ({ fetch }) => {
    try {
        // Define API endpoints with version prefix
        const endpoints = [
            `${API_VSN}/site/config`,
            `${API_VSN}/posts?published=true`,
            `${API_VSN}/pics`,
            `${API_VSN}/animations`
        ];

        // Construct full URLs with API_BASE
        const urls = endpoints.map(endpoint => `${API_BASE}${endpoint}`);
        
        // Fetch all data in parallel
        const [siteConfigRes, postsRes, picsRes, animationsRes] = await Promise.all(
            urls.map(url => fetchWithTimeout(url, {}, fetch))
        );

        // Debug the posts data
        console.log('Raw posts response:', JSON.stringify(postsRes.posts?.slice(0, 2), null, 2));

        // Process animations data if it exists
        const animations = animationsRes?.animations?.map((animation: any) => ({
            ...animation,
            scale_factor: animation.scale_factor || 100
        })) || [];

        // Get the site config and ensure scale_factor is preserved
        const siteConfig = siteConfigRes.config || siteConfigRes;
        if (siteConfig.lottie_animation) {
            const currentAnimation = animations.find((a: { name: string; scale_factor: number }) => 
                a.name === siteConfig.lottie_animation
            );
            if (currentAnimation) {
                siteConfig.scale_factor = currentAnimation.scale_factor;
            } else if (siteConfig.scale_factor === undefined) {
                siteConfig.scale_factor = 100; // Set default if not found
            }
        } else if (siteConfig.scale_factor === undefined) {
            siteConfig.scale_factor = 100; // Set default if no animation
        }

        return {
            siteConfig,
            posts: postsRes.posts || [],
            animations,
            pics: picsRes
        };
    } catch (error) {
        console.error('❌ Error loading layout data:', error);
        throw error;
    }
}; 