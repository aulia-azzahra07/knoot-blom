import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CustomOrderModal from './components/CustomOrderModal';
import GiftChatbot from './components/GiftChatbot';

import HomePage from './views/HomePage';
import ShopPage from './views/ShopPage';
import ProductDetailPage from './views/ProductDetailPage';
import CheckoutPage from './views/CheckoutPage';
import MyAccountPage from './views/MyAccountPage';
import AboutPage from './views/AboutPage';
import BlogPage from './views/BlogPage';
import AdminPortalPage from './views/AdminPortalPage';
import LoginPage from './views/LoginPage';

import {
  fetchProducts,
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from './services/productService';
import { fetchOrders, updateOrderStatusOnServer, subscribeToOrders } from './services/orderService';
import { fetchAllReviews } from './services/reviewService';
import { supabase } from './lib/supabase';
import {
  clearLegacyAuthStorage,
  getInitialSessionUser,
  resolveUserProfileFromSession,
  logoutUser
} from './services/authService';
import { CheckCircle2 } from 'lucide-react';
import './App.css';

// Filter untuk membuang otomatis sisa item produk yang sudah tidak tersedia dari localStorage
const isRemovedLegacyItem = (item) => {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '').toLowerCase();
  const cat = String(item.category || '').toLowerCase().trim();
  const slug = String(item.slug || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  return (
    Boolean(item.isCustomKit) ||
    id.startsWith('custom-kit-') ||
    cat === 'diy-kit' ||
    cat === 'diykit' ||
    slug.includes('diy-kit') ||
    slug.includes('diy-crochet') ||
    name.includes('diy kit') ||
    name.includes('diy crochet')
  );
};

export default function App() {
  // ── AUTH STATE (Default selalu guest = null, role diturunkan hanya dari sesi Supabase asli) ──
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // cegah kedipan guest -> login sebelum getSession selesai
  // Mode preview toko khusus admin (TIDAK mengubah role asli, tidak dipakai oleh guest/customer)
  const [adminStorePreview, setAdminStorePreview] = useState(false);

  // Role asli: null untuk guest, 'customer' atau 'admin' untuk user yang login
  const userRole = currentUser ? currentUser.role : null;
  const isAdminMode = userRole === 'admin' && !adminStorePreview;

  // Simpan halaman tujuan jika guest mencoba akses halaman wajib login
  const pendingViewRef = useRef(null);
  const lastNavigatedUserIdRef = useRef(null);

  const navigateAfterLogin = (userProfile) => {
    if (!userProfile) return;
    const targetView = pendingViewRef.current;
    pendingViewRef.current = null;
    lastNavigatedUserIdRef.current = userProfile.id;

    if (userProfile.role === 'admin') {
      setAdminStorePreview(false);
      setCurrentView('admin');
      return;
    }

    setAdminStorePreview(false);
    if (targetView && targetView !== 'admin' && targetView !== 'login') {
      setCurrentView(targetView);
    } else {
      setCurrentView('home');
    }
  };

  // Cek sesi Supabase sekali lewat getSession(), lalu sinkronkan via onAuthStateChange
  useEffect(() => {
    let isMounted = true;

    // Bersihkan key auth/role lama buatan aplikasi tanpa menyentuh key sesi Supabase (sb-*-auth-token)
    clearLegacyAuthStorage();

    getInitialSessionUser()
      .then((userProfile) => {
        if (!isMounted) return;
        setCurrentUser(userProfile);
        if (userProfile?.role === 'admin') {
          lastNavigatedUserIdRef.current = userProfile.id;
          setAdminStorePreview(false);
          setCurrentView((prev) => (prev === 'home' || prev === 'login' || prev === 'account' ? 'admin' : prev));
        }
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        lastNavigatedUserIdRef.current = null;
        pendingViewRef.current = null;
        setCurrentUser(null);
        setAdminStorePreview(false);
        setOrders([]);
        setOrdersError(null);
        setCurrentView('home');
        try {
          const p = window.location.pathname.toLowerCase();
          if (p === '/lacak-pesanan' || p === '/admin' || p.startsWith('/admin/')) {
            window.history.replaceState({}, '', '/');
          }
        } catch {}
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Defer query Supabase di luar callback onAuthStateChange agar tidak terjadi auth-lock deadlock
        setTimeout(async () => {
          if (!isMounted) return;
          const userProfile = await resolveUserProfileFromSession(session);
          if (!isMounted) return;
          setCurrentUser(userProfile);

          if (event === 'SIGNED_IN' && userProfile && lastNavigatedUserIdRef.current !== userProfile.id) {
            navigateAfterLogin(userProfile);
          }
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── PRODUK & ULASAN (Satu sumber saja: Supabase) ──────────────────────
  const [products, setProducts] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [reviews, setReviews] = useState([]);

  const refreshAllProducts = async (includeAdmin = userRole === 'admin') => {
    const tasks = [fetchProducts()];
    if (includeAdmin) {
      tasks.push(fetchAdminProducts());
    }
    const [loadedPublic, loadedAdmin] = await Promise.all(tasks);
    if (Array.isArray(loadedPublic)) setProducts(loadedPublic);
    if (includeAdmin && Array.isArray(loadedAdmin)) setAdminProducts(loadedAdmin);
  };

  const refreshProductsAndReviews = async () => {
    try {
      const [loadedProducts, loadedReviews] = await Promise.all([
        fetchProducts(),
        fetchAllReviews(10)
      ]);
      if (Array.isArray(loadedProducts)) setProducts(loadedProducts);
      if (Array.isArray(loadedReviews)) setReviews(loadedReviews);
      if (userRole === 'admin') {
        const loadedAdmin = await fetchAdminProducts();
        if (Array.isArray(loadedAdmin)) setAdminProducts(loadedAdmin);
      }
    } catch (err) {
      console.error('[App] Gagal memuat ulang produk & ulasan:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchProducts().catch((err) => {
        console.error('[App] Gagal memuat katalog produk:', err);
        return [];
      }),
      fetchAllReviews(10).catch((err) => {
        console.error('[App] Gagal memuat ulasan:', err);
        return [];
      })
    ]).then(([loadedProducts, loadedReviews]) => {
      if (!isMounted) return;
      if (Array.isArray(loadedProducts)) setProducts(loadedProducts);
      if (Array.isArray(loadedReviews)) setReviews(loadedReviews);
    });
    return () => { isMounted = false; };
  }, []);

  // Muat seluruh produk (termasuk is_active = false & semua varian) khusus saat role admin aktif
  useEffect(() => {
    if (authLoading || userRole !== 'admin') {
      setAdminProducts([]);
      return;
    }
    let isMounted = true;
    fetchAdminProducts()
      .then((loaded) => {
        if (isMounted && Array.isArray(loaded)) {
          setAdminProducts(loaded);
        }
      })
      .catch((err) => {
        console.error('[App] Gagal memuat katalog admin dari Supabase:', err);
        if (isMounted) {
          showToast(`Gagal memuat katalog produk: ${err.message || 'Periksa RLS Supabase.'}`);
        }
      });
    return () => { isMounted = false; };
  }, [authLoading, userRole]);

  // ── PESANAN (Hanya dimuat langsung dari Supabase untuk pengguna yang login) ──
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState(null);

  useEffect(() => {
    if (authLoading || !currentUser) {
      setOrders([]);
      setOrdersError(null);
      return;
    }

    let isMounted = true;
    const loadFreshOrders = async () => {
      try {
        const loaded = await fetchOrders();
        if (isMounted && Array.isArray(loaded)) {
          setOrders(loaded);
          setOrdersError(null);
        }
      } catch (err) {
        console.error('[App] Gagal memuat pesanan dari Supabase:', err);
        if (isMounted) {
          setOrdersError(err?.message || 'Gagal memuat data pesanan dari server.');
        }
      }
    };

    loadFreshOrders();
    const unsubscribe = subscribeToOrders((fresh) => {
      if (isMounted && Array.isArray(fresh)) {
        setOrders(fresh);
        setOrdersError(null);
      }
    });
    const intervalId = setInterval(loadFreshOrders, 4000); // poll tiap 4 detik

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(intervalId);
    };
  }, [authLoading, currentUser?.id]);

  // ── NAVIGASI ─────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      if (path === '/diy-kit' || path.startsWith('/diy-kit/')) {
        window.history.replaceState({}, '', '/');
        return 'shop';
      }
      if (path === '/admin' || path.startsWith('/admin/')) {
        return 'admin';
      }
      if (path === '/lacak-pesanan') return 'account';
    } catch {}
    return 'home';
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Dengarkan tombol Back/Forward browser untuk route /lacak-pesanan, /admin, dan redirect route lama
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/diy-kit' || path.startsWith('/diy-kit/')) {
        window.history.replaceState({}, '', '/');
        setCurrentView('shop');
        return;
      }
      if (path === '/admin' || path.startsWith('/admin/')) {
        setCurrentView('admin');
        return;
      }
      if (path === '/lacak-pesanan') {
        setCurrentView('account');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      setSelectedProduct((prev) => {
        if (!prev) return products[0];
        return products.find((p) => p.id === prev.id || p.slug === prev.slug) || products[0];
      });

      // Bersihkan wishlist dari produk yang sudah tidak tersedia di katalog aktif
      const activeProductIds = new Set(products.map((p) => p.id));
      setWishlist((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const cleaned = prev.filter((id) => activeProductIds.has(id));
        return cleaned.length !== prev.length ? cleaned : prev;
      });

      // Sinkronkan harga, gambar, status aktif, dan varian item non-custom di keranjang dengan data terbaru Supabase
      setCartItems((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        let changed = false;
        const synced = [];
        for (const item of prev) {
          if (isRemovedLegacyItem(item)) {
            changed = true;
            continue;
          }
          if (item.isCustom) {
            synced.push(item);
            continue;
          }
          const dbProd = products.find((p) => p.id === item.id || (item.slug && p.slug === item.slug));
          // Produk yang dinonaktifkan (is_active = false) atau dihapus tidak boleh tersisa di keranjang
          if (!dbProd || dbProd.is_active === false) {
            changed = true;
            continue;
          }
          // Jika produk punya varian, pastikan varian terpilih masih aktif dan stok > 0
          const activeVars = Array.isArray(dbProd.variants)
            ? dbProd.variants.filter((v) => v.is_active !== false)
            : [];
          if (activeVars.length > 0 && item.selectedColor) {
            const matchedVar = activeVars.find(
              (v) =>
                (item.variant_id && v.id === item.variant_id) ||
                (item.selectedColor?.id && v.id === item.selectedColor.id) ||
                v.name === item.selectedColor?.name
            );
            if (!matchedVar || matchedVar.is_active === false || (Number(matchedVar.stock) || 0) <= 0) {
              changed = true;
              continue;
            }
          }

          const dbPrice = Number(dbProd.price) || 0;
          const nextImage = item.image && item.image.startsWith('http') ? item.image : dbProd.image;
          if (item.price !== dbPrice || item.name !== dbProd.name || item.image !== nextImage) {
            changed = true;
            synced.push({
              ...item,
              name: dbProd.name,
              price: dbPrice,
              originalPrice: dbProd.originalPrice,
              image: nextImage || dbProd.image
            });
          } else {
            synced.push(item);
          }
        }
        return changed ? synced : prev;
      });
    }
  }, [products]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── PROTEKSI HALAMAN ─────────────────────────────────────────────────
  // Halaman yang butuh login
  const PROTECTED_VIEWS = ['checkout', 'account', 'account-wishlist', 'account-chat'];
  const ADMIN_ONLY_VIEWS = ['admin'];

  useEffect(() => {
    if (authLoading) return; // tunggu getSession selesai dicek

    // Admin yang membuka /lacak-pesanan atau halaman Lacak Pesanan diarahkan ke Panel Admin
    if (
      currentUser?.role === 'admin' &&
      (currentView === 'account' || window.location.pathname === '/lacak-pesanan')
    ) {
      setAdminStorePreview(false);
      setCurrentView('admin');
      if (window.location.pathname === '/lacak-pesanan') {
        window.history.replaceState({}, '', '/');
      }
      showToast('👑 Halaman Lacak Pesanan hanya untuk pembeli. Dialihkan ke Panel Admin.');
      return;
    }

    // Halaman wajib login untuk guest -> simpan tujuan lalu arahkan ke Login
    if (PROTECTED_VIEWS.includes(currentView) && !currentUser) {
      pendingViewRef.current = currentView;
      showToast('⚠️ Silakan login terlebih dahulu untuk mengakses halaman ini.');
      setCurrentView('login');
      return;
    }

    // Panel Admin hanya untuk role admin
    if (ADMIN_ONLY_VIEWS.includes(currentView)) {
      if (!currentUser) {
        pendingViewRef.current = 'admin';
        try {
          if (window.location.pathname.toLowerCase().startsWith('/admin')) {
            window.history.replaceState({}, '', '/');
          }
        } catch {}
        showToast('⚠️ Silakan login sebagai Admin untuk membuka Panel Admin.');
        setCurrentView('login');
        return;
      }
      if (currentUser.role !== 'admin') {
        try {
          if (window.location.pathname.toLowerCase().startsWith('/admin')) {
            window.history.replaceState({}, '', '/');
          }
        } catch {}
        showToast('⛔ Halaman Admin hanya untuk Admin Toko.');
        setCurrentView('home');
        return;
      }
    }

    // Sinkronkan URL /lacak-pesanan khusus untuk customer yang login
    try {
      if (currentView === 'account' && currentUser && currentUser.role !== 'admin') {
        if (window.location.pathname !== '/lacak-pesanan') {
          window.history.replaceState({}, '', '/lacak-pesanan');
        }
      } else if (window.location.pathname === '/lacak-pesanan') {
        window.history.replaceState({}, '', '/');
      }
    } catch {}
  }, [currentView, currentUser, authLoading]);

  // ── KERANJANG ─────────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('kb_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !isRemovedLegacyItem(item));
        }
      }
    } catch {}
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('kb_cart', JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);

  // ── WISHLIST ──────────────────────────────────────────────────────────
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('kb_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => !String(id || '').toLowerCase().startsWith('custom-kit-'));
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem('kb_wishlist', JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  // ── MODALS & TOAST ────────────────────────────────────────────────────
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [activeOrderForChat, setActiveOrderForChat] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // ── LOGIN / LOGOUT HANDLERS ───────────────────────────────────────────
  // Khusus admin asli untuk beralih tampilan antara Panel Admin dan preview Toko Pembeli
  const handleSwitchRole = (targetMode) => {
    if (currentUser?.role !== 'admin') {
      showToast('⛔ Fitur ini hanya tersedia untuk Admin Toko.');
      return;
    }

    if (targetMode === 'admin') {
      setAdminStorePreview(false);
      setCurrentView('admin');
    } else {
      setAdminStorePreview(true);
      if (currentView === 'admin') setCurrentView('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userProfile) => {
    if (!userProfile) return;
    setCurrentUser(userProfile);
    navigateAfterLogin(userProfile);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout error:', e.message);
    }
    lastNavigatedUserIdRef.current = null;
    pendingViewRef.current = null;
    setCurrentUser(null);
    setAdminStorePreview(false);
    setOrders([]);
    setOrdersError(null);
    setCurrentView('home');
    try {
      const p = window.location.pathname.toLowerCase();
      if (p === '/lacak-pesanan' || p === '/admin' || p.startsWith('/admin/')) {
        window.history.replaceState({}, '', '/');
      }
    } catch {}
    showToast('Anda telah keluar dari akun.');
  };

  // Product Management Handlers (Admin - Langsung ke Supabase & muat ulang dari DB)
  const handleAddProduct = async (newProductPayload) => {
    const created = await createProduct(newProductPayload);
    await refreshAllProducts(true);
    return created;
  };

  const handleUpdateProduct = async (productId, updatedProductPayload) => {
    const updated = await updateProduct(productId, updatedProductPayload);
    await refreshAllProducts(true);
    return updated;
  };

  const handleDeleteProduct = async (productId) => {
    const result = await deleteProduct(productId);
    await refreshAllProducts(true);
    return result;
  };

  // Order Management Handlers (Admin - Server/RPC Validated & Supabase Synchronized)
  const handleUpdateOrderStatus = async (orderId, newStatus, options = {}) => {
    const normalizedOptions =
      typeof options === 'object' && options !== null
        ? options
        : {};

    // 1. Validasi & simpan via Server / RPC transaksional terlebih dahulu (jangan lompati urutan)
    const result = await updateOrderStatusOnServer(orderId, newStatus, normalizedOptions);
    if (!result || !result.success) {
      const errMsg = result?.message || 'Gagal memperbarui status pesanan.';
      showToast(`❌ ${errMsg}`);
      return { success: false, message: errMsg };
    }

    const updatedServerOrder = result.order || null;

    // 2. Update state lokal setelah server menyetujui
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === orderId || o.dbId === orderId) {
          const patch = {
            ...o,
            status: newStatus,
          };
          if (newStatus === 'Diantar') {
            patch.estimasi_antar = updatedServerOrder?.estimasi_antar ?? normalizedOptions.estimasiAntar ?? o.estimasi_antar;
            patch.pengantar = updatedServerOrder?.pengantar ?? normalizedOptions.pengantar ?? o.pengantar;
          }
          if (newStatus === 'Dibatalkan') {
            patch.alasan_batal = updatedServerOrder?.alasan_batal ?? normalizedOptions.alasanBatal ?? o.alasan_batal;
          }
          if (newStatus === 'Selesai') {
            patch.paymentStatus = 'dibayar';
            patch.status_bayar = 'dibayar';
          }
          return patch;
        }
        return o;
      });
      return updated;
    });

    // 3. Sinkronkan ulang orders (beserta order_status_history terbaru) dari Supabase
    fetchOrders()
      .then((fresh) => {
        if (Array.isArray(fresh)) {
          setOrders(fresh);
          setOrdersError(null);
        }
      })
      .catch((err) => {
        console.error('[App] Gagal sinkron ulang pesanan setelah update status:', err);
      });

    // 4. Jika pesanan menjadi Selesai, segarkan data produk agar angka "terjual" ikut ter-update otomatis
    if (newStatus === 'Selesai') {
      refreshAllProducts().catch((err) => {
        console.error('[App] Gagal menyegarkan katalog produk setelah pesanan selesai:', err);
      });
    }

    showToast(`Status pesanan #${orderId} berhasil diubah ke "${newStatus}"!`);
    return { success: true, order: updatedServerOrder };
  };

  // Handle Order Placed successfully by Customer
  const handleOrderSuccess = (newOrder) => {
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.id !== newOrder.id && o.order_number !== newOrder.id);
      return [newOrder, ...filtered];
    });
    setCartItems([]);
    // Sinkronisasi instan ke database untuk memastikan item dan rincian transaksi lengkap
    fetchOrders()
      .then((fresh) => {
        if (Array.isArray(fresh)) {
          setOrders(fresh);
          setOrdersError(null);
        }
      })
      .catch((err) => {
        console.error('[App] Gagal sinkron ulang pesanan setelah checkout:', err);
      });
  };

  // Manual Refresh Orders (Admin & Customer)
  const handleRefreshOrders = async () => {
    try {
      const fresh = await fetchOrders();
      if (Array.isArray(fresh)) {
        setOrders(fresh);
        setOrdersError(null);
        showToast(`✨ ${fresh.length} pesanan berhasil dimuat dari database.`);
      }
    } catch (e) {
      console.error('[App] Gagal menyegarkan data pesanan:', e);
      setOrdersError(e?.message || 'Gagal menyegarkan data pesanan.');
      showToast('Gagal menyegarkan data pesanan.');
    }
  };

  // Add to Cart (selalu gunakan harga terbaru dari products.price & validasi produk/varian aktif + stok)
  const handleAddToCart = (product) => {
    if (isRemovedLegacyItem(product)) return;
    const qtyToAdd = Math.max(1, Number(product.quantity) || 1);
    const isCustom = Boolean(product.isCustom);

    let dbProduct = null;
    let chosenVariant = product.selectedColor || null;

    if (!isCustom) {
      dbProduct = products.find((p) => p.id === product.id || (product.slug && p.slug === product.slug));
      if (!dbProduct || dbProduct.is_active === false) {
        showToast('Produk tidak aktif atau tidak tersedia.');
        return;
      }

      const activeVariants = Array.isArray(dbProduct.variants)
        ? dbProduct.variants.filter((v) => v.is_active !== false)
        : [];

      if (activeVariants.length > 0) {
        if (chosenVariant) {
          chosenVariant =
            activeVariants.find(
              (v) =>
                (product.variant_id && v.id === product.variant_id) ||
                (chosenVariant.id && v.id === chosenVariant.id) ||
                v.name === chosenVariant.name
            ) || null;
        } else {
          chosenVariant = activeVariants.find((v) => (Number(v.stock) || 0) > 0) || null;
        }

        if (!chosenVariant || chosenVariant.is_active === false || (Number(chosenVariant.stock) || 0) <= 0) {
          showToast('Stok varian produk sedang habis atau tidak aktif.');
          return;
        }
      } else if ((Number(dbProduct.stock) || 0) <= 0) {
        showToast('Stok produk sedang habis.');
        return;
      }
    }

    const colorName = chosenVariant?.name || 'Default';
    const authoritativePrice = dbProduct ? Number(dbProduct.price) : (Number(product.price) || 0);
    const authoritativeProduct = dbProduct
      ? {
          ...product,
          id: dbProduct.id,
          slug: dbProduct.slug,
          name: dbProduct.name,
          price: authoritativePrice,
          originalPrice: dbProduct.originalPrice,
          image: product.image || dbProduct.image,
          variant_id: chosenVariant?.id || null,
          selectedColor: chosenVariant
        }
      : { ...product, price: authoritativePrice };

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.id === authoritativeProduct.id && (item.selectedColor?.name || 'Default') === colorName
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          price: authoritativePrice,
          quantity: updated[existingIdx].quantity + qtyToAdd
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            ...authoritativeProduct,
            quantity: qtyToAdd,
            selectedColor: chosenVariant
          }
        ];
      }
    });

    showToast(`"${authoritativeProduct.name}" berhasil dimasukkan ke keranjang belanja! ♡`);
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (productId, colorName, newQty) => {
    if (newQty <= 0) return;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === productId && (item.selectedColor?.name || 'Default') === (colorName || 'Default')) {
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (productId, colorName) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => !(item.id === productId && (item.selectedColor?.name || 'Default') === (colorName || 'Default'))
      )
    );
    showToast('Produk dihapus dari keranjang.');
  };

  // Toggle Wishlist (Wajib login; guest diarahkan ke Login lalu kembali setelah berhasil)
  const handleToggleWishlist = (product) => {
    if (!currentUser) {
      pendingViewRef.current = currentView === 'login' ? 'account-wishlist' : currentView;
      showToast('⚠️ Silakan login terlebih dahulu untuk menyimpan Wishlist.');
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (wishlist.includes(product.id)) {
      setWishlist((prev) => prev.filter((id) => id !== product.id));
      showToast(`"${product.name}" dihapus dari Wishlist.`);
    } else {
      setWishlist((prev) => [...prev, product.id]);
      showToast(`"${product.name}" ditambahkan ke Wishlist! ♡`);
    }
  };

  // Navigate to Product Detail
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // General Navigation
  const handleNavigate = (viewId, categoryId = 'all') => {
    const safeView = viewId === 'diy-kit' ? 'shop' : viewId;
    const safeCategory = categoryId === 'diy-kit' ? 'all' : categoryId;
    if (safeCategory !== 'all') {
      setSelectedCategory(safeCategory);
    }
    setCurrentView(safeView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Dirajut' || o.status === 'Packing' || o.status === 'Diantar'
  ).length;

  // ── LOADING SCREEN saat auth belum selesai dicek ─────────────────────
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #FF86C1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#888', fontSize: '14px' }}>Memuat sesi login...</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* 1. Header / Navbar */}
      {isAdminMode ? (
        <AdminNavbar
          onSwitchRole={handleSwitchRole}
          pendingOrdersCount={pendingOrdersCount}
          onNavigate={handleNavigate}
          currentView={currentView}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        <Navbar
          currentRole={userRole}
          onSwitchRole={handleSwitchRole}
          pendingOrdersCount={currentUser ? pendingOrdersCount : 0}
          currentView={currentView}
          setCurrentView={setCurrentView}
          cartCount={totalCartCount}
          wishlistCount={currentUser ? wishlist.length : 0}
          onOpenCart={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectCategory={setSelectedCategory}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 2. Main View Switcher */}
      <main className="main-content-body">
        {/* Login Page */}
        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {/* Admin Portal View (hanya untuk role admin yang terverifikasi) */}
        {currentView === 'admin' && userRole === 'admin' && (
          <AdminPortalPage
            products={adminProducts}
            orders={orders}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onNavigate={handleNavigate}
            onSwitchRole={handleSwitchRole}
            onRefreshOrders={handleRefreshOrders}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {currentView === 'home' && (
          <HomePage
            products={products}
            reviews={reviews}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlist={currentUser ? wishlist : []}
            onToggleWishlist={handleToggleWishlist}
            onNavigate={handleNavigate}
            onOpenCustomOrder={() => setIsCustomOrderOpen(true)}
          />
        )}

        {currentView === 'shop' && (
          <ShopPage
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlist={currentUser ? wishlist : []}
            onToggleWishlist={handleToggleWishlist}
            initialCategory={selectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {currentView === 'product-detail' && (
          <ProductDetailPage
            product={selectedProduct}
            allProducts={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlist={currentUser ? wishlist : []}
            onToggleWishlist={handleToggleWishlist}
            onBackToShop={() => setCurrentView('shop')}
            showToast={showToast}
          />
        )}

        {currentView === 'checkout' && currentUser && (
          <CheckoutPage
            cartItems={cartItems}
            products={products}
            onBackToCart={() => {
              if (cartItems.length > 0) setIsCartOpen(true);
              setCurrentView('shop');
            }}
            onOrderSuccess={handleOrderSuccess}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {currentUser && (currentView === 'account' || currentView === 'account-wishlist' || currentView === 'account-chat') && (
          <MyAccountPage
            userOrders={orders}
            ordersError={ordersError}
            onRetryOrders={handleRefreshOrders}
            wishlist={wishlist}
            allProducts={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            activeTab={
              currentView === 'account-wishlist'
                ? 'wishlist'
                : currentView === 'account-chat'
                ? 'chat'
                : 'orders'
            }
            showToast={showToast}
            onSwitchRole={handleSwitchRole}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenChatWithOrder={(order) => {
              setActiveOrderForChat(order);
              setCurrentView('account-chat');
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onNavigate={handleNavigate}
            onReviewSubmitted={refreshProductsAndReviews}
          />
        )}

        {currentView === 'about' && (
          <AboutPage onNavigate={handleNavigate} />
        )}

        {currentView === 'blog' && (
          <BlogPage onNavigate={handleNavigate} />
        )}
      </main>

      {/* 3. Footer */}
      {isAdminMode ? (
        <footer className="admin-footer-simple">
          <div className="container admin-footer-container">
            <span>© 2026 Knot & Bloom • <strong>Admin Studio Portal</strong></span>
            <span className="admin-footer-tag">Sistem Manajemen Toko & Pesanan Terintegrasi Supabase</span>
          </div>
        </footer>
      ) : (
        <Footer setCurrentView={setCurrentView} />
      )}

      {/* 4. Storefront Features & Modals (Tersedia untuk Guest & Pembeli) */}
      {!isAdminMode && (
        <>
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            products={products}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onProceedToCheckout={() => {
              setIsCartOpen(false);
              if (!currentUser) {
                pendingViewRef.current = 'checkout';
                showToast('⚠️ Silakan login terlebih dahulu untuk melanjutkan ke Checkout.');
                setCurrentView('login');
              } else {
                setCurrentView('checkout');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={handleSelectProduct}
          />

          <CustomOrderModal
            isOpen={isCustomOrderOpen}
            onClose={() => setIsCustomOrderOpen(false)}
            onAddToCart={handleAddToCart}
            showToast={showToast}
          />

          <GiftChatbot
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        </>
      )}

      {/* 7. Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <CheckCircle2 size={20} color="#FF86C1" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
