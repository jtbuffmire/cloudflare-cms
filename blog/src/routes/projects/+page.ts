import type { PageLoad } from './$types';
import type { Project } from '$lib/types';
import { API_VSN, API_BASE, getRequestInit } from '$lib/config';

export interface PageData {
    projects: Project[];
}

export const load: PageLoad<PageData> = async ({ fetch }) => {
    const response = await fetch(`${API_BASE}${API_VSN}/projects`, getRequestInit());
    const projects = await response.json() as Project[];
    
    return {
        projects: projects.filter(p => p.published)
    };
}; 