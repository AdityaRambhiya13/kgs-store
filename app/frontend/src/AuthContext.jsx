import React, { createContext, useContext, useState, useEffect } from 'react';
import { login } from './api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem('kgsPhone');
        localStorage.removeItem('kgsToken');
        localStorage.removeItem('kgsName');
        localStorage.removeItem('kgsAddress');
        setUser(null);
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
        }
        setLoading(false);

        window.addEventListener('auth-error', logout);
        return () => window.removeEventListener('auth-error', logout);
    }, []);

    const loginFunc = async (identifier, pin) => {
        try {
            const res = await login(identifier, pin);
            localStorage.setItem('kgsPhone', res.phone);
            localStorage.setItem('kgsToken', res.access_token);
            if (res.name) localStorage.setItem('kgsName', res.name);
            if (res.address) localStorage.setItem('kgsAddress', res.address);

            setUser({ phone: res.phone, token: res.access_token, name: res.name, address: res.address });
            return true;
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login: loginFunc, logout, updateName }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
