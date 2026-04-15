import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { wsManager } from '../lib/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [systemInfo, setSystemInfo] = useState({ cuda_available: false });

    // Fetch system info (CUDA availability) — retry until backend is ready
    useEffect(() => {
        let attempts = 0;
        const MAX = 10;
        const tryFetch = () => {
            api.get('/auth/system-info')
                .then(response => setSystemInfo(response.data))
                .catch(() => {
                    setSystemInfo({ cuda_available: false });
                    if (attempts++ < MAX) setTimeout(tryFetch, 1500);
                });
        };
        tryFetch();
    }, []);

    useEffect(() => {
        if (token) {
            // Verify token and get user info
            api.get('/auth/me')
                .then(response => {
                    setUser(response.data);
                    setLoading(false);
                    // Connect WebSocket after successful auth
                    wsManager.connect(token);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                    setLoading(false);
                    wsManager.disconnect();
                });
        } else {
            setLoading(false);
            wsManager.disconnect();
        }
    }, [token]);

    const login = async (email, password) => {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        const response = await api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const { access_token, user: userData } = response.data;

        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(userData);

        return userData;
    };

    const register = async (email, password) => {
        const response = await api.post('/auth/register', {
            email,
            password
        });
        const { access_token, user: userData } = response.data;

        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(userData);

        return userData;
    };

    const refreshUser = async () => {
        if (token) {
            try {
                const response = await api.get('/auth/me');
                setUser(response.data);
            } catch (error) {
                console.error("Failed to refresh user data", error);
            }
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        wsManager.disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser, systemInfo }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const API_URL = import.meta.env.VITE_API_URL || '';
