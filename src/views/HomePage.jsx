import React from 'react';
import { ArrowRight, Sparkles, Heart, Package, Smile, ShoppingBag, Scissors, Star, CheckCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { CATEGORIES, TESTIMONIALS } from '../data/products';

export default function HomePage({
  products,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onNavigate,
  onOpenCustomOrder,
  onOpenCustomKit
}) {
  // Best sellers for hero section
  const bestSellers = products.slice(0, 4);

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
      case 'Package':
        return <Package size={24} color="#9333EA" />;
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
              Temukan produk handmade rajutan orisinal dan DIY kit lengkap untuk membuat karya sendiri, atau hadiah spesial yang berkesan untuk orang tersayang!
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

      {/* 4. DUAL FEATURE PROMO BANNERS */}
      <section className="promo-banners-section container">
        <div className="promo-banners-grid">
          {/* Card 1: Mulai Petualangan Merajutmu */}
          <div className="promo-banner-box banner-diy">
            <div className="promo-text-content">
              <span className="promo-tag">Pemula & Hobi Baru</span>
              <h3 className="promo-title">Mulai Petualangan Merajutmu!</h3>
              <p className="promo-desc">
                Dapatkan DIY kit lengkap + panduan video untuk pemula. Yuk, bikin karya sendiri!
              </p>
              <button
                className="promo-btn btn-diy-link"
                onClick={() => onNavigate('shop')}
              >
                <span>Lihat Katalog</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="promo-banner-img">
              <img src="/images/diy-crochet-kit.jpg" alt="DIY Kit" />
            </div>
          </div>

          {/* Card 2: Buat Pesanan Custom Sendiri */}
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

          {/* Testimoni */}
          <div className="testimonial-box-card">
            <div className="testi-header">
              <span className="story-eyebrow">Apa Kata Mereka</span>
              <h3 className="story-title">Testimoni</h3>
            </div>
            <div className="testi-content">
              <div className="testi-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#FFB703" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="testi-quote">
                "{TESTIMONIALS[0].comment}"
              </blockquote>
              <div className="testi-author-row">
                <img
                  src={TESTIMONIALS[0].avatar}
                  alt={TESTIMONIALS[0].name}
                  className="testi-avatar"
                />
                <div>
                  <div className="testi-name">
                    <strong>{TESTIMONIALS[0].name}</strong>, {TESTIMONIALS[0].location}
                  </div>
                  <span className="testi-prod-name">Membeli: {TESTIMONIALS[0].product}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
