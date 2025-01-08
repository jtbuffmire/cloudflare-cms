const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  async getPosts() {
    const response = await fetch(`${API_URL}/posts`);
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return response.json();
  },

  async getPost(id: string) {
    const response = await fetch(`${API_URL}/posts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch post');
    }
    return response.json();
  }
};