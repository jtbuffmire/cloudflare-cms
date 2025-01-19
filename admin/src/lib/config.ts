// API Configuration
export const API_VSN = import.meta.env.VITE_API_VSN || '/api/v1';

// Ensure consistent slashes between base and version
export function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    if (import.meta.env.DEV) {
        return 'http://localhost:8787';
    }
    const hostname = window.location.hostname;
    const domain = hostname.startsWith('admin.') ? hostname.replace('admin.', '') : hostname;
    return `https://api.${domain}`;
}

export const API_BASE = getApiBase();
export const API_TIMEOUT = 5000;

// console.log('⚙️ Admin Panel Configuration:', {
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
    if (typeof window === 'undefined') return '';
    
    const hostname = window.location.hostname;
    // For localhost, use localhost
    if (hostname === 'localhost') return 'localhost';
    
    // For production admin panel (admin.buffmire.com), return main domain (buffmire.com)
    if (hostname.startsWith('admin.')) {
        return hostname.replace('admin.', '');
    }
    
    // Otherwise return the hostname
    return hostname;
};

// Request Configuration
export const getDefaultHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Site-Domain': getDomain()
    };

    // Add dummy token in development
    if (import.meta.env.DEV) {
        headers['Authorization'] = 'Bearer dummy-token';
    }

    return headers;
};

export function getRequestInit(): RequestInit {
    const token = localStorage.getItem('token');
    return {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Site-Domain': getDomain()
        }
    };
} 