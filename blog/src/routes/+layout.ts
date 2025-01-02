export const ssr = true
export const prerender = true;

export const load = ({ url }) => {
	const { pathname } = url;

	return {
		pathname,
		meta: {
			title: 'blog',
			description: 'my website/portfolio/blog.'
		}
	};
};
