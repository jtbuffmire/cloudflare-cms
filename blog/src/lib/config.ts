// API Configuration
export const API_VSN = '/api/v1';

export function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    if (import.meta.env.VITE_API_URL) {
        // console.log('🔍 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
        return import.meta.env.VITE_API_URL;
    }
    if (import.meta.env.DEV) {
        console.log('🔍 Using DEV URL: http://localhost:8787');
        return 'http://localhost:8787';
    }
    const hostname = window.location.hostname;
    const url = `https://api.${hostname.replace('www.', '')}`;
    console.log('🔍 Using production URL:', url);
    return url;
}

export const API_BASE = getApiBase();
// console.log('🌐 Final API_BASE:', API_BASE);
export const WS_URL = import.meta.env.VITE_WS_URL;
export const API_TIMEOUT = 5000;

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

// Domain Configuration
export const getDomain = () => {
    if (typeof window === 'undefined') {
        // During SSR, use a default domain for development
        if (import.meta.env.DEV) {
            return 'localhost';
        }
        return '';
    }
    const hostname = window.location.hostname;
    // Always return just the hostname without port for consistency with backend
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