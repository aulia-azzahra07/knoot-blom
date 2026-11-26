import React from 'react';
import { Heart, ShieldCheck, RefreshCw, Sparkles, MapPin } from 'lucide-react';

export default function Footer({ setCurrentView }) {
  const handleNavClick = (viewId) => {
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer-wrap">
      {/* Decorative Wavy Wave Top */}
      <div className="wavy-top">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '50px' }}>
          <path d="M0,32L48,42.7C96,53,192,75,288,69.3C384,64,480,32,576,21.3C672,11,768,21,864,37.3C960,53,1056,75,1152,69.3C1248,64,1344,32,1392,16L1440,0L1440,80L1392,80C1344,80,1248,80,1152,80C1056,80,960,80,864,80C768,80,672,80,576,80C480,80,384,80,288,80C192,80,96,80,48,80L0,80Z" fill="#FDEEF4" />
        </svg>
      </div>

      <div className="footer-content-bg">
        <div className="container">
          {/* Social Follow Banner from Mockup */}
          <div className="footer-social-banner">
            <span className="social-banner-tag">Follow us @knittycraft_</span>
            <div className="social-icons-row">
              <a
                href="https://www.instagram.com/knittycraft_?utm_source=ig_web_button_share_sheet&hvrq=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                title="Instagram @knittycraft_"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
            </div>
            <div className="footer-tagline-quote">
              <span>"Handmade is always a good idea ♡"</span>
              <span className="bullet-sep">•</span>
              <span>"Small stitches make big dreams ♡"</span>
            </div>
          </div>

          {/* Grid columns */}
          <div className="footer-grid">
            {/* Col 1: Brand Info */}
            <div className="footer-col">
              <div className="footer-brand-title">
                <div className="footer-logo-circle">
                  <Heart size={16} fill="#FF86C1" color="#FF86C1" />
                </div>
                <span>Knot & Bloom</span>
              </div>
              <p className="footer-desc">
                Dirajut dengan hati, dibawa setiap hari. Menyediakan aksesoris rajut handmade orisinal dan DIY kit lengkap untuk pemula.
              </p>
              <div className="footer-address">
                <MapPin size={16} className="footer-pin-icon" />
                <span>Rintisan Mahasiswa Manajemen Informatika, Universitas Sriwijaya — Palembang, Sumatera Selatan</span>
              </div>
            </div>

            {/* Col 2: Navigasi */}
            <div className="footer-col">
              <h4 className="footer-col-title">Jelajahi</h4>
              <ul className="footer-links">
                <li><button onClick={() => handleNavClick('home')}>Beranda</button></li>
                <li><button onClick={() => handleNavClick('shop')}>Semua Katalog</button></li>
                <li><button onClick={() => handleNavClick('diy-kit')}>Paket DIY Kit</button></li>
                <li><button onClick={() => handleNavClick('blog')}>Blog & Tips Rajut</button></li>
                <li><button onClick={() => handleNavClick('about')}>Tentang & Proposal Kami</button></li>
              </ul>
            </div>

            {/* Col 3: Kategori Favorit */}
            <div className="footer-col">
              <h4 className="footer-col-title">Kategori Populer</h4>
              <ul className="footer-links">
                <li><button onClick={() => handleNavClick('shop')}>Tulip Keychain</button></li>
                <li><button onClick={() => handleNavClick('shop')}>Mini Crochet Bag</button></li>
                <li><button onClick={() => handleNavClick('shop')}>Boneka Amigurumi</button></li>
                <li><button onClick={() => handleNavClick('shop')}>Pouch Stroberi Serut</button></li>
                <li><button onClick={() => handleNavClick('shop')}>Buket Wisuda Rajut</button></li>
              </ul>
            </div>

            {/* Col 4: Keunggulan & Layanan */}
            <div className="footer-col">
              <h4 className="footer-col-title">Jaminan Kami</h4>
              <div className="footer-features">
                <div className="footer-feature-item">
                  <ShieldCheck size={18} className="feat-icon" />
                  <div>
                    <strong>100% Jahitan Rapi</strong>
                    <span>Daftar periksa QC sebelum kirim</span>
                  </div>
                </div>
                <div className="footer-feature-item">
                  <RefreshCw size={18} className="feat-icon" />
                  <div>
                    <strong>Garansi 14 Hari</strong>
                    <span>Jaminan ganti atau rajut ulang</span>
                  </div>
                </div>
                <div className="footer-feature-item">
                  <Sparkles size={18} className="feat-icon" />
                  <div>
                    <strong>Bisa Personalisasi</strong>
                    <span>Warna, inisial nama & gift wrap</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="footer-bottom">
            <div>
              © 2026 <strong>Knot & Bloom</strong> (Knitty Craft UMKM). Dibuat oleh Kelompok 3 Manajemen Informatika Unsri.
            </div>
            <div className="footer-bottom-links">
              <span>Keamanan Produk Anak</span>
              <span>•</span>
              <span>Kebijakan Privasi</span>
              <span>•</span>
              <span>Syarat & Ketentuan PO</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
