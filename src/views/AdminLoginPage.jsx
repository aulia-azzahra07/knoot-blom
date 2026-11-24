
import React, { useState } from 'react';
import { loginAdmin } from '../services/authService';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage({ onLoginSuccess, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setLoading(true);

        try {
            const result = await loginAdmin(email.trim(), password);
            onLoginSuccess(result);
        } catch (error) {
            setErrorMessage(error.message || 'Login gagal. Silakan coba kembali.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-card">
                <div className="admin-login-icon">
                    <Shield size={32} />
                </div>

                <h2>Admin Login</h2>
                <p>Masuk untuk mengelola Knot & Bloom</p>

                <form onSubmit={handleLogin}>
                    <label>Email Admin</label>
                    <div className="admin-login-input">
                        <Mail size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Masukkan email admin"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <label>Password</label>
                    <div className="admin-login-input">
                        <Lock size={18} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Masukkan password"
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {errorMessage && (
                        <div className="admin-login-error">
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="admin-login-submit"
                        disabled={loading}
                    >
                        {loading ? 'Memverifikasi...' : 'Masuk sebagai Admin'}
                    </button>
                </form>

                <button
                    type="button"
                    className="admin-login-back"
                    onClick={onBack}
                >
                    Kembali ke Toko
                </button>
            </div>
        </div>
    );
}
