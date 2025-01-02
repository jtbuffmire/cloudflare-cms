const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const api = {
  async getPosts() {
    const response = await fetch(`${API_URL}/api/posts`);
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return response.json();
  },

  async getPost(id: string) {
    const response = await fetch(`${API_URL}/api/posts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch post');
    }
    return response.json();
  }
};