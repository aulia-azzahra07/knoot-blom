import React, { useState } from 'react';
import { Search, Heart, ShoppingBag, User, Menu, X, LogIn, LogOut, Shield } from 'lucide-react';

export default function Navbar({
  currentRole = 'customer',
  onSwitchRole,
  pendingOrdersCount = 0,
  currentView,
  setCurrentView,
  cartCount,
  wishlistCount,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  currentUser = null,
  onLogout = null
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'shop', label: 'Shop' },
    { id: 'account', label: 'Lacak Pesanan', badge: pendingOrdersCount },
    { id: 'blog', label: 'Blog' },
    { id: 'about', label: 'About' }
  ];

  const handleNavClick = (viewId) => {
    setCurrentView(viewId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentView('shop');
      setSearchOpen(false);
    }
  };

  return (
    <header className="navbar-header">
      <nav className="navbar-container container">
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => handleNavClick('home')}>
          <div className="logo-icon-wrap">
            <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="44" fill="#FF86C1" />
              <path d="M26 48 C26 26 74 26 74 48 C74 70 26 70 26 48 Z" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
              <path d="M30 32 C42 68 58 68 70 32" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
              <circle cx="72" cy="28" r="12" fill="#FEDEA4" />
              <circle cx="32" cy="72" r="9" fill="#5DE5AB" />
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-title">
              <span>Knot</span>
              <span className="brand-amp">&</span>
              <span>Bloom</span>
            </div>
            <span className="brand-tagline">Crafting Happiness One Stitch at a Time ♡</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <ul className="navbar-menu">
          {navLinks.map((link) => (
            <li key={link.id}>
              <button
                className={`nav-link-btn ${currentView === link.id ? 'active' : ''}`}
                onClick={() => handleNavClick(link.id)}
              >
                {link.label}
                {link.badge > 0 && <span className="nav-badge-alert">{link.badge}</span>}
                {currentView === link.id && <span className="active-dot" />}
              </button>
            </li>
          ))}
        </ul>

        {/* Action Icons */}
        <div className="navbar-actions">
          <button
            className={`action-icon-btn ${searchOpen ? 'active' : ''}`}
            onClick={() => setSearchOpen(!searchOpen)}
            title="Cari Produk"
          >
            <Search size={20} />
          </button>

          <button
            className="action-icon-btn wishlist-btn"
            onClick={() => handleNavClick('account-wishlist')}
            title="Wishlist Favorit"
          >
            <Heart size={20} />
            {wishlistCount > 0 && <span className="action-badge wishlist-badge">{wishlistCount}</span>}
          </button>

          <button
            className="action-icon-btn cart-btn"
            onClick={onOpenCart}
            title="Keranjang Belanja"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="action-badge cart-badge">{cartCount}</span>}
          </button>

          {/* Admin Direct Button (hanya tampil kalau sudah login DAN role admin) */}
          {currentUser && currentUser.role === 'admin' && (
            <button
              className={`admin-panel-shortcut-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => {
                if (onSwitchRole) onSwitchRole('admin');
                handleNavClick('admin');
              }}
              title="Panel Admin Toko"
            >
              <Shield size={16} />
              <span>Admin Panel</span>
              {pendingOrdersCount > 0 && (
                <span className="admin-shortcut-badge">{pendingOrdersCount}</span>
              )}
            </button>
          )}

          {/* User pill atau tombol Login */}
          <div className="user-profile-relative-wrap">
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="user-pill-btn"
                  onClick={() => handleNavClick(currentUser.role === 'admin' ? 'admin' : 'account')}
                  title={`Akun: ${currentUser.name}`}
                >
                  <div className="user-avatar-mini icon-avatar-circle">
                    <User size={15} color="#E63985" />
                  </div>
                  <div className="user-pill-text-col">
                    <span className="user-name-text">{currentUser.name?.split(' ')[0]}</span>
                    <span className="user-role-subtext">
                      {currentUser.role === 'admin' ? '👑 Admin' : '🌸 Pembeli'}
                    </span>
                  </div>
                </button>
                <button
                  className="action-icon-btn"
                  onClick={onLogout}
                  title="Keluar"
                  style={{ color: '#888' }}
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                className="btn-navbar-login"
                onClick={() => handleNavClick('login')}
                title="Masuk ke Akun Anda"
              >
                <LogIn size={16} />
                <span>Masuk / Daftar</span>
              </button>
            )}
          </div>

          <button
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Floating Search Bar */}
      {searchOpen && (
        <div className="search-overlay-bar">
          <div className="container search-bar-inner">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <Search size={18} className="search-input-icon" />
              <input
                type="text"
                placeholder="Cari produk rajutan, tulip keychain, bag, DIY kit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary btn-search-submit">Cari</button>
              <button type="button" className="btn-search-close" onClick={() => setSearchOpen(false)}>
                <X size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <ul className="mobile-menu-list">
            {navLinks.map((link) => (
              <li key={link.id}>
                <button
                  className={`mobile-nav-link ${currentView === link.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(link.id)}
                >
                  {link.label}
                  {link.badge > 0 && <span className="mobile-nav-badge">{link.badge}</span>}
                </button>
              </li>
            ))}
            <li key="mobile-login-logout">
              {currentUser ? (
                <button className="mobile-nav-link" onClick={onLogout}>
                  🔓 Keluar ({currentUser.name?.split(' ')[0]})
                </button>
              ) : (
                <button className="mobile-nav-link" onClick={() => handleNavClick('login')}>
                  🔐 Login / Daftar
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
