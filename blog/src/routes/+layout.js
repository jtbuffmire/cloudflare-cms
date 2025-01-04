export const ssr = true;
// removing prerender in an effort to debug websocket updates
export const prerender = false;

export function load({ depends }) {
    depends('app:config');

    return {
        meta: {
            title: 'blog',
            description: 'my website/portfolio/blog.'
        }
    };
}