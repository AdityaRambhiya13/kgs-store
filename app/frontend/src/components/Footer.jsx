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
                        <p>+91 99875 02271</p>
                        <p style={{ marginTop: 6 }}>Monday to Sunday: 9 AM – 10 PM</p>
                    </div>

                    <div className="footer-col">
                        <h4>🚚 Delivery Area</h4>
                        <p>Only Dombivali</p>
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
