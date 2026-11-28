import React, { useState, useEffect } from 'react';
import {
  Package,
  PlusCircle,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Edit3,
  Trash2,
  ExternalLink,
  MessageCircle,
  Eye,
  Printer,
  ChevronDown,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  Palette,
  Layers,
  PhoneCall,
  MapPin,
  Calendar,
  AlertCircle,
  Navigation,
  Banknote,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CATEGORIES } from '../data/products';
import AdminCustomerChat from '../components/AdminCustomerChat';
import {
  getAdminTotalUnreadCount,
  subscribeToAllMessages,
  getOrCreateCustomerConversation,
  getAdminConversations
} from '../services/adminChatService';
import {
  uploadProductImage,
  generateSlugFromName
} from '../services/productService';
import { getSafeProductImage, handleProductImageError } from '../utils/productImage';

export default function AdminPortalPage({
  products,
  orders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onNavigate,
  onSwitchRole,
  onRefreshOrders,
  showToast,
  onOpenChatWithOrder,
  currentUser = null
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'products' | 'chat' | 'settings'
  const [totalUnreadChat, setTotalUnreadChat] = useState(0);
  const [chatTargetConversation, setChatTargetConversation] = useState(null);
  const [chatTargetCustomerId, setChatTargetCustomerId] = useState(null);
  const [chatTargetOrder, setChatTargetOrder] = useState(null);
  const [chatRequestKey, setChatRequestKey] = useState(0);
  const [openingChatOrderId, setOpeningChatOrderId] = useState(null);

  // Handler klik "Chat Pembeli di Web" pada kartu pesanan
  const handleOpenChatForOrder = async (order) => {
    const customerId = order?.user_id || order?.userId || order?.raw?.user_id;
    if (!customerId) {
      if (showToast) showToast('Pembeli belum punya akun sehingga tidak bisa dihubungi lewat chat web.');
      return;
    }

    const customerName = order.customer?.name || order.raw?.customer_name || 'Pelanggan';
    console.log('[AdminPortalPage] Membuka chat pembeli untuk pesanan:', {
      orderId: order.id,
      customerId,
      customerName
    });

    setOpeningChatOrderId(order.id);
    try {
      let conversation = null;
      try {
        conversation = await getOrCreateCustomerConversation(customerId, customerName);
      } catch (upsertErr) {
        console.error('[AdminPortalPage] Gagal upsert percakapan:', upsertErr);
        // Coba cari percakapan yang sudah ada di daftar percakapan admin
        try {
          const allConvs = await getAdminConversations();
          conversation = allConvs.find((c) => c.customer_id === customerId) || null;
        } catch (listErr) {
          console.error('[AdminPortalPage] Gagal cek daftar percakapan:', listErr);
        }
        if (!conversation) {
          throw upsertErr;
        }
      }

      setChatTargetConversation(conversation);
      setChatTargetCustomerId(customerId);
      setChatTargetOrder(order);
      setChatRequestKey(Date.now());
      setActiveTab('chat');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[AdminPortalPage] Gagal membuka chat pembeli:', err);
      if (showToast) {
        showToast(`❌ Gagal membuka chat pembeli: ${err?.message || 'Periksa RLS tabel conversations di Supabase.'}`);
      }
    } finally {
      setOpeningChatOrderId(null);
    }
  };

  // Monitor unread chat messages for badge
  useEffect(() => {
    let isMounted = true;
    getAdminTotalUnreadCount().then((count) => {
      if (isMounted) setTotalUnreadChat(count);
    });

    const unsubscribe = subscribeToAllMessages(() => {
      getAdminTotalUnreadCount().then((count) => {
        if (isMounted) setTotalUnreadChat(count);
      });
    });

    const poll = setInterval(() => {
      getAdminTotalUnreadCount().then((count) => {
        if (isMounted) setTotalUnreadChat(count);
      });
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(poll);
    };
  }, []);

  // Orders State (tab aktif default: 'dirajut')
  const [orderStatusFilter, setOrderStatusFilter] = useState('dirajut');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);
  const [inputEstimasiAntar, setInputEstimasiAntar] = useState('');
  const [inputPengantar, setInputPengantar] = useState('');
  const [isUpdatingStatusOrderId, setIsUpdatingStatusOrderId] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [inputAlasanBatal, setInputAlasanBatal] = useState('');

  // Products State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);

  // Formatting helpers
  const formatRupiah = (val) => 'Rp ' + Number(val || 0).toLocaleString('id-ID');

  // Stats calculation
  const totalRevenue = orders
    .filter((o) => o.status !== 'Dibatalkan')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Alur Status Baru COD Pengantaran Toko: Dirajut -> Packing -> Diantar -> Selesai (atau Dibatalkan)
  const knittingOrders = orders.filter((o) => o.status === 'Dirajut');
  const packingOrders = orders.filter((o) => o.status === 'Packing');
  const deliveringOrders = orders.filter((o) => o.status === 'Diantar');
  const completedOrders = orders.filter((o) => o.status === 'Selesai');
  const cancelledOrders = orders.filter((o) => o.status === 'Dibatalkan');
  const pendingOrders = [...knittingOrders, ...packingOrders, ...deliveringOrders];

  const STATUS_TAB_LABELS = {
    dirajut: 'Dirajut',
    packing: 'Packing',
    diantar: 'Diantar',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan'
  };
  const activeStatusLabel = STATUS_TAB_LABELS[orderStatusFilter] || 'Dirajut';

  // Filtered orders (hanya menampilkan pesanan sesuai tab status aktif + pencarian di dalam tab aktif)
  const filteredOrders = orders.filter((order) => {
    const matchesFilter = order.status === activeStatusLabel;

    const query = orderSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      order.id.toLowerCase().includes(query) ||
      (order.customer?.name || '').toLowerCase().includes(query) ||
      (order.customer?.phone || '').includes(query);

    return matchesFilter && matchesSearch;
  });

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const query = productSearchQuery.toLowerCase().trim();
    const matchesSearch = !query || p.name.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Dirajut':
        return 'badge-processing';
      case 'Packing':
        return 'badge-shipping';
      case 'Diantar':
        return 'badge-delivering';
      case 'Selesai':
        return 'badge-completed';
      case 'Dibatalkan':
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  };

  // Open Edit Product
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  // Open Add Product
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  return (
    <div className="admin-portal-view container fade-in">
      {/* Admin Navigation Tabs */}
      <div className="admin-tabs-nav">
        <button
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={18} />
          <span>Dashboard & Omset</span>
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={18} />
          <span>Pesanan Masuk</span>
          {pendingOrders.length > 0 && (
            <span className="admin-tab-count-badge">{pendingOrders.length}</span>
          )}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={18} />
          <span>Katalog Produk</span>
          <span className="admin-tab-count-subtle">{products.length}</span>
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageCircle size={18} />
          <span>Chat Customer</span>
          {totalUnreadChat > 0 && (
            <span className="admin-tab-count-badge">{totalUnreadChat}</span>
          )}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Layers size={18} />
          <span>Profil Tim & Hak Akses</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="admin-tab-content fade-in">
          {/* Quick Metrics Grid */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card metric-pink">
              <div className="metric-icon-box">
                <DollarSign size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Omset Penjualan</span>
                <h3 className="metric-value">{formatRupiah(totalRevenue)}</h3>
                <span className="metric-hint">Dari {orders.filter(o => o.status === 'Selesai').length} pesanan berhasil</span>
              </div>
            </div>

            <div className="admin-metric-card metric-yellow">
              <div className="metric-icon-box">
                <Clock size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Pesanan Perlu Diproses</span>
                <h3 className="metric-value">{pendingOrders.length} Pesanan</h3>
                <span className="metric-hint">{knittingOrders.length} Dirajut • {packingOrders.length} Packing</span>
              </div>
            </div>

            <div className="admin-metric-card metric-blue">
              <div className="metric-icon-box">
                <Truck size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Sedang Diantar Toko</span>
                <h3 className="metric-value">{deliveringOrders.length} Pesanan</h3>
                <span className="metric-hint">Pengantaran langsung COD oleh tim toko</span>
              </div>
            </div>

            <div className="admin-metric-card metric-mint">
              <div className="metric-icon-box">
                <Package size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Produk di Katalog</span>
                <h3 className="metric-value">{products.length} Item</h3>
                <span className="metric-hint">Tersedia dalam 6 kategori kerajinan</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Latest Orders */}
          <div className="admin-overview-grid">
            <div className="admin-card-section">
              <div className="section-header-row">
                <div className="section-title-wrap">
                  <ShoppingBag size={20} color="#FF86C1" />
                  <h3>Pesanan Masuk Terbaru</h3>
                </div>
                <button
                  className="btn-text-link"
                  onClick={() => setActiveTab('orders')}
                >
                  Lihat Semua Pesanan ({orders.length}) →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="empty-admin-state">
                  <p>Belum ada pesanan masuk saat ini.</p>
                </div>
              ) : (
                <div className="admin-orders-compact-list">
                  {orders.slice(0, 4).map((order) => (
                    <div key={order.id} className="admin-order-compact-card">
                      <div className="compact-order-header">
                        <div className="compact-id-date">
                          <span className="order-code">#{order.id}</span>
                          <span className="order-time">{order.date}</span>
                        </div>
                        <span className={`status-pill ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="compact-order-body">
                        <div className="customer-mini-info">
                          <strong>{order.customer?.name || 'Pelanggan'}</strong>
                          <span className="customer-address-snip">
                            <MapPin size={12} /> {order.customer?.address || 'Palembang'}
                          </span>
                        </div>
                        <div className="compact-items-sum">
                          <span>{order.items?.length || 1} produk</span>
                          <span className="dot">•</span>
                          <strong>{formatRupiah(order.total)}</strong>
                        </div>
                      </div>

                      <div className="compact-order-footer">
                        <button
                          className="btn-sm btn-outline-pink"
                          onClick={() => {
                            const targetTab = (order.status || 'Dirajut').toLowerCase();
                            setOrderStatusFilter(STATUS_TAB_LABELS[targetTab] ? targetTab : 'dirajut');
                            setActiveTab('orders');
                            setOrderSearchQuery(order.id);
                          }}
                        >
                          Kelola Pesanan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Box */}
            <div className="admin-card-section side-action-section">
              <div className="section-header-row">
                <div className="section-title-wrap">
                  <Sparkles size={20} color="#FEDEA4" />
                  <h3>Aksi Cepat Admin</h3>
                </div>
              </div>

              <div className="admin-quick-actions-menu">
                <button className="quick-action-tile primary" onClick={handleOpenAddProduct}>
                  <div className="action-tile-icon">
                    <PlusCircle size={24} />
                  </div>
                  <div className="action-tile-text">
                    <strong>+ Tambah Produk Baru</strong>
                    <span>Input nama, harga, varian warna, foto dan deskripsi</span>
                  </div>
                </button>

                <button
                  className="quick-action-tile"
                  onClick={() => {
                    setActiveTab('orders');
                    setOrderStatusFilter('dirajut');
                  }}
                >
                  <div className="action-tile-icon">
                    <Clock size={24} />
                  </div>
                  <div className="action-tile-text">
                    <strong>Pesanan Perlu Diproses ({pendingOrders.length})</strong>
                    <span>Lihat detail pesanan dan perbarui tahap pengerjaan</span>
                  </div>
                </button>

                <button
                  className="quick-action-tile"
                  onClick={() => {
                    setActiveTab('products');
                  }}
                >
                  <div className="action-tile-icon">
                    <Package size={24} />
                  </div>
                  <div className="action-tile-text">
                    <strong>Katalog & Stok ({products.length})</strong>
                    <span>Perbarui harga, stok, atau hapus produk lama</span>
                  </div>
                </button>
              </div>

              {/* Knot & Bloom Team Note */}
              <div className="admin-quote-card">
                <h4>🧶 Knot & Bloom Artisan UMKM</h4>
                <p>
                  "Setiap produk dirajut dengan cinta oleh tim pengrajin lokal Palembang (Universitas Sriwijaya).
                  Pastikan kepuasan pembeli dengan memproses pesanan tepat waktu!"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING ORDERS (PESANAN MASUK) */}
      {activeTab === 'orders' && (
        <div className="admin-tab-content fade-in">
          {/* Filter & Search Bar */}
          <div className="admin-filter-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Cari ID pesanan (KB...), nama pembeli, atau nomor WhatsApp..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
              />
              {orderSearchQuery && (
                <button className="clear-search-btn" onClick={() => setOrderSearchQuery('')}>
                  ✕
                </button>
              )}
            </div>

            <div className="status-filter-pills">
              <button
                className={`filter-pill ${orderStatusFilter === 'dirajut' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('dirajut')}
              >
                Dirajut ({knittingOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'packing' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('packing')}
              >
                Packing ({packingOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'diantar' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('diantar')}
              >
                Diantar ({deliveringOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'selesai' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('selesai')}
              >
                Selesai ({completedOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'dibatalkan' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('dibatalkan')}
              >
                Dibatalkan ({cancelledOrders.length})
              </button>
            </div>

            {/* Realtime Supabase Indicator & Manual Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#059669',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '5px 10px',
                  borderRadius: '20px'
                }}
                title="Tersinkronisasi otomatis secara realtime dengan database Supabase"
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'inline-block',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)'
                  }}
                />
                Live Database
              </span>

              {onRefreshOrders && (
                <button
                  type="button"
                  onClick={onRefreshOrders}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    color: '#374151',
                    fontWeight: '500'
                  }}
                  title="Segarkan data pesanan dari database"
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="empty-state-box">
              <ShoppingBag size={48} color="#FF86C1" />
              <h3>
                {orderSearchQuery
                  ? `Tidak ada pesanan yang cocok di tahap ${activeStatusLabel}`
                  : orderStatusFilter === 'dibatalkan'
                  ? 'Belum ada pesanan yang Dibatalkan'
                  : `Belum ada pesanan di tahap ${activeStatusLabel}`}
              </h3>
              <p>
                {orderSearchQuery
                  ? `Tidak ditemukan pesanan dengan kata kunci "${orderSearchQuery}" pada tab ${activeStatusLabel}.`
                  : 'Pesanan pada tahap ini akan otomatis muncul di sini saat statusnya diperbarui.'}
              </p>
              {orderSearchQuery && (
                <button
                  className="btn-secondary"
                  onClick={() => setOrderSearchQuery('')}
                >
                  Hapus Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="admin-orders-list">
              {filteredOrders.map((order) => {
                const customerPhone = (order.customer?.phone || '').replace(/[^0-9]/g, '');
                const waLink = customerPhone
                  ? `https://wa.me/${customerPhone.startsWith('0') ? '62' + customerPhone.slice(1) : customerPhone}?text=Halo%20kak%20${encodeURIComponent(order.customer?.name || '')},%20saya%20Admin%20Knot%20%26%20Bloom%20mengonfirmasi%20pesanan%20nomor%20${order.id}.`
                  : null;

                return (
                  <div key={order.id} className="admin-order-card">
                    {/* Order Top Bar */}
                    <div className="order-card-header">
                      <div className="order-id-group">
                        <span className="order-badge-id">No. Pesanan: #{order.id}</span>
                        <span className="order-timestamp">
                          <Calendar size={14} /> {order.date}
                        </span>
                        <span className="order-payment-tag">
                          {order.paymentMethod || 'BANK TRANSFER'}
                        </span>
                      </div>

                      <div className="order-header-right">
                        <span className={`status-pill ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Order Body: Customer details & Items */}
                    <div className="order-card-grid">
                      {/* Customer Info Box */}
                      <div className="order-customer-box">
                        <h4 className="box-title">
                          <MapPin size={16} /> Informasi Pembeli & Pengiriman
                        </h4>
                        <div className="customer-detail-list">
                          <div className="detail-row">
                            <span className="detail-label">Nama:</span>
                            <strong className="detail-val">{order.customer?.name || '-'}</strong>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Kontak:</span>
                            <span className="detail-val phone-highlight">
                              {order.customer?.phone || '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Alamat:</span>
                            <span className="detail-val address-text">
                              {order.customer?.address || '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Pengantaran:</span>
                            <span className="detail-val">
                              {order.shippingMethod || 'Pengantaran Langsung Toko'}
                            </span>
                          </div>

                          {order.estimasi_antar && (
                            <div className="detail-row resi-row">
                              <span className="detail-label">Estimasi Antar:</span>
                              <strong className="detail-val">
                                {order.estimasi_antar}
                              </strong>
                            </div>
                          )}

                          {order.pengantar && (
                            <div className="detail-row">
                              <span className="detail-label">Pengantar:</span>
                              <span className="detail-val">{order.pengantar}</span>
                            </div>
                          )}

                          {order.notes && (
                            <div className="order-notes-alert">
                              <strong>Catatan Pembeli:</strong> "{order.notes}"
                            </div>
                          )}
                        </div>

                        {/* Customer Actions Row: Live In-Web Chat (Shopee-Style) */}
                        <div className="customer-actions-row">
                          {(() => {
                            const hasCustomerAccount = Boolean(
                              order.user_id || order.userId || order.raw?.user_id
                            );
                            const isOpening = openingChatOrderId === order.id;
                            return (
                              <button
                                type="button"
                                className="btn-sm btn-chat-web-admin"
                                disabled={!hasCustomerAccount || isOpening}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenChatForOrder(order);
                                }}
                                title={
                                  hasCustomerAccount
                                    ? 'Buka obrolan langsung di Web dengan pembeli'
                                    : 'Pembeli belum punya akun'
                                }
                              >
                                <MessageCircle size={15} />
                                <span>{isOpening ? 'Membuka Chat...' : 'Chat Pembeli di Web'}</span>
                              </button>
                            );
                          })()}

                          <button
                            type="button"
                            className="btn-sm btn-outline"
                            onClick={() => setSelectedOrderForInvoice(order)}
                          >
                            <Printer size={15} />
                            <span>Cetak Label & Invoice</span>
                          </button>
                        </div>
                      </div>

                      {/* Items Ordered List */}
                      <div className="order-items-box">
                        <h4 className="box-title">
                          <Package size={16} /> Produk yang Dipesan ({order.items?.length || 0})
                        </h4>
                        <div className="ordered-items-table">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="ordered-item-row">
                              <div className="item-thumbnail">
                                <img
                                  src={getSafeProductImage(item.image, item.name)}
                                  alt={item.name}
                                  onError={(e) => handleProductImageError(e, item.name, item.image)}
                                />
                              </div>
                              <div className="item-meta">
                                <span className="item-title">{item.name}</span>
                                {item.selectedColor && (
                                  <div className="item-color-pill">
                                    <span
                                      className="color-dot"
                                      style={{ backgroundColor: item.selectedColor.hex || '#FF86C1' }}
                                    />
                                    <span>Varian: {item.selectedColor.name}</span>
                                  </div>
                                )}
                              </div>
                              <div className="item-pricing">
                                <span className="qty-tag">x{item.quantity}</span>
                                <strong className="price-tag">
                                  {formatRupiah(item.price * item.quantity)}
                                </strong>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Calculation Breakdown */}
                        <div className="order-calc-breakdown">
                          <div className="calc-row">
                            <span>Subtotal Produk:</span>
                            <span>{formatRupiah(order.subtotal || order.total - (order.shippingCost || 15000))}</span>
                          </div>
                          <div className="calc-row">
                            <span>Ongkir ({order.shippingMethod || 'Reguler'}):</span>
                            <span>{formatRupiah(order.shippingCost || 15000)}</span>
                          </div>
                          <div className="calc-row total-row">
                            <strong>Total Tagihan:</strong>
                            <strong className="total-val">{formatRupiah(order.total)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Action Footer */}
                    <div className="order-card-footer">
                      {/* COD Collection Amount */}
                      {order.status !== 'Selesai' && order.status !== 'Dibatalkan' && (
                        <div className="cod-collect-notice">
                          <Banknote size={15} />
                          <strong>Tagihan COD: {formatRupiah(order.total)}</strong>
                        </div>
                      )}

                      <div className="status-update-buttons">
                        {/* Tahap 1: Dirajut -> Mulai Packing */}
                        {order.status === 'Dirajut' && (
                          <button
                            className="btn-sm btn-primary-pink"
                            disabled={isUpdatingStatusOrderId === order.id}
                            onClick={async () => {
                              setIsUpdatingStatusOrderId(order.id);
                              try {
                                await onUpdateOrderStatus(order.id, 'Packing');
                              } finally {
                                setIsUpdatingStatusOrderId(null);
                              }
                            }}
                          >
                            <Package size={15} />
                            <span>
                              {isUpdatingStatusOrderId === order.id ? 'Memproses...' : 'Mulai Packing'}
                            </span>
                          </button>
                        )}

                        {/* Tahap 2: Packing -> Antar Pesanan (buka modal estimasi_antar + pengantar) */}
                        {order.status === 'Packing' && (
                          <button
                            className="btn-sm btn-blue"
                            disabled={isUpdatingStatusOrderId === order.id}
                            onClick={() => {
                              setSelectedOrderForDelivery(order);
                              setInputEstimasiAntar(order.estimasi_antar || '');
                              setInputPengantar(order.pengantar || '');
                            }}
                          >
                            <Navigation size={15} />
                            <span>Antar Pesanan</span>
                          </button>
                        )}

                        {/* Tahap 3: Diantar -> Tandai Selesai */}
                        {order.status === 'Diantar' && (
                          <button
                            className="btn-sm btn-mint"
                            disabled={isUpdatingStatusOrderId === order.id}
                            onClick={async () => {
                              setIsUpdatingStatusOrderId(order.id);
                              try {
                                await onUpdateOrderStatus(order.id, 'Selesai');
                              } finally {
                                setIsUpdatingStatusOrderId(null);
                              }
                            }}
                          >
                            <CheckCircle2 size={15} />
                            <span>
                              {isUpdatingStatusOrderId === order.id ? 'Memproses...' : 'Tandai Selesai'}
                            </span>
                          </button>
                        )}

                        {/* Dibatalkan: boleh dari Dirajut, Packing, atau Diantar (wajib isi alasan) */}
                        {(order.status === 'Dirajut' || order.status === 'Packing' || order.status === 'Diantar') && (
                          <button
                            className="btn-sm btn-outline-danger"
                            disabled={isUpdatingStatusOrderId === order.id}
                            onClick={() => {
                              setOrderToCancel(order);
                              setInputAlasanBatal('');
                              setIsCancelModalOpen(true);
                            }}
                          >
                            <XCircle size={15} />
                            <span>Batalkan</span>
                          </button>
                        )}

                        {/* Final state badges (tidak dapat diubah lagi) */}
                        {order.status === 'Selesai' && (
                          <span className="status-pill badge-completed">✓ Selesai — COD Dibayar</span>
                        )}
                        {order.status === 'Dibatalkan' && (
                          <div>
                            <span className="status-pill badge-cancelled">✕ Dibatalkan</span>
                            {order.alasan_batal && (
                              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                                Alasan: {order.alasan_batal}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCT MANAGEMENT (TAMBAH / EDIT / HAPUS PRODUK) */}
      {activeTab === 'products' && (
        <div className="admin-tab-content fade-in">
          {/* Header Action Row */}
          <div className="admin-products-header">
            <div className="header-text-block">
              <h3>Daftar Katalog Produk Rajut ({products.length})</h3>
              <p>Kelola katalog produk, harga jual, diskon promo, dan tambah produk baru ke etalase toko.</p>
            </div>
            <button className="btn-add-product-main" onClick={handleOpenAddProduct}>
              <PlusCircle size={20} />
              <span>+ Tambah Produk Baru</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Cari nama produk atau bahan..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
              />
              {productSearchQuery && (
                <button className="clear-search-btn" onClick={() => setProductSearchQuery('')}>
                  ✕
                </button>
              )}
            </div>

            <div className="category-select-wrapper">
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="category-dropdown"
              >
                <option value="all">Semua Kategori ({products.length})</option>
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table / Cards */}
          {filteredProducts.length === 0 ? (
            <div className="empty-state-box">
              <Package size={48} color="#FF86C1" />
              <h3>Produk tidak ditemukan</h3>
              <p>Tidak ada produk yang cocok dengan pencarian atau kategori ini.</p>
              <button
                className="btn-secondary"
                onClick={() => {
                  setProductSearchQuery('');
                  setProductCategoryFilter('all');
                }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="admin-products-grid">
              {filteredProducts.map((prod) => (
                <div key={prod.id} className="admin-product-card">
                  <div className="prod-card-thumb">
                    <img
                      src={getSafeProductImage(prod.image, prod.name)}
                      alt={prod.name}
                      onError={(e) => handleProductImageError(e, prod.name, prod.image)}
                    />
                    {prod.tag && (
                      <span className={`prod-tag-badge ${prod.tagType || 'bestseller'}`}>
                        {prod.tag}
                      </span>
                    )}
                  </div>

                  <div className="prod-card-details">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <div className="prod-cat-pill">
                        {CATEGORIES.find((c) => c.id === prod.category)?.name || prod.category}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: prod.is_active === false ? '#FEE2E2' : '#DCFCE7',
                          color: prod.is_active === false ? '#B91C1C' : '#15803D'
                        }}
                      >
                        {prod.is_active === false ? 'Nonaktif' : 'Aktif'}
                      </span>
                    </div>

                    <h4 className="prod-name-title">{prod.name}</h4>

                    <div className="prod-price-row">
                      <strong className="current-price">{formatRupiah(prod.price)}</strong>
                      {prod.originalPrice && prod.originalPrice > prod.price && (
                        <span className="orig-price">{formatRupiah(prod.originalPrice)}</span>
                      )}
                    </div>

                    <p className="prod-desc-preview">{prod.description}</p>

                    {/* Variants preview (dari tabel product_variants) */}
                    {Array.isArray(prod.variants) && prod.variants.length > 0 && (
                      <div className="colors-preview-row">
                        <span className="color-label">Varian ({prod.variants.length}):</span>
                        <div className="color-dots-list">
                          {prod.variants.slice(0, 5).map((v) => (
                            <span
                              key={v.id || v.name}
                              className="color-dot-mini"
                              style={{
                                backgroundColor: v.color_hex || '#E5E7EB',
                                opacity: v.is_active === false || (Number(v.stock) || 0) <= 0 ? 0.35 : 1
                              }}
                              title={`${v.name} — Stok: ${v.stock}${v.is_active === false ? ' (Nonaktif)' : ''}`}
                            />
                          ))}
                          {prod.variants.length > 5 && (
                            <span className="more-colors-count">+{prod.variants.length - 5}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="prod-stats-row">
                      <span>Stok: <strong>{prod.stock ?? 0}</strong></span>
                      <span>
                        {prod.reviewsCount > 0 && prod.rating != null
                          ? `★ ${Number(prod.rating).toFixed(1)} (${prod.reviewsCount})`
                          : 'Belum ada ulasan'}
                      </span>
                      <span>Terjual: {prod.soldCount ?? 0}</span>
                    </div>

                    {/* Actions */}
                    <div className="prod-card-actions">
                      <button
                        className="btn-edit-prod"
                        onClick={() => handleOpenEditProduct(prod)}
                        title="Edit Produk"
                      >
                        <Edit3 size={16} />
                        <span>Edit Produk</span>
                      </button>

                      <button
                        className="btn-delete-prod"
                        onClick={() => setDeleteConfirmProduct(prod)}
                        title="Hapus Produk"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS & TEAM ROLES */}
      {activeTab === 'settings' && (
        <div className="admin-tab-content fade-in">
          <div className="admin-settings-layout">
            <div className="settings-card">
              <h3>👑 Hak Akses & Peran Sistem (Role Management)</h3>
              <p>
                Aplikasi e-commerce Knot & Bloom kini memiliki 2 peran aktif:
              </p>

              <div className="roles-comparison-grid">
                <div className="role-box customer-role">
                  <div className="role-box-header">
                    <span className="role-icon">🌸</span>
                    <div>
                      <h4>Peran 1: Pelanggan (Customer)</h4>
                      <span className="role-sub">Pengguna publik / Pembeli</span>
                    </div>
                  </div>
                  <ul className="role-permissions-list">
                    <li>✓ Menjelajahi katalog produk, filter kategori & pencarian</li>
                    <li>✓ Menambah produk ke Keranjang Belanja</li>
                    <li>✓ Custom Order rajut sesuai keinginan</li>
                    <li>✓ Melakukan Checkout, memilih kurir & metode pembayaran</li>
                    <li>✓ Menyimpan Wishlist barang favorit</li>
                    <li>✓ Memantau riwayat & status pesanan di "Akun Saya"</li>
                  </ul>
                  <button
                    className="btn-sm btn-outline-pink"
                    onClick={() => onSwitchRole('customer')}
                  >
                    Beralih ke Mode Pembeli
                  </button>
                </div>

                <div className="role-box admin-role highlight">
                  <div className="role-box-header">
                    <span className="role-icon">👑</span>
                    <div>
                      <h4>Peran 2: Admin Toko (Administrator)</h4>
                      <span className="role-sub">Tim Manajemen & Operasional</span>
                    </div>
                  </div>
                  <ul className="role-permissions-list">
                    <li>✓ <strong>Melihat semua pesanan/order yang masuk</strong> secara live</li>
                    <li>✓ <strong>Memperbarui status pesanan</strong> (Dirajut → Packing → Diantar → Selesai)</li>
                    <li>✓ <strong>Atur estimasi waktu antar & nama pengantar</strong> langsung oleh toko</li>
                    <li>✓ <strong>Hubungi pembeli langsung</strong> via WhatsApp resmi</li>
                    <li>✓ <strong>Cetak label packing & invoice</strong> pesanan</li>
                    <li>✓ <strong>Tambah produk baru</strong> (foto, harga, varian warna, spesifikasi)</li>
                    <li>✓ <strong>Edit & hapus produk</strong> dari etalase katalog</li>
                    <li>✓ Pantau total omset penjualan & ringkasan bisnis</li>
                  </ul>
                  <div className="current-active-tag">
                    <CheckCircle2 size={16} /> Sedang Aktif Sekarang
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <h3>🧶 Tentang Tim Operasional Knot & Bloom</h3>
              <p>
                Usaha Mikro Kecil Menengah (UMKM) kriya rajut berbasis mahasiswa Universitas Sriwijaya (Unsri), Palembang.
              </p>
              <div className="team-admin-roster">
                <div className="team-roster-pill">
                  <strong>Nyimas Ayu Asri Muth M</strong>
                  <span>Ketua, Keuangan & Admin Sistem</span>
                </div>
                <div className="team-roster-pill">
                  <strong>Bunga Angelica</strong>
                  <span>Operasional, Gudang & Rekap Pesanan</span>
                </div>
                <div className="team-roster-pill">
                  <strong>Anindya Cantika Fitri</strong>
                  <span>Desain Produk & Pola Rajut</span>
                </div>
                <div className="team-roster-pill">
                  <strong>Naila Alfathonah</strong>
                  <span>Marketing & Relasi Pembeli</span>
                </div>
                <div className="team-roster-pill">
                  <strong>Aulia Azzahra</strong>
                  <span>Produksi Rajut & Quality Control</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CHAT CUSTOMER */}
      {activeTab === 'chat' && (
        <div className="admin-tab-content fade-in">
          <AdminCustomerChat
            currentUser={currentUser}
            orders={orders}
            showToast={showToast}
            initialConversation={chatTargetConversation}
            targetCustomerId={chatTargetCustomerId}
            attachedOrder={chatTargetOrder}
            chatRequestKey={chatRequestKey}
            onClearAttachedOrder={() => setChatTargetOrder(null)}
            onViewOrder={(orderId) => {
              const target = orders.find((o) => String(o.id) === String(orderId));
              const targetTab = (target?.status || 'Dirajut').toLowerCase();
              setOrderStatusFilter(STATUS_TAB_LABELS[targetTab] ? targetTab : 'dirajut');
              setActiveTab('orders');
              setOrderSearchQuery(orderId);
            }}
          />
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          editingProduct={editingProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSave={async (prodData) => {
            if (editingProduct) {
              await onUpdateProduct(editingProduct.id, prodData);
              showToast(`Produk "${prodData.name}" berhasil diperbarui! ♡`);
            } else {
              await onAddProduct(prodData);
              showToast(`Produk baru "${prodData.name}" berhasil ditambahkan ke katalog! ✨`);
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}


      {/* MODAL 2: ANTAR PESANAN (PENGANTARAN LANGSUNG TOKO) */}
      {selectedOrderForDelivery && (
        <div className="modal-overlay-custom fade-in" onClick={() => setSelectedOrderForDelivery(null)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>🛵 Antar Pesanan #{selectedOrderForDelivery.id}</h3>
              <button className="btn-close-modal" onClick={() => setSelectedOrderForDelivery(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              <p className="modal-desc-text">
                Pembeli: <strong>{selectedOrderForDelivery.customer?.name}</strong><br />
                Status akan diubah dari <strong>Packing</strong> menjadi <strong>"Diantar"</strong>.
              </p>

              <div className="form-group-custom">
                <label>
                  Estimasi Waktu Antar <span style={{ color: '#DC2626' }}>* (wajib diisi)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Hari ini 15.00-17.00"
                  value={inputEstimasiAntar}
                  onChange={(e) => setInputEstimasiAntar(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group-custom" style={{ marginTop: '12px' }}>
                <label>Nama Pengantar (opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Kak Naila / Tim Studio"
                  value={inputPengantar}
                  onChange={(e) => setInputPengantar(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn-secondary"
                onClick={() => setSelectedOrderForDelivery(null)}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                disabled={isUpdatingStatusOrderId === selectedOrderForDelivery.id}
                onClick={async () => {
                  if (!inputEstimasiAntar.trim()) {
                    showToast('Estimasi waktu antar wajib diisi!');
                    return;
                  }
                  const targetOrder = selectedOrderForDelivery;
                  setIsUpdatingStatusOrderId(targetOrder.id);
                  try {
                    const res = await onUpdateOrderStatus(targetOrder.id, 'Diantar', {
                      estimasiAntar: inputEstimasiAntar.trim(),
                      pengantar: inputPengantar.trim()
                    });
                    if (res?.success) {
                      setSelectedOrderForDelivery(null);
                    }
                  } finally {
                    setIsUpdatingStatusOrderId(null);
                  }
                }}
              >
                {isUpdatingStatusOrderId === selectedOrderForDelivery.id
                  ? 'Menyimpan...'
                  : 'Simpan & Ubah ke Diantar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BATALKAN PESANAN */}
      {isCancelModalOpen && orderToCancel && (
        <div className="modal-overlay-custom fade-in" onClick={() => setIsCancelModalOpen(false)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>⚠️ Batalkan Pesanan #{orderToCancel.id}?</h3>
              <button className="btn-close-modal" onClick={() => setIsCancelModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body-custom">
              <p className="modal-desc-text">
                Pembeli: <strong>{orderToCancel.customer?.name}</strong><br />
                Status saat ini: <strong>{orderToCancel.status}</strong>
              </p>
              <div className="form-group-custom">
                <label>Alasan Pembatalan <span style={{ color: '#DC2626' }}>* (wajib diisi)</span></label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Stok habis, customer minta batal, customer menolak pembayaran COD..."
                  value={inputAlasanBatal}
                  onChange={(e) => setInputAlasanBatal(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', resize: 'vertical', fontSize: '13px' }}
                />
              </div>
            </div>
            <div className="modal-footer-custom">
              <button className="btn-secondary" onClick={() => setIsCancelModalOpen(false)}>Tutup</button>
              <button
                className="btn-primary"
                style={{ background: '#DC2626' }}
                disabled={isUpdatingStatusOrderId === orderToCancel.id}
                onClick={async () => {
                  if (!inputAlasanBatal.trim()) {
                    showToast('Alasan pembatalan wajib diisi!');
                    return;
                  }
                  const targetOrder = orderToCancel;
                  setIsUpdatingStatusOrderId(targetOrder.id);
                  try {
                    const res = await onUpdateOrderStatus(targetOrder.id, 'Dibatalkan', {
                      alasanBatal: inputAlasanBatal.trim()
                    });
                    if (res?.success) {
                      setIsCancelModalOpen(false);
                      setOrderToCancel(null);
                    }
                  } finally {
                    setIsUpdatingStatusOrderId(null);
                  }
                }}
              >
                {isUpdatingStatusOrderId === orderToCancel.id ? 'Memproses...' : 'Ya, Batalkan Pesanan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE / PRINTING PACKING SLIP */}
      {selectedOrderForInvoice && (
        <div className="modal-overlay-custom fade-in" onClick={() => setSelectedOrderForInvoice(null)}>
          <div className="modal-dialog-custom modal-invoice" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>📄 Label Pengantaran & Invoice Pesanan</h3>
              <button className="btn-close-modal" onClick={() => setSelectedOrderForInvoice(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body-custom print-invoice-body">
              <div className="invoice-slip-paper">
                <div className="slip-brand-row">
                  <div>
                    <h2 className="slip-brand-title">Knot & Bloom ♡</h2>
                    <span className="slip-brand-sub">Crafting Happiness One Stitch at a Time</span>
                    <p className="slip-brand-addr">Kampus Unsri Bukit Besar, Palembang, Sumatera Selatan</p>
                  </div>
                  <div className="slip-order-meta">
                    <span className="slip-code">INVOICE: #{selectedOrderForInvoice.id}</span>
                    <span className="slip-date">{selectedOrderForInvoice.date}</span>
                    <span className="slip-badge-status">{selectedOrderForInvoice.status}</span>
                  </div>
                </div>

                <div className="slip-address-grid">
                  <div className="slip-addr-col">
                    <span className="slip-col-label">PENGIRIM:</span>
                    <strong>Knot & Bloom UMKM Rajut</strong>
                    <p>WhatsApp: 0812-7890-1234</p>
                    <p>Palembang, Sumatera Selatan</p>
                  </div>

                  <div className="slip-addr-col dest-col">
                    <span className="slip-col-label">PENERIMA PAKET:</span>
                    <strong className="dest-name">{selectedOrderForInvoice.customer?.name}</strong>
                    <p className="dest-phone">📞 {selectedOrderForInvoice.customer?.phone}</p>
                    <p className="dest-fulladdr">📍 {selectedOrderForInvoice.customer?.address}</p>
                    {selectedOrderForInvoice.notes && (
                      <p className="dest-notes">Catatan: {selectedOrderForInvoice.notes}</p>
                    )}
                  </div>
                </div>

                <div className="slip-items-section">
                  <table className="slip-items-table">
                    <thead>
                      <tr>
                        <th>Item Produk</th>
                        <th>Varian</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Harga</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderForInvoice.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td>{item.selectedColor?.name || 'Default'}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-right">{formatRupiah(item.price)}</td>
                          <td className="text-right">{formatRupiah(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="slip-totals-row">
                    <div className="slip-payment-method">
                      <span>Metode Pembayaran:</span>
                      <strong>{selectedOrderForInvoice.paymentMethod}</strong>
                      <p>Pengantaran: {selectedOrderForInvoice.shippingMethod || 'Pengantaran Langsung Toko'}</p>
                      {selectedOrderForInvoice.estimasi_antar && (
                        <p>Estimasi Antar: <strong>{selectedOrderForInvoice.estimasi_antar}</strong></p>
                      )}
                      {selectedOrderForInvoice.pengantar && (
                        <p>Pengantar: <strong>{selectedOrderForInvoice.pengantar}</strong></p>
                      )}
                    </div>
                    <div className="slip-calc-lines">
                      <div className="slip-calc-line">
                        <span>Ongkos Kirim:</span>
                        <span>{formatRupiah(selectedOrderForInvoice.shippingCost || 15000)}</span>
                      </div>
                      <div className="slip-calc-line total-grand">
                        <span>Total Bayar:</span>
                        <span>{formatRupiah(selectedOrderForInvoice.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="slip-footer-message">
                  <p>Terima kasih telah mendukung pengrajin rajut lokal Palembang! ♡</p>
                  <span>Instagram: @knotandbloom.id • Tag kami saat unboxing ya!</span>
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn-secondary"
                onClick={() => setSelectedOrderForInvoice(null)}
              >
                Tutup
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={16} />
                <span>Cetak Invoice / Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteConfirmProduct && (
        <div className="modal-overlay-custom fade-in" onClick={() => setDeleteConfirmProduct(null)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>Hapus Produk?</h3>
              <button className="btn-close-modal" onClick={() => setDeleteConfirmProduct(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              <p>
                Apakah Anda yakin ingin menghapus produk <strong>"{deleteConfirmProduct.name}"</strong>?
                Jika produk pernah dipesan, statusnya akan dinonaktifkan (<code>is_active = false</code>) agar riwayat pesanan tetap aman. Jika belum pernah dipesan, produk dan variannya akan dihapus permanen.
              </p>
            </div>
            <div className="modal-footer-custom">
              <button className="btn-secondary" onClick={() => setDeleteConfirmProduct(null)}>
                Batal
              </button>
              <button
                className="btn-danger-confirm"
                onClick={async () => {
                  try {
                    const result = await onDeleteProduct(deleteConfirmProduct.id);
                    const msg =
                      result?.mode === 'soft_deleted'
                        ? `Produk "${deleteConfirmProduct.name}" pernah dipesan sehingga dinonaktifkan (is_active = false).`
                        : `Produk "${deleteConfirmProduct.name}" berhasil dihapus permanen beserta variannya.`;
                    showToast(msg);
                    setDeleteConfirmProduct(null);
                  } catch (error) {
                    console.error('[AdminPortalPage] Gagal menghapus produk:', error);
                    showToast(
                      `Gagal menghapus produk: ${error.message || 'Terjadi kesalahan.'}`
                    );
                  }
                }}
              >
                Ya, Hapus Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: FORM ADD / EDIT PRODUCT (Sesuai struktur tabel products & product_variants)
// ----------------------------------------------------------------------
function ProductFormModal({ editingProduct, onClose, onSave }) {
  const [name, setName] = useState(editingProduct?.name || '');
  const [slug, setSlug] = useState(editingProduct?.slug || '');
  const [slugEditedManually, setSlugEditedManually] = useState(Boolean(editingProduct?.slug));
  const [category, setCategory] = useState(editingProduct?.category || 'aksesoris');
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [note, setNote] = useState(editingProduct?.note || '');
  const [price, setPrice] = useState(editingProduct?.price ?? '');
  const [originalPrice, setOriginalPrice] = useState(
    editingProduct?.original_price ?? editingProduct?.originalPrice ?? ''
  );
  const [tag, setTag] = useState(editingProduct?.tag || '');
  const [tagType, setTagType] = useState(editingProduct?.tag_type ?? editingProduct?.tagType ?? '');
  const [sortOrder, setSortOrder] = useState(editingProduct?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(editingProduct ? editingProduct.is_active !== false : true);
  const [manualStock, setManualStock] = useState(editingProduct?.dbStock ?? editingProduct?.stock ?? 0);

  // Gambar produk (array URL di images jsonb; urutan pertama menjadi image_url)
  const [images, setImages] = useState(() => {
    if (Array.isArray(editingProduct?.images) && editingProduct.images.length > 0) {
      return editingProduct.images.filter((u) => typeof u === 'string' && u.trim());
    }
    if (editingProduct?.image_url || editingProduct?.image) {
      return [editingProduct.image_url || editingProduct.image];
    }
    return [];
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Varian dari tabel product_variants (id, name, color_hex, stock, is_active)
  const [variants, setVariants] = useState(() => {
    const src = editingProduct?.allVariants || editingProduct?.variants || [];
    return src.map((v) => ({
      id: v.id || null,
      name: v.name || '',
      color_hex: v.color_hex || '',
      useColor: Boolean(v.color_hex),
      stock: Number(v.stock) || 0,
      is_active: v.is_active !== false,
    }));
  });

  // Spesifikasi produk (disimpan sebagai object di kolom specs jsonb)
  const [specRows, setSpecRows] = useState(() => {
    const rawSpecs = editingProduct?.specs;
    if (rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)) {
      const entries = Object.entries(rawSpecs).map(([key, value]) => ({
        key,
        value: String(value ?? ''),
      }));
      if (entries.length > 0) return entries;
    }
    return [
      { key: 'ukuran', value: '' },
      { key: 'bahan', value: 'Benang Milk Cotton Premium' },
      { key: 'waktuPengerjaan', value: '1-3 hari' },
    ];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleNameChange = (val) => {
    setName(val);
    if (!slugEditedManually) {
      setSlug(generateSlugFromName(val));
    }
  };

  const handleImageFilesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setFormError('');
    setIsUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const publicUrl = await uploadProductImage(file);
        uploadedUrls.push(publicUrl);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      console.error('[ProductFormModal] Upload gambar gagal:', err);
      setFormError(err.message || 'Gagal mengunggah gambar ke Supabase Storage.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleMoveImage = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: null,
        name: '',
        color_hex: '#FF86C1',
        useColor: true,
        stock: 1,
        is_active: true,
      },
    ]);
  };

  const handleUpdateVariantRow = (index, patch) => {
    setVariants((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleRemoveVariantRow = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSpecRow = () => {
    setSpecRows((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleUpdateSpecRow = (index, field, val) => {
    setSpecRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  const handleRemoveSpecRow = (index) => {
    setSpecRows((prev) => prev.filter((_, i) => i !== index));
  };

  const hasVariants = variants.length > 0;
  const calculatedActiveVariantStock = variants
    .filter((v) => v.is_active)
    .reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    const resolvedSlug = generateSlugFromName(slug || trimmedName);
    const numPrice = Math.round(Number(price));

    if (!trimmedName) {
      setFormError('Nama produk wajib diisi.');
      return;
    }
    if (!resolvedSlug) {
      setFormError('Slug produk wajib diisi (huruf kecil, angka, atau tanda hubung).');
      return;
    }
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      setFormError('Harga jual (price) wajib lebih besar dari 0.');
      return;
    }

    let parsedOriginalPrice = null;
    if (String(originalPrice).trim() !== '') {
      parsedOriginalPrice = Math.round(Number(originalPrice));
      if (!Number.isFinite(parsedOriginalPrice) || parsedOriginalPrice < numPrice) {
        setFormError('Harga coret (original_price) harus lebih besar atau sama dengan harga jual.');
        return;
      }
    }

    const seenVariantNames = new Set();
    const cleanedVariants = [];
    for (const v of variants) {
      const vName = String(v.name || '').trim();
      if (!vName) {
        setFormError('Setiap baris varian wajib memiliki nama.');
        return;
      }
      const lower = vName.toLowerCase();
      if (seenVariantNames.has(lower)) {
        setFormError(`Nama varian "${vName}" duplikat dalam satu produk.`);
        return;
      }
      seenVariantNames.add(lower);

      const vStock = Math.round(Number(v.stock));
      if (!Number.isFinite(vStock) || vStock < 0) {
        setFormError(`Stok varian "${vName}" harus 0 atau lebih.`);
        return;
      }

      cleanedVariants.push({
        ...(v.id ? { id: v.id } : {}),
        name: vName,
        color_hex: v.useColor && v.color_hex ? v.color_hex.trim() : null,
        stock: vStock,
        is_active: v.is_active !== false,
      });
    }

    const specsObject = {};
    specRows.forEach((row) => {
      const k = String(row.key || '').trim();
      const val = String(row.value || '').trim();
      if (k && val) {
        specsObject[k] = val;
      }
    });

    // Payload sesuai kolom asli tabel `products` & `product_variants`
    // TIDAK menyertakan colors, sold_count, rating, atau reviews_count
    const productPayload = {
      name: trimmedName,
      slug: resolvedSlug,
      category,
      description: description.trim(),
      note: note.trim() || null,
      price: numPrice,
      original_price: parsedOriginalPrice,
      tag: tag.trim() || null,
      tag_type: tagType.trim() || null,
      sort_order: Math.round(Number(sortOrder)) || 0,
      is_active: isActive,
      image_url: images[0] || null,
      images,
      specs: specsObject,
      variants: cleanedVariants,
      ...(!hasVariants ? { stock: Math.max(0, Math.round(Number(manualStock) || 0)) } : {}),
    };

    setIsSaving(true);
    try {
      await onSave(productPayload);
    } catch (error) {
      console.error('[ProductFormModal] Gagal menyimpan produk:', error);
      setFormError(error.message || 'Gagal menyimpan produk ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay-custom fade-in" onClick={onClose}>
      <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-custom">
          <div className="modal-title-with-badge">
            <Sparkles size={20} color="#FF86C1" />
            <h3>{editingProduct ? 'Edit Produk Rajut' : 'Tambah Produk Baru'}</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-custom modal-form-scrollable">
            {formError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <div className="product-form-grid">
              {/* Name */}
              <div className="form-group-custom half-width">
                <label>Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Keychain Bunga, Pouch Mini..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              {/* Slug (otomatis dari name, unik) */}
              <div className="form-group-custom half-width">
                <label>Slug (otomatis & unik) *</label>
                <input
                  type="text"
                  required
                  placeholder="keychain-bunga"
                  value={slug}
                  onChange={(e) => {
                    setSlugEditedManually(true);
                    setSlug(e.target.value);
                  }}
                />
              </div>

              {/* Category */}
              <div className="form-group-custom half-width">
                <label>Kategori *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order & Status Aktif */}
              <div className="form-group-custom half-width">
                <label>Urutan Tampil (sort_order) & Status</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    style={{ width: '100px' }}
                    title="Urutan tampil produk (semakin kecil tampil lebih dulu)"
                  />
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: 0,
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: isActive ? '#15803D' : '#991B1B'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>{isActive ? 'Aktif (Tampil di Toko)' : 'Nonaktif (Disembunyikan)'}</span>
                  </label>
                </div>
              </div>

              {/* Price */}
              <div className="form-group-custom half-width">
                <label>Harga Jual (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  placeholder="Contoh: 15000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Original Price (opsional, >= price) */}
              <div className="form-group-custom half-width">
                <label>Harga Coret / Asli (opsional, ≥ harga jual)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Kosongkan jika tidak ada harga coret"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
              </div>

              {/* Tag & Tag Type */}
              <div className="form-group-custom half-width">
                <label>Label / Tag (opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Best Seller, New Arrival"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>

              <div className="form-group-custom half-width">
                <label>Tipe Label (tag_type)</label>
                <select value={tagType} onChange={(e) => setTagType(e.target.value)}>
                  <option value="">Tanpa Tipe Khusus</option>
                  <option value="bestseller">Best Seller (bestseller)</option>
                  <option value="new">New Arrival (new)</option>
                  <option value="madetoorder">Made to Order (madetoorder)</option>
                </select>
              </div>

              {/* Stok Manual (HANYA jika produk tidak memiliki varian) */}
              <div className="form-group-custom full-width">
                <label>Stok Produk</label>
                {hasVariants ? (
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.84rem',
                      color: '#166534'
                    }}
                  >
                    Total stok varian aktif saat ini: <strong>{calculatedActiveVariantStock}</strong>.{' '}
                    Kolom <code>products.stock</code> dihitung otomatis oleh trigger database (<code>sync_product_stock</code>).
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={manualStock}
                    onChange={(e) => setManualStock(e.target.value)}
                    placeholder="Masukkan stok produk (karena belum ada varian)"
                  />
                )}
              </div>

              {/* Upload Gambar ke Supabase Storage bucket `product-images` */}
              <div className="form-group-custom full-width">
                <label>Foto Produk (Upload ke bucket product-images • JPG/PNG/WEBP, maks 2 MB)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label
                      className="btn-sm btn-outline-pink"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isUploadingImage ? 'wait' : 'pointer',
                        margin: 0
                      }}
                    >
                      <Upload size={15} />
                      <span>{isUploadingImage ? 'Mengunggah...' : 'Upload Foto Produk'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        multiple
                        disabled={isUploadingImage}
                        onChange={handleImageFilesUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                      Foto pertama otomatis menjadi foto utama (<code>image_url</code>). Semua foto disimpan di <code>images</code>.
                    </span>
                  </div>

                  {images.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: '10px'
                      }}
                    >
                      {images.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          style={{
                            border: idx === 0 ? '2px solid #FF86C1' : '1px solid #E5E7EB',
                            borderRadius: '10px',
                            padding: '6px',
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '6px', background: '#FAF4EE' }}>
                            <img
                              src={getSafeProductImage(url, name || 'Foto Produk')}
                              alt={`Foto ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => handleProductImageError(e, name || 'Foto Produk', url)}
                            />
                            {idx === 0 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  background: '#FF86C1',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '999px'
                                }}
                              >
                                Utama
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              disabled={idx === 0}
                              onClick={() => handleMoveImage(idx, -1)}
                              title="Geser kiri"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              disabled={idx === images.length - 1}
                              onClick={() => handleMoveImage(idx, 1)}
                              title="Geser kanan"
                            >
                              <ChevronRight size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-del-chip"
                              onClick={() => handleRemoveImage(idx)}
                              title="Hapus foto"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        border: '1px dashed #E5E7EB',
                        borderRadius: '10px',
                        padding: '14px',
                        fontSize: '0.82rem',
                        color: '#6B7280',
                        textAlign: 'center'
                      }}
                    >
                      Belum ada foto produk. Klik tombol "Upload Foto Produk" di atas.
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="form-group-custom full-width">
                <label>Deskripsi Produk</label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan detail keunikan produk, bahan, dan kegunaannya..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Note */}
              <div className="form-group-custom full-width">
                <label>Catatan Produk (note)</label>
                <input
                  type="text"
                  placeholder="Contoh: Warna dapat sedikit berbeda karena pencahayaan layar."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Variants (tabel product_variants) */}
              <div className="form-group-custom full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Varian Produk (tabel product_variants)</label>
                  <button
                    type="button"
                    className="btn-sm btn-outline-pink"
                    onClick={handleAddVariantRow}
                  >
                    + Tambah Baris Varian
                  </button>
                </div>

                {variants.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed #E5E7EB',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '0.82rem',
                      color: '#6B7280'
                    }}
                  >
                    Belum ada varian. Produk tanpa varian memakai stok manual di atas. Klik "+ Tambah Baris Varian" untuk menambah varian warna/model.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {variants.map((v, idx) => (
                      <div
                        key={v.id || `new-${idx}`}
                        className="admin-variant-row"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          background: v.is_active ? '#fff' : '#F9FAFB'
                        }}
                      >
                        <input
                          type="text"
                          required
                          placeholder="Nama varian (unik)"
                          value={v.name}
                          onChange={(e) => handleUpdateVariantRow(idx, { name: e.target.value })}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="checkbox"
                            checked={v.useColor}
                            onChange={(e) =>
                              handleUpdateVariantRow(idx, {
                                useColor: e.target.checked,
                                color_hex: e.target.checked ? (v.color_hex || '#FF86C1') : ''
                              })
                            }
                            title="Aktifkan/nonaktifkan warna hex (opsional)"
                          />
                          {v.useColor ? (
                            <input
                              type="color"
                              value={v.color_hex || '#FF86C1'}
                              onChange={(e) => handleUpdateVariantRow(idx, { color_hex: e.target.value })}
                              className="color-picker-input"
                              title="Pilih warna varian"
                            />
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Tanpa warna</span>
                          )}
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) =>
                            handleUpdateVariantRow(idx, { stock: Math.max(0, Number(e.target.value) || 0) })
                          }
                          title="Stok varian (>= 0)"
                          placeholder="Stok"
                        />

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0, fontSize: '0.78rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={v.is_active}
                            onChange={(e) => handleUpdateVariantRow(idx, { is_active: e.target.checked })}
                          />
                          <span>Aktif</span>
                        </label>

                        <button
                          type="button"
                          className="btn-del-chip"
                          onClick={() => handleRemoveVariantRow(idx)}
                          title="Hapus varian"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specs (daftar spesifikasi dinamis di kolom specs jsonb) */}
              <div className="form-group-custom full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Spesifikasi Produk (specs)</label>
                  <button
                    type="button"
                    className="btn-sm btn-outline-pink"
                    onClick={handleAddSpecRow}
                  >
                    + Tambah Spesifikasi
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {specRows.map((row, idx) => (
                    <div key={idx} className="admin-spec-row">
                      <input
                        type="text"
                        placeholder="Label (misal: bahan, ukuran)"
                        value={row.key}
                        onChange={(e) => handleUpdateSpecRow(idx, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Nilai (misal: Milk Cotton 5 ply)"
                        value={row.value}
                        onChange={(e) => handleUpdateSpecRow(idx, 'value', e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-del-chip"
                        onClick={() => handleRemoveSpecRow(idx)}
                        title="Hapus baris spesifikasi"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving || isUploadingImage}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || isUploadingImage}>
              <CheckCircle2 size={16} />
              <span>
                {isSaving
                  ? 'Menyimpan...'
                  : editingProduct
                  ? 'Simpan Perubahan'
                  : 'Tambahkan Produk ke Toko'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
