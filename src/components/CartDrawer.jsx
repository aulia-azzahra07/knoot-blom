import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';
import { PRODUCTS } from '../data/products';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onSelectProduct
}) {
  if (!isOpen) return null;

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Aturan Baru: Min. pembelian Rp 50.000 Gratis Ongkir, se-Palembang Rp 5.000 flat
  const isFreeShipping = subtotal >= 50000;
  const ongkir = subtotal === 0 ? 0 : (isFreeShipping ? 0 : 5000);
  const total = subtotal + ongkir;

  // Recommended products not already in cart
  const recommended = PRODUCTS.filter(
    (p) => !cartItems.some((ci) => ci.id === p.id)
  ).slice(0, 4);

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <ShoppingBag size={22} className="cart-bag-icon" />
            <h2>Keranjang Belanja <span className="cart-count-pill">({cartItems.length} item)</span></h2>
          </div>
          <button className="cart-close-btn" onClick={onClose} title="Tutup">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <div className="cart-empty-circle">
                <ShoppingBag size={48} color="#FF86C1" />
              </div>
              <h3>Keranjang Belanjamu Masih Kosong</h3>
              <p>Yuk, temukan aksesoris rajut handmade cantik dan DIY kit kesukaanmu!</p>
              <button
                className="btn-primary"
                onClick={onClose}
                style={{ marginTop: '16px' }}
              >
                Mulai Belanja Sekarang
              </button>
            </div>
          ) : (
            <>
              {/* Free Shipping Progress (Min. Rp 50.000) */}
              <div className="free-shipping-bar">
                <div className="free-shipping-text">
                  <Sparkles size={16} color="#E63985" />
                  <span>
                    {subtotal >= 50000
                      ? '🎉 Hore! Belanjaanmu berhak GRATIS ONGKIR se-Palembang!'
                      : `Tambah ${formatRupiah(50000 - subtotal)} lagi untuk GRATIS ONGKIR ke seluruh Palembang! ✨`}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (subtotal / 50000) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.selectedColor?.name || 'def'}`} className="cart-item-card">
                    <div className="cart-item-img" onClick={() => { onSelectProduct(item); onClose(); }}>
                      <img src={item.image} alt={item.name} />
                    </div>

                    <div className="cart-item-info">
                      <div className="cart-item-head">
                        <h4 onClick={() => { onSelectProduct(item); onClose(); }}>
                          {item.name}
                        </h4>
                        <button
                          className="cart-item-del-btn"
                          onClick={() => onRemoveItem(item.id, item.selectedColor?.name)}
                          title="Hapus produk"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {item.selectedColor && (
                        <div className="cart-item-color-pill">
                          <span
                            className="color-dot"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          <span>{item.selectedColor.name}</span>
                        </div>
                      )}

                      <div className="cart-item-bottom">
                        <div className="cart-item-price">
                          {formatRupiah(item.price)}
                        </div>

                        {/* Quantity Counter */}
                        <div className="cart-qty-counter">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.selectedColor?.name, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.selectedColor?.name, item.quantity + 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Items Carousel */}
              {recommended.length > 0 && (
                <div className="cart-recommended-section">
                  <h4 className="cart-rec-title">Produk yang mungkin kamu suka</h4>
                  <div className="cart-rec-grid">
                    {recommended.map((rec) => (
                      <div
                        key={rec.id}
                        className="cart-rec-item"
                        onClick={() => {
                          onSelectProduct(rec);
                          onClose();
                        }}
                      >
                        <img src={rec.image} alt={rec.name} />
                        <div className="rec-info">
                          <span className="rec-name">{rec.name}</span>
                          <span className="rec-price">{formatRupiah(rec.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Summary */}
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary-box">
              <h4 className="summary-title">Ringkasan Belanja</h4>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Ongkir (Se-Palembang)</span>
                <span style={{ color: isFreeShipping ? '#059669' : 'inherit', fontWeight: isFreeShipping ? '600' : 'normal' }}>
                  {isFreeShipping ? 'GRATIS (Rp 0)' : formatRupiah(ongkir)}
                </span>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
            </div>

            <div className="cart-action-buttons">
              <button
                className="btn-primary btn-checkout-cart"
                onClick={onProceedToCheckout}
              >
                <span>Lanjut ke Checkout</span>
                <ArrowRight size={18} />
              </button>

              <button
                className="btn-secondary btn-continue-cart"
                onClick={onClose}
              >
                Lanjut Belanja
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
