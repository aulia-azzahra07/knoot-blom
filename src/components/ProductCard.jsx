import React from 'react';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { getSafeProductImage, handleProductImageError } from '../utils/productImage';

export default function ProductCard({
  product,
  onSelectProduct,
  onAddToCart,
  isWishlisted,
  onToggleWishlist
}) {
  const formatRupiah = (val) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const getBadgeClass = (tagType) => {
    switch (tagType) {
      case 'bestseller':
        return 'badge-bestseller';
      case 'new':
        return 'badge-new';
      case 'madetoorder':
        return 'badge-madetoorder';
      default:
        return 'badge-bestseller';
    }
  };

  return (
    <div className="product-card">
      {/* Product Image & Badges */}
      <div className="product-image-wrap" onClick={() => onSelectProduct(product)}>
        <img
          src={getSafeProductImage(product.image, product.name)}
          alt={product.name}
          loading="lazy"
          onError={(e) => handleProductImageError(e, product.name, product.image)}
        />

        {/* Badge */}
        {product.tag && (
          <div className="product-tag-wrap">
            <span className={`badge ${getBadgeClass(product.tagType)}`}>
              {product.tag}
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          className={`product-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          title={isWishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
        >
          <Heart size={16} fill={isWishlisted ? '#FF86C1' : 'none'} color={isWishlisted ? '#FF86C1' : 'currentColor'} />
        </button>
      </div>

      {/* Info Content */}
      <div className="product-info">
        {/* Rating & Sold count (Real dari tabel reviews & view product_sales) */}
        <div className="product-rating-row">
          <div className="product-stars">
            {product.reviewsCount > 0 && product.rating != null ? (
              <>
                <Star size={13} fill="#FFB703" strokeWidth={0} />
                <span style={{ fontWeight: 600, marginLeft: 3, color: '#484F4F' }}>
                  {Number(product.rating).toFixed(1)}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#888' }}>Belum ada ulasan</span>
            )}
          </div>
          <span>•</span>
          <span>{product.soldCount ?? 0} terjual</span>
        </div>

        {/* Title */}
        <h3
          className="product-title"
          onClick={() => onSelectProduct(product)}
          style={{ cursor: 'pointer' }}
        >
          {product.name}
        </h3>

        {/* Price & Add to Cart button */}
        <div className="product-price-row">
          <div>
            <div className="product-price">{formatRupiah(product.price)}</div>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="product-original-price">
                {formatRupiah(product.originalPrice)}
              </span>
            )}
          </div>

          <button
            className="card-quick-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            title="Tambah ke Keranjang"
          >
            <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
