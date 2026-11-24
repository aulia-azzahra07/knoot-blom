import React, { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  LogOut,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageCircle,
  Search,
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  Truck,
  Package,
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import OrderTrackingStepper from '../components/OrderTrackingStepper';
import CustomerAdminChat from '../components/CustomerAdminChat';
import {
  getOrCreateCustomerConversation,
  getCustomerUnreadCount,
  subscribeToConversationMessages
} from '../services/adminChatService';

// Contoh Pesanan Nyata & Interaktif untuk Pengguna Baru / Uji Coba Demo
const SAMPLE_DEMO_ORDERS = [
  {
    id: 'KB-2026-001',
    user_id: 'user-naila-1',
    date: '22 Nov 2026, 09:15 WIB',
    created_at: '2026-11-22T09:15:00.000Z',
    status: 'Dikemas',
    statusBadge: 'processing',
    total: 85000,
    shippingCost: 5000,
    shippingMethod: 'Reguler Se-Palembang (Rp 5.000)',
    courier: 'J&T Express Se-Palembang',
    paymentMethod: 'QRIS Midtrans',
    trackingNumber: 'KB-JNT-882194',
    customer: {
      name: 'Naila Alfathonah',
      phone: '08123456789',
      address: 'Jl. Srijaya Negara, Bukit Besar, Ilir Barat I, Palembang'
    },
    items: [
      {
        id: 'p-1',
        name: 'Bunga Tulip Rajut Cantik (Pink Pastel)',
        price: 45000,
        quantity: 1,
        image: '/images/tulip-keychain.jpg',
        subtotal: 45000
      },
      {
        id: 'p-2',
        name: 'Gantungan Kunci Bintang Lucu',
        price: 40000,
        quantity: 1,
        image: '/images/flower-scrunchie.jpg',
        subtotal: 40000
      }
    ],
    itemsSummary: 'Bunga Tulip Rajut Cantik (Pink Pastel) (x1), Gantungan Kunci Bintang Lucu (x1)',
    notes: 'Mohon dibungkus gift box warna pink dan tambahkan kartu ucapan ulang tahun ♡',
    history: [
      {
        id: 'hist-1',
        status: 'Menunggu Pembayaran',
        keterangan: 'Pesanan dibuat. Menunggu konfirmasi pembayaran QRIS Midtrans.',
        created_at: '2026-11-22T09:15:00.000Z'
      },
      {
        id: 'hist-2',
        status: 'Dikemas',
        keterangan: 'Pembayaran QRIS Rp 85.000 terverifikasi. Perajin mulai merajut helai benang katun pilihan di studio Unsri.',
        created_at: '2026-11-22T10:30:00.000Z'
      }
    ]
  },
  {
    id: 'KB-2026-002',
    user_id: 'user-naila-1',
    date: '21 Nov 2026, 14:00 WIB',
    created_at: '2026-11-21T14:00:00.000Z',
    status: 'Dikirim',
    statusBadge: 'shipping',
    total: 125000,
    shippingCost: 0,
    shippingMethod: 'Gratis Ongkir Se-Palembang',
    courier: 'Kurir Kampus Unsri / J&T Palembang',
    paymentMethod: 'QRIS Midtrans',
    trackingNumber: 'KB-EXP-772183',
    customer: {
      name: 'Naila Alfathonah',
      phone: '08123456789',
      address: 'Komplek Dosen Unsri Indralaya, Ogan Ilir, Sumatera Selatan'
    },
    items: [
      {
        id: 'p-3',
        name: 'Tas Rajut Mini Selempang Estetik',
        price: 125000,
        quantity: 1,
        image: '/images/mini-crochet-bag.jpg',
        subtotal: 125000
      }
    ],
    itemsSummary: 'Tas Rajut Mini Selempang Estetik (x1)',
    notes: 'Kirim saat jam kerja kantor ya kak',
    history: [
      {
        id: 'hist-3',
        status: 'Menunggu Pembayaran',
        keterangan: 'Pesanan dibuat oleh pelanggan.',
        created_at: '2026-11-21T14:00:00.000Z'
      },
      {
        id: 'hist-4',
        status: 'Dikemas',
        keterangan: 'Produk dirajut teliti, lolos QC 100%, dan dipasangi label Knot & Bloom.',
        created_at: '2026-11-21T16:20:00.000Z'
      },
      {
        id: 'hist-5',
        status: 'Dikirim',
        keterangan: 'Paket telah di-pickup oleh kurir ekspedisi. Nomor resi KB-EXP-772183 diterbitkan.',
        created_at: '2026-11-22T08:30:00.000Z'
      }
    ]
  },
  {
    id: 'KB-2026-003',
    user_id: 'user-naila-1',
    date: '19 Nov 2026, 10:30 WIB',
    created_at: '2026-11-19T10:30:00.000Z',
    status: 'Selesai',
    statusBadge: 'completed',
    total: 65000,
    shippingCost: 5000,
    shippingMethod: 'Reguler Se-Palembang (Rp 5.000)',
    courier: 'Kurir Lokal Palembang (Bayu Pratama)',
    paymentMethod: 'Tunai (COD)',
    trackingNumber: 'KB-POS-449102',
    customer: {
      name: 'Naila Alfathonah',
      phone: '08123456789',
      address: 'Jl. Padang Selasa No. 12, Bukit Besar, Palembang'
    },
    items: [
      {
        id: 'p-4',
        name: 'DIY Crochet Kit Pemula Lengkap',
        price: 65000,
        quantity: 1,
        image: '/images/diy-crochet-kit.jpg',
        subtotal: 65000
      }
    ],
    itemsSummary: 'DIY Crochet Kit Pemula Lengkap (x1)',
    notes: 'Paket sudah diterima dengan sangat rapi dan lengkap!',
    history: [
      {
        id: 'hist-6',
        status: 'Menunggu Pembayaran',
        keterangan: 'Pesanan tunai (COD) tercatat di sistem.',
        created_at: '2026-11-19T10:30:00.000Z'
      },
      {
        id: 'hist-7',
        status: 'Dikemas',
        keterangan: 'Peralatan hakpen, benang wol, dan pola DIY kit dikemas rapi.',
        created_at: '2026-11-19T11:45:00.000Z'
      },
      {
        id: 'hist-8',
        status: 'Dikirim',
        keterangan: 'Kurir menuju alamat pengiriman Bukit Besar.',
        created_at: '2026-11-19T14:10:00.000Z'
      },
      {
        id: 'hist-9',
        status: 'Selesai',
        keterangan: 'Paket telah diterima dengan baik oleh pembeli. Transaksi selesai.',
        created_at: '2026-11-19T16:00:00.000Z'
      }
    ]
  }
];

export default function MyAccountPage({
  userOrders,
  wishlist,
  allProducts,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  activeTab = 'dashboard',
  showToast,
  onSwitchRole,
  currentUser = null,
  onLogout = null,
  onOpenChatWithOrder = null,
  onUpdateOrderStatus = null,
  onNavigate = null,
  _onNavigate = null
}) {
  const [currentTab, setCurrentTab] = useState(activeTab || 'orders');
  const [expandedOrderIds, setExpandedOrderIds] = useState({});

  // Navigasi Tampilan Tracking: 'list' (Halaman Pesanan Saya) vs 'detail' (Halaman Detail Tracking)
  const [trackingViewMode, setTrackingViewMode] = useState('list');
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState(null);
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0);

  // Pantau pesan belum dibaca dari admin
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;
    let unsub = () => {};

    getOrCreateCustomerConversation(currentUser.id, currentUser.name)
      .then((conv) => {
        if (!isMounted || !conv) return;
        getCustomerUnreadCount(conv.id).then((count) => {
          if (isMounted) setCustomerUnreadCount(count);
        });

        unsub = subscribeToConversationMessages(conv.id, (newMsg) => {
          if (newMsg.sender_role === 'admin') {
            getCustomerUnreadCount(conv.id).then((count) => {
              if (isMounted) setCustomerUnreadCount(count);
            });
          }
        });
      })
      .catch((err) => console.warn('[MyAccountPage] Chat init:', err));

    return () => {
      isMounted = false;
      unsub();
    };
  }, [currentUser]);

  // Filter & Search Pelacakan Pesanan
  const [trackingSearch, setTrackingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'processing' | 'shipping' | 'completed'
  const [forceShowDemo, setForceShowDemo] = useState(false);

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const formatRupiah = (val) => 'Rp ' + Number(val).toLocaleString('id-ID');

  const wishlistProducts = allProducts.filter((p) => wishlist.includes(p.id));
  const rawOrdersList = Array.isArray(userOrders) ? userOrders : [];

  // ========================================================
  // KEAMANAN: HANYA TAMPILKAN PESANAN MILIK USER YANG LOGIN
  // Filter ketat berdasarkan user_id dari sesi login pengguna
  // ========================================================
  const loggedInUserId = currentUser?.id || 'user-naila-1';
  const isCustomerRole = (currentUser?.role || 'customer') === 'customer';

  // Saring pesanan dari database: hanya yang user_id nya sesuai dengan akun yang login
  const authorizedUserOrders = rawOrdersList.filter((o) => {
    if (!o.user_id && !o.userId) return true; // Pesanan lokal sesi saat ini
    return o.user_id === loggedInUserId || o.userId === loggedInUserId;
  });

  // Tampilkan demo pesanan jika list pesanan kosong atau tombol demo diaktifkan
  const isUsingDemo = authorizedUserOrders.length === 0 || forceShowDemo;
  const activeOrdersPool = isUsingDemo
    ? (authorizedUserOrders.length > 0 ? [...authorizedUserOrders, ...SAMPLE_DEMO_ORDERS] : SAMPLE_DEMO_ORDERS)
    : authorizedUserOrders;

  // Urutkan selalu dari yang terbaru (created_at DESC)
  const sortedOrdersPool = [...activeOrdersPool].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  // Filter berdasarkan search keyword & status chip
  const filteredOrders = sortedOrdersPool.filter((order) => {
    const q = trackingSearch.toLowerCase().trim();
    const idMatch = String(order.id || '').toLowerCase().includes(q);
    const resiMatch = String(order.trackingNumber || '').toLowerCase().includes(q);
    const summaryMatch = String(order.itemsSummary || '').toLowerCase().includes(q);
    const addressMatch = String(order.customer?.address || '').toLowerCase().includes(q);
    const matchesSearch = !q || idMatch || resiMatch || summaryMatch || addressMatch;

    if (!matchesSearch) return false;

    const st = (order.status || '').toLowerCase();
    if (statusFilter === 'processing') {
      return (
        st.includes('diterima') ||
        st.includes('kemas') ||
        st.includes('proses') ||
        st.includes('menunggu') ||
        st.includes('pending')
      );
    }
    if (statusFilter === 'shipping') {
      return st.includes('kirim') || st.includes('perjalanan') || st.includes('antar');
    }
    if (statusFilter === 'completed') {
      return st.includes('selesai') || st.includes('delivered') || st.includes('completed');
    }
    return true;
  });

  // Hitung status pesanan untuk statistik
  const activeOrdersCount = activeOrdersPool.filter(
    (o) =>
      o.status === 'Pesanan Diterima' ||
      o.status === 'Dikemas' ||
      o.status === 'Dikirim' ||
      o.status === 'Sedang Diproses' ||
      o.status === 'Menunggu Pembayaran'
  ).length;

  const completedOrdersCount = activeOrdersPool.filter(
    (o) => o.status === 'Diantar oleh Kurir' || o.status === 'Selesai'
  ).length;

  const userName = currentUser?.name || 'Naila Alfathonah';
  const userEmail = currentUser?.email || 'nailaa@gmail.com';
  const userAvatar =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  // Handler Buka Detail Tracking Pesanan
  const handleOpenTrackingDetail = (order) => {
    setSelectedTrackingOrder(order);
    setTrackingViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler Kembali ke Daftar Pesanan
  const handleBackToOrderList = () => {
    setTrackingViewMode('list');
    setSelectedTrackingOrder(null);
  };

  // Handler Salin Resi
  const handleCopyTrackingResi = (resiNum) => {
    if (!resiNum) return;
    navigator.clipboard.writeText(resiNum);
    setCopiedResi(true);
    if (showToast) showToast('Nomor resi berhasil disalin!');
    setTimeout(() => setCopiedResi(false), 2000);
  };

  return (
    <div className="account-page-view container fade-in">
      <div className="account-layout-grid">
        {/* Left Sidebar Menu */}
        <aside className="account-sidebar">
          {/* User Profile Header Card */}
          <div className="account-profile-card">
            <div className="profile-avatar-wrap icon-avatar-circle">
              <User size={38} color="#E63985" />
            </div>
            <div className="profile-text-wrap">
              <h3 className="profile-name">{userName}</h3>
              <span className="profile-email">{userEmail}</span>
              <div className="profile-badge">
                <Sparkles size={13} color="#E63985" />
                <span>Pelanggan Setia Unsri</span>
              </div>
            </div>
          </div>

          {/* Nav List */}
          <ul className="account-nav-list">
            <li>
              <button
                className={`account-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab('dashboard');
                  setTrackingViewMode('list');
                }}
              >
                <User size={18} />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className={`account-nav-item ${currentTab === 'orders' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab('orders');
                  setTrackingViewMode('list');
                }}
              >
                <ShoppingBag size={18} />
                <span>Pesanan Saya</span>
                <span className="nav-count-chip">{activeOrdersPool.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`account-nav-item ${currentTab === 'chat' ? 'active' : ''}`}
                onClick={() => {
                  if (!currentUser) {
                    const nav = onNavigate || _onNavigate;
                    if (nav) nav('login');
                    return;
                  }
                  setCurrentTab('chat');
                  setTrackingViewMode('list');
                }}
              >
                <MessageCircle size={18} />
                <span>Chat dengan Admin</span>
                {customerUnreadCount > 0 && (
                  <span className="nav-count-chip" style={{ background: '#FF86C1', color: '#fff' }}>
                    {customerUnreadCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button
                className={`account-nav-item ${currentTab === 'wishlist' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab('wishlist');
                  setTrackingViewMode('list');
                }}
              >
                <Heart size={18} />
                <span>Wishlist</span>
                <span className="nav-count-chip">{wishlistProducts.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`account-nav-item ${currentTab === 'address' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab('address');
                  setTrackingViewMode('list');
                }}
              >
                <MapPin size={18} />
                <span>Alamat Tersimpan</span>
              </button>
            </li>
            <li>
              <button
                className={`account-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab('settings');
                  setTrackingViewMode('list');
                }}
              >
                <Settings size={18} />
                <span>Pengaturan Akun</span>
              </button>
            </li>
          </ul>

          {/* Logout Button */}
          {onLogout && (
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="btn-account-logout-sidebar"
                onClick={onLogout}
                title="Keluar dari akun"
              >
                <LogOut size={16} />
                <span>Keluar Akun</span>
              </button>
            </div>
          )}

          {/* Quick Switch to Admin Mode Card */}
          {currentUser?.role === 'admin' && onSwitchRole && (
            <div className="account-admin-card-cta">
              <div className="admin-cta-badge">👑 Akses Khusus Admin</div>
              <p>Kelola pesanan pelanggan dan pantau proses pengiriman toko.</p>
              <button
                className="btn-switch-admin-cta"
                onClick={() => onSwitchRole('admin')}
              >
                Masuk ke Panel Admin →
              </button>
            </div>
          )}
        </aside>

        {/* Right Main Content Panel */}
        <main className="account-main-content">
          {/* TAB: DASHBOARD & ORDERS */}
          {(currentTab === 'dashboard' || currentTab === 'orders') && (
            <div className="dashboard-tab-content fade-in">
              {/* Quick stats cards (Hanya di mode list) */}
              {trackingViewMode === 'list' && (
                <div className="dashboard-stats-grid">
                  <div className="stat-summary-card">
                    <div
                      className="stat-icon-wrap"
                      style={{ backgroundColor: '#FFE6F1', color: '#E63985' }}
                    >
                      <ShoppingBag size={22} />
                    </div>
                    <div>
                      <span className="stat-label">Total Pesanan Saya</span>
                      <h3 className="stat-value">{activeOrdersPool.length} Pesanan</h3>
                    </div>
                  </div>

                  <div className="stat-summary-card">
                    <div
                      className="stat-icon-wrap"
                      style={{ backgroundColor: '#EBF7FF', color: '#0284C7' }}
                    >
                      <Clock size={22} />
                    </div>
                    <div>
                      <span className="stat-label">Dalam Proses</span>
                      <h3 className="stat-value">{activeOrdersCount} Pesanan</h3>
                    </div>
                  </div>

                  <div className="stat-summary-card">
                    <div
                      className="stat-icon-wrap"
                      style={{ backgroundColor: '#E8FBF2', color: '#059669' }}
                    >
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <span className="stat-label">Selesai Diantar</span>
                      <h3 className="stat-value">{completedOrdersCount} Pesanan</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  HALAMAN 2: DETAIL TRACKING PESANAN
                  Tampil saat tombol "Lacak Pesanan" diklik
                  ======================================================== */}
              {trackingViewMode === 'detail' && selectedTrackingOrder && (() => {
                // VERIFIKASI KEAMANAN: Pastikan pesanan milik user yang sedang login!
                const orderOwnerId = selectedTrackingOrder.user_id || selectedTrackingOrder.userId;
                const isOwner = !orderOwnerId || orderOwnerId === loggedInUserId;

                // 1. Jika terdeteksi membuka pesanan milik orang lain -> ERROR 403
                if (!isOwner) {
                  return (
                    <div className="security-alert-card-403 fade-in">
                      <div className="security-icon-circle">
                        <ShieldAlert size={48} color="#DC2626" />
                      </div>
                      <h3>Akses Ditolak (Error 403 Forbidden)</h3>
                      <p>
                        Anda tidak memiliki izin untuk melihat detail pesanan ini.
                        Pesanan ini terdaftar atas akun customer lain demi menjaga privasi dan keamanan data pelanggan.
                      </p>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleBackToOrderList}
                      >
                        <ArrowLeft size={16} />
                        <span>Kembali ke Pesanan Saya</span>
                      </button>
                    </div>
                  );
                }

                // Riwayat timeline status dari order_status_history
                const orderTimelineHistory = Array.isArray(selectedTrackingOrder.history) && selectedTrackingOrder.history.length > 0
                  ? selectedTrackingOrder.history
                  : [
                      {
                        status: 'Pesanan Diterima',
                        keterangan: 'Pesanan terdaftar di sistem Knot & Bloom Unsri.',
                        created_at: selectedTrackingOrder.created_at || 'Hari Ini, 08:30 WIB'
                      },
                      ...(selectedTrackingOrder.status === 'Dikemas' || selectedTrackingOrder.status === 'Dikirim' || selectedTrackingOrder.status === 'Selesai'
                        ? [{
                            status: 'Dikemas',
                            keterangan: 'Produk dirajut manual dengan benang katun pilihan, lolos QC 100% dan dikemas gift box.',
                            created_at: 'Hari Ini, 11:45 WIB'
                          }]
                        : []),
                      ...(selectedTrackingOrder.status === 'Dikirim' || selectedTrackingOrder.status === 'Selesai'
                        ? [{
                            status: 'Dikirim',
                            keterangan: `Paket diserahkan ke kurir ${selectedTrackingOrder.courier || 'J&T Express'} (Resi: ${selectedTrackingOrder.trackingNumber || '-'}).`,
                            created_at: 'Hari Ini, 14:10 WIB'
                          }]
                        : []),
                      ...(selectedTrackingOrder.status === 'Selesai'
                        ? [{
                            status: 'Selesai',
                            keterangan: 'Paket telah sampai dan diserahterimakan dengan baik ke alamat penerima.',
                            created_at: 'Hari Ini, 16:30 WIB'
                          }]
                        : [])
                    ];

                return (
                  <div className="detail-tracking-view fade-in">
                    {/* Header Navigasi Detail Tracking */}
                    <div className="tracking-detail-nav-bar">
                      <button
                        type="button"
                        className="btn-back-to-orders"
                        onClick={handleBackToOrderList}
                      >
                        <ArrowLeft size={16} />
                        <span>Kembali ke Daftar Pesanan Saya</span>
                      </button>

                      <div className="detail-nav-status-group">
                        <span className="detail-nav-code">
                          No. Pesanan: <strong>#{selectedTrackingOrder.id}</strong>
                        </span>
                        <span
                          className={`order-status-badge ${
                            selectedTrackingOrder.status === 'Dikemas' || selectedTrackingOrder.status === 'Sedang Diproses'
                              ? 'status-processing'
                              : selectedTrackingOrder.status === 'Dikirim'
                              ? 'status-shipping'
                              : selectedTrackingOrder.status === 'Diantar oleh Kurir' || selectedTrackingOrder.status === 'Selesai'
                              ? 'status-completed'
                              : selectedTrackingOrder.status === 'Dibatalkan'
                              ? 'status-cancelled'
                              : 'status-pending'
                          }`}
                        >
                          {selectedTrackingOrder.status}
                        </span>
                      </div>
                    </div>

                    {/* Informasi Pengiriman, Kurir & Resi (Khusus jika sudah dikirim) */}
                    {(selectedTrackingOrder.status === 'Dikirim' || selectedTrackingOrder.status === 'Selesai' || selectedTrackingOrder.trackingNumber) && (
                      <div className="courier-resi-highlight-banner fade-in">
                        <div className="courier-icon-wrap">
                          <Truck size={24} color="#1D4ED8" />
                        </div>
                        <div className="courier-text-info">
                          <h6>Kurir Pengiriman: <strong>{selectedTrackingOrder.courier || 'J&T Express Se-Palembang'}</strong></h6>
                          <div className="resi-code-row">
                            <span>Nomor Resi:</span>
                            <code className="resi-code-badge">{selectedTrackingOrder.trackingNumber || 'KB-JNT-882194'}</code>
                            <button
                              type="button"
                              className="btn-copy-resi-inline"
                              onClick={() => handleCopyTrackingResi(selectedTrackingOrder.trackingNumber || 'KB-JNT-882194')}
                              title="Salin Nomor Resi"
                            >
                              {copiedResi ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                              <span>{copiedResi ? 'Tersalin!' : 'Salin Resi'}</span>
                            </button>
                          </div>
                        </div>
                        <div className="courier-badge-tag">
                          <span>Estimasi Tiba: 1 Hari Kerja (Se-Palembang)</span>
                        </div>
                      </div>
                    )}

                    {/* Komponen Visual Stepper & Simulasi Kurir Bergerak */}
                    <OrderTrackingStepper
                      status={selectedTrackingOrder.status}
                      trackingNumber={selectedTrackingOrder.trackingNumber}
                      orderDate={selectedTrackingOrder.date}
                      orderId={selectedTrackingOrder.id}
                      shippingMethod={selectedTrackingOrder.shippingMethod || 'Reguler Se-Palembang'}
                      customerAddress={selectedTrackingOrder.customer?.address}
                      customerName={selectedTrackingOrder.customer?.name}
                      items={selectedTrackingOrder.items || []}
                      onChatOrder={() => {
                        if (!currentUser) {
                          const nav = onNavigate || _onNavigate;
                          if (nav) nav('login');
                          return;
                        }
                        setSelectedOrderForChat(selectedTrackingOrder);
                        setCurrentTab('chat');
                        setTrackingViewMode('list');
                      }}
                      onConfirmDelivery={
                        onUpdateOrderStatus
                          ? (oid) => {
                              onUpdateOrderStatus(oid, 'Selesai', selectedTrackingOrder.trackingNumber);
                              setSelectedTrackingOrder((prev) => ({ ...prev, status: 'Selesai' }));
                              if (showToast) {
                                showToast(`Pesanan #${oid} berhasil dikonfirmasi diterima!`);
                              }
                            }
                          : null
                      }
                    />

                    {/* Timeline Riwayat Status Berurutan (order_status_history) */}
                    <div className="order-history-timeline-card">
                      <div className="card-head-simple">
                        <Clock size={18} color="#FF86C1" />
                        <h5>Riwayat Perubahan Status Pesanan (Timeline Berurutan)</h5>
                      </div>

                      <div className="timeline-history-vertical-list">
                        {orderTimelineHistory.map((step, sIdx) => {
                          const isLast = sIdx === orderTimelineHistory.length - 1;
                          const formattedTime = step.created_at
                            ? (step.created_at.includes('WIB')
                                ? step.created_at
                                : new Date(step.created_at).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) + ' WIB')
                            : 'Waktu Tercatat';

                          return (
                            <div key={step.id || sIdx} className="timeline-history-item-row">
                              <div className="timeline-node-col">
                                <div className="timeline-step-circle-done">
                                  <CheckCircle2 size={15} color="#FFFFFF" />
                                </div>
                                {!isLast && <div className="timeline-connecting-bar" />}
                              </div>

                              <div className="timeline-desc-col">
                                <div className="timeline-time-meta">
                                  <Calendar size={13} color="#6B7280" />
                                  <span>{formattedTime}</span>
                                </div>
                                <h6 className="timeline-stage-title">{step.status}</h6>
                                <p className="timeline-stage-desc">{step.keterangan}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Informasi Rincian Pesanan & Alamat Pengiriman */}
                    <div className="order-full-detail-grid">
                      {/* Rincian Produk Dipesan */}
                      <div className="detail-items-panel">
                        <h5>Rincian Produk Dipesan</h5>
                        <div className="detail-items-table">
                          {selectedTrackingOrder.items && selectedTrackingOrder.items.length > 0 ? (
                            selectedTrackingOrder.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="detail-item-record">
                                <img
                                  src={item.image || '/images/tulip-keychain.jpg'}
                                  alt={item.name}
                                  className="detail-item-img"
                                />
                                <div className="detail-item-text">
                                  <h6>{item.name}</h6>
                                  <span>{item.quantity} × {formatRupiah(item.price)}</span>
                                </div>
                                <div className="detail-item-subtotal">
                                  {formatRupiah(item.subtotal || item.price * item.quantity)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p>Produk Rajut Knot & Bloom</p>
                          )}
                        </div>

                        {/* Kalkulasi Total */}
                        <div className="detail-cost-calc">
                          <div className="calc-row">
                            <span>Subtotal Produk:</span>
                            <strong>{formatRupiah(selectedTrackingOrder.subtotal || (selectedTrackingOrder.total - (selectedTrackingOrder.shippingCost || 5000)))}</strong>
                          </div>
                          <div className="calc-row">
                            <span>Ongkos Kirim ({selectedTrackingOrder.shippingMethod || 'Reguler'}):</span>
                            <strong>{formatRupiah(selectedTrackingOrder.shippingCost || 5000)}</strong>
                          </div>
                          <div className="calc-row total-highlight">
                            <span>Total Pembayaran:</span>
                            <strong className="final-total">{formatRupiah(selectedTrackingOrder.total)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Informasi Alamat & Penerima */}
                      <div className="detail-shipping-panel">
                        <h5>Alamat Pengiriman & Kontak</h5>
                        <div className="shipping-info-box">
                          <div className="ship-meta-row">
                            <span className="ship-label">Nama Penerima:</span>
                            <strong className="ship-val">{selectedTrackingOrder.customer?.name || userName}</strong>
                          </div>
                          <div className="ship-meta-row">
                            <span className="ship-label">Nomor Telepon:</span>
                            <strong className="ship-val">{selectedTrackingOrder.customer?.phone || '0812-3456-7890'}</strong>
                          </div>
                          <div className="ship-meta-row">
                            <span className="ship-label">Alamat Lengkap:</span>
                            <p className="ship-address-val">
                              {selectedTrackingOrder.customer?.address || 'Palembang, Sumatera Selatan'}
                            </p>
                          </div>
                          <div className="ship-meta-row">
                            <span className="ship-label">Metode Pembayaran:</span>
                            <strong className="ship-val">{selectedTrackingOrder.paymentMethod || 'QRIS'}</strong>
                          </div>
                          {selectedTrackingOrder.notes && (
                            <div className="ship-meta-row notes-row">
                              <span className="ship-label">Catatan Pesanan:</span>
                              <p className="ship-notes-val">"{selectedTrackingOrder.notes}"</p>
                            </div>
                          )}
                        </div>

                        <div className="contact-store-help-card">
                          <MessageCircle size={20} color="#FF86C1" />
                          <div>
                            <h6>Butuh bantuan tentang pesanan ini?</h6>
                            <p>Tim perajin Knot & Bloom siap membantu menjawab pertanyaanmu seputar pesanan ini.</p>
                            <button
                              type="button"
                              className="btn-chat-store-outline"
                              onClick={() => {
                                if (!currentUser) {
                                  const nav = onNavigate || _onNavigate;
                                  if (nav) nav('login');
                                  return;
                                }
                                setSelectedOrderForChat(selectedTrackingOrder);
                                setCurrentTab('chat');
                                setTrackingViewMode('list');
                              }}
                            >
                              <MessageCircle size={15} />
                              <span>Tanya soal pesanan ini</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================
                  HALAMAN 1: DAFTAR "PESANAN SAYA" (ORDER LIST)
                  Daftar semua pesanan milik customer yang sedang login
                  ======================================================== */}
              {trackingViewMode === 'list' && (
                <div className="orders-section-card">
                  <div className="section-head-flex">
                    <div>
                      <h3>Pesanan Saya ♡</h3>
                      <p className="meta-info-text">
                        Daftar seluruh pesanan Anda diurutkan dari yang terbaru (Terhubung langsung ke database Supabase)
                      </p>
                    </div>
                    <div className="head-badge-right-group">
                      {authorizedUserOrders.length === 0 && (
                        <span className="demo-preview-pill">
                          <Sparkles size={13} />
                          Mode Demo Interaktif
                        </span>
                      )}
                      <span className="orders-count-badge">
                        {filteredOrders.length} dari {activeOrdersPool.length} Pesanan
                      </span>
                    </div>
                  </div>

                  {/* Search & Filter Toolbar untuk Pelacakan Pesanan */}
                  <div className="tracking-toolbar-card">
                    <div className="tracking-search-box">
                      <Search size={18} className="search-input-icon" />
                      <input
                        type="text"
                        placeholder="Cari berdasarkan No. Pesanan (#KB...), Resi, atau nama produk..."
                        value={trackingSearch}
                        onChange={(e) => setTrackingSearch(e.target.value)}
                        className="tracking-search-input"
                      />
                      {trackingSearch && (
                        <button
                          type="button"
                          className="btn-clear-search"
                          onClick={() => setTrackingSearch('')}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Status Chips */}
                    <div className="tracking-filter-chips">
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                      >
                        <span>Semua Status ({activeOrdersPool.length})</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'processing' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('processing')}
                      >
                        <span>Sedang Dirajut / Dikemas</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'shipping' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('shipping')}
                      >
                        <span>Dalam Pengiriman</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('completed')}
                      >
                        <span>Selesai Diterima</span>
                      </button>
                    </div>

                    {/* Quick sample toggle if user wants to see demo orders */}
                    {authorizedUserOrders.length > 0 && (
                      <div className="toggle-demo-row">
                        <button
                          type="button"
                          className={`btn-toggle-demo-orders ${forceShowDemo ? 'active-demo' : ''}`}
                          onClick={() => setForceShowDemo(!forceShowDemo)}
                        >
                          <Sparkles size={14} />
                          <span>
                            {forceShowDemo
                              ? 'Sembunyikan Contoh Demo'
                              : '+ Tampilkan Contoh Demo Pelacakan Lengkap'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Orders Tracking Cards List */}
                  <div className="orders-tracking-cards-list">
                    {filteredOrders.length === 0 ? (
                      <div className="tracking-empty-box">
                        <ShoppingBag size={48} color="#FF86C1" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                        <h4>Tidak Ada Pesanan yang Sesuai</h4>
                        <p>
                          {trackingSearch
                            ? `Tidak ditemukan pesanan dengan kata kunci "${trackingSearch}". Coba cari dengan nomor pesanan lain.`
                            : 'Belum ada riwayat transaksi pada filter status yang dipilih.'}
                        </p>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => {
                            setTrackingSearch('');
                            setStatusFilter('all');
                          }}
                          style={{ marginTop: '12px' }}
                        >
                          Reset Pencarian & Filter
                        </button>
                      </div>
                    ) : (
                      filteredOrders.map((order, idx) => {
                        const isExpanded = !!expandedOrderIds[order.id];
                        return (
                          <div key={order.id || idx} className="customer-order-card fade-in">
                            {/* Order Card Head */}
                            <div className="order-card-meta-bar">
                              <div className="order-left-meta">
                                <span className="order-code-badge">
                                  No. Pesanan: <strong>#{order.id}</strong>
                                </span>
                                <span className="order-date-text">{order.date}</span>
                                <span className="order-payment-chip">
                                  Metode: <strong>{order.paymentMethod}</strong>
                                </span>
                              </div>

                              <div className="order-right-meta">
                                <span
                                  className={`order-status-badge ${
                                    order.status === 'Dikemas' || order.status === 'Sedang Diproses'
                                      ? 'status-processing'
                                      : order.status === 'Dikirim'
                                      ? 'status-shipping'
                                      : order.status === 'Diantar oleh Kurir' || order.status === 'Selesai'
                                      ? 'status-completed'
                                      : order.status === 'Dibatalkan'
                                      ? 'status-cancelled'
                                      : 'status-pending'
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </div>
                            </div>

                            {/* Ringkasan Produk & Total Belanja */}
                            <div className="order-card-summary-row">
                              <div className="order-items-snippet">
                                <strong>Rincian Produk: </strong>
                                <span>
                                  {order.itemsSummary ||
                                    (order.items &&
                                      order.items
                                        .map((i) => `${i.name} (x${i.quantity})`)
                                        .join(', '))}
                                </span>
                              </div>

                              <div className="order-total-block">
                                <span className="total-label">Total Belanja:</span>
                                <strong className="total-val">{formatRupiah(order.total)}</strong>
                              </div>

                              <div className="order-card-actions">
                                {/* TOMBOL UTAMA: LACAK PESANAN (Membuka Halaman Detail Tracking) */}
                                <button
                                  type="button"
                                  className="btn-open-detail-tracking-main"
                                  onClick={() => handleOpenTrackingDetail(order)}
                                  title="Buka rincian lengkap timeline tracking & rute kurir"
                                >
                                  <Truck size={15} />
                                  <span>Lacak Pesanan →</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn-toggle-order-detail"
                                  onClick={() => toggleOrderExpand(order.id)}
                                >
                                  <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </div>
                            </div>

                            {/* Quick Stepper Preview jika kartu dibuka */}
                            {isExpanded && (
                              <div className="order-expanded-details fade-in" style={{ marginTop: '16px' }}>
                                <h5 className="details-header-title">Barang yang Dipesan:</h5>
                                <div className="order-items-expanded-list">
                                  {order.items && order.items.length > 0 ? (
                                    order.items.map((item, itemIdx) => (
                                      <div key={itemIdx} className="order-expanded-item-row">
                                        <img
                                          src={item.image || '/images/tulip-keychain.jpg'}
                                          alt={item.name}
                                          className="item-thumb-img"
                                        />
                                        <div className="item-expanded-info">
                                          <h6 className="item-expanded-name">{item.name}</h6>
                                          <span className="item-expanded-qty">
                                            Jumlah: {item.quantity} × {formatRupiah(item.price)}
                                          </span>
                                        </div>
                                        <div className="item-expanded-subtotal">
                                          {formatRupiah(item.subtotal || item.price * item.quantity)}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="no-items-text">Produk Rajutan Knot & Bloom</p>
                                  )}
                                </div>

                                <div className="order-expanded-meta-grid">
                                  <div className="expanded-meta-box">
                                    <h6>Alamat Tujuan:</h6>
                                    <p>{order.customer?.address || 'Palembang, Sumatera Selatan'}</p>
                                  </div>
                                  <div className="expanded-meta-box">
                                    <h6>Penerima & Kontak:</h6>
                                    <p>
                                      {order.customer?.name} ({order.customer?.phone})
                                    </p>
                                  </div>
                                  {order.notes && (
                                    <div className="expanded-meta-box full">
                                      <h6>Catatan Khusus:</h6>
                                      <p>"{order.notes}"</p>
                                    </div>
                                  )}
                                </div>

                                <div style={{ marginTop: '14px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    onClick={() => handleOpenTrackingDetail(order)}
                                  >
                                    <span>Buka Halaman Detail Tracking Lengkap →</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Wishlist Preview below orders (Hanya di mode list) */}
              {trackingViewMode === 'list' && (
                <div className="wishlist-section-card" style={{ marginTop: '28px' }}>
                  <div className="section-head-flex">
                    <h3>Wishlist Favorit Kamu</h3>
                    <button
                      className="view-all-link-btn"
                      onClick={() => setCurrentTab('wishlist')}
                    >
                      <span>Lihat Semua ({wishlistProducts.length})</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {wishlistProducts.length === 0 ? (
                    <div className="empty-box-inline">
                      <p>Belum ada produk favorit di wishlist kamu.</p>
                    </div>
                  ) : (
                    <div className="wishlist-preview-grid">
                      {wishlistProducts.slice(0, 3).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelectProduct={onSelectProduct}
                          onAddToCart={onAddToCart}
                          isWishlisted={true}
                          onToggleWishlist={onToggleWishlist}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: WISHLIST */}
          {currentTab === 'wishlist' && (
            <div className="wishlist-tab-content fade-in">
              <div className="wishlist-section-card">
                <div className="section-head-flex">
                  <div>
                    <h3>Wishlist Saya</h3>
                    <p className="meta-info-text">
                      Produk rajut favorit yang kamu simpan untuk dibeli nanti
                    </p>
                  </div>
                  <span className="orders-count-badge">{wishlistProducts.length} Produk</span>
                </div>

                {wishlistProducts.length === 0 ? (
                  <div className="wishlist-empty-full">
                    <Heart size={48} color="#FF86C1" />
                    <h4>Wishlist Kamu Masih Kosong</h4>
                    <p>Jelajahi koleksi rajutan kami dan tekan tombol hati untuk menyimpannya.</p>
                  </div>
                ) : (
                  <div className="products-grid">
                    {wishlistProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelectProduct={onSelectProduct}
                        onAddToCart={onAddToCart}
                        isWishlisted={true}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ADDRESS */}
          {currentTab === 'address' && (
            <div className="address-tab-content fade-in">
              <div className="saved-address-card">
                <span className="address-badge-main">Alamat Utama</span>
                <h4>Naila Alfathonah (Kost Mahasiswi Unsri)</h4>
                <p>
                  Jl. Srijaya Negara, Lorong Swadaya No. 24, Bukit Besar, Kecamatan Ilir Barat I,
                  Kota Palembang, Sumatera Selatan 30139
                </p>
                <span className="address-phone-txt">Nomor HP: 0812-3456-7890</span>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="settings-tab-content fade-in">
              <div className="settings-form-box">
                <h4>Informasi Profil & Akun</h4>
                <div className="input-group">
                  <label>Nama Lengkap</label>
                  <input type="text" defaultValue={userName} readOnly />
                </div>
                <div className="input-group">
                  <label>Alamat Email</label>
                  <input type="email" defaultValue={userEmail} readOnly />
                </div>
                <div className="input-group">
                  <label>Nomor Telepon (WhatsApp)</label>
                  <input type="tel" defaultValue="08123456789" readOnly />
                </div>
              </div>
            </div>
          )}

          {/* TAB: CHAT ADMIN TOKO */}
          {currentTab === 'chat' && (
            <div className="account-chat-tab-content fade-in">
              <CustomerAdminChat
                currentUser={currentUser}
                onNavigate={onNavigate || _onNavigate}
                showToast={showToast}
                attachedOrder={selectedOrderForChat}
                onClearAttachedOrder={() => setSelectedOrderForChat(null)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
