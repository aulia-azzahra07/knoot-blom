import React from 'react';
import { Package, Sparkles, ArrowRight, Video, CheckCircle2, Heart } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function DiyKitPage({
  products,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onOpenCustomKit
}) {
  // Filter only diy-kit products
  const diyProducts = products.filter((p) => p.category === 'diy-kit');

  return (
    <div className="diy-kit-page container fade-in">
      {/* 1. Header Banner matching Mockup Screen 4 */}
      <div className="diy-hero-banner">
        <div className="diy-banner-text">
          <div className="hero-badge-pill">
            <Package size={16} color="#FF86C1" />
            <span>Koleksi Eksklusif DIY Kit</span>
          </div>
          <h1 className="diy-title">DIY Kit</h1>
          <p className="diy-subtitle">
            Paket lengkap untuk kamu yang ingin belajar merajut atau membuat kreasi sendiri di rumah.
          </p>

          <div className="diy-perks-row">
            <div className="diy-perk">
              <CheckCircle2 size={16} color="#059669" />
              <span>Video tutorial step-by-step gratis</span>
            </div>
            <div className="diy-perk">
              <CheckCircle2 size={16} color="#059669" />
              <span>Benang milk cotton premium super lembut</span>
            </div>
            <div className="diy-perk">
              <CheckCircle2 size={16} color="#059669" />
              <span>Hakpen ergonomis tidak bikin lelah</span>
            </div>
          </div>
        </div>

        <div className="diy-banner-callout">
          <div className="diy-badge-floating">
            <Video size={18} color="#FF86C1" />
            <span>Belajar merajut jadi lebih mudah dan menyenangkan!</span>
          </div>
          <img
            src="/images/diy-crochet-kit.jpg"
            alt="DIY Starter Kit"
            className="diy-banner-img"
          />
        </div>
      </div>

      {/* 2. Grid of DIY Kits */}
      <section className="diy-products-section">
        <div className="section-head-row">
          <div>
            <h2 className="section-title">Pilihan Paket Belajar Merajut</h2>
            <p className="section-subtitle-left">
              Pilih proyek rajutan pertamamu — lengkap dengan benang, pola, alat, dan bimbingan video
            </p>
          </div>
        </div>

        <div className="products-grid-4">
          {diyProducts.map((prod) => (
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

      {/* 3. Paket DIY Custom (Banner bottom from Screen 4) */}
      <section className="diy-custom-banner">
        <div className="diy-custom-inner">
          <div className="diy-custom-info">
            <span className="promo-tag">Kreasi Tanpa Batas</span>
            <h2 className="diy-custom-title">Paket DIY Custom</h2>
            <p className="diy-custom-desc">
              Pilih warna benang, jenis produk, dan aksesori sesuai keinginanmu! Ingin merajut dengan warna kesukaan atau kombinasi pastel idaman? Kami siapkan khusus untukmu.
            </p>
            <button className="btn-primary btn-custom-kit-act" onClick={onOpenCustomKit}>
              <Sparkles size={18} />
              <span>Buat Paketmu Sekarang</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="diy-custom-graphic">
            <div className="yarn-stack-art">
              <div className="stack-yarn yarn-1" style={{ backgroundColor: '#FF86C1' }} />
              <div className="stack-yarn yarn-2" style={{ backgroundColor: '#FEDEA4' }} />
              <div className="stack-yarn yarn-3" style={{ backgroundColor: '#A7D8FF' }} />
              <div className="stack-yarn yarn-4" style={{ backgroundColor: '#5DE5AB' }} />
            </div>
            <div className="yarn-caption">
              <span>Bebas pilih hingga 4 warna pilihan ♡</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
