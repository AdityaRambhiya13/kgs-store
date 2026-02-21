import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyPin, setupPin } from './api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Init from local storage
        const storedPhone = localStorage.getItem('kgsPhone');
        const storedToken = localStorage.getItem('kgsToken');

        if (storedPhone && storedToken) {
            setUser({ phone: storedPhone, token: storedToken });
        }
        setLoading(false);
    }, []);

    const login = async (phone, pin) => {
        try {
            const res = await verifyPin(phone, pin);
            localStorage.setItem('kgsPhone', phone);
            localStorage.setItem('kgsToken', res.access_token);
            setUser({ phone, token: res.access_token });
            return true;
        } catch (error) {
            throw error;
        }
    };

    const signup = async (phone, pin) => {
        try {
            const res = await setupPin(phone, pin);
            localStorage.setItem('kgsPhone', phone);
            localStorage.setItem('kgsToken', res.access_token);
            setUser({ phone, token: res.access_token });
            return true;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('kgsPhone');
        localStorage.removeItem('kgsToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
