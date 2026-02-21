import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginRegister } from './api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const phone = localStorage.getItem('kgsPhone');
        const token = localStorage.getItem('kgsToken');
        const name = localStorage.getItem('kgsName');
        const address = localStorage.getItem('kgsAddress');

        if (phone && token) {
            setUser({ phone, token, name, address });
        }
        setLoading(false);
    }, []);

    const login = async (phone, pin, name = null, address = null) => {
        try {
            const res = await loginRegister(phone, pin, name, address);
            localStorage.setItem('kgsPhone', phone);
            localStorage.setItem('kgsToken', res.access_token);
            if (res.name) localStorage.setItem('kgsName', res.name);
            if (res.address) localStorage.setItem('kgsAddress', res.address);

            setUser({ phone, token: res.access_token, name: res.name, address: res.address });
            return true;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('kgsPhone');
        localStorage.removeItem('kgsToken');
        localStorage.removeItem('kgsName');
        localStorage.removeItem('kgsAddress');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
