import { Response as CFResponse } from '@cloudflare/workers-types';

export const API_URL = 'http://localhost:8787';
export const API_VSN = '/api/v1';

export function handleError(error: unknown): Response {
    console.error('❌ Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Base API configuration
const API_CONFIG = {
  baseUrl: '',
  endpoints: {
    auth: {
      login: '/login',
      refresh: '/refresh'
    },
    site: {
      config: '/site/config',
    },
    pics: {
      list: '/pics',
      upload: '/pics/upload',
      delete: (id: string) => `/pics/${id}`
    },
    posts: {
      list: '/posts',
      create: '/posts',
      update: (id: string) => `/posts/${id}`,
      delete: (id: string) => `/posts/${id}`
    }
  }
};

// Types for our API responses
interface ApiResponse<T> {
  data: T;
  error?: string;
}

class ApiError extends Error {
  constructor(public response: Response, message?: string) {
    super(message || `API Error: ${response.status} ${response.statusText}`);
  }
}

class ApiClient {
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          // @ts-ignore
          window.location.href = '/login';
        }
        throw new ApiError(response);
      }

      const data = await response.json() as T;
      return { data };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(new Response(null, { status: 500 }), (error as Error).message);
    }
  }

  // Auth methods
  async login(username: string, password: string) {
    return this.fetch<{ token: string }>(API_CONFIG.endpoints.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  }

  // Site methods
  async getSiteConfig() {
    return this.fetch(API_CONFIG.endpoints.site.config);
  }

  async updateSiteConfig(config: any) {
    return this.fetch(API_CONFIG.endpoints.site.config, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }

  // Pics methods
  async getPics() {
    return this.fetch(API_CONFIG.endpoints.pics.list);
  }

  async uploadPics(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.fetch(API_CONFIG.endpoints.pics.upload, {
      method: 'POST',
      body: formData
    });
  }

  async deletePics(id: string) {
    return this.fetch(API_CONFIG.endpoints.pics.delete(id), {
      method: 'DELETE'
    });
  }

  // Posts methods
  async getPosts() {
    return this.fetch(API_CONFIG.endpoints.posts.list);
  }

  async createPost(post: any) {
    return this.fetch(API_CONFIG.endpoints.posts.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
  }

  async updatePost(id: string, post: any) {
    return this.fetch(API_CONFIG.endpoints.posts.update(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
  }

  async deletePost(id: string) {
    return this.fetch(API_CONFIG.endpoints.posts.delete(id), {
      method: 'DELETE'
    });
  }
}

// Export a singleton instance
export const api = new ApiClient();

export function createResponse(body: any, options: ResponseInit = {}) {
    return new (globalThis as any).Response(
        body === null ? null : (typeof body === 'string' ? body : JSON.stringify(body)),
        {
            headers: new Headers({
                'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json',
                ...options.headers
            }),
            ...options
        }
    ) as CFResponse;
}