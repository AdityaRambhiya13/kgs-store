import React, { createContext, useContext, useState, useEffect } from 'react';
import { login } from './api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        localStorage.clear(); // Wipe everything to be safe
        setUser(null);
        // Refresh page to ensure all contexts reset
        window.location.href = '/login';
    };

    const updateName = (name) => {
        localStorage.setItem('kgsName', name);
        setUser(prev => prev ? { ...prev, name } : prev);
    };

    useEffect(() => {
        const phone = localStorage.getItem('kgsPhone');
        const token = localStorage.getItem('kgsToken');
        const name = localStorage.getItem('kgsName');
        const address = localStorage.getItem('kgsAddress');

        if (phone && token) {
            setUser({ phone, token, name, address });
            // Always refresh profile from server to ensure data is fresh
            fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    if (data.name) localStorage.setItem('kgsName', data.name);
                    if (data.address) localStorage.setItem('kgsAddress', data.address);
                    setUser({ phone, token, name: data.name || name, address: data.address || address });
                }
            })
            .catch(() => {}) // Silently ignore network errors
        }
        setLoading(false);

        window.addEventListener('auth-error', logout);
        return () => window.removeEventListener('auth-error', logout);
    }, []);

    const completeAuth = (res) => {
        localStorage.setItem('kgsPhone', res.phone);
        localStorage.setItem('kgsToken', res.access_token);
        if (res.name) localStorage.setItem('kgsName', res.name);
        if (res.address) localStorage.setItem('kgsAddress', res.address);

        setUser({ phone: res.phone, token: res.access_token, name: res.name, address: res.address });
    };

    const loginFunc = async (identifier, pin) => {
        try {
            const res = await login(identifier, pin);
            completeAuth(res);
            return true;
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login: loginFunc, logout, updateName, completeAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
