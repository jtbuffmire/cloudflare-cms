import { dev } from '$app/environment';

interface PostMetadata {
  slug?: string;
  title: string;
  description: string;
  published: boolean;
  [key: string]: any;
}

interface Post {
  metadata: PostMetadata;
  default: any;
}

type PostModule = () => Promise<Post>;
type PostModules = Record<string, PostModule>;

export function nameFromPath(path: string): string {
  return path.split('/').slice(-1)[0].split('.')[0].replace(/^\++/, '');
}

export async function getPosts(modules: PostModules): Promise<PostMetadata[]> {
  const postPromises = Object.entries(modules).map(([path, resolver]) =>
    resolver().then((post) => ({
      slug: nameFromPath(path),
      ...post.metadata
    }))
  );

  let posts = await Promise.all(postPromises);

  if (!dev) {
    posts = posts.filter((post) => post.published);
  }

  return posts;
}

interface ImageModule {
  default: string;
}

type ImageModules = Record<string, () => Promise<ImageModule>>;

export async function importOgImage(imagePath: string): Promise<string | undefined> {
  const images = import.meta.glob<ImageModule>('/src/content/*/*/*.{jpg,png}', {
    import: 'default',
    query: {
      enhanced: true,
      w: '1200',
      format: 'jpg;png'
    }
  });

  for (const [path, src] of Object.entries(images)) {
    if (path.includes(imagePath)) {
      const image = await src();
      return image.default;
    }
  }
  
  return undefined;
} 