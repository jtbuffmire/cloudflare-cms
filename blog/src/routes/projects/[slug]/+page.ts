import type { PageLoad } from './$types';
import type { Project } from '$lib/types';
import { error } from '@sveltejs/kit';
import { nameFromPath, importOgImage } from '$lib/js/posts';
import { API_VSN, API_BASE, getRequestInit } from '$lib/config';
import { dev } from '$app/environment';

export interface PageData {
    project: Project;
    meta?: {
        title: string;
        description: string;
        type: string;
        image?: string;
    };
}

export const load: PageLoad<PageData> = async ({ fetch, params }) => {
    // First try to get from API
    const response = await fetch(`${API_BASE}${API_VSN}/projects`, getRequestInit());
    const projects = await response.json() as Project[];
    const project = projects.find(p => p.published && p.slug === params.slug);
    
    if (project) {
        return {
            project,
            meta: {
                title: project.name,
                description: project.description,
                type: 'article',
                image: project.thumbnail
            }
        };
    }

    // If not found in API, try markdown files
    const modules = import.meta.glob<{ 
        metadata: { 
            name: string;
            description: string;
            published: boolean;
            images: string[];
            github?: string;
            website?: string;
        };
        default: {
            render: () => { html: string };
        };
    }>('/src/content/projects/*/*.md');

    let match: { path: string; resolver: () => Promise<any> } | undefined;

    for (const [path, resolver] of Object.entries(modules)) {
        if (nameFromPath(path) === params.slug) {
            match = { path, resolver };
            break;
        }
    }

    if (!match) {
        throw error(404, 'Project not found');
    }

    const post = await match.resolver();

    if (!post || (!post.metadata.published && !dev)) {
        throw error(404, 'Project not found');
    }

    const imagePath = match.path.split('/').slice(0, -1).join('/') + '/' + post.metadata.images[0];
    const image = await importOgImage(imagePath);

    // Convert markdown post to project format
    const markdownProject: Project = {
        name: post.metadata.name || '',
        description: post.metadata.description || '',
        thumbnail: image || '',
        images: post.metadata.images || [],
        github: post.metadata.github,
        website: post.metadata.website,
        content: post.default.render().html || '',
        published: post.metadata.published || false,
        slug: params.slug
    };

    return {
        project: markdownProject,
        meta: {
            title: post.metadata.name || '',
            description: post.metadata.description || '',
            type: 'article',
            image
        }
    };
}; 