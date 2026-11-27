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
  FileText,
  Star
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import OrderTrackingStepper from '../components/OrderTrackingStepper';
import CustomerAdminChat from '../components/CustomerAdminChat';
import { getSafeProductImage, handleProductImageError } from '../utils/productImage';
import {
  getOrCreateCustomerConversation,
  getCustomerUnreadCount,
  subscribeToConversationMessages
} from '../services/adminChatService';
import {
  fetchReviewsByOrder,
  submitProductReview
} from '../services/reviewService';

export default function MyAccountPage({
  userOrders,
  ordersError = null,
  onRetryOrders = null,
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
  _onNavigate = null,
  onReviewSubmitted = null
}) {
  const [currentTab, setCurrentTab] = useState(activeTab || 'orders');
  const [expandedOrderIds, setExpandedOrderIds] = useState({});

  // Navigasi Tampilan Tracking: 'list' (Halaman Pesanan Saya) vs 'detail' (Halaman Detail Tracking)
  const [trackingViewMode, setTrackingViewMode] = useState('list');
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState(null);
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0);

  // State ulasan produk untuk pesanan berstatus 'Selesai'
  const [orderReviews, setOrderReviews] = useState({});
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [submittingReviewKey, setSubmittingReviewKey] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const orderDbId = selectedTrackingOrder?.dbId;
    if (trackingViewMode !== 'detail' || !orderDbId) {
      setOrderReviews({});
      return;
    }

    fetchReviewsByOrder(orderDbId).then((rows) => {
      if (!isMounted) return;
      const map = {};
      (rows || []).forEach((r) => {
        if (r.product_id) map[r.product_id] = r;
      });
      setOrderReviews(map);
    });

    return () => {
      isMounted = false;
    };
  }, [trackingViewMode, selectedTrackingOrder?.dbId]);

  const handleReviewDraftChange = (productId, patch) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [productId]: {
        rating: prev[productId]?.rating || 5,
        comment: prev[productId]?.comment || '',
        ...patch
      }
    }));
  };

  const handleSubmitOrderReview = async (e, order, item) => {
    e.preventDefault();
    const productId = item.productId || item.id;
    const orderDbId = order.dbId;
    const draft = reviewDrafts[productId] || { rating: 5, comment: '' };

    if (!currentUser?.id) {
      if (showToast) showToast('Silakan login terlebih dahulu untuk mengirim ulasan.');
      return;
    }
    if (!draft.comment.trim()) {
      if (showToast) showToast('Mohon tulis komentar ulasanmu terlebih dahulu.');
      return;
    }

    setSubmittingReviewKey(productId);
    try {
      const saved = await submitProductReview({
        userId: currentUser.id,
        productId,
        orderId: orderDbId,
        customerName: currentUser.name || order.customer?.name || 'Pelanggan',
        rating: draft.rating || 5,
        comment: draft.comment
      });

      setOrderReviews((prev) => ({ ...prev, [productId]: saved }));
      setReviewDrafts((prev) => ({ ...prev, [productId]: { rating: 5, comment: '' } }));
      if (showToast) showToast('Terima kasih! Ulasanmu berhasil dikirim.');
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      console.error('[MyAccountPage] Gagal kirim ulasan:', err);
      if (showToast) showToast(`❌ ${err.message || 'Gagal mengirim ulasan.'}`);
    } finally {
      setSubmittingReviewKey(null);
    }
  };

  // Pantau pesan belum dibaca dari admin
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;
    let unsub = () => { };

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
  const [statusFilter, setStatusFilter] = useState('all');

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
  const loggedInUserId = currentUser?.id || null;
  const isCustomerRole = currentUser?.role === 'customer';

  // Saring pesanan dari database: hanya yang user_id-nya sesuai dengan akun yang login
  const authorizedUserOrders = loggedInUserId
    ? rawOrdersList.filter((o) => o.user_id === loggedInUserId || o.userId === loggedInUserId)
    : [];

  const activeOrdersPool = authorizedUserOrders;

  // Urutkan selalu dari yang terbaru (created_at DESC)
  const sortedOrdersPool = [...activeOrdersPool].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  // Filter berdasarkan search keyword & status chip (Dirajut, Packing, Diantar, Selesai, Dibatalkan)
  const filteredOrders = sortedOrdersPool.filter((order) => {
    const q = trackingSearch.toLowerCase().trim();
    const idMatch = String(order.id || '').toLowerCase().includes(q);
    const summaryMatch = String(order.itemsSummary || '').toLowerCase().includes(q);
    const addressMatch = String(order.customer?.address || '').toLowerCase().includes(q);
    const matchesSearch = !q || idMatch || summaryMatch || addressMatch;

    if (!matchesSearch) return false;

    const st = (order.status || '').toLowerCase().trim();
    if (statusFilter === 'dirajut') return st === 'dirajut';
    if (statusFilter === 'packing') return st === 'packing';
    if (statusFilter === 'diantar') return st === 'diantar' || st.includes('diantar');
    if (statusFilter === 'selesai') return st === 'selesai';
    if (statusFilter === 'dibatalkan') return st === 'dibatalkan';
    return true;
  });

  // Hitung status pesanan untuk statistik
  const activeOrdersCount = activeOrdersPool.filter(
    (o) => o.status === 'Dirajut' || o.status === 'Packing' || o.status === 'Diantar'
  ).length;

  const completedOrdersCount = activeOrdersPool.filter(
    (o) => o.status === 'Selesai'
  ).length;

  const userName = currentUser?.name || '';
  const userEmail = currentUser?.email || '';
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
                <span>{currentUser?.role === 'admin' ? 'Admin Toko' : 'Anggota Knot & Bloom'}</span>
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
                      status: 'Dirajut',
                      keterangan: 'Pesanan COD berhasil dibuat. Tim Knot & Bloom mulai merajut pesananmu.',
                      created_at: selectedTrackingOrder.created_at || selectedTrackingOrder.date
                    },
                    ...(selectedTrackingOrder.status === 'Packing' || selectedTrackingOrder.status === 'Diantar' || selectedTrackingOrder.status === 'Selesai'
                      ? [{
                        status: 'Packing',
                        keterangan: 'Rajutan selesai! Pesanan dikemas rapi oleh tim Knot & Bloom dan siap diantar.',
                        created_at: selectedTrackingOrder.date
                      }]
                      : []),
                    ...(selectedTrackingOrder.status === 'Diantar' || selectedTrackingOrder.status === 'Selesai'
                      ? [{
                        status: 'Diantar',
                        keterangan: `Pesanan diantar langsung oleh tim Knot & Bloom.${selectedTrackingOrder.estimasi_antar ? ` Estimasi: ${selectedTrackingOrder.estimasi_antar}.` : ''
                          }${selectedTrackingOrder.pengantar ? ` Pengantar: ${selectedTrackingOrder.pengantar}.` : ''
                          }`,
                        created_at: selectedTrackingOrder.date
                      }]
                      : []),
                    ...(selectedTrackingOrder.status === 'Selesai'
                      ? [{
                        status: 'Selesai',
                        keterangan: 'Pesanan telah diterima pembeli dan pembayaran tunai (COD) telah dibayar lunas.',
                        created_at: selectedTrackingOrder.date
                      }]
                      : []),
                    ...(selectedTrackingOrder.status === 'Dibatalkan'
                      ? [{
                        status: 'Dibatalkan',
                        keterangan: `Pesanan dibatalkan. Alasan: ${selectedTrackingOrder.alasan_batal || '-'}`,
                        created_at: selectedTrackingOrder.date
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
                          className={`order-status-badge ${selectedTrackingOrder.status === 'Dirajut'
                            ? 'status-processing'
                            : selectedTrackingOrder.status === 'Packing'
                              ? 'status-shipping'
                              : selectedTrackingOrder.status === 'Diantar'
                                ? 'status-shipping'
                                : selectedTrackingOrder.status === 'Selesai'
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

                    {/* Komponen Visual Stepper 4 Tahap: Dirajut, Packing, Diantar, Selesai */}
                    <OrderTrackingStepper
                      status={selectedTrackingOrder.status}
                      orderDate={selectedTrackingOrder.date}
                      orderId={selectedTrackingOrder.id}
                      customerAddress={selectedTrackingOrder.customer?.address}
                      customerName={selectedTrackingOrder.customer?.name}
                      estimasiAntar={selectedTrackingOrder.estimasi_antar}
                      pengantar={selectedTrackingOrder.pengantar}
                      alasanBatal={selectedTrackingOrder.alasan_batal}
                      total={selectedTrackingOrder.total}
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
                      onScrollToReview={
                        selectedTrackingOrder.status === 'Selesai' && selectedTrackingOrder.dbId
                          ? () => {
                            const el = document.getElementById('order-review-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
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
                                  src={getSafeProductImage(item.image, item.name)}
                                  alt={item.name}
                                  className="detail-item-img"
                                  onError={(e) => handleProductImageError(e, item.name, item.image)}
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

                    {/* FORM KIRIM ULASAN (Hanya tampil jika pesanan berstatus 'Selesai') */}
                    {selectedTrackingOrder.status === 'Selesai' && selectedTrackingOrder.dbId && (
                      <div id="order-review-section" className="order-review-section">
                        <div className="card-head-simple" style={{ marginBottom: '14px' }}>
                          <Star size={18} color="#FFB703" fill="#FFB703" />
                          <h5>Beri Ulasan Produk Pesanan Ini</h5>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: '16px' }}>
                          Bagikan pengalamanmu tentang produk rajut yang kamu terima (1 ulasan per produk per pesanan).
                        </p>

                        <div className="order-review-items-list">
                          {(selectedTrackingOrder.items || []).map((item, idx) => {
                            const productId = item.productId || item.id;
                            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                            const canReview = typeof productId === 'string' && uuidRegex.test(productId);
                            const existingRev = canReview ? orderReviews[productId] : null;
                            const draft = reviewDrafts[productId] || { rating: 5, comment: '' };
                            const isSubmitting = submittingReviewKey === productId;

                            if (!canReview) return null;

                            return (
                              <div key={productId || idx} className="review-item-form-card">
                                <div className="review-item-form-head">
                                  <img
                                    src={getSafeProductImage(item.image, item.name)}
                                    alt={item.name}
                                    className="detail-item-img"
                                    onError={(e) => handleProductImageError(e, item.name, item.image)}
                                  />
                                  <div>
                                    <h6>{item.name}</h6>
                                    <span>{item.quantity} × {formatRupiah(item.price)}</span>
                                  </div>
                                </div>

                                {existingRev ? (
                                  <div className="review-submitted-box">
                                    <div className="review-submitted-badge">
                                      <CheckCircle2 size={15} color="#059669" />
                                      <span>Ulasan terkirim</span>
                                      <span className="submitted-stars-inline">
                                        {[...Array(5)].map((_, sIdx) => (
                                          <Star
                                            key={sIdx}
                                            size={14}
                                            fill={sIdx < Number(existingRev.rating) ? '#FFB703' : 'none'}
                                            color="#FFB703"
                                            strokeWidth={sIdx < Number(existingRev.rating) ? 0 : 1.5}
                                          />
                                        ))}
                                      </span>
                                    </div>
                                    <p className="review-submitted-comment">"{existingRev.comment}"</p>
                                  </div>
                                ) : (
                                  <form
                                    className="order-review-form"
                                    onSubmit={(e) => handleSubmitOrderReview(e, selectedTrackingOrder, item)}
                                  >
                                    <div className="star-picker-row">
                                      <span>Rating:</span>
                                      {[1, 2, 3, 4, 5].map((num) => (
                                        <button
                                          key={num}
                                          type="button"
                                          className="star-pick-btn"
                                          onClick={() => handleReviewDraftChange(productId, { rating: num })}
                                          title={`${num} bintang`}
                                        >
                                          <Star
                                            size={20}
                                            fill={num <= (draft.rating || 5) ? '#FFB703' : 'none'}
                                            color="#FFB703"
                                          />
                                        </button>
                                      ))}
                                      <span className="star-rating-val">({draft.rating || 5}/5)</span>
                                    </div>

                                    <textarea
                                      rows={2}
                                      className="order-review-textarea"
                                      placeholder="Tulis ulasanmu tentang kualitas, warna, atau pengemasan produk..."
                                      maxLength={1000}
                                      value={draft.comment || ''}
                                      onChange={(e) => handleReviewDraftChange(productId, { comment: e.target.value })}
                                      disabled={isSubmitting}
                                      required
                                    />

                                    <button
                                      type="submit"
                                      className="btn-primary btn-sm"
                                      disabled={isSubmitting || !(draft.comment || '').trim()}
                                    >
                                      {isSubmitting ? 'Mengirim Ulasan...' : 'Kirim Ulasan'}
                                    </button>
                                  </form>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                        Daftar seluruh pesanan Anda diurutkan dari yang terbaru.
                      </p>
                    </div>
                    <div className="head-badge-right-group">
                      <span className="orders-count-badge">
                        {filteredOrders.length} dari {activeOrdersPool.length} Pesanan
                      </span>
                    </div>
                  </div>

                  {ordersError && (
                    <div
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        color: '#991B1B',
                        fontSize: '0.88rem'
                      }}
                    >
                      <span>Gagal memuat data pesanan: {ordersError}</span>
                      {onRetryOrders && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={onRetryOrders}
                        >
                          Coba Lagi
                        </button>
                      )}
                    </div>
                  )}

                  {/* Search & Filter Toolbar untuk Pelacakan Pesanan */}
                  <div className="tracking-toolbar-card">
                    <div className="tracking-search-box">
                      <Search size={18} className="search-input-icon" />
                      <input
                        type="text"
                        placeholder="Cari berdasarkan No. Pesanan (#KB...) atau nama produk..."
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
                        className={`filter-chip ${statusFilter === 'dirajut' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('dirajut')}
                      >
                        <span>Dirajut</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'packing' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('packing')}
                      >
                        <span>Packing</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'diantar' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('diantar')}
                      >
                        <span>Diantar</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'selesai' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('selesai')}
                      >
                        <span>Selesai</span>
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${statusFilter === 'dibatalkan' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('dibatalkan')}
                      >
                        <span>Dibatalkan</span>
                      </button>
                    </div>
                  </div>

                  {/* Orders Tracking Cards List */}
                  <div className="orders-tracking-cards-list">
                    {filteredOrders.length === 0 ? (
                      <div className="tracking-empty-box">
                        <ShoppingBag size={48} color="#FF86C1" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                        <h4>
                          {activeOrdersPool.length === 0
                            ? 'Belum Ada Pesanan'
                            : 'Tidak Ada Pesanan yang Sesuai'}
                        </h4>
                        <p>
                          {activeOrdersPool.length === 0
                            ? 'Kamu belum memiliki riwayat pesanan. Yuk mulai belanja koleksi rajutan Knot & Bloom!'
                            : trackingSearch
                            ? `Tidak ditemukan pesanan dengan kata kunci "${trackingSearch}". Coba cari dengan nomor pesanan lain.`
                            : 'Belum ada riwayat transaksi pada filter status yang dipilih.'}
                        </p>
                        {activeOrdersPool.length === 0 ? (
                          (onNavigate || _onNavigate) && (
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              onClick={() => (onNavigate || _onNavigate)('shop')}
                              style={{ marginTop: '12px' }}
                            >
                              Mulai Belanja Sekarang
                            </button>
                          )
                        ) : (
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
                        )}
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
                                  className={`order-status-badge ${order.status === 'Dirajut'
                                    ? 'status-processing'
                                    : order.status === 'Packing' || order.status === 'Diantar'
                                      ? 'status-shipping'
                                      : order.status === 'Selesai'
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
                                  title="Buka rincian lengkap status & timeline pesanan"
                                >
                                  <Package size={15} />
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
                                          src={getSafeProductImage(item.image, item.name)}
                                          alt={item.name}
                                          className="item-thumb-img"
                                          onError={(e) => handleProductImageError(e, item.name, item.image)}
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
              {currentUser?.address ? (
                <div className="saved-address-card">
                  <span className="address-badge-main">Alamat Utama</span>
                  <h4>{userName || 'Alamat Pengiriman'}</h4>
                  <p>{currentUser.address}</p>
                  {currentUser.phone && (
                    <span className="address-phone-txt">Nomor HP: {currentUser.phone}</span>
                  )}
                </div>
              ) : (
                <div className="saved-address-card">
                  <h4>Belum Ada Alamat Tersimpan</h4>
                  <p>Alamat pengiriman dapat diisi saat kamu melakukan checkout pesanan.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="settings-tab-content fade-in">
              <div className="settings-form-box">
                <h4>Informasi Profil & Akun</h4>
                <div className="input-group">
                  <label>Nama Lengkap</label>
                  <input type="text" value={userName} readOnly />
                </div>
                <div className="input-group">
                  <label>Alamat Email</label>
                  <input type="email" value={userEmail} readOnly />
                </div>
                <div className="input-group">
                  <label>Nomor Telepon (WhatsApp)</label>
                  <input type="tel" value={currentUser?.phone || ''} placeholder="Belum diisi" readOnly />
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
