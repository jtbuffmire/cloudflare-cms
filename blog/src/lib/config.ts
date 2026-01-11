// API Configuration
export const API_VSN = import.meta.env.VITE_API_VSN || '/api/v1';

// Ensure consistent slashes between base and version
export function getApiBase(): string {
    if (import.meta.env.DEV) {
        return 'http://localhost:8787';
    }
    if (typeof window === 'undefined') {
        // During SSR in production, use environment variable or default
        return import.meta.env.VITE_API_URL || 'http://localhost:8787';
    }
    const hostname = window.location.hostname;
    const domain = hostname.replace('www.', '');
    return `https://api.${domain}`;
}

export const API_BASE = getApiBase();
export const API_TIMEOUT = 5000;
export const WS_BASE = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
export const WS_URL = `${WS_BASE}/ws`;

// Domain Configuration
export const getDomain = () => {
    if (typeof window === 'undefined') {
        // During SSR, default to localhost for development
        // In production, the worker will use the Host header
        return import.meta.env.DEV ? 'localhost' : 'localhost';
    }
    const hostname = window.location.hostname;
    return hostname.replace('www.', '');
};

// Request Configuration
export const getDefaultHeaders = () => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Site-Domain': getDomain()
});

export const getRequestInit = (options: RequestInit = {}): RequestInit => ({
    ...options,
    credentials: 'include' as RequestCredentials,
    headers: {
        ...getDefaultHeaders(),
        ...options.headers
    }
});

// Helper function to construct API URLs
export const API_ENDPOINT = (path: string) => `${API_BASE}${API_VSN}${path}`; 