import xss from 'xss';

export function sanitizeHtml(html: string): string {
    return xss(html, {
        whiteList: {
            h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], 
            p: [], a: ['href'], img: ['src', 'alt'],
            ul: [], ol: [], li: [], blockquote: [], code: [], pre: [],
            strong: [], em: [], del: [], hr: [], br: [], 
            table: [], thead: [], tbody: [], tr: [], th: [], td: []
        }
    });
}
