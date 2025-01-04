import { Env } from '../types';
import { marked } from 'marked';
import { sanitizeHtml } from '../utils/sanitize';

interface PreviewRequest {
    markdown: string;
}

export async function generatePreview(request: Request, env: Env): Promise<Response> {
    try {
        const { markdown } = await request.json() as PreviewRequest;
        
        if (!markdown) {
            return new Response(JSON.stringify({ 
                error: 'Markdown content is required' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Convert markdown to HTML
        const rawHtml = marked(markdown);
        
        // Sanitize HTML to prevent XSS
        const html = sanitizeHtml(rawHtml);

        return new Response(JSON.stringify({ html }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Preview generation error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to generate preview',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
