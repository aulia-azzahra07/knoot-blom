import React from 'react';
import { ArrowRight, Sparkles, Heart, Smile, ShoppingBag, Scissors, Star, User } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { CATEGORIES } from '../data/products';

export default function HomePage({
  products,
  reviews = [],
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onNavigate,
  onOpenCustomOrder
}) {
  // Produk unggulan di Home — pastikan Keychain Bunga ikut tampil bersama produk lain
  const bestSellers = (() => {
    const top = products.slice(0, 5);
    const keychainBunga = products.find(
      (p) =>
        (p.slug || '').toLowerCase() === 'keychain-bunga' ||
        (p.name || '').toLowerCase().includes('keychain bunga')
    );
    if (keychainBunga && !top.some((p) => p.id === keychainBunga.id)) {
      return [...top.slice(0, 4), keychainBunga];
    }
    return top;
  })();

  const latestReview = Array.isArray(reviews) && reviews.length > 0 ? reviews[0] : null;

  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles size={24} color="#FF86C1" />;
      case 'Smile':
        return <Smile size={24} color="#D97706" />;
      case 'ShoppingBag':
        return <ShoppingBag size={24} color="#0284C7" />;
      case 'Heart':
        return <Heart size={24} color="#059669" />;
      case 'Scissors':
        return <Scissors size={24} color="#EA580C" />;
      default:
        return <Sparkles size={24} color="#FF86C1" />;
    }
  };

  return (
    <div className="homepage-view fade-in">
      {/* 1. HERO BANNER */}
      <section className="hero-section container">
        <div className="hero-banner-card">
          <div className="hero-content">
            <div className="hero-badge-pill">
              <Sparkles size={16} color="#FF86C1" />
              <span>100% Dirajut Tangan dengan Kasih Sayang</span>
            </div>
            <h1 className="hero-title">
              Crafting Happiness <br />
              <span className="hero-title-highlight">One Stitch at a Time ♡</span>
            </h1>
            <p className="hero-description">
              Temukan produk handmade rajutan orisinal untuk melengkapi gayamu, atau hadiah spesial yang berkesan untuk orang tersayang!
            </p>
            <div className="hero-btn-group">
              <button
                className="btn-primary btn-hero"
                onClick={() => onNavigate('shop')}
              >
                <span>Shop Now</span>
                <ArrowRight size={18} />
              </button>
              <button
                className="btn-secondary btn-hero-secondary"
                onClick={onOpenCustomOrder}
              >
                <Heart size={18} color="#FF86C1" />
                <span>Pesan Custom</span>
              </button>
            </div>

            {/* Quick Micro Badges */}
            <div className="hero-stats-row">
              <div className="hero-stat">
                <strong>4.9 ★</strong>
                <span>Ulasan Pembeli</span>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <strong>1.000+</strong>
                <span>Karya Terjual</span>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <strong>14 Hari</strong>
                <span>Garansi Rajut</span>
              </div>
            </div>
          </div>

          <div className="hero-image-wrap">
            <div className="hero-image-backdrop" />
            <img
              src="/images/hero-bunny.jpg"
              alt="Handmade Crochet Amigurumi Bunny with Strawberry Hat"
              className="hero-main-img floating-anim"
            />
            {/* Cute floating badge */}
            <div className="hero-floating-bubble bubble-1">
              <span>🌸 Milk Cotton 100% Lembut</span>
            </div>
            <div className="hero-floating-bubble bubble-2">
              <span>✨ Dikirim dari Palembang</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY PILLS */}
      <section className="categories-section container">
        <div className="categories-grid">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="category-pill-card"
              onClick={() => onNavigate('shop', cat.id)}
            >
              <div
                className="cat-icon-circle"
                style={{ backgroundColor: `${cat.color}25` }}
              >
                {getCategoryIcon(cat.icon)}
              </div>
              <span className="cat-pill-name">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. PRODUK TERLARIS */}
      <section className="bestsellers-section container">
        <div className="section-head-row">
          <div>
            <h2 className="section-title">Produk Terlaris</h2>
            <p className="section-subtitle-left">Favorit pembeli minggu ini, dibuat dengan teliti dan penuh kehangatan</p>
          </div>
          <button
            className="view-all-link-btn"
            onClick={() => onNavigate('shop')}
          >
            <span>Lihat Semua</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="products-grid-4">
          {bestSellers.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              isWishlisted={wishlist.includes(prod.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 4. FEATURE PROMO BANNER */}
      <section className="promo-banners-section container">
        <div className="promo-banners-grid">
          {/* Buat Pesanan Custom Sendiri */}
          <div className="promo-banner-box banner-custom">
            <div className="promo-text-content">
              <span className="promo-tag">Kado & Koleksi Personal</span>
              <h3 className="promo-title">Buat Pesanan Custom Sendiri!</h3>
              <p className="promo-desc">
                Pilih warna, ukuran, dan desain sesuai keinginanmu. Bisa tambah inisial nama!
              </p>
              <button
                className="promo-btn btn-custom-link"
                onClick={onOpenCustomOrder}
              >
                <span>Rancang Sekarang</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="promo-banner-img">
              <img src="/images/tulip-keychain.jpg" alt="Custom Crochet" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. CERITA KAMI & TESTIMONI ROW */}
      <section className="story-testimonial-section container">
        <div className="story-testimonial-grid">
          {/* Cerita Kami */}
          <div className="story-box-card">
            <div className="story-image-wrap">
              <img
                src="/images/mini-crochet-bag.jpg"
                alt="Karya Rajut Knot and Bloom"
              />
            </div>
            <div className="story-content-wrap">
              <span className="story-eyebrow">Tentang Kami</span>
              <h3 className="story-title">Cerita Kami</h3>
              <p className="story-body">
                <strong>Knot & Bloom</strong> lahir dari kecintaan kami pada rajutan dan hal-hal kecil yang membawa kebahagiaan. Dimulai oleh 5 mahasiswi Manajemen Informatika Universitas Sriwijaya, kami percaya bahwa setiap rajutan punya cerita, dan kami ingin menjadi bagian dari cerita indahmu.
              </p>
              <button
                className="btn-outline-pink story-more-btn"
                onClick={() => onNavigate('about')}
              >
                <span>Tentang Kami</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Testimoni (Real dari tabel `reviews` di Supabase) */}
          <div className="testimonial-box-card">
            <div className="testi-header">
              <span className="story-eyebrow">Apa Kata Mereka</span>
              <h3 className="story-title">Testimoni</h3>
            </div>
            {latestReview ? (
              <div className="testi-content">
                <div className="testi-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      fill={i < (Number(latestReview.rating) || 0) ? '#FFB703' : 'none'}
                      color="#FFB703"
                      strokeWidth={i < (Number(latestReview.rating) || 0) ? 0 : 1.5}
                    />
                  ))}
                </div>
                <blockquote className="testi-quote">
                  "{latestReview.comment}"
                </blockquote>
                <div className="testi-author-row">
                  <div className="testi-avatar icon-avatar-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFE4EE' }}>
                    <User size={20} color="#E63985" />
                  </div>
                  <div>
                    <div className="testi-name">
                      <strong>{latestReview.customer_name || 'Pelanggan'}</strong>
                    </div>
                    {latestReview.product_name && (
                      <span className="testi-prod-name">Membeli: {latestReview.product_name}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="testi-content" style={{ padding: '24px 0', textAlign: 'center', color: '#888' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  Belum ada ulasan, jadilah yang pertama!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
