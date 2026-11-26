import { supabase } from '../lib/supabase';
import { fetchProductsByIds } from './productService';
import { PRODUCT_IMAGE_PLACEHOLDER } from '../utils/productImage';

const API_BASE_URL = 'http://localhost:5000';

/**
 * Ambil map produk (byId & byName) -> image_url langsung dari tabel `products` Supabase.
 * Tidak lagi memakai fallback gambar produk lokal/dummy.
 */
const fetchProductImagesMap = async () => {
  try {
    const { data, error } = await supabase.from('products').select('id, name, image_url');
    if (error) {
      console.warn('[OrderService] Gagal memuat image_url produk dari Supabase:', error.message);
      return { byId: {}, byName: {} };
    }
    if (Array.isArray(data)) {
      const byId = {};
      const byName = {};
      data.forEach((p) => {
        const url = typeof p.image_url === 'string' ? p.image_url.trim() : '';
        if (p.id && url) byId[p.id] = url;
        if (p.name && url) byName[p.name.trim().toLowerCase()] = url;
      });
      return { byId, byName };
    }
  } catch (err) {
    console.warn('[OrderService] Error saat memuat gambar produk:', err.message);
  }
  return { byId: {}, byName: {} };
};

/**
 * Cari URL gambar resmi produk dari database `products`.
 * Jika tidak ditemukan, kembalikan placeholder netral (bukan gambar produk lain).
 */
const resolveOrderItemImage = (item, productImagesMap = { byId: {}, byName: {} }) => {
  const directUrl = item.image_url || item.products?.image_url || '';
  if (typeof directUrl === 'string' && directUrl.trim()) {
    return directUrl.trim();
  }

  const byId = productImagesMap?.byId || {};
  if (item.product_id && byId[item.product_id]) {
    return byId[item.product_id];
  }

  // Untuk order lama yang product_id-nya null, cocokkan awalan nama produk dengan tabel `products`
  const byName = productImagesMap?.byName || {};
  const baseName = String(item.product_name || '').split(' - ')[0].trim().toLowerCase();
  if (baseName && byName[baseName]) {
    return byName[baseName];
  }

  return PRODUCT_IMAGE_PLACEHOLDER;
};

/**
 * Format data pesanan dari Supabase agar sesuai dengan struktur yang ditampilkan di Admin Portal & Akun Pembeli
 */
export const mapSupabaseOrderToUi = (o, productImagesMap = {}) => {
  let statusLabel = 'Dikemas';
  let statusBadge = 'processing';

  const orderStatus = (o.order_status || o.status || '').toLowerCase();
  const paymentStatus = (o.payment_status || '').toLowerCase();

  if (orderStatus === 'cancelled' || orderStatus === 'dibatalkan' || paymentStatus === 'failed') {
    statusLabel = 'Dibatalkan';
    statusBadge = 'cancelled';
  } else if (orderStatus === 'selesai' || orderStatus === 'completed' || orderStatus === 'delivered') {
    statusLabel = 'Selesai';
    statusBadge = 'completed';
  } else if (
    orderStatus === 'diantar kurir' ||
    orderStatus === 'diantar' ||
    orderStatus === 'delivering' ||
    orderStatus.includes('diantar')
  ) {
    statusLabel = 'Diantar Kurir';
    statusBadge = 'delivering';
  } else if (orderStatus === 'shipped' || orderStatus === 'dikirim') {
    statusLabel = 'Dikirim';
    statusBadge = 'shipping';
  } else {
    // Alur Baru Tunai: Status awal otomatis "Dikemas"
    statusLabel = 'Dikemas';
    statusBadge = 'processing';
  }

  // Status bayar: 'belum_dibayar' atau 'dibayar' (otomatis dibayar jika status Selesai)
  const statusBayar = o.status_bayar || (statusLabel === 'Selesai' || paymentStatus === 'paid' ? 'dibayar' : 'belum_dibayar');

  const createdDate = o.created_at ? new Date(o.created_at) : new Date();
  const dateFormatted =
    createdDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) +
    ', ' +
    createdDate.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const rawItems = Array.isArray(o.order_items) ? o.order_items : [];
  const items = rawItems.map((item) => ({
    id: item.product_id || item.id,
    productId: item.product_id,
    name: item.product_name || 'Produk Rajut Knot & Bloom',
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
    image: resolveOrderItemImage(item, productImagesMap)
  }));

  const itemsSummary = items.length > 0
    ? items.map((i) => `${i.name} (x${i.quantity})`).join(', ')
    : 'Produk Rajut Knot & Bloom';

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0) || 1;

  const cost = Number(o.shipping_cost) || 0;
  const shippingDesc = cost === 0
    ? 'Gratis Ongkir Se-Palembang (Min. 50k)'
    : `Reguler Se-Palembang (Rp ${cost.toLocaleString('id-ID')})`;

  const rawHistory = Array.isArray(o.order_status_history) && o.order_status_history.length > 0
    ? [...o.order_status_history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : (Array.isArray(o.history) ? o.history : []);

  return {
    id: o.order_number || o.id,
    dbId: o.id,
    user_id: o.user_id,
    userId: o.user_id,
    created_at: o.created_at,
    date: dateFormatted,
    status: statusLabel,
    statusBadge: statusBadge,
    subtotal: Number(o.subtotal) || 0,
    shippingCost: cost,
    total: Number(o.total) || 0,
    shippingMethod: shippingDesc,
    paymentMethod: o.payment_method || 'Tunai',
    paymentStatus: o.payment_status || 'pending',
    status_bayar: statusBayar,
    trackingNumber: o.no_resi || o.tracking_number || '',
    courier: o.kurir || o.courier || '',
    customer: {
      name: o.customer_name || 'Pelanggan',
      phone: o.phone || '-',
      address: o.address || '-'
    },
    items: items,
    itemsSummary: itemsSummary,
    itemCount: itemCount,
    notes: o.notes || '',
    alasan_batal: o.alasan_batal || '',
    history: rawHistory,
    raw: o
  };
};

/**
 * Filter pembantu untuk membuang order dummy lama dari penyimpanan lokal
 */
const isRealOrder = (order) => {
  if (!order || !order.id) return false;
  const idStr = String(order.id);
  if (idStr.startsWith('KB12345') || idStr === 'KB123456' || idStr === 'KB123455') {
    return false;
  }
  return true;
};

/**
 * Mengambil daftar seluruh pesanan resmi secara realtime langsung dari Supabase.
 * Tidak menggunakan data dummy.
 */
export const fetchOrders = async () => {
  const productImagesMap = await fetchProductImagesMap();

  // 1. Prioritas Utama: Langsung dari Supabase SDK (Koneksi Cepat & Realtime)
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*), order_status_history(*)')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((o) => mapSupabaseOrderToUi(o, productImagesMap));
    }
    if (error) {
      console.warn('Supabase SDK error:', error.message);
    }
  } catch (err) {
    console.warn('Gagal fetch orders langsung dari Supabase SDK:', err.message);
  }

  // 2. Prioritas Kedua: Backend API Express (/api/orders) jika backend sedang aktif
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        return data.orders.map((o) => mapSupabaseOrderToUi(o, productImagesMap));
      }
    }
  } catch (err) {
    // Backend offline is normal in dev mode
  }

  // 3. Fallback: LocalStorage hanya jika berisi pesanan asli buatan pengguna
  try {
    const saved = localStorage.getItem('kb_orders');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(isRealOrder);
        return filtered;
      }
    }
  } catch {}

  return [];
};

/**
 * Berlangganan (Subscribe) ke perubahan realtime database Supabase
 * Callback akan dipanggil setiap ada pesanan baru, pembaruan status, atau pembayaran
 */
export const subscribeToOrders = (onUpdate) => {
  try {
    const channel = supabase
      .channel('orders-realtime-knotbloom')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('[Supabase Realtime] Perubahan pesanan terdeteksi:', payload.eventType, payload.new?.order_number);
          const fresh = await fetchOrders();
          if (typeof onUpdate === 'function') {
            onUpdate(fresh);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        async (payload) => {
          console.log('[Supabase Realtime] Perubahan rincian barang:', payload.eventType);
          const fresh = await fetchOrders();
          if (typeof onUpdate === 'function') {
            onUpdate(fresh);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        async (payload) => {
          console.log('[Supabase Realtime] Perubahan status pembayaran:', payload.eventType);
          const fresh = await fetchOrders();
          if (typeof onUpdate === 'function') {
            onUpdate(fresh);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_status_history'
        },
        async (payload) => {
          console.log('[Supabase Realtime] Perubahan riwayat tracking order:', payload.eventType);
          const fresh = await fetchOrders();
          if (typeof onUpdate === 'function') {
            onUpdate(fresh);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime Status]', status);
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Gagal menghubungkan channel:', err.message);
    return () => {};
  }
};

/**
 * Menyimpan pesanan COD langsung ke Supabase.
 * Selalu ambil user dari Supabase Auth — tidak pernah dari parameter bebas.
 */
export const createCashOrderDirectly = async ({
  customerName,
  phone,
  address,
  subtotal,
  shippingCost,
  total,
  notes,
  cartItems
}) => {
  // ── STEP 0: Verifikasi user yang sedang login via Supabase Auth ──────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const err = new Error('Kamu harus login terlebih dahulu untuk membuat pesanan.');
    err.code = 'NOT_AUTHENTICATED';
    throw err;
  }

  const authenticatedUserId = user.id;

  // ── STEP 1: Buat nomor pesanan unik & verifikasi harga dari database ─────
  const timestamp = Date.now();
  const orderNumber = `KB-${timestamp.toString().slice(-6)}`;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const dbProductsMap = Array.isArray(cartItems) && cartItems.length > 0
    ? await fetchProductsByIds(
        cartItems
          .filter((item) => !item.isCustom && !item.isCustomKit)
          .map((item) => item.id || item.productId)
      )
    : {};

  const verifiedItems = Array.isArray(cartItems)
    ? cartItems.map((item) => {
        const rawId = item.id || item.productId;
        const isValidUUID = typeof rawId === 'string' && uuidRegex.test(rawId);
        const dbProd = !item.isCustom && !item.isCustomKit && isValidUUID ? dbProductsMap[rawId] : null;
        const itemPrice = dbProd ? Number(dbProd.price) : (Number(item.price) || 0);
        const itemQty = Number(item.quantity) || 1;
        const itemName = dbProd ? dbProd.name : (item.name || 'Produk');
        return {
          product_id: isValidUUID ? rawId : null,
          product_name: `${itemName}${item.selectedColor ? ` - ${item.selectedColor.name || item.selectedColor}` : ''}`,
          price: itemPrice,
          quantity: itemQty,
          subtotal: itemPrice * itemQty
        };
      })
    : [];

  const verifiedSubtotal = verifiedItems.length > 0
    ? verifiedItems.reduce((sum, item) => sum + item.subtotal, 0)
    : Number(subtotal) || 0;
  const verifiedShippingCost = verifiedItems.length > 0
    ? (verifiedSubtotal >= 50000 ? 0 : 5000)
    : (Number(shippingCost) || 0);
  const verifiedTotal = verifiedItems.length > 0
    ? verifiedSubtotal + verifiedShippingCost
    : (Number(total) || 0);

  console.log('[Checkout] Membuat pesanan:', orderNumber, 'untuk user:', authenticatedUserId);

  // ── STEP 2: Insert ke tabel orders (harga terverifikasi dari database) ───
  const orderPayload = {
    order_number: orderNumber,
    customer_name: customerName,
    phone: phone,
    address: address + (notes ? ` (Catatan: ${notes})` : ''),
    subtotal: verifiedSubtotal,
    shipping_cost: verifiedShippingCost,
    total: verifiedTotal,
    payment_method: 'COD',
    payment_status: 'belum_dibayar',
    order_status: 'Dikemas',
    user_id: authenticatedUserId
  };

  console.log('[Checkout] Payload orders:', orderPayload);

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();

  if (orderError) {
    console.error('[Checkout] GAGAL insert orders:', orderError);
    // Tampilkan pesan error asli dari Supabase
    throw new Error(`Gagal menyimpan pesanan: ${orderError.message} (kode: ${orderError.code})`);
  }

  console.log('[Checkout] ✅ Order berhasil dibuat:', orderData.id);

  // ── STEP 3: Insert ke order_items (memakai harga dari database) ──────────
  if (verifiedItems.length > 0) {
    const itemsPayload = verifiedItems.map((item) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsError) {
      console.error('[Checkout] Gagal insert order_items:', itemsError);
      // Lanjut saja — pesanan utama sudah tersimpan
    } else {
      console.log('[Checkout] ✅ order_items berhasil disimpan:', itemsPayload.length, 'item');
    }
  }

  // ── STEP 4: Catat riwayat awal ke order_status_history ───────────────────
  const { error: histError } = await supabase.from('order_status_history').insert({
    order_id: orderData.id,
    status: 'Dikemas',
    keterangan: 'Pesanan COD berhasil dibuat. Perajin Knot & Bloom mulai menyiapkan pesanan.',
    created_at: new Date().toISOString()
  });

  if (histError) {
    console.warn('[Checkout] Gagal insert order_status_history:', histError.message);
  } else {
    console.log('[Checkout] ✅ order_status_history berhasil dicatat');
  }

  return {
    success: true,
    isCash: true,
    orderId: orderData.id,
    orderNumber: orderNumber,
    subtotal: verifiedSubtotal,
    shippingCost: verifiedShippingCost,
    total: verifiedTotal,
    status: 'Dikemas',
    status_bayar: 'belum_dibayar'
  };
};

/**
 * Memperbarui status pesanan di database Supabase (dengan validasi alur dan histori)
 */
export const updateOrderStatusOnServer = async (orderId, newStatus, trackingNumber = '', courier = '', alasanBatal = '') => {
  // 1. Prioritaskan panggil backend Express API agar tervalidasi di server
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus,
        trackingNumber,
        courier,
        alasan_batal: alasanBatal
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    } else if (!res.ok) {
      return { success: false, message: data.message || 'Gagal mengubah status di server.' };
    }
  } catch (err) {
    console.warn('Backend API tidak merespons, beralih ke fallback Supabase:', err.message);
  }

  // 2. Fallback update langsung ke database Supabase
  try {
    const updatePayload = {
      order_status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'Selesai') {
      updatePayload.payment_status = 'paid';
    } else if (newStatus === 'Dibatalkan') {
      updatePayload.payment_status = 'failed';
      if (alasanBatal && alasanBatal.trim()) {
        updatePayload.alasan_batal = alasanBatal.trim();
      }
    }

    if (newStatus === 'Dikirim') {
      if (trackingNumber) updatePayload.no_resi = trackingNumber;
      if (courier) updatePayload.kurir = courier;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const queryField = uuidRegex.test(orderId) ? 'id' : 'order_number';

    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq(queryField, orderId)
      .select()
      .maybeSingle();

    if (!error && data) {
      // Catat ke order_status_history
      try {
        await supabase.from('order_status_history').insert({
          order_id: data.id,
          status: newStatus,
          keterangan: newStatus === 'Selesai'
            ? 'Paket telah diterima dengan baik oleh pembeli dan pembayaran tunai telah lunas diselesaikan.'
            : newStatus === 'Diantar Kurir'
            ? 'Paket sedang dibawa kurir menuju alamat pengiriman pembeli.'
            : newStatus === 'Dikirim'
            ? `Paket telah diserahkan ke kurir ${courier || 'ekspedisi'} dengan nomor resi ${trackingNumber}.`
            : `Status pesanan diubah menjadi ${newStatus}.`,
          created_at: new Date().toISOString()
        });
      } catch (histErr) {}

      return { success: true, order: data };
    }
  } catch (err) {
    console.warn('Gagal update status langsung di Supabase:', err.message);
  }

  return { success: false, message: 'Gagal memperbarui status pesanan.' };
};

/**
 * -------------------------------------------------------------
 * FITUR KHUSUS CUSTOMER (TRACKING & PESANAN SAYA)
 * Keamanan: Filter wajib WHERE user_id = loggedInUserId dari sesi token
 * -------------------------------------------------------------
 */

/**
 * Mengambil daftar SEMUA pesanan yang HANYA milik customer yang sedang login.
 * Diurutkan dari yang terbaru (created_at DESC).
 * @param {string} userId - ID User dari sesi login (bukan dari input user bebas)
 */
export const fetchCustomerOrders = async (userId) => {
  if (!userId) {
    console.warn('[Tracking] User ID tidak ditemukan. Customer belum login.');
    return [];
  }

  const productImagesMap = await fetchProductImagesMap();

  // 1. Prioritas Utama: Mengambil via API Backend Express dengan Bearer Token
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      const res = await fetch(`${API_BASE_URL}/api/customer/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.orders)) {
          return json.orders.map((o) => mapSupabaseOrderToUi(o, productImagesMap));
        }
      }
    }
  } catch (apiErr) {
    // Backend API offline / dev mode -> lanjut ke Supabase SDK langsung
  }

  // 2. Prioritas Kedua: Query langsung ke Supabase dengan filter ketat user_id
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((o) => mapSupabaseOrderToUi(o, productImagesMap));
    }
    if (error) {
      console.warn('Supabase customer orders query notice:', error.message);
    }
  } catch (sbErr) {
    console.warn('Supabase SDK customer orders error:', sbErr.message);
  }

  // 3. Fallback: Filter LocalStorage hanya untuk pesanan milik user_id ini
  try {
    const saved = localStorage.getItem('kb_orders');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((o) => o.user_id === userId || o.userId === userId || !o.user_id)
          .filter(isRealOrder);
      }
    }
  } catch {}

  return [];
};

/**
 * Mengambil detail satu pesanan untuk Halaman "Detail Tracking".
 * Melakukan pengecekan otorisasi: jika pesanan milik user lain -> lempar error 403 Forbidden!
 * @param {string} orderId - ID Pesanan atau Kode Pesanan (KB-...)
 * @param {string} userId - ID User dari sesi login
 */
export const fetchCustomerOrderDetail = async (orderId, userId) => {
  if (!userId) {
    const err = new Error('Akses ditolak (401 Unauthorized). Silakan login terlebih dahulu.');
    err.status = 401;
    throw err;
  }

  const productImagesMap = await fetchProductImagesMap();

  // 1. Coba lewat backend Express endpoint /api/customer/orders/:orderId
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      const res = await fetch(`${API_BASE_URL}/api/customer/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (!res.ok) {
        const err = new Error(json.message || 'Gagal memuat detail pesanan');
        err.status = res.status;
        throw err;
      }
      if (json.success && json.order) {
        return {
          order: mapSupabaseOrderToUi(json.order, productImagesMap),
          history: json.history || []
        };
      }
    }
  } catch (apiErr) {
    if (apiErr.status === 403 || apiErr.status === 404) {
      throw apiErr; // Lempar status 403 / 404 ke UI
    }
  }

  // 2. Query langsung ke Supabase dengan pemeriksaan keamanan kepemilikan
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const queryField = uuidRegex.test(orderId) ? 'id' : 'order_number';

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq(queryField, orderId)
      .maybeSingle();

    if (orderError) throw orderError;

    // Jika pesanan tidak ditemukan sama sekali di database -> 404 Not Found
    if (!order) {
      const err = new Error(`Pesanan dengan nomor #${orderId} tidak ditemukan.`);
      err.status = 404;
      throw err;
    }

    // CEK KEAMANAN KEPEMILIKAN PESANAN (SECURITY CHECK)
    // Jika customer membuka detail pesanan milik orang lain -> 403 Forbidden
    if (order.user_id && order.user_id !== userId) {
      const err = new Error('Akses ditolak (403 Forbidden). Anda tidak berhak melihat pesanan milik customer lain.');
      err.status = 403;
      throw err;
    }

    // Ambil riwayat kronologis dari tabel order_status_history
    let history = [];
    try {
      const { data: historyData } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (Array.isArray(historyData) && historyData.length > 0) {
        history = historyData;
      }
    } catch (hErr) {
      console.warn('Notice: order_status_history fetch:', hErr.message);
    }

    return {
      order: mapSupabaseOrderToUi(order, productImagesMap),
      history: history
    };
  } catch (sbErr) {
    if (sbErr.status === 403 || sbErr.status === 404) {
      throw sbErr;
    }
    throw new Error(sbErr.message || 'Gagal mengambil detail pesanan.');
  }
};

