import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-container" style={{
      background: '#0b0f1a',
      color: '#cbd5e1',
      minHeight: '100vh',
      padding: '40px 20px',
      fontFamily: "'Inter', sans-serif",
      lineHeight: '1.6'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'rgba(30, 41, 59, 0.5)',
          padding: '40px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: blur('10px')
        }}
      >
        <h1 style={{ color: 'white', marginBottom: '24px', fontSize: '2.5rem' }}>Privacy Policy</h1>
        <p style={{ marginBottom: '20px' }}>Last Updated: May 6, 2026</p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#60a5fa', marginBottom: '12px' }}>1. Data We Collect</h2>
          <p>We collect only the information necessary to fulfill your orders:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>Name and Phone Number (for account identification)</li>
            <li>Delivery Address (if you choose home delivery)</li>
            <li>Order History (to provide customer support)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#60a5fa', marginBottom: '12px' }}>2. How We Use Your Data</h2>
          <p>Your data is used exclusively for:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>Processing and delivering your grain orders.</li>
            <li>Notifying you of order status updates.</li>
            <li>Security verification via 4-digit PIN.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#60a5fa', marginBottom: '12px' }}>3. Data Security</h2>
          <p>We implement industry-standard security measures, including:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li><strong>Encryption:</strong> All data transmitted is encrypted via SSL/TLS.</li>
            <li><strong>Password Protection:</strong> Your PIN is stored using one-way cryptographic hashing (Bcrypt).</li>
            <li><strong>Access Control:</strong> Only authorized store personnel can view your delivery details.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#60a5fa', marginBottom: '12px' }}>4. Your Rights</h2>
          <p>Under the IT Act (India), you have the right to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of any inaccurate data.</li>
            <li>Request deletion of your account and related data.</li>
          </ul>
        </section>

        <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <p>If you have any questions, please contact Ketan Grain Store directly in-store.</p>
          <button 
            onClick={() => window.history.back()}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              borderRadius: '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;
