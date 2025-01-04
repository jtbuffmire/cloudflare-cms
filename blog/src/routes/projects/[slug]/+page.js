import { nameFromPath, importOgImage } from '$lib/js/posts.js';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

export async function load({ params }) {
// Projects are currently disabled
throw error(404, 'Projects are currently disabled');
//	const modules = import.meta.glob('/src/content/projects/*/*.md');

//	let match = {};

//	for (const [path, resolver] of Object.entries(modules)) {
//		if (nameFromPath(path) === params.slug) {
//			match = { path, resolver };
//			break;
//		}
//	}

//	const post = await match?.resolver?.();

//	if (!post || (!post.metadata.published && !dev)) {
//		throw error(404, 'project not found');
//	}

//	let imagePath = match.path.split('/').slice(0, -1).join('/') + '/' + post.metadata.images[0];
//	let image = await importOgImage(imagePath);

//	return {
//		post,
//		meta: {
//			title: post.metadata.name,
//			description: post.metadata.description,
//			type: 'article',
//			image
//		}
//	};
}
