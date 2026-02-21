import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function LoginModal() {
    const { user, loading, login, signup } = useAuth();
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const location = useLocation();

    // If still loading auth state from local storage, or if user is already logged in, render nothing.
    if (loading || user) return null;

    // Don't enforce customer login on the admin page
    if (location.pathname === '/manage-store-99') return null;

    const isValidPhone = /^[6-9]\d{9}$/.test(phone);
    const isValidPin = /^\d{4}$/.test(pin);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValidPhone) {
            setError('Enter a valid 10-digit mobile number.');
            return;
        }
        if (!isValidPin) {
            setError('Enter a 4-digit numeric PIN.');
            return;
        }

        setError('');
        setIsProcessing(true);

        try {
            if (isSignup) {
                await signup(phone, pin);
            } else {
                await login(phone, pin);
            }
        } catch (err) {
            // If logging in fails with 404, suggest signing up
            if (!isSignup && err.message.includes('No account found')) {
                setError('No account found. Please sign up first.');
                setIsSignup(true);
            } else if (isSignup && err.message.includes('already exists')) {
                // Adjust this condition based on your backend response for duplicate users
                setError('Account already exists. Please log in.');
                setIsSignup(false);
            } else {
                setError(err.message || 'Authentication failed. Please try again.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 9999
                }}
            >
                <motion.div
                    className="modal-content"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    style={{
                        background: 'var(--bg-surface)', padding: '2rem',
                        borderRadius: '16px', width: '90%', maxWidth: '400px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="gradient-text" style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                            Welcome to KGS
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            {isSignup ? 'Set up your account to start shopping' : 'Log in to continue shopping'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="confirm-phone-group">
                            <label>Mobile Number</label>
                            <div className="phone-input-row">
                                <span className="phone-prefix" style={{ padding: '0 12px' }}>🇮🇳 +91</span>
                                <input
                                    type="tel"
                                    className="input"
                                    inputMode="numeric"
                                    maxLength={10}
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    style={{ flex: 1 }}
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="confirm-phone-group">
                            <label>4-Digit PIN</label>
                            <input
                                type="password"
                                className="input pin-input"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                autoComplete="off"
                                style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '24px' }}
                            />
                        </div>

                        {error && <p className="error-msg" style={{ margin: 0, textAlign: 'center' }}>⚠️ {error}</p>}

                        <motion.button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!isValidPhone || !isValidPin || isProcessing}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                padding: '1rem', marginTop: '1rem',
                                justifyContent: 'center', fontSize: '16px', fontWeight: 600
                            }}
                        >
                            {isProcessing ? <span className="spinner spinner-sm" /> : (isSignup ? 'Set PIN & Continue' : 'Log In')}
                        </motion.button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            {isSignup ? 'Already have an account?' : "Don't have an account?"}
                            <button
                                className="btn-link"
                                onClick={() => { setIsSignup(!isSignup); setError(''); }}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--primary)',
                                    cursor: 'pointer', fontWeight: 600, marginLeft: '6px'
                                }}
                            >
                                {isSignup ? 'Log In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
