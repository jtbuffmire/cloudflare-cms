import xss from 'xss';

export function sanitizeHtml(html: string): string {
    const options = {
        whiteList: {
            h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], 
            p: [], a: ['href', 'target', 'rel'], 
            img: ['src', 'alt', 'title'],
            ul: [], ol: [], li: [], blockquote: [], code: [], pre: [],
            strong: [], em: [], del: [], hr: [], br: [], 
            table: [], thead: [], tbody: [], tr: [], th: [], td: [],
            'iconify-icon': ['icon', 'width', 'height', 'style', 'class']
        },
        // Allow all URLs and icon attributes
        onTagAttr: function(tag: string, name: string, value: string) {
            // Allow all image sources and link hrefs
            if ((tag === 'img' && name === 'src') || (tag === 'a' && name === 'href')) {
                return `${name}="${value}"`;
            }
            // Allow all iconify-icon attributes
            if (tag === 'iconify-icon') {
                return `${name}="${value}"`;
            }
        },
        // Allow iconify-icon custom elements
        onTag: function(tag: string, html: string, options: any) {
            if (tag === 'iconify-icon') {
                return html;
            }
        }
    };

    return xss(html, options);
}
