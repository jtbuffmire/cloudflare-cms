import { Env } from '../types';

export const API_VSN = '/api/v1' as const;

export function getAllowedOrigins(env: Env): string[] {
  if (env.ENVIRONMENT === 'development') {
    return [
      'http://localhost:4174',  // Blog
      'http://localhost:5173'   // Admin panel
    ];
  }
  
  // In production, origins are configured via environment variables
  return (env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim());
}

export function getAdminOrigins(env: Env): string[] {
  if (env.ENVIRONMENT === 'development') {
    return ['http://localhost:5173'];  // Admin panel
  }
  
  // In production, origins are configured via environment variables
  return (env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim());
}

// Only used for development
export const DEVELOPMENT_DOMAINS = [
    'localhost',
    '192.168.86.38',  // Your local IP
    'buffmire.local',
    'mealsonwheels.local'
];

export function getDomain(): string {
    return 'localhost';  // Default for worker context
}

export const getDefaultHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Site-Domain': getDomain()
    };
};

export const getRequestInit = (options: RequestInit = {}): RequestInit => {
    return {
        ...options,
        credentials: 'include',  // Includes cookies in cross-origin requests
        headers: {
            ...getDefaultHeaders(),
            ...options.headers
        }
    };
};
