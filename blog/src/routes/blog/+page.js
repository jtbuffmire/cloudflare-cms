export async function load({ fetch, depends }) {
	depends('app:posts');

	console.log('🔄 Fetching posts...');
	const response = await fetch('http://localhost:8787/api/posts');
	const data = await response.json();
	
	return {
		posts: data.posts || [],
		meta: {
			title: 'blog',
			description: 'posts about various topics.'
		}
	};
}
