export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <span className="footer-logo">🌾 Ketan General Stores</span>
                    <p className="footer-tagline">Your trusted neighbourhood grain store since decades.</p>
                </div>

                <div className="footer-cols">
                    <div className="footer-col">
                        <h4>📍 Store Address</h4>
                        <p>G3, G4, Vasant Chamber,<br />
                            Gupte Road,<br />
                            Dombivali (West) — 421202</p>
                    </div>

                    <div className="footer-col">
                        <h4>📞 Contact</h4>
                        <p>+91 88794 85171</p>
                        <p style={{ marginTop: 6 }}>Mon – Sat: 8 AM – 9 PM<br />Sunday: 9 AM – 7 PM</p>
                    </div>

                    <div className="footer-col">
                        <h4>🚚 Delivery Area</h4>
                        <p>Kalyan, Dombivali, Ulhasnagar &amp; nearby areas.<br />
                            Min order ₹200 for home delivery.</p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} Ketan General Stores · All rights reserved</p>
                    <p className="footer-note">🔒 Secure · Cash on Delivery · Quality Guaranteed</p>
                </div>
            </div>
        </footer>
    )
}
