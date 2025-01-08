// +layout.server.js
import { TEST_TOKEN } from '$env/static/private';

const authenticatedFetch = (url) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

export async function load() {
  try {
    const API_BASE = 'http://localhost:8787/api';
    const [configRes, postsRes, mediaRes, animationsRes] = await Promise.all([
      authenticatedFetch(`${API_BASE}/site/config`),
      authenticatedFetch(`${API_BASE}/posts`),
      authenticatedFetch(`${API_BASE}/media`),
      authenticatedFetch(`${API_BASE}/animations`)
    ]);

    const configData = await configRes.json();
    const postsData = await postsRes.json();
    const mediaData = await mediaRes.json();
    const animationsData = await animationsRes.json();

    return {
      siteConfig: configData,
      posts: postsData,
      media: mediaData,
      animations: animationsData
    };
  } catch (error) {
    console.error('Server load failed:', error);
    throw error;
  }
}
