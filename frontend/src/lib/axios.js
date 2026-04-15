import axios from 'axios';

// Use relative URL when no explicit API URL is set (proxy handles routing via Vite)
const API_BASE = import.meta.env.VITE_API_URL || '';

const instance = axios.create({
    baseURL: `${API_BASE}/api`,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Check if a JWT token is expired by decoding its payload.
 */
function isTokenExpired(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.exp * 1000 < Date.now();
    } catch {
        return false;
    }
}

instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            if (isTokenExpired(token)) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return Promise.reject(new Error('Token expired'));
            }
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Let browser set correct Content-Type with boundary for FormData
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

instance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Login/register endpoint'lerinde 401 gelirse redirect yapma —
        // hata mesajını form kendisi göstersin
        const url = error.config?.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
        if (error.response && error.response.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance;
