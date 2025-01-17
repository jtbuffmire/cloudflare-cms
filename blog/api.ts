/// <reference types="vite/client" />
import { API_VSN, getApiBase } from './src/lib/config';

class ApiError extends Error {
  constructor(public response: Response, message?: string) {
    super(message || `API Error: ${response.status}`);
  }
}

interface ApiResponse<T> {
  data: T;
}

// Base API configuration
const API_CONFIG = {
  baseUrl: getApiBase(),
  endpoints: {
    // ... existing endpoints
  }
};

const wsUrl = import.meta.env.VITE_WS_URL;

export const api = {
  async getPosts() {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_VSN}/posts?published=true`);
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return response.json();
  },

  async getPost(id: string) {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_VSN}/posts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch post');
    }
    return response.json();
  },

  async _fetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Accept': 'application/json'
    };

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_VSN}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        throw new ApiError(response);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('API Error:', error);
      throw new ApiError(new Response(null, { status: 500 }), error.message);
    }
  }
};