import { CFRequest, CFResponse, Env } from '../types';
import { handleError } from '../lib/api';
import { getDB } from '../lib/database';
import { broadcastUpdate } from '../lib/websocket';
import { createResponse } from '../lib/api';

interface Project {
    id?: number;
    domain?: string;
    name: string;
    description: string;
    thumbnail?: string | null;
    images: string[];
    github?: string;
    website?: string;
    content: string;
    published: boolean;
    slug: string;
    created_at?: string;
}

export async function handleGetProjects(request: Request, env: Env): Promise<Response> {
    try {
        const db = getDB(env);
        const domain = request.headers.get('X-Site-Domain') || 'localhost';
        
        console.log('GET - Domain value:', domain);
        console.log('GET - Domain type:', typeof domain);
        
        const stmt = db.prepare('SELECT * FROM projects WHERE domain = ? ORDER BY created_at DESC');
        console.log('GET - Statement:', stmt);
        
        const bound = stmt.bind(domain);
        console.log('GET - Bound statement:', bound);
        
        const { results: projects } = await bound.all();

        return new Response(JSON.stringify(projects), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('GET Projects error:', error);
        return handleError(error);
    }
}

export async function handleGetProject(request: Request, env: Env, id: string): Promise<Response> {
    try {
        const db = getDB(env);
        const domain = request.headers.get('X-Site-Domain') || 'localhost';

        const project = await db.prepare(
            'SELECT * FROM projects WHERE domain = ? AND id = ?'
        ).bind(domain, id).first();

        if (!project) {
            // @ts-ignore - Response type mismatch, needs future fix
            return createResponse('Project not found', { status: 404 });
        }

        return new Response(JSON.stringify(project), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function handleCreateProject(request: CFRequest, env: Env, ctx: ExecutionContext, params: Record<string, string>): Promise<CFResponse> {
    try {
        const db = getDB(env);
        const domain = request.headers.get('X-Site-Domain') || 'localhost';
        const projectData = await request.json() as Project;

        // Debug log the incoming data
        console.log('Creating project with data:', {
            domain,
            name: projectData.name,
            description: projectData.description,
            thumbnail: projectData.thumbnail,
            images: projectData.images,
            github: projectData.github,
            website: projectData.website,
            content: projectData.content,
            published: projectData.published,
            slug: projectData.slug
        });

        // Validate required fields
        if (!projectData.name || !projectData.description || !projectData.slug) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: name, description, and slug are required'
            }), {
                status: 400,
                headers: new Headers({ 'Content-Type': 'application/json' })
            }) as unknown as CFResponse;
        }

        // Check if project with same slug already exists for this domain
        const existingProject = await db.prepare(
            'SELECT id FROM projects WHERE domain = ? AND slug = ?'
        ).bind(domain, projectData.slug).first();

        if (existingProject) {
            return new Response(JSON.stringify({
                error: 'A project with this slug already exists'
            }), {
                status: 400,
                headers: new Headers({ 'Content-Type': 'application/json' })
            }) as unknown as CFResponse;
        }

        // If thumbnail is provided, verify it exists in pictures table
        if (projectData.thumbnail) {
            const pic = await db.prepare(
                'SELECT r2_key FROM pics WHERE domain = ? AND r2_key = ?'
            ).bind(domain, projectData.thumbnail).first();

            if (!pic) {
                return new Response(JSON.stringify({
                    error: 'Thumbnail picture not found'
                }), {
                    status: 400,
                    headers: new Headers({ 'Content-Type': 'application/json' })
                }) as unknown as CFResponse;
            }
        }

        console.log('CREATE - About to prepare statement with values:', {
            domain,
            name: projectData.name,
            description: projectData.description,
            thumbnail: projectData.thumbnail || null,
            images: JSON.stringify(projectData.images || []),
            github: projectData.github || null,
            website: projectData.website || null,
            content: projectData.content || '',
            published: projectData.published || false,
            slug: projectData.slug
        });

        console.log('CREATE - Binding values with types:', {
            domain: { value: domain, type: typeof domain },
            name: { value: projectData.name, type: typeof projectData.name },
            description: { value: projectData.description, type: typeof projectData.description },
            thumbnail: { value: projectData.thumbnail || null, type: typeof (projectData.thumbnail || null) },
            images: { value: JSON.stringify(projectData.images || []), type: typeof JSON.stringify(projectData.images || []) },
            github: { value: projectData.github || null, type: typeof (projectData.github || null) },
            website: { value: projectData.website || null, type: typeof (projectData.website || null) },
            content: { value: projectData.content || '', type: typeof (projectData.content || '') },
            published: { value: projectData.published || false, type: typeof (projectData.published || false) },
            slug: { value: projectData.slug, type: typeof projectData.slug }
        });

        const stmt = await db.prepare(
            projectData.thumbnail === undefined ?
            `INSERT INTO projects (
                domain, name, description, images,
                github, website, content, published, slug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` :
            `INSERT INTO projects (
                domain, name, description, thumbnail, images,
                github, website, content, published, slug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        console.log('CREATE - Statement:', stmt);
        
        const bindValues = projectData.thumbnail === undefined ? [
            domain,
            projectData.name,
            projectData.description,
            JSON.stringify(projectData.images || []),
            projectData.github || null,
            projectData.website || null,
            projectData.content || '',
            Number(projectData.published || false),
            projectData.slug
        ] : [
            domain,
            projectData.name,
            projectData.description,
            projectData.thumbnail,
            JSON.stringify(projectData.images || []),
            projectData.github || null,
            projectData.website || null,
            projectData.content || '',
            Number(projectData.published || false),
            projectData.slug
        ];

        console.log('CREATE - Bind values:', bindValues);
        
        const bound = stmt.bind(...bindValues);

        console.log('CREATE - Bound statement:', bound);
        
        const result = await bound.run();

        const newProject = await db.prepare(
            'SELECT * FROM projects WHERE id = ?'
        ).bind(result.meta.lastRowId).first();

        // Broadcast update to connected clients
        await broadcastUpdate(env, domain, {
            type: 'project_created',
            data: newProject
        });

        return new Response(JSON.stringify(newProject), {
            headers: new Headers({ 'Content-Type': 'application/json' }),
            status: 201
        }) as unknown as CFResponse;
    } catch (error) {
        console.error('Error creating project:', error);
        return handleError(error) as unknown as CFResponse;
    }
}

export async function handleUpdateProject(request: CFRequest, env: Env, ctx: ExecutionContext, params: Record<string, string>): Promise<CFResponse> {
    const { id } = params;
    try {
        const db = getDB(env);
        const domain = request.headers.get('X-Site-Domain') || 'localhost';
        const projectData = await request.json() as Project;

        await db.prepare(
            `UPDATE projects SET
                name = ?, description = ?, thumbnail = ?, images = ?,
                github = ?, website = ?, content = ?, published = ?, slug = ?
            WHERE domain = ? AND id = ?`
        ).bind(
            projectData.name,
            projectData.description,
            projectData.thumbnail === undefined ? null : projectData.thumbnail,
            JSON.stringify(projectData.images || []),
            projectData.github || null,
            projectData.website || null,
            projectData.content || '',
            projectData.published || false,
            projectData.slug,
            domain,
            id
        ).run();

        const updatedProject = await db.prepare(
            'SELECT * FROM projects WHERE id = ?'
        ).bind(id).first();

        // Broadcast update to connected clients
        await broadcastUpdate(env, domain, {
            type: 'project_updated',
            data: updatedProject
        });

        return new Response(JSON.stringify(updatedProject), {
            headers: new Headers({ 'Content-Type': 'application/json' })
        }) as unknown as CFResponse;
    } catch (error) {
        return handleError(error) as unknown as CFResponse;
    }
}

export async function handleDeleteProject(request: CFRequest, env: Env, ctx: ExecutionContext, params: Record<string, string>): Promise<CFResponse> {
    const { id } = params;
    try {
        const db = getDB(env);
        const domain = request.headers.get('X-Site-Domain') || 'localhost';

        const project = await db.prepare(
            'SELECT * FROM projects WHERE domain = ? AND id = ?'
        ).bind(domain, id).first();

        if (!project) {
            return createResponse('Project not found', { status: 404 });
        }

        await db.prepare(
            'DELETE FROM projects WHERE domain = ? AND id = ?'
        ).bind(domain, id).run();

        // Broadcast update to connected clients
        await broadcastUpdate(env, domain, {
            type: 'project_deleted',
            data: { id }
        });

        return createResponse(null, { status: 204 });
    } catch (error) {
        return handleError(error) as unknown as CFResponse;
    }
} 