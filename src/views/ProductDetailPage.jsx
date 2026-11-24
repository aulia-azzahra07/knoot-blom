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

    // 4. Fallback cerdas untuk produk Keychain Pita & Bintang dari Supabase storage
    const pName = (prod.name || '').toLowerCase();
    if (pName.includes('pita')) {
      if (colName.includes('biru')) {
        return 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png';
      }
      if (colName.includes('putih')) {
        return 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png';
      }
      if (colName.includes('kuning')) {
        return 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png';
      }
    } else if (pName.includes('bintang')) {
      if (colName.includes('kuning')) {
        return 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png';
      }
      if (colName.includes('pink')) {
        return 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairdband%20pink.png';
      }
    }

    return prod.image;
  };

  const initialColor = product.colors && product.colors.length > 0 ? product.colors[0] : null;
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedImage, setSelectedImage] = useState(() => resolveColorImage(initialColor, product) || product.image);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('deskripsi');

  // Sinkronisasi foto & varian warna saat produk berganti
  React.useEffect(() => {
    if (product) {
      const initCol = product.colors && product.colors.length > 0 ? product.colors[0] : null;
      setSelectedColor(initCol);
      const initImg = initCol ? resolveColorImage(initCol, product) : (product.image || product.images?.[0]);
      setSelectedImage(initImg);
      setQuantity(1);
    }
  }, [product]);

  // Handler saat warna diklik: Ganti warna aktif DAN ubah gambar utama otomatis
  const handleSelectColor = (col) => {
    setSelectedColor(col);
    const targetImg = resolveColorImage(col, product);
    if (targetImg) {
      setSelectedImage(targetImg);
    }
  };

  // Handler saat thumbnail foto diklik
  const handleSelectThumbnail = (imgUrl) => {
    setSelectedImage(imgUrl);
    // Jika thumbnail cocok dengan salah satu warna, sinkronkan juga warna aktifnya
    if (product.colors && product.colors.length > 0) {
      const matchedCol = product.colors.find((col) => {
        const resolved = resolveColorImage(col, product);
        return resolved === imgUrl || imgUrl.toLowerCase().includes((col.name || '').toLowerCase());
      });
      if (matchedCol) {
        setSelectedColor(matchedCol);
      }
    }
  };

  // Customer Reviews state
  const [reviewsList, setReviewsList] = useState([
    {
      id: 1,
      author: 'Putri Ramadhani',
      rating: 5,
      date: '28 Okt 2026',
      comment: 'MasyaAllah cantik banget! Jahitannya rapi banget, benangnya halus nggak gampang brudul. Pengemasan pakai kardus estetik dan ada kartu ucapan.',
      variant: selectedColor?.name || 'Soft Pink'
    },
    {
      id: 2,
      author: 'Dinda Kirana',
      rating: 5,
      date: '22 Okt 2026',
      comment: 'Barangnya persis sama di foto. Cocok banget buat gantungan tas kuliah. Pengiriman dari Palembang ke Jakarta aman dan cepat sampai!',
      variant: 'Warm Peach'
    },
    {
      id: 3,
      author: 'Rina Salsabila',
      rating: 4,
      date: '15 Okt 2026',
      comment: 'Lucu bangettt, respon admin cepat dan ramah pas minta custom warna. Recommended!',
      variant: 'Lilac'
    }
  ]);

  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newRev = {
      id: Date.now(),
      author: newReviewName.trim() || 'Pelanggan Setia',
      rating: newReviewRating,
      date: 'Hari ini',
      comment: newReviewText,
      variant: selectedColor?.name || 'Default'
    };

    setReviewsList([newRev, ...reviewsList]);
    setNewReviewText('');
    setNewReviewName('');
    showToast('Terima kasih! Ulasanmu berhasil ditambahkan.');
  };

  const handleAddToCartClick = () => {
    onAddToCart({
      ...product,
      quantity,
      selectedColor: selectedColor || (product.colors ? product.colors[0] : null),
      image: selectedImage || product.image
    });
    showToast(`${quantity}x ${product.name} (${selectedColor?.name || 'Varian'}) dimasukkan ke keranjang belanja!`);
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
            {(product.images || [product.image]).map((imgUrl, idx) => (
              <div
                key={idx}
                className={`detail-thumb-box ${selectedImage === imgUrl ? 'active' : ''}`}
                onClick={() => handleSelectThumbnail(imgUrl)}
              >
                <img src={imgUrl} alt={`${product.name} thumbnail ${idx}`} />
              </div>
            ))}
          </div>

          <div className="detail-main-img-box">
            <img src={selectedImage || product.image} alt={product.name} />
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

          {/* Rating, Sold & Badges */}
          <div className="detail-meta-row">
            <div className="detail-rating-pill">
              <Star size={16} fill="#FFB703" strokeWidth={0} />
              <strong style={{ marginLeft: 4 }}>{product.rating}</strong>
              <span className="meta-text-muted">({product.reviewsCount || 120} ulasan)</span>
            </div>
            <span className="meta-dot">•</span>
            <span className="meta-sold">{product.soldCount || 200}+ terjual</span>
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

          {/* Color Variant Swatches */}
          {product.colors && product.colors.length > 0 && (
            <div className="detail-variant-section">
              <div className="variant-label-row">
                <span className="variant-label-title">Pilih Warna:</span>
                <strong className="variant-selected-name">
                  {selectedColor?.name || 'Pilih salah satu'}
                </strong>
              </div>
              <div className="color-swatches-grid">
                {product.colors.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    className={`color-swatch-btn ${selectedColor?.hex === col.hex ? 'active' : ''}`}
                    onClick={() => handleSelectColor(col)}
                    title={col.name}
                  >
                    <span
                      className="swatch-circle"
                      style={{ backgroundColor: col.hex }}
                    >
                      {selectedColor?.hex === col.hex && (
                        <Check size={14} color="#484F4F" />
                      )}
                    </span>
                    <span className="swatch-name">{col.name}</span>
                  </button>
                ))}
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
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <span className="qty-display-num">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="detail-btn-group">
              <button
                className="btn-primary btn-add-cart-large"
                onClick={handleAddToCartClick}
              >
                <ShoppingBag size={20} />
                <span>Tambah ke Keranjang</span>
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
            Ulasan ({reviewsList.length + 117})
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
                  <div className="rating-big-row">
                    <span className="big-rating-num">{product.rating}</span>
                    <div>
                      <div className="testi-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={20} fill="#FFB703" strokeWidth={0} />
                        ))}
                      </div>
                      <span className="total-reviews-count">Berdasarkan {reviewsList.length + 117} ulasan terverifikasi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add review form */}
              <form onSubmit={handleAddReview} className="add-review-card">
                <h4>Tulis Ulasan Kamu ♡</h4>
                <div className="form-inline-row">
                  <input
                    type="text"
                    placeholder="Nama kamu (contoh: Naila)"
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                  />
                  <div className="star-rating-picker">
                    <span>Rating: </span>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setNewReviewRating(num)}
                        className="star-pick-btn"
                      >
                        <Star
                          size={18}
                          fill={num <= newReviewRating ? '#FFB703' : 'none'}
                          color="#FFB703"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Ceritakan kepuasanmu dengan produk rajut ini..."
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                />
                <button type="submit" className="btn-primary btn-submit-review">
                  Kirim Ulasan
                </button>
              </form>

              {/* Reviews List */}
              <div className="reviews-list-container">
                {reviewsList.map((rev) => (
                  <div key={rev.id} className="review-item-card">
                    <div className="rev-head-row">
                      <div className="rev-author-box">
                        <div className="rev-avatar-circle">
                          {rev.author.charAt(0)}
                        </div>
                        <div>
                          <strong>{rev.author}</strong>
                          <span className="rev-variant">Varian: {rev.variant}</span>
                        </div>
                      </div>
                      <div className="rev-date-stars">
                        <div className="testi-stars">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} size={14} fill="#FFB703" strokeWidth={0} />
                          ))}
                        </div>
                        <span className="rev-date">{rev.date}</span>
                      </div>
                    </div>
                    <p className="rev-comment-text">"{rev.comment}"</p>
                  </div>
                ))}
              </div>
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
