import { token } from './stores/auth';
import { get } from 'svelte/store';

const API_URL = import.meta.env.VITE_API_URL;

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const authToken = get(token);
  const headers = {
    ...options.headers,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response;
}

export const api = {
  async login(username: string, password: string) {
    const response = await fetchApi('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },

  async getPosts() {
    const response = await fetchApi('/posts');
    return response.json();
  },

  async createPost(data: any) {
    const response = await fetchApi('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetchApi('/media', {
      method: 'POST',
      body: formData
    });
    return response.json();
  }
};