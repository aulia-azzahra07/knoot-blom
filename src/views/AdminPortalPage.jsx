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
  Banknote
} from 'lucide-react';
import { CATEGORIES } from '../data/products';
import AdminCustomerChat from '../components/AdminCustomerChat';
import {
  getAdminTotalUnreadCount,
  subscribeToAllMessages,
  getOrCreateCustomerConversation,
  getAdminConversations
} from '../services/adminChatService';
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

  // Orders State
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedOrderForResi, setSelectedOrderForResi] = useState(null);
  const [inputResi, setInputResi] = useState('');
  const [inputCourier, setInputCourier] = useState('J&T Express Se-Palembang');
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

  // COD Status: Dikemas, Dikirim, Diantar Kurir, Selesai, Dibatalkan
  const packingOrders = orders.filter((o) => o.status === 'Dikemas');
  const shippingOrders = orders.filter((o) => o.status === 'Dikirim');
  const deliveringOrders = orders.filter((o) => o.status === 'Diantar Kurir');
  const completedOrders = orders.filter((o) => o.status === 'Selesai');
  const cancelledOrders = orders.filter((o) => o.status === 'Dibatalkan');
  const pendingOrders = [...packingOrders, ...shippingOrders, ...deliveringOrders];

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      orderStatusFilter === 'all'
        ? true
        : orderStatusFilter === 'packing'
          ? order.status === 'Dikemas'
          : orderStatusFilter === 'shipping'
            ? order.status === 'Dikirim'
            : orderStatusFilter === 'delivering'
              ? order.status === 'Diantar Kurir'
              : orderStatusFilter === 'completed'
                ? order.status === 'Selesai'
                : orderStatusFilter === 'cancelled'
                  ? order.status === 'Dibatalkan'
                  : true;

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
      case 'Dikemas':
        return 'badge-processing';
      case 'Dikirim':
        return 'badge-shipping';
      case 'Diantar Kurir':
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
                <span className="metric-hint">Perlu dirajut & disiapkan packing</span>
              </div>
            </div>

            <div className="admin-metric-card metric-blue">
              <div className="metric-icon-box">
                <Truck size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Sedang Dalam Pengiriman</span>
                <h3 className="metric-value">{shippingOrders.length} Paket</h3>
                <span className="metric-hint">Kurir JNE / J&T / Instant Palembang</span>
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
                    setOrderStatusFilter('processing');
                  }}
                >
                  <div className="action-tile-icon">
                    <Clock size={24} />
                  </div>
                  <div className="action-tile-text">
                    <strong>Pesanan Perlu Diproses ({pendingOrders.length})</strong>
                    <span>Lihat detail pesanan dan update nomor resi pengiriman</span>
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
                className={`filter-pill ${orderStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('all')}
              >
                Semua ({orders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'packing' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('packing')}
              >
                Dikemas ({packingOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'shipping' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('shipping')}
              >
                Dikirim ({shippingOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'delivering' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('delivering')}
              >
                Diantar Kurir ({deliveringOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('completed')}
              >
                Selesai ({completedOrders.length})
              </button>
              <button
                className={`filter-pill ${orderStatusFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('cancelled')}
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
              <h3>Tidak ada pesanan ditemukan</h3>
              <p>Coba ganti filter status atau kata kunci pencarian Anda.</p>
              <button
                className="btn-secondary"
                onClick={() => {
                  setOrderStatusFilter('all');
                  setOrderSearchQuery('');
                }}
              >
                Reset Filter
              </button>
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
                            <span className="detail-label">Pengiriman:</span>
                            <span className="detail-val">
                              {order.shippingMethod || 'Reguler Se-Palembang'}
                            </span>
                          </div>

                          {order.trackingNumber && (
                            <div className="detail-row resi-row">
                              <span className="detail-label">No. Resi:</span>
                              <strong className="detail-val resi-code">
                                {order.trackingNumber}
                              </strong>
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
                          <strong>Tagihan COD Kurir: {formatRupiah(order.total)}</strong>
                        </div>
                      )}

                      <div className="status-update-buttons">
                        {/* Dikemas → Tombol Kirim (buka modal resi+kurir) */}
                        {order.status === 'Dikemas' && (
                          <button
                            className="btn-sm btn-primary-pink"
                            onClick={() => {
                              setSelectedOrderForResi(order);
                              setInputResi('');
                              setInputCourier('J&T Express Se-Palembang');
                            }}
                          >
                            <Truck size={15} />
                            <span>Kirim Pesanan</span>
                          </button>
                        )}

                        {/* Dikirim → Tandai Diantar Kurir */}
                        {order.status === 'Dikirim' && (
                          <button
                            className="btn-sm btn-blue"
                            onClick={() => onUpdateOrderStatus(order.id, 'Diantar Kurir', order.trackingNumber, order.courier || '')}
                          >
                            <Navigation size={15} />
                            <span>Tandai Diantar Kurir</span>
                          </button>
                        )}

                        {/* Diantar Kurir → Tandai Selesai */}
                        {order.status === 'Diantar Kurir' && (
                          <button
                            className="btn-sm btn-mint"
                            onClick={() => onUpdateOrderStatus(order.id, 'Selesai', order.trackingNumber, order.courier || '')}
                          >
                            <CheckCircle2 size={15} />
                            <span>Tandai Selesai (COD Lunas)</span>
                          </button>
                        )}

                        {/* Dikemas atau Diantar Kurir → Batalkan */}
                        {(order.status === 'Dikemas' || order.status === 'Diantar Kurir') && (
                          <button
                            className="btn-sm btn-outline-danger"
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

                        {/* Final state badges */}
                        {order.status === 'Selesai' && (
                          <span className="status-pill badge-completed">✓ Selesai — COD Lunas</span>
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
                    <div className="prod-cat-pill">
                      {CATEGORIES.find((c) => c.id === prod.category)?.name || prod.category}
                    </div>

                    <h4 className="prod-name-title">{prod.name}</h4>

                    <div className="prod-price-row">
                      <strong className="current-price">{formatRupiah(prod.price)}</strong>
                      {prod.originalPrice && prod.originalPrice > prod.price && (
                        <span className="orig-price">{formatRupiah(prod.originalPrice)}</span>
                      )}
                    </div>

                    <p className="prod-desc-preview">{prod.description}</p>

                    {/* Color variants preview */}
                    {prod.colors && prod.colors.length > 0 && (
                      <div className="colors-preview-row">
                        <span className="color-label">Varian:</span>
                        <div className="color-dots-list">
                          {prod.colors.slice(0, 5).map((c, i) => (
                            <span
                              key={i}
                              className="color-dot-mini"
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                          {prod.colors.length > 5 && (
                            <span className="more-colors-count">+{prod.colors.length - 5}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="prod-stats-row">
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
                    <li>✓ Custom Order rajut & Custom DIY Starter Kit</li>
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
                    <li>✓ <strong>Memperbarui status pesanan</strong> (Sedang Diproses → Dikirim → Selesai)</li>
                    <li>✓ <strong>Input nomor resi</strong> ekspedisi (JNE, J&T, Grab, dll)</li>
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
            try {
              if (editingProduct) {
                await onUpdateProduct({
                  ...editingProduct,
                  ...prodData,
                });

                showToast(
                  `Produk "${prodData.name}" berhasil diperbarui! ♡`
                );
              } else {
                await onAddProduct(prodData);

                showToast(
                  `Produk baru "${prodData.name}" berhasil ditambahkan ke katalog! ✨`
                );
              }

              setIsProductModalOpen(false);
              setEditingProduct(null);
            } catch (error) {
              console.error('Gagal menyimpan produk:', error);

              showToast(
                `Gagal menyimpan produk: ${error.message || 'Terjadi kesalahan.'}`
              );
            }
          }}
        />
      )}


      {/* MODAL 2: INPUT RESI PENGIRIMAN */}
      {selectedOrderForResi && (
        <div className="modal-overlay-custom fade-in" onClick={() => setSelectedOrderForResi(null)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3>🚚 Kirim Pesanan & Input Resi</h3>
              <button className="btn-close-modal" onClick={() => setSelectedOrderForResi(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              <p className="modal-desc-text">
                Pesanan <strong>#{selectedOrderForResi.id}</strong> ({selectedOrderForResi.customer?.name}).
                Status akan diubah menjadi <strong>"Dikirim"</strong>.
              </p>

              <div className="form-group-custom">
                <label>Nomor Resi *</label>
                <input
                  type="text"
                  placeholder="Contoh: KB-JNE-8829104 / JT123456789"
                  value={inputResi}
                  onChange={(e) => setInputResi(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group-custom" style={{ marginTop: '12px' }}>
                <label>Nama Kurir / Ekspedisi *</label>
                <select
                  value={inputCourier}
                  onChange={(e) => setInputCourier(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}
                >
                  <option value="J&T Express Se-Palembang">J&T Express Se-Palembang</option>
                  <option value="JNE Reguler">JNE Reguler</option>
                  <option value="Kurir Kampus Unsri">Kurir Kampus Unsri</option>
                  <option value="Kurir Lokal Palembang">Kurir Lokal Palembang</option>
                  <option value="SiCepat Reguler">SiCepat Reguler</option>
                  <option value="AnterAja">AnterAja</option>
                </select>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn-secondary"
                onClick={() => setSelectedOrderForResi(null)}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const resiValue = inputResi.trim() || `KB-EXP-${Date.now().toString().slice(-6)}`;
                  onUpdateOrderStatus(selectedOrderForResi.id, 'Dikirim', resiValue, inputCourier);
                  setSelectedOrderForResi(null);
                  showToast(`Pesanan #${selectedOrderForResi.id} berhasil dikirim via ${inputCourier} dengan resi ${resiValue}!`);
                }}
              >
                Simpan & Ubah Status ke Dikirim
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
                onClick={() => {
                  if (!inputAlasanBatal.trim()) {
                    showToast('Alasan pembatalan wajib diisi!');
                    return;
                  }
                  onUpdateOrderStatus(orderToCancel.id, 'Dibatalkan', '', '', inputAlasanBatal.trim());
                  setIsCancelModalOpen(false);
                  setOrderToCancel(null);
                  showToast(`Pesanan #${orderToCancel.id} telah dibatalkan.`);
                }}
              >
                Ya, Batalkan Pesanan
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
              <h3>📄 Label Pengiriman & Invoice Pesanan</h3>
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
                      <p>Ekspedisi: {selectedOrderForInvoice.shippingMethod || 'Reguler'}</p>
                      {selectedOrderForInvoice.trackingNumber && (
                        <p>No. Resi: <strong>{selectedOrderForInvoice.trackingNumber}</strong></p>
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
                Apakah Anda yakin ingin menghapus produk <strong>"{deleteConfirmProduct.name}"</strong> dari katalog?
                Tindakan ini tidak dapat dibatalkan.
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
                    await onDeleteProduct(deleteConfirmProduct.id);

                    showToast(
                      `Produk "${deleteConfirmProduct.name}" berhasil dihapus.`
                    );

                    setDeleteConfirmProduct(null);
                  } catch (error) {
                    console.error('Gagal menghapus produk:', error);

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
// MODAL: FORM ADD / EDIT PRODUCT
// ----------------------------------------------------------------------
function ProductFormModal({ isOpen, editingProduct, onClose, onSave }) {
  const [name, setName] = useState(editingProduct?.name || '');
  const [category, setCategory] = useState(editingProduct?.category || 'aksesoris');
  const [price, setPrice] = useState(editingProduct?.price || 25000);
  const [originalPrice, setOriginalPrice] = useState(editingProduct?.originalPrice || 30000);
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [image, setImage] = useState(editingProduct?.image || '/images/tulip-keychain.jpg');
  const [tag, setTag] = useState(editingProduct?.tag || 'New Arrival');
  const [specsSize, setSpecsSize] = useState(editingProduct?.specs?.ukuran || '± 10 cm');
  const [specsMaterial, setSpecsMaterial] = useState(editingProduct?.specs?.bahan || 'Benang Milk Cotton Premium');
  const [specsTime, setSpecsTime] = useState(editingProduct?.specs?.waktuPengerjaan || '1-2 hari');

  // Colors management
  const [colors, setColors] = useState(
    editingProduct?.colors || [
      { name: 'Soft Pink', hex: '#FF86C1' },
      { name: 'Cream Daisy', hex: '#FEDEA4' },
      { name: 'Mint Green', hex: '#5DE5AB' },
      { name: 'Sky Blue', hex: '#A7D8FF' },
      { name: 'Lilac', hex: '#EEDBFF' }
    ]
  );
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#FF86C1');

  // Preset images helper
  const presetImages = [
    { label: 'Tulip Keychain', url: '/images/tulip-keychain.jpg' },
    { label: 'Mini Crochet Bag', url: '/images/mini-crochet-bag.jpg' },
    { label: 'Bear Amigurumi', url: '/images/bear-amigurumi.jpg' },
    { label: 'Strawberry Pouch', url: '/images/strawberry-pouch.jpg' },
    { label: 'DIY Crochet Kit', url: '/images/diy-crochet-kit.jpg' },
    { label: 'Bunny Amigurumi', url: '/images/hero-bunny.jpg' }
  ];

  const handleAddColor = () => {
    if (!newColorName.trim()) return;

    setColors([
      ...colors,
      {
        name: newColorName.trim(),
        hex: newColorHex,
        stock: 1
      }
    ]);

    setNewColorName('');
  };

  const handleRemoveColor = (index) => {
    setColors(colors.filter((_, i) => i !== index));
  };
  const handleUpdateColorStock = (index, value) => {
    const stock = Math.max(0, Number(value) || 0);

    setColors((prev) =>
      prev.map((color, i) =>
        i === index ? { ...color, stock } : color
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prodId =
      editingProduct?.id ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;

    const productPayload = {
      id: prodId,
      name: name.trim(),
      category,
      price: Number(price),
      originalPrice: Number(originalPrice) || Number(price),
      rating: editingProduct?.rating || 5.0,
      reviewsCount: editingProduct?.reviewsCount || 1,
      soldCount: editingProduct?.soldCount || 0,
      tag: tag.trim(),
      tagType: tag.toLowerCase().includes('best') ? 'bestseller' : 'new',
      image,
      images: editingProduct?.images || [image],
      colors: colors.map((color) => ({
        name: color.name,
        hex: color.hex,
        stock: Math.max(0, Number(color.stock) || 0)
      })),
      description: description.trim(),
      specs: {
        ukuran: specsSize.trim(),
        bahan: specsMaterial.trim(),
        warna: 'Pilihan warna sesuai varian',
        cocokUntuk: 'Aksesoris, fashion, kado spesial',
        waktuPengerjaan: specsTime.trim()
      },
      note: 'Warna dapat sedikit berbeda karena pencahayaan dan resolusi layar.'
    };

    onSave(productPayload);
  };

  return (
    <div className="modal-overlay-custom fade-in" onClick={onClose}>
      <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-custom">
          <div className="modal-title-with-badge">
            <Sparkles size={20} color="#FF86C1" />
            <h3>{editingProduct ? 'Edit Produk Rajut' : 'Tambah Produk Baru'}</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-custom modal-form-scrollable">
            {/* Form grid */}
            <div className="product-form-grid">
              {/* Product Name */}
              <div className="form-group-custom full-width">
                <label>Nama Produk Rajut *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sunflower Crochet Coaster, Daisy Sling Bag..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="form-group-custom half-width">
                <label>Kategori Produk *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag / Badge */}
              <div className="form-group-custom half-width">
                <label>Label Promo / Badge</label>
                <input
                  type="text"
                  placeholder="Contoh: Best Seller, New Arrival, Promo Launching"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>

              {/* Price */}
              <div className="form-group-custom half-width">
                <label>Harga Jual (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Original Price */}
              <div className="form-group-custom half-width">
                <label>Harga Asli / Coret (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="Kosongkan jika tidak ada diskon"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
              </div>

              {/* Image Preview & URL */}
              <div className="form-group-custom full-width">
                <label>Foto Produk Utama (URL atau Pilih Preset)</label>
                <div className="image-input-container">
                  <div className="img-preview-box">
                    <img
                      src={getSafeProductImage(image, name || 'Preview Produk')}
                      alt="Preview"
                      onError={(e) => handleProductImageError(e, name || 'Preview Produk', image)}
                    />
                  </div>
                  <div className="img-inputs-col">
                    <input
                      type="text"
                      placeholder="Masukkan URL gambar atau pilih preset di bawah"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                    />

                    <div className="preset-buttons-row">
                      <span className="preset-label">Pilihan Preset Cepat:</span>
                      <div className="presets-wrap">
                        {presetImages.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`btn-preset-thumb ${image === p.url ? 'active' : ''}`}
                            onClick={() => setImage(p.url)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-group-custom full-width">
                <label>Deskripsi Produk *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ceritakan detail keunikan produk, sentuhan handmade, kegunaan, dan kelebihannya..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Color Variants */}
              <div className="form-group-custom full-width">
                <label>Varian Warna Benang yang Tersedia</label>
                <div className="colors-management-block">
                  <div className="colors-chips-list">
                    {colors.map((c, idx) => (
                      <div key={idx} className="color-chip">
                        <span
                          className="color-dot"
                          style={{ backgroundColor: c.hex }}
                        />

                        <span>{c.name}</span>

                        <input
                          type="number"
                          min="0"
                          value={c.stock ?? 1}
                          onChange={(e) =>
                            handleUpdateColorStock(idx, e.target.value)
                          }
                          className="color-stock-input"
                          title="Jumlah stok varian"
                        />

                        <button
                          type="button"
                          className="btn-del-chip"
                          onClick={() => handleRemoveColor(idx)}
                          title="Hapus varian"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-color-input-row">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="color-picker-input"
                    />
                    <input
                      type="text"
                      placeholder="Nama warna (misal: Dusty Pink, Sage Green...)"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-sm btn-outline-pink"
                      onClick={handleAddColor}
                    >
                      + Tambah Varian
                    </button>
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div className="form-group-custom one-third">
                <label>Ukuran Produk</label>
                <input
                  type="text"
                  placeholder="Contoh: ± 8 cm x 12 cm"
                  value={specsSize}
                  onChange={(e) => setSpecsSize(e.target.value)}
                />
              </div>

              <div className="form-group-custom one-third">
                <label>Bahan Benang</label>
                <input
                  type="text"
                  placeholder="Contoh: Milk Cotton 5 ply"
                  value={specsMaterial}
                  onChange={(e) => setSpecsMaterial(e.target.value)}
                />
              </div>

              <div className="form-group-custom one-third">
                <label>Waktu Pengerjaan</label>
                <input
                  type="text"
                  placeholder="Contoh: Ready Stock / 1-2 hari"
                  value={specsTime}
                  onChange={(e) => setSpecsTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle2 size={16} />
              <span>{editingProduct ? 'Simpan Perubahan' : 'Tambahkan Produk ke Toko'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
