import React, { useState } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Phone,
  MapPin, ArrowRight, Sparkles, AlertCircle, CheckCircle2
} from 'lucide-react';
import { loginUser, registerUser } from '../services/authService';

export default function LoginPage({ onLoginSuccess, onNavigate, showToast }) {
  const [activeTab, setActiveTab] = useState('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ── LOGIN ────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Mohon isi email dan kata sandi.');
      return;
    }

    setLoading(true);
    try {
      const userProfile = await loginUser(email, password);

      showToast(
        userProfile.role === 'admin'
          ? `👑 Selamat datang, ${userProfile.name}! Panel Admin aktif.`
          : `🌸 Halo ${userProfile.name}! Selamat berbelanja di Knot & Bloom.`
      );

      if (onLoginSuccess) onLoginSuccess(userProfile);
    } catch (err) {
      console.error('[LoginPage] Login error:', err.message);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setErrorMessage('Mohon lengkapi nama, email, dan kata sandi.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser(email, password, fullName, phone, address);

      if (result.needsConfirmation) {
        // Email konfirmasi dikirim — user belum bisa login sampai dikonfirmasi
        setSuccessMessage(
          `✅ Pendaftaran berhasil! Cek inbox email ${result.email} dan klik link verifikasi untuk mengaktifkan akun.`
        );
        showToast('📧 Link verifikasi dikirim ke email kamu!');
        // Reset form
        setEmail(''); setPassword(''); setConfirmPassword('');
        setFullName(''); setPhone(''); setAddress('');
      } else {
        // Langsung login (email confirm dinonaktifkan di Supabase)
        const userProfile = {
          id: result.user.id,
          email: result.email,
          name: result.name,
          phone: phone.trim(),
          address: address.trim(),
          role: 'customer',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
        };
        showToast(`🎉 Selamat datang di Knot & Bloom, ${result.name}!`);
        if (onLoginSuccess) onLoginSuccess(userProfile);
      }
    } catch (err) {
      console.error('[LoginPage] Register error:', err.message);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper container fade-in">
      <div className="auth-card-box">

        {/* Logo & Brand */}
        <div className="auth-brand-head">
          <div className="auth-brand-logo">
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="44" fill="#FF86C1" />
              <path d="M26 48 C26 26 74 26 74 48 C74 70 26 70 26 48 Z" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
              <path d="M30 32 C42 68 58 68 70 32" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
              <circle cx="72" cy="28" r="12" fill="#FEDEA4" />
              <circle cx="32" cy="72" r="9" fill="#5DE5AB" />
            </svg>
          </div>
          <h2>Selamat Datang di Knot &amp; Bloom</h2>
          <p className="auth-sub-desc">
            {activeTab === 'login'
              ? 'Masuk untuk melacak pesanan, wishlist & live chat studio'
              : 'Daftar akun baru — nikmati kemudahan belanja & lacak pesanan'}
          </p>
        </div>

        {/* Tab: Masuk / Daftar */}
        <div className="auth-tabs-segmented">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
          >
            Masuk
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setErrorMessage(''); setSuccessMessage(''); }}
          >
            Daftar
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="auth-alert-error">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="auth-alert-success" style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: '10px', padding: '12px 14px',
            color: '#166534', fontSize: '14px', marginBottom: '12px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ── FORM LOGIN ── */}
        {activeTab === 'login' ? (
          <form className="auth-form-body" onSubmit={handleLoginSubmit}>
            <div className="auth-field-group">
              <label>Email</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label>Kata Sandi</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-btn-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary auth-btn-submit" disabled={loading}>
              <span>{loading ? 'Memproses...' : 'Masuk Sekarang'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

        ) : (
          /* ── FORM REGISTER ── */
          <form className="auth-form-body" onSubmit={handleRegisterSubmit}>
            <div className="auth-field-group">
              <label>Nama Lengkap *</label>
              <div className="auth-input-wrap">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Naila Alfathonah"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label>Email *</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label>Nomor WhatsApp / HP *</label>
              <div className="auth-input-wrap">
                <Phone size={18} className="auth-input-icon" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label>Alamat Pengiriman</label>
              <div className="auth-input-wrap">
                <MapPin size={18} className="auth-input-icon" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Melati No. 12, Sekip Jaya, Palembang"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label>Kata Sandi (min. 6 karakter) *</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi aman"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-btn-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Konfirmasi Kata Sandi *</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-btn-submit" disabled={loading}>
              <span>{loading ? 'Memproses...' : 'Daftar Sekarang'}</span>
              <Sparkles size={18} />
            </button>
          </form>
        )}

        <div className="auth-footer-nav">
          <button type="button" className="btn-auth-back" onClick={() => onNavigate('home')}>
            ← Kembali ke Katalog Toko
          </button>
        </div>
      </div>
    </div>
  );
}
