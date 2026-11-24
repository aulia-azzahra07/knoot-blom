import React from 'react';
import { ShoppingBag, Store, Shield, User } from 'lucide-react';

export default function AdminNavbar({
  onSwitchRole,
  pendingOrdersCount = 0,
  onNavigate,
  currentView = 'admin',
  currentUser,
  onLogout
}) {
  return (
    <header className="admin-navbar-header">
      <nav className="admin-main-nav container">
        {/* Brand Logo & Studio Title */}
        <div
          className="admin-brand-col"
          onClick={() => (onNavigate ? onNavigate('admin') : onSwitchRole('admin'))}
          style={{ cursor: 'pointer' }}
          title="Buka Panel Admin"
        >
          <div className="admin-logo-badge">
            <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="44" fill="#FF86C1" />
              <path d="M26 48 C26 26 74 26 74 48 C74 70 26 70 26 48 Z" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
              <path d="M30 32 C42 68 58 68 70 32" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
              <circle cx="72" cy="28" r="12" fill="#FEDEA4" />
              <circle cx="32" cy="72" r="9" fill="#5DE5AB" />
            </svg>
          </div>
          <div className="admin-brand-info">
            <div className="admin-brand-title">
              <span>Knot & Bloom</span>
            </div>
            <span className="admin-brand-sub">Sistem Pengelolaan Pesanan & Produk</span>
          </div>
        </div>

        {/* Right Actions: Status, Shortcut to Admin Portal, & Switch to Customer */}
        <div className="admin-right-actions">
          {/* Tombol kembali ke Panel Admin jika sedang membuka halaman lain */}
          {currentView !== 'admin' && onNavigate && (
            <button
              className="btn-admin-view-store"
              onClick={() => onNavigate('admin')}
              style={{ background: '#FFE4EE', color: '#E63985', borderColor: '#FF86C1' }}
              title="Kembali ke Panel Admin"
            >
              <Shield size={15} />
              <span>Buka Panel Admin</span>
            </button>
          )}

          {pendingOrdersCount > 0 && (
            <div
              className="admin-alert-pill"
              title={`${pendingOrdersCount} pesanan baru butuh diproses`}
              onClick={() => (onNavigate ? onNavigate('admin') : null)}
              style={{ cursor: 'pointer' }}
            >
              <ShoppingBag size={14} />
              <span>{pendingOrdersCount} Pesanan Baru</span>
            </div>
          )}

          {/* Admin Profile Pill */}
          <div className="admin-profile-pill">
            <div className="admin-avatar-icon-circle">
              <User size={18} color="#E63985" />
            </div>
            <div className="admin-profile-meta">
              <span className="admin-profile-name">{currentUser?.name || "Admin Toko"}</span>
              <span className="admin-profile-role">Owner & Manager</span>
            </div>
          </div>

          {/* Single clean button to switch to customer store */}
          <button
            className="btn-admin-view-store"
            onClick={() => onSwitchRole('customer')}
            title="Beralih ke tampilan toko pembeli"
          >
            <Store size={15} />
            <span>Ke Toko Pembeli</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
