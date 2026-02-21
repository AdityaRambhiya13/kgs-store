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
        const storedPin = localStorage.getItem('kgsPin');

        if (storedPhone && storedPin) {
            setUser({ phone: storedPhone, pin: storedPin });
        }
        setLoading(false);
    }, []);

    const login = async (phone, pin) => {
        try {
            await verifyPin(phone, pin);
            localStorage.setItem('kgsPhone', phone);
            localStorage.setItem('kgsPin', pin);
            setUser({ phone, pin });
            return true;
        } catch (error) {
            throw error;
        }
    };

    const signup = async (phone, pin) => {
        try {
            await setupPin(phone, pin);
            localStorage.setItem('kgsPhone', phone);
            localStorage.setItem('kgsPin', pin);
            setUser({ phone, pin });
            return true;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('kgsPhone');
        localStorage.removeItem('kgsPin');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
