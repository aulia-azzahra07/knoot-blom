import React, { useState } from 'react';
import {
  Heart,
  Star,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  Truck,
  ShieldCheck,
  Package,
  ChevronRight,
  ArrowLeft,
  Share2,
  Check
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getSafeProductImage, handleProductImageError } from '../utils/productImage';
import { fetchReviewsByProduct } from '../services/reviewService';

export default function ProductDetailPage({
  product,
  allProducts,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  onBackToShop,
  showToast
}) {
  if (!product) return null;

  const resolveColorImage = (col, prod = product) => {
    if (!col || !prod) return prod?.image;

    // 1. Jika objek warna memiliki properti image langsung
    if (col.image) return col.image;

    // 2. Cek varian produk
    if (prod.variants && prod.variants.length > 0) {
      const matchV = prod.variants.find(
        (v) => (v.name || '').toLowerCase() === (col.name || '').toLowerCase() && (v.image || v.image_url)
      );
      if (matchV && (matchV.image || matchV.image_url)) {
        return matchV.image || matchV.image_url;
      }
    }

    // 3. Cek array images produk yang cocok dengan nama warna
    const colName = (col.name || '').toLowerCase();
    if (prod.images && prod.images.length > 0) {
      const matchImg = prod.images.find((img) =>
        img.toLowerCase().includes(colName) || decodeURIComponent(img).toLowerCase().includes(colName)
      );
      if (matchImg) return matchImg;

      // Fallback berdasarkan index warna vs gambar
      const colIdx = (prod.colors || []).findIndex((c) => (c.name || '').toLowerCase() === colName);
      if (colIdx >= 0 && prod.images[colIdx]) {
        return prod.images[colIdx];
      }
    }

    return prod.image || prod.images?.[0] || '';
  };

  const activeVariants = Array.isArray(product.variants)
    ? product.variants.filter((v) => v.is_active !== false)
    : [];
  const hasVariants = activeVariants.length > 0;
  const getDefaultSelectableVariant = (prod) => {
    const vars = Array.isArray(prod?.variants)
      ? prod.variants.filter((v) => v.is_active !== false)
      : [];
    return vars.find((v) => (Number(v.stock) || 0) > 0) || null;
  };

  const initialColor = getDefaultSelectableVariant(product);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedImage, setSelectedImage] = useState(() => resolveColorImage(initialColor, product) || product.image);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('deskripsi');

  // Sinkronisasi foto & varian saat produk berganti
  React.useEffect(() => {
    if (product) {
      const initCol = getDefaultSelectableVariant(product);
      setSelectedColor(initCol);
      const initImg = initCol ? resolveColorImage(initCol, product) : (product.image || product.images?.[0]);
      setSelectedImage(initImg);
      setQuantity(1);
    }
  }, [product]);

  // Handler saat varian diklik: hanya boleh pilih varian aktif dengan stok > 0
  const handleSelectColor = (col) => {
    if (!col || col.is_active === false || (Number(col.stock) || 0) <= 0) return;
    setSelectedColor(col);
    setQuantity((prev) => Math.min(prev, Math.max(1, Number(col.stock) || 1)));
    const targetImg = resolveColorImage(col, product);
    if (targetImg) {
      setSelectedImage(targetImg);
    }
  };

  // Handler saat thumbnail foto diklik
  const handleSelectThumbnail = (imgUrl) => {
    setSelectedImage(imgUrl);
    if (activeVariants.length > 0) {
      const matchedCol = activeVariants.find((col) => {
        if ((Number(col.stock) || 0) <= 0) return false;
        const resolved = resolveColorImage(col, product);
        return resolved === imgUrl || imgUrl.toLowerCase().includes((col.name || '').toLowerCase());
      });
      if (matchedCol) {
        setSelectedColor(matchedCol);
      }
    }
  };

  // Customer Reviews state (Real dari tabel `reviews` di Supabase)
  const [reviewsList, setReviewsList] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    if (!product?.id) {
      setReviewsList([]);
      setLoadingReviews(false);
      return;
    }
    setLoadingReviews(true);
    fetchReviewsByProduct(product.id).then((data) => {
      if (isMounted) {
        setReviewsList(Array.isArray(data) ? data : []);
        setLoadingReviews(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  const realReviewCount = reviewsList.length;
  const realAvgRating =
    realReviewCount > 0
      ? Number(
          (
            reviewsList.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
            realReviewCount
          ).toFixed(1)
        )
      : null;

  const formatReviewDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const availableStock = hasVariants
    ? (selectedColor ? Math.max(0, Number(selectedColor.stock) || 0) : 0)
    : Math.max(0, Number(product.stock) || 0);
  const canAddToCart = product.is_active !== false && availableStock > 0 && (!hasVariants || Boolean(selectedColor));

  const handleAddToCartClick = () => {
    if (!canAddToCart) {
      showToast('Stok produk atau varian yang dipilih sedang habis.');
      return;
    }
    onAddToCart({
      ...product,
      quantity: Math.min(quantity, availableStock),
      variant_id: selectedColor?.id || null,
      selectedColor: selectedColor || null,
      image: selectedImage || product.image
    });
  };

  // Related products (exclude current)
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="product-detail-view container fade-in">
      {/* Breadcrumbs */}
      <nav className="detail-breadcrumbs">
        <button onClick={onBackToShop} className="breadcrumb-link">
          Home
        </button>
        <ChevronRight size={14} className="breadcrumb-arrow" />
        <button
          onClick={onBackToShop}
          className="breadcrumb-link"
          style={{ textTransform: 'capitalize' }}
        >
          {product.category.replace('-', ' ')}
        </button>
        <ChevronRight size={14} className="breadcrumb-arrow" />
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      {/* Main Top Grid: Gallery + Info */}
      <div className="detail-top-grid">
        {/* Left: Image Gallery */}
        <div className="detail-gallery-wrap">
          <div className="detail-thumbs-column">
            {(product.images && product.images.length > 0 ? product.images : [product.image]).map((imgUrl, idx) => (
              <div
                key={idx}
                className={`detail-thumb-box ${selectedImage === imgUrl ? 'active' : ''}`}
                onClick={() => handleSelectThumbnail(imgUrl)}
              >
                <img
                  src={getSafeProductImage(imgUrl, product.name)}
                  alt={`${product.name} thumbnail ${idx}`}
                  onError={(e) => handleProductImageError(e, product.name, imgUrl)}
                />
              </div>
            ))}
          </div>

          <div className="detail-main-img-box">
            <img
              src={getSafeProductImage(selectedImage || product.image, product.name)}
              alt={product.name}
              onError={(e) => handleProductImageError(e, product.name, selectedImage || product.image)}
            />
            {product.tag && (
              <div className="detail-tag-float">
                <span className="badge badge-bestseller">{product.tag}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info, Price & Actions */}
        <div className="detail-info-wrap">
          {/* Breadcrumbs Category & Title */}
          <div className="detail-category-label">
            {product.category.replace('-', ' ').toUpperCase()}
          </div>
          <h1 className="detail-product-title">{product.name}</h1>

          {/* Rating, Sold & Badges (Real dari database) */}
          <div className="detail-meta-row">
            <div className="detail-rating-pill">
              {realReviewCount > 0 && realAvgRating != null ? (
                <>
                  <Star size={16} fill="#FFB703" strokeWidth={0} />
                  <strong style={{ marginLeft: 4 }}>{realAvgRating.toFixed(1)}</strong>
                  <span className="meta-text-muted">({realReviewCount} ulasan)</span>
                </>
              ) : (
                <span className="meta-text-muted">Belum ada ulasan</span>
              )}
            </div>
            <span className="meta-dot">•</span>
            <span className="meta-sold">{product.soldCount ?? 0} terjual</span>
            <span className="meta-dot">•</span>
            <span className="badge badge-handmade">Handmade</span>
          </div>

          {/* Price */}
          <div className="detail-price-box">
            <span className="detail-current-price">
              {formatRupiah(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="detail-original-price">
                {formatRupiah(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Description Snippet */}
          <p className="detail-short-desc">{product.description}</p>

          {/* Variant Selector (dibaca langsung dari tabel product_variants) */}
          {hasVariants && (
            <div className="detail-variant-section">
              <div className="variant-label-row">
                <span className="variant-label-title">Pilih Varian:</span>
                <strong className="variant-selected-name">
                  {selectedColor
                    ? `${selectedColor.name} (Stok: ${selectedColor.stock})`
                    : 'Semua varian sedang habis'}
                </strong>
              </div>
              <div className="color-swatches-grid">
                {activeVariants.map((col) => {
                  const isOutOfStock = (Number(col.stock) || 0) <= 0 || col.is_active === false;
                  const isSelected = selectedColor && (selectedColor.id ? selectedColor.id === col.id : selectedColor.name === col.name);
                  const hexColor = col.color_hex || col.hex;
                  return (
                    <button
                      key={col.id || col.name}
                      type="button"
                      disabled={isOutOfStock}
                      className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectColor(col)}
                      title={isOutOfStock ? `${col.name} (Stok Habis)` : `${col.name} — Stok ${col.stock}`}
                      style={
                        isOutOfStock
                          ? { opacity: 0.45, cursor: 'not-allowed', textDecoration: 'line-through' }
                          : undefined
                      }
                    >
                      {hexColor && (
                        <span
                          className="swatch-circle"
                          style={{ backgroundColor: hexColor }}
                        >
                          {isSelected && <Check size={14} color="#484F4F" />}
                        </span>
                      )}
                      <span className="swatch-name">
                        {col.name}
                        {isOutOfStock ? ' (Habis)' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Action Buttons */}
          <div className="detail-actions-section">
            <div className="detail-qty-wrap">
              <span className="qty-label">Jumlah:</span>
              <div className="qty-counter-box">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !canAddToCart}
                >
                  <Minus size={16} />
                </button>
                <span className="qty-display-num">{canAddToCart ? quantity : 0}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  disabled={!canAddToCart || quantity >= availableStock}
                >
                  <Plus size={16} />
                </button>
              </div>
              <span style={{ fontSize: '0.8rem', color: availableStock > 0 ? '#6B7280' : '#DC2626', marginLeft: '8px' }}>
                {availableStock > 0 ? `Tersedia ${availableStock}` : 'Stok Habis'}
              </span>
            </div>

            <div className="detail-btn-group">
              <button
                className="btn-primary btn-add-cart-large"
                onClick={handleAddToCartClick}
                disabled={!canAddToCart}
                style={!canAddToCart ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                <ShoppingBag size={20} />
                <span>{canAddToCart ? 'Tambah ke Keranjang' : 'Stok Habis'}</span>
              </button>

              <button
                className={`btn-wishlist-large ${isWishlisted ? 'active' : ''}`}
                onClick={() => onToggleWishlist(product)}
                title={isWishlisted ? 'Hapus dari Wishlist' : 'Simpan ke Wishlist'}
              >
                <Heart
                  size={20}
                  fill={isWishlisted ? '#FF86C1' : 'none'}
                  color={isWishlisted ? '#FF86C1' : 'currentColor'}
                />
              </button>
            </div>
          </div>

          {/* Key Trust Highlights (from Mockup) */}
          <div className="detail-trust-cards">
            <div className="trust-card">
              <div className="trust-icon-box">
                <Heart size={20} color="#FF86C1" />
              </div>
              <div>
                <strong>100% Handmade</strong>
                <span>Dibuat dengan cinta & teliti</span>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <Truck size={20} color="#0284C7" />
              </div>
              <div>
                <strong>Pengiriman Cepat</strong>
                <span>1-3 hari (Palembang & Nasional)</span>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <Package size={20} color="#059669" />
              </div>
              <div>
                <strong>Packing Aman</strong>
                <span>Rapi, estetik & kartu ucapan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section Tabs: Deskripsi, Detail Produk, Ulasan */}
      <div className="detail-tabs-section">
        <div className="detail-tab-headers">
          <button
            className={`tab-btn ${activeTab === 'deskripsi' ? 'active' : ''}`}
            onClick={() => setActiveTab('deskripsi')}
          >
            Deskripsi
          </button>
          <button
            className={`tab-btn ${activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('detail')}
          >
            Detail Produk
          </button>
          <button
            className={`tab-btn ${activeTab === 'ulasan' ? 'active' : ''}`}
            onClick={() => setActiveTab('ulasan')}
          >
            Ulasan ({realReviewCount})
          </button>
        </div>

        <div className="tab-content-card">
          {activeTab === 'deskripsi' && (
            <div className="tab-pane fade-in">
              <h3 className="tab-pane-title">Deskripsi Lengkap</h3>
              <p className="tab-text-lead">{product.description}</p>

              {product.specs && (
                <div className="specs-list-box">
                  <h4>Spesifikasi Produk:</h4>
                  <ul>
                    {Object.entries(product.specs).map(([key, val]) => (
                      <li key={key}>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {key.replace(/([A-Z])/g, ' $1')}:
                        </strong>{' '}
                        <span>{val}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="note-alert-box">
                <Sparkles size={18} color="#E63985" />
                <span>
                  {product.note ||
                    'Warna dapat sedikit berbeda karena pencahayaan dan resolusi layar perangkat Anda.'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'detail' && (
            <div className="tab-pane fade-in">
              <h3 className="tab-pane-title">Instruksi & Jaminan Kualitas</h3>
              <div className="specs-grid-two">
                <div className="spec-info-box">
                  <h4>🧶 Panduan Perawatan Rajut:</h4>
                  <ul>
                    <li>Cuci menggunakan air dingin atau suam-suam kuku dengan sabun lembut (hindari deterjen keras).</li>
                    <li>Jangan disikat atau diperas terlalu kuat agar rajutan tidak melar.</li>
                    <li>Keringkan dengan cara diangin-anginkan di permukaan datar (hindari paparan matahari langsung terik).</li>
                  </ul>
                </div>

                <div className="spec-info-box">
                  <h4>🛡️ Garansi 14 Hari Knitty Craft:</h4>
                  <ul>
                    <li>Garansi kerapian jahitan dan pengait gantungan selama 14 hari setelah barang diterima.</li>
                    <li>Jika ada jahitan terlepas atau kerusakan produksi, kami ganti baru atau rajut ulang gratis.</li>
                    <li>Sertakan video unboxing untuk klaim cepat via WhatsApp.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ulasan' && (
            <div className="tab-pane fade-in">
              <div className="reviews-summary-head">
                <div>
                  <h3 className="tab-pane-title">Ulasan Pembeli</h3>
                  {realReviewCount > 0 && realAvgRating != null ? (
                    <div className="rating-big-row">
                      <span className="big-rating-num">{realAvgRating.toFixed(1)}</span>
                      <div>
                        <div className="testi-stars">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={20}
                              fill={i < Math.round(realAvgRating) ? '#FFB703' : 'none'}
                              color="#FFB703"
                              strokeWidth={i < Math.round(realAvgRating) ? 0 : 1.5}
                            />
                          ))}
                        </div>
                        <span className="total-reviews-count">
                          Berdasarkan {realReviewCount} ulasan terverifikasi
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#888', margin: '6px 0 0' }}>
                      Belum ada ulasan
                    </p>
                  )}
                </div>
              </div>

              <div className="note-alert-box" style={{ marginBottom: '20px' }}>
                <Sparkles size={18} color="#E63985" />
                <span>
                  Sudah membeli produk ini? Kirim ulasanmu melalui halaman <strong>Pesanan Saya / Detail Tracking</strong> setelah pesanan berstatus <strong>Selesai</strong>.
                </span>
              </div>

              {/* Reviews List (Real dari tabel `reviews` di Supabase) */}
              {loadingReviews ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>
                  Memuat ulasan...
                </p>
              ) : reviewsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px', color: '#888' }}>
                  <p style={{ margin: 0, fontSize: '0.98rem' }}>
                    Belum ada ulasan, jadilah yang pertama!
                  </p>
                </div>
              ) : (
                <div className="reviews-list-container">
                  {reviewsList.map((rev) => (
                    <div key={rev.id} className="review-item-card">
                      <div className="rev-head-row">
                        <div className="rev-author-box">
                          <div className="rev-avatar-circle">
                            {(rev.customer_name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{rev.customer_name || 'Pelanggan'}</strong>
                            <span className="rev-variant">Pembeli Terverifikasi</span>
                          </div>
                        </div>
                        <div className="rev-date-stars">
                          <div className="testi-stars">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={i < (Number(rev.rating) || 0) ? '#FFB703' : 'none'}
                                color="#FFB703"
                                strokeWidth={i < (Number(rev.rating) || 0) ? 0 : 1.5}
                              />
                            ))}
                          </div>
                          <span className="rev-date">{formatReviewDate(rev.created_at)}</span>
                        </div>
                      </div>
                      <p className="rev-comment-text">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: "Produk Lainnya" */}
      <section className="related-products-section">
        <div className="section-head-row">
          <div>
            <h2 className="section-title">Produk Lainnya</h2>
            <p className="section-subtitle-left">Kamu mungkin juga menyukai kreasi handmade ini</p>
          </div>
          <button className="view-all-link-btn" onClick={onBackToShop}>
            <span>Lihat Semua</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="products-grid-4">
          {relatedProducts.map((rel) => (
            <ProductCard
              key={rel.id}
              product={rel}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              isWishlisted={wishlist.includes(rel.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
