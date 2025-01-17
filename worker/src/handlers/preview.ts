import type { Env, CFRequest, CFResponse } from '../types';
import { marked } from 'marked';
import { sanitizeHtml } from '../utils/sanitize';

interface PreviewRequest {
    markdown: string;
}

export async function generatePreview(
    request: CFRequest,
    env: Env,
    ctx: ExecutionContext,
    params: Record<string, string>
): Promise<CFResponse> {
    try {
        const { markdown } = await request.json() as PreviewRequest;
        console.log('📝 Received markdown:', markdown);
        
        if (!markdown) {
            return new Response(JSON.stringify({ 
                error: 'Markdown content is required' 
            }), { 
                status: 400,
                headers: {'Content-Type': 'application/json'}   
            }) as unknown as CFResponse;
        }

        // Convert markdown to HTML
        const rawHtml = marked.parse(markdown) as string;
        console.log('🔄 Converted to HTML:', rawHtml);
        
        // Sanitize HTML to prevent XSS
        const html = sanitizeHtml(rawHtml);
        console.log('🧹 Sanitized HTML:', html);

        // Add Iconify script if needed
        const finalHtml = html.includes('iconify-icon') 
            ? `<script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>${html}`
            : html;

        return new Response(JSON.stringify({ html: finalHtml }), {
            headers: {'Content-Type': 'application/json'}
        }) as unknown as CFResponse;

    } catch (error) {
        console.error('Preview generation error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to generate preview',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), { 
            status: 500,
            headers: {'Content-Type': 'application/json'}
        }) as unknown as CFResponse;
    }
}
