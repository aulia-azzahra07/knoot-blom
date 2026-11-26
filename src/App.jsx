import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CustomOrderModal from './components/CustomOrderModal';
import CustomDiyKitModal from './components/CustomDiyKitModal';
import GiftChatbot from './components/GiftChatbot';

import HomePage from './views/HomePage';
import ShopPage from './views/ShopPage';
import ProductDetailPage from './views/ProductDetailPage';
import DiyKitPage from './views/DiyKitPage';
import CheckoutPage from './views/CheckoutPage';
import MyAccountPage from './views/MyAccountPage';
import AboutPage from './views/AboutPage';
import BlogPage from './views/BlogPage';
import AdminPortalPage from './views/AdminPortalPage';
import LoginPage from './views/LoginPage';

import { fetchProducts } from './services/productService';
import { fetchOrders, updateOrderStatusOnServer, subscribeToOrders } from './services/orderService';
import { fetchAllReviews } from './services/reviewService';
import { supabase } from './lib/supabase';
import { getCurrentUserWithRole, logoutUser } from './services/authService';
import { Heart, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import './App.css';

// Filter untuk memastikan tidak ada data dummy lama
const isRealOrder = (order) => {
  if (!order || !order.id) return false;
  const idStr = String(order.id);
  return !idStr.startsWith('KB12345') && idStr !== 'KB123456' && idStr !== 'KB123455';
};

export default function App() {
  // ── AUTH STATE ───────────────────────────────────────────────────────
  // null = belum dicek, false = tidak login, object = sudah login
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // cegah flash halaman sebelum auth selesai

  // Role state: 'customer' | 'admin' — diinisialisasi dari localStorage, bisa diswitch manual
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      return localStorage.getItem('kb_role') || 'customer';
    } catch {
      return 'customer';
    }
  });

  // Dengarkan perubahan sesi Supabase Auth secara realtime
  useEffect(() => {
    // Cek sesi yang sudah ada saat app pertama dimuat
    getCurrentUserWithRole().then((userProfile) => {
      setCurrentUser(userProfile || false);
      setAuthLoading(false);
    });

    // Dengarkan event login/logout/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const userProfile = await getCurrentUserWithRole();
          setCurrentUser(userProfile || false);
          if (userProfile?.role === 'admin') {
            setCurrentView('admin');
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(false);
          setCurrentView('home');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── PRODUK & ULASAN (Satu sumber saja: Supabase) ──────────────────────
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);

  const refreshProductsAndReviews = async () => {
    const [loadedProducts, loadedReviews] = await Promise.all([
      fetchProducts(),
      fetchAllReviews(10)
    ]);
    if (Array.isArray(loadedProducts)) setProducts(loadedProducts);
    if (Array.isArray(loadedReviews)) setReviews(loadedReviews);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchProducts(), fetchAllReviews(10)]).then(([loadedProducts, loadedReviews]) => {
      if (!isMounted) return;
      if (Array.isArray(loadedProducts)) setProducts(loadedProducts);
      if (Array.isArray(loadedReviews)) setReviews(loadedReviews);
    });
    return () => { isMounted = false; };
  }, []);

  // ── PESANAN ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('kb_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const realOnly = parsed.filter(isRealOrder);
          if (realOnly.length > 0) return realOnly;
        }
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    const loadFreshOrders = async () => {
      try {
        const loaded = await fetchOrders();
        if (isMounted && Array.isArray(loaded)) {
          setOrders(loaded);
          try { localStorage.setItem('kb_orders', JSON.stringify(loaded)); } catch {}
        }
      } catch (err) {
        console.warn('Error fetching orders:', err.message);
      }
    };

    loadFreshOrders();
    const unsubscribe = subscribeToOrders((fresh) => {
      if (isMounted && Array.isArray(fresh)) {
        setOrders(fresh);
        try { localStorage.setItem('kb_orders', JSON.stringify(fresh)); } catch {}
      }
    });
    const intervalId = setInterval(loadFreshOrders, 4000); // poll tiap 4 detik

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // ── NAVIGASI ─────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState(() => {
    try {
      if (window.location.pathname === '/lacak-pesanan') return 'account';
      const savedRole = localStorage.getItem('kb_role');
      if (savedRole === 'admin') return 'admin';
    } catch {}
    return 'home';
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Dengarkan tombol Back/Forward browser untuk route /lacak-pesanan
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/lacak-pesanan') {
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

      // Sinkronkan harga & gambar item non-custom di keranjang dengan data terbaru dari tabel `products` Supabase
      setCartItems((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        let changed = false;
        const synced = prev.map((item) => {
          if (item.isCustom || item.isCustomKit) return item;
          const dbProd = products.find((p) => p.id === item.id || (item.slug && p.slug === item.slug));
          if (!dbProd) return item;
          const dbPrice = Number(dbProd.price) || 0;
          const nextImage = item.image && item.image.startsWith('http') ? item.image : dbProd.image;
          if (item.price !== dbPrice || item.name !== dbProd.name || item.image !== nextImage) {
            changed = true;
            return {
              ...item,
              name: dbProd.name,
              price: dbPrice,
              originalPrice: dbProd.originalPrice,
              image: nextImage || dbProd.image
            };
          }
          return item;
        });
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
    if (authLoading) return; // tunggu auth selesai dicek

    // Admin yang membuka /lacak-pesanan atau halaman Lacak Pesanan diarahkan ke Panel Admin
    if (
      currentUser?.role === 'admin' &&
      (currentView === 'account' || window.location.pathname === '/lacak-pesanan')
    ) {
      setCurrentRole('admin');
      try { localStorage.setItem('kb_role', 'admin'); } catch {}
      setCurrentView('admin');
      if (window.location.pathname === '/lacak-pesanan') {
        window.history.replaceState({}, '', '/');
      }
      showToast('👑 Halaman Lacak Pesanan hanya untuk pembeli. Dialihkan ke Panel Admin.');
      return;
    }

    if (PROTECTED_VIEWS.includes(currentView) && !currentUser) {
      showToast('⚠️ Silakan login terlebih dahulu untuk mengakses halaman ini.');
      setCurrentView('login');
      return;
    }
    if (ADMIN_ONLY_VIEWS.includes(currentView) && currentUser?.role !== 'admin') {
      showToast('⛔ Halaman Admin hanya untuk Admin Toko.');
      setCurrentView('home');
      return;
    }

    // Sinkronkan URL /lacak-pesanan khusus untuk customer
    try {
      if (currentView === 'account' && currentUser?.role !== 'admin') {
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
      if (saved) return JSON.parse(saved) || [];
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
      if (saved) return JSON.parse(saved) || [];
    } catch {}
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem('kb_wishlist', JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  // ── MODALS & TOAST ────────────────────────────────────────────────────
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [isCustomKitOpen, setIsCustomKitOpen] = useState(false);
  const [activeOrderForChat, setActiveOrderForChat] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // ── LOGIN / LOGOUT HANDLERS ───────────────────────────────────────────
  const handleSwitchRole = (newRole) => {
    setCurrentRole(newRole);
    try {
      localStorage.setItem('kb_role', newRole);
    } catch (e) {}

    if (newRole === 'admin') {
      // Pastikan ada sesi profil admin aktif jika belum login admin di Supabase
      if (!currentUser || currentUser.role !== 'admin') {
        const defaultAdmin = {
          id: 'admin-owner-unsri',
          name: 'Admin Toko (Owner)',
          email: 'admin@knotandbloom.com',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
        };
        setCurrentUser(defaultAdmin);
      }
      setCurrentView('admin');
      showToast('👑 Mode Admin Toko aktif! Anda dapat mengelola pesanan & produk.');
    } else {
      // Jika sebelumnya memakai default admin dummy saat switch role, reset
      if (currentUser?.id === 'admin-owner-unsri') {
        setCurrentUser(null);
      }
      if (currentView === 'admin') setCurrentView('home');
      showToast('🌸 Mode Pembeli (Customer) aktif! Selamat berbelanja di Knot & Bloom.');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userProfile) => {
    setCurrentUser(userProfile);
    if (userProfile.role === 'admin') {
      setCurrentRole('admin');
      try { localStorage.setItem('kb_role', 'admin'); } catch {}
      setCurrentView('admin');
      showToast(`👑 Selamat datang, ${userProfile.name}! Panel Admin aktif.`);
    } else {
      setCurrentRole('customer');
      try { localStorage.setItem('kb_role', 'customer'); } catch {}
      setCurrentView('account');
      showToast(`🌸 Halo ${userProfile.name}! Selamat berbelanja.`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout error:', e.message);
    }
    setCurrentUser(false);
    setCurrentView('home');
    showToast('Anda telah keluar dari akun.');
  };

  // handleSwitchRole sudah ada di atas — role juga bisa diswitch manual via Navbar

  // Product Management Handlers (Admin - Local & Server Synchronized)
  const handleAddProduct = async (newProduct) => {
    setProducts((prev) => {
      const updated = [newProduct, ...prev];
      try {
        localStorage.setItem('kb_products', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      // Muat ulang daftar produk resmi dari database
      const refreshed = await fetchProducts();
      if (Array.isArray(refreshed) && refreshed.length > 0) {
        setProducts(refreshed);
      }
    } catch (err) {
      console.warn('Gagal sinkron produk baru ke backend:', err.message);
    }
  };

  const handleUpdateProduct = async (updatedProduct) => {
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      try {
        localStorage.setItem('kb_products', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`http://localhost:5000/api/products/${encodeURIComponent(updatedProduct.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
    } catch (err) {
      console.warn('Gagal update produk di backend:', err.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      try {
        localStorage.setItem('kb_products', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`http://localhost:5000/api/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Gagal hapus produk di backend:', err.message);
    }
  };

  // Order Management Handlers (Admin & Customer - Local & Supabase Synchronized)
  const handleUpdateOrderStatus = async (orderId, newStatus, trackingNumber = '', courier = '', alasanBatal = '') => {
    // 1. Update state lokal segera untuk UI responsif
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === orderId || o.dbId === orderId) {
          const patch = {
            ...o,
            status: newStatus,
            trackingNumber: trackingNumber !== undefined ? trackingNumber : o.trackingNumber,
          };
          if (courier) patch.courier = courier;
          if (alasanBatal) patch.alasan_batal = alasanBatal;
          if (newStatus === 'Selesai') patch.status_bayar = 'dibayar';
          return patch;
        }
        return o;
      });
      try {
        localStorage.setItem('kb_orders', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Sinkronkan perubahan status ke database Supabase
    await updateOrderStatusOnServer(orderId, newStatus, trackingNumber, courier, alasanBatal);

    // 3. Jika pesanan menjadi Selesai, segarkan data produk agar angka "terjual" ikut ter-update otomatis
    if (newStatus === 'Selesai') {
      fetchProducts().then((loaded) => {
        if (Array.isArray(loaded)) setProducts(loaded);
      });
    }

    showToast(`Status pesanan #${orderId} berhasil diubah ke "${newStatus}"!`);
  };

  // Handle Order Placed successfully by Customer
  const handleOrderSuccess = (newOrder) => {
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.id !== newOrder.id && o.order_number !== newOrder.id);
      const updated = [newOrder, ...filtered];
      try {
        localStorage.setItem('kb_orders', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setCartItems([]);
    // Sinkronisasi instan ke database untuk memastikan item dan rincian transaksi lengkap
    fetchOrders().then((fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setOrders(fresh);
      }
    });
  };

  // Manual Refresh Orders (Admin & Customer)
  const handleRefreshOrders = async () => {
    try {
      const fresh = await fetchOrders();
      if (Array.isArray(fresh)) {
        setOrders(fresh);
        try {
          localStorage.setItem('kb_orders', JSON.stringify(fresh));
        } catch {}
        showToast(`✨ Realtime: ${fresh.length} pesanan tersinkronisasi langsung dari database.`);
      }
    } catch (e) {
      showToast('Gagal menyegarkan data pesanan.');
    }
  };

  // Add to Cart (selalu gunakan harga terbaru dari tabel `products` Supabase untuk produk katalog)
  const handleAddToCart = (product) => {
    const qtyToAdd = product.quantity || 1;
    const colorName = product.selectedColor?.name || 'Default';
    const isCustom = Boolean(product.isCustom || product.isCustomKit);
    const dbProduct = !isCustom
      ? products.find((p) => p.id === product.id || (product.slug && p.slug === product.slug))
      : null;
    const authoritativePrice = dbProduct ? Number(dbProduct.price) : (Number(product.price) || 0);
    const authoritativeProduct = dbProduct
      ? {
          ...product,
          name: dbProduct.name,
          price: authoritativePrice,
          originalPrice: dbProduct.originalPrice,
          image: product.image || dbProduct.image
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
            selectedColor: authoritativeProduct.selectedColor || (authoritativeProduct.colors ? authoritativeProduct.colors[0] : null)
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

  // Toggle Wishlist
  const handleToggleWishlist = (product) => {
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
    if (categoryId !== 'all') {
      setSelectedCategory(categoryId);
    }
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Sedang Diproses' || o.status === 'Menunggu Pembayaran'
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
      {currentRole === 'admin' ? (
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
          currentRole={currentRole}
          onSwitchRole={handleSwitchRole}
          pendingOrdersCount={pendingOrdersCount}
          currentView={currentView}
          setCurrentView={setCurrentView}
          cartCount={totalCartCount}
          wishlistCount={wishlist.length}
          onOpenCart={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectCategory={setSelectedCategory}
          currentUser={currentUser || null}
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

        {/* Admin Portal View */}
        {(currentView === 'admin' || (currentRole === 'admin' && currentView === 'admin')) && (
          <AdminPortalPage
            products={products}
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
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onNavigate={handleNavigate}
            onOpenCustomOrder={() => setIsCustomOrderOpen(true)}
            onOpenCustomKit={() => setIsCustomKitOpen(true)}
          />
        )}

        {currentView === 'shop' && (
          <ShopPage
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlist={wishlist}
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
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onBackToShop={() => setCurrentView('shop')}
            showToast={showToast}
          />
        )}

        {currentView === 'diy-kit' && (
          <DiyKitPage
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onOpenCustomKit={() => setIsCustomKitOpen(true)}
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

        {(currentView === 'account' || currentView === 'account-wishlist' || currentView === 'account-chat') && (
          <MyAccountPage
            userOrders={orders}
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
          <BlogPage
            onNavigate={handleNavigate}
            onOpenCustomKit={() => setIsCustomKitOpen(true)}
          />
        )}
      </main>

      {/* 3. Footer */}
      {currentRole === 'admin' ? (
        <footer className="admin-footer-simple">
          <div className="container admin-footer-container">
            <span>© 2026 Knot & Bloom • <strong>Admin Studio Portal</strong></span>
            <span className="admin-footer-tag">Sistem Manajemen Toko & Pesanan Terintegrasi Supabase</span>
          </div>
        </footer>
      ) : (
        <Footer setCurrentView={setCurrentView} />
      )}

      {/* 4. Customer Features & Modals (Khusus Peran Pembeli) */}
      {currentRole === 'customer' && (
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
              setCurrentView('checkout');
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

          <CustomDiyKitModal
            isOpen={isCustomKitOpen}
            onClose={() => setIsCustomKitOpen(false)}
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
