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

// Debug logs after all declarations
console.log('📦 All environment variables:', {
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    SSR: import.meta.env.SSR,
    ALL_ENV: Object.fromEntries(Object.entries(import.meta.env)),
    VITE_VARS: Object.fromEntries(
        Object.entries(import.meta.env)
            .filter(([key]) => key.startsWith('VITE_'))
    )
});

// console.log('📝 Blog Configuration:', {
//     API_BASE,
//     API_TIMEOUT,
//     ENV_VARS: {
//         VITE_API_URL: import.meta.env.VITE_API_URL,
//         MODE: import.meta.env.MODE,
//         DEV: import.meta.env.DEV,
//         PROD: import.meta.env.PROD,
//     }
// });

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
export const getDefaultHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Site-Domain': getDomain()
    };
    // console.log('📨 Default headers:', headers);
    return headers;
};

export const getRequestInit = (options: RequestInit = {}): RequestInit => {
    const init: RequestInit = {
        ...options,
        credentials: 'include' as RequestCredentials,
        headers: {
            ...getDefaultHeaders(),
            ...options.headers
        }
    };
    // console.log('🔧 Request init configuration:', init);
    return init;
};

// Helper function to construct API URLs
export const API_ENDPOINT = (path: string) => {
    // Only log in development/preview
    if (import.meta.env.DEV || import.meta.env.VITE_ENVIRONMENT === 'preview') {
        console.log('🔍 API Request:', {
            env: import.meta.env.VITE_ENVIRONMENT,
            base: API_BASE,
            version: API_VSN,
            path,
            url: `${API_BASE}${API_VSN}${path}`
        });
    }
    return `${API_BASE}${API_VSN}${path}`;
}; 