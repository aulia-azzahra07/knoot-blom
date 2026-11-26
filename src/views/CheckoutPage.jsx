import React, { useState } from 'react';
import {
  CreditCard,
  Truck,
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  ArrowLeft,
  Check,
  Sparkles,
  Banknote,
  Info,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createCashOrderDirectly } from '../services/orderService';
import { fetchProductsByIds } from '../services/productService';
import { getSafeProductImage, handleProductImageError } from '../utils/productImage';
import { supabase } from '../lib/supabase';
import OrderTrackingStepper from '../components/OrderTrackingStepper';

export default function CheckoutPage({
  cartItems,
  products = [],
  onBackToCart,
  onOrderSuccess,
  showToast,
  currentUser
}) {
  const [fullName, setFullName] = useState('Naila Alfathonah');
  const [phone, setPhone] = useState('08123456789');
  const [address, setAddress] = useState('Jl. Melati No. 12, Sekip Jaya, Kemuning');
  const [province, setProvince] = useState('Sumatera Selatan');
  const [city, setCity] = useState('Palembang');
  const [postalCode, setPostalCode] = useState('30111');
  const [orderNotes, setOrderNotes] = useState('Mohon warna bunganya soft pastel ya kak, untuk kado ulang tahun sahabat.');

  // Shipping selection
  const [shippingMethod, setShippingMethod] = useState('palembang-flat');
  const [isProcessing, setIsProcessing] = useState(false);
  // Metode pembayaran selalu COD — tidak perlu state

  // Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Pastikan setiap item non-custom memakai harga & gambar terbaru dari tabel `products` Supabase
  const resolvedCartItems = cartItems.map((item) => {
    if (item.isCustom || item.isCustomKit) return item;
    const dbProd = products.find((p) => p.id === item.id || (item.slug && p.slug === item.slug));
    if (!dbProd) return item;
    return {
      ...item,
      name: dbProd.name || item.name,
      price: Number(dbProd.price) || Number(item.price) || 0,
      image: item.image && item.image.startsWith('http') ? item.image : (dbProd.image || item.image)
    };
  });

  const subtotal = resolvedCartItems.reduce(
    (acc, item) => acc + Number(item.price) * Number(item.quantity),
    0
  );

  // Aturan Ongkir Baru: Minimal pembelian Rp 50.000 Gratis Ongkir, se-Palembang flat Rp 5.000
  const isFreeShipping = subtotal >= 50000;
  const shippingCost = isFreeShipping ? 0 : 5000;
  const total = subtotal + shippingCost;

  const formatRupiah = (val) => 'Rp ' + Number(val).toLocaleString('id-ID');

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // ── Validasi form ────────────────────────────────────────────────────────
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      showToast('Mohon lengkapi nama, nomor HP, dan alamat terlebih dahulu.');
      return;
    }
    if (resolvedCartItems.length === 0) {
      showToast('Keranjang belanja masih kosong.');
      return;
    }

    // ── Cek login via Supabase Auth (bukan dari prop/localStorage) ────────────
    const { data: { user: authUser }, error: authCheckError } = await supabase.auth.getUser();
    if (authCheckError || !authUser) {
      showToast('Kamu harus login terlebih dahulu untuk membuat pesanan.');
      // Arahkan ke halaman login jika ada handler-nya
      if (onBackToCart) onBackToCart();
      return;
    }

    try {
      setIsProcessing(true);

      // ── Verifikasi harga terbaru langsung dari tabel `products` di Supabase ──
      const dbProductsMap = await fetchProductsByIds(
        resolvedCartItems
          .filter((item) => !item.isCustom && !item.isCustomKit)
          .map((item) => item.id || item.productId)
      );

      const verifiedCartItems = resolvedCartItems.map((item) => {
        if (item.isCustom || item.isCustomKit) return item;
        const dbProd = dbProductsMap[item.id || item.productId];
        if (!dbProd) return item;
        return {
          ...item,
          name: dbProd.name || item.name,
          price: Number(dbProd.price),
          image: item.image && item.image.startsWith('http') ? item.image : (dbProd.image || item.image)
        };
      });

      const verifiedSubtotal = verifiedCartItems.reduce(
        (acc, item) => acc + Number(item.price) * Number(item.quantity),
        0
      );
      const verifiedShippingCost = verifiedSubtotal >= 50000 ? 0 : 5000;
      const verifiedTotal = verifiedSubtotal + verifiedShippingCost;

      let result = null;
      let usedBackend = false;

      // ── Coba Backend Express API ──────────────────────────────────────────
      try {
        const response = await fetch('http://localhost:5000/api/create-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: fullName.trim(),
            phone: phone.trim(),
            address: `${address.trim()}, ${city.trim()}, ${province.trim()} ${postalCode.trim()}`,
            subtotal: verifiedSubtotal,
            shippingCost: verifiedShippingCost,
            total: verifiedTotal,
            notes: orderNotes.trim(),
            userId: authUser.id,
            cartItems: verifiedCartItems.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              selectedColor: item.selectedColor?.name || item.selectedColor || null,
            })),
          }),
        });

        const json = await response.json();
        if (response.ok && json.success) {
          result = json;
          usedBackend = true;
          console.log('[Checkout] ✅ Pesanan via backend berhasil:', json.orderNumber);
        } else {
          // Backend aktif tapi return error — tampilkan dan BERHENTI
          console.error('[Checkout] Backend error:', json);
          throw new Error(json.message || 'Gagal membuat pesanan melalui server.');
        }
      } catch (backendErr) {
        if (backendErr.message && !backendErr.message.includes('fetch') && !backendErr.message.includes('NetworkError') && !backendErr.message.includes('Failed to fetch')) {
          // Error bukan "server offline" — lempar ke user
          throw backendErr;
        }
        // Server offline / tidak aktif → fallback ke Supabase langsung
        console.warn('[Checkout] Backend offline, beralih ke Supabase langsung...');
      }

      // ── Fallback: Supabase SDK langsung (jika backend offline) ───────────
      if (!result) {
        result = await createCashOrderDirectly({
          customerName: fullName.trim(),
          phone: phone.trim(),
          address: `${address.trim()}, ${city.trim()}, ${province.trim()} ${postalCode.trim()}`,
          subtotal: verifiedSubtotal,
          shippingCost: verifiedShippingCost,
          total: verifiedTotal,
          notes: orderNotes.trim(),
          cartItems: verifiedCartItems,
        });
        console.log('[Checkout] ✅ Pesanan via Supabase langsung berhasil:', result.orderNumber);
      }

      // ── Pastikan result valid — JANGAN tampilkan sukses kalau gagal ───────
      if (!result || !result.success || !result.orderId) {
        throw new Error('Respons tidak valid dari server. Pesanan mungkin tidak tersimpan.');
      }

      const finalSubtotal = result.subtotal ?? verifiedSubtotal;
      const finalShippingCost = result.shippingCost ?? verifiedShippingCost;
      const finalTotal = result.total ?? verifiedTotal;

      // ── Buat objek order untuk UI ─────────────────────────────────────────
      const newOrder = {
        id: result.orderNumber || `KB-${Date.now().toString().slice(-6)}`,
        orderId: result.orderId,
        dbId: result.orderId,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        items: verifiedCartItems.map((item) => ({ ...item })),
        subtotal: finalSubtotal,
        shippingCost: finalShippingCost,
        total: finalTotal,
        paymentMethod: 'COD',
        paymentStatus: 'belum_dibayar',
        orderStatus: 'Dikemas',
        status: 'Dikemas',
        customer: {
          name: fullName.trim(),
          phone: phone.trim(),
          address: `${address.trim()}, ${city.trim()}, ${province.trim()} ${postalCode.trim()}`,
          notes: orderNotes.trim()
        }
      };

      try {
        localStorage.setItem('kb_last_order', JSON.stringify({
          orderNumber: result.orderNumber,
          orderId: result.orderId,
          paymentMethod: 'COD',
          total: finalTotal,
          customerName: fullName.trim(),
        }));
      } catch (_) {}

      // Konfeti! Hanya tampil kalau benar-benar sukses
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch (_) {}

      if (onOrderSuccess) onOrderSuccess(newOrder);
      setCompletedOrder(newOrder);
      setIsSuccessModalOpen(true);

    } catch (error) {
      console.error('[Checkout] ❌ Error:', error);
      // Tampilkan pesan error asli ke user — tidak diam-diam
      const userMessage = error.message || 'Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.';
      showToast(`❌ ${userMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin!`);
  };

  return (
    <div className="checkout-page-view container fade-in">
      <div className="checkout-header-bar">
        <button className="back-btn" onClick={onBackToCart}>
          <ArrowLeft size={18} />
          <span>Kembali ke Keranjang</span>
        </button>
        <h1 className="checkout-main-title">
          Formulir Pemesanan & Checkout
        </h1>
      </div>

      <div className="checkout-grid-layout">
        {/* Left Column: Delivery & Payment Forms */}
        <div className="checkout-left-col">
          <form id="checkout-form" onSubmit={handlePlaceOrder}>
            {/* 1. Data Penerima */}
            <div className="checkout-card">
              <div className="card-header-iconic">
                <div className="icon-circle">1</div>
                <h3>Informasi Penerima & Alamat Pengiriman</h3>
              </div>

              <div className="form-fields-grid">
                <div className="form-field full-width">
                  <label>Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama penerima paket"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Nomor Telepon / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812xxxxxxx"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Alamat Lengkap *</label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
                  />
                </div>

                <div className="form-field half-width">
                  <label>Provinsi</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  >
                    <option value="Sumatera Selatan">Sumatera Selatan</option>
                    <option value="DKI Jakarta">DKI Jakarta</option>
                    <option value="Jawa Barat">Jawa Barat</option>
                    <option value="Jawa Timur">Jawa Timur</option>
                    <option value="Jawa Tengah">Jawa Tengah</option>
                    <option value="Lampung">Lampung</option>
                    <option value="Sumatera Utara">Sumatera Utara</option>
                  </select>
                </div>

                <div className="form-field half-width">
                  <label>Kota / Kabupaten</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="Palembang">Palembang</option>
                    <option value="Ogan Ilir (Indralaya)">Ogan Ilir (Indralaya)</option>
                    <option value="Prabumulih">Prabumulih</option>
                    <option value="Banyuasin">Banyuasin</option>
                    <option value="Jakarta Selatan">Jakarta Selatan</option>
                    <option value="Bandung">Bandung</option>
                    <option value="Surabaya">Surabaya</option>
                  </select>
                </div>

                <div className="form-field half-width">
                  <label>Kode Pos</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="30111"
                  />
                </div>

                <div className="form-field half-width">
                  <label>Catatan Pesanan / Kado</label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Pesan kado, request warna, dll."
                  />
                </div>
              </div>
            </div>

            {/* 2. Metode Pengiriman */}
            <div className="checkout-card">
              <div className="card-header-iconic">
                <div className="icon-circle">2</div>
                <h3>Metode Pengiriman</h3>
              </div>

              <div className="shipping-options-list">
                <label className="shipping-option-box active">
                  <div className="shipping-radio-wrap">
                    <input
                      type="radio"
                      name="shipping"
                      checked={true}
                      readOnly
                    />
                    <div>
                      <strong>Pengiriman Seluruh Kota Palembang</strong>
                      <p>Diantar aman oleh kurir lokal / ekspedisi terpercaya langsung ke alamatmu</p>
                    </div>
                  </div>
                  <span className={`shipping-price-tag ${isFreeShipping ? 'price-free-tag' : ''}`}>
                    {isFreeShipping ? 'GRATIS (Rp 0)' : 'Rp 5.000'}
                  </span>
                </label>

                {/* Info Box Ongkir Palembang */}
                <div
                  className="shipping-promo-notice"
                  style={{
                    backgroundColor: isFreeShipping ? '#ECFDF5' : '#FFF1F8',
                    border: `1px solid ${isFreeShipping ? '#A7F3D0' : '#FFD1E6'}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: isFreeShipping ? '#065F46' : '#9D174D',
                    marginTop: '8px'
                  }}
                >
                  <Sparkles size={18} color={isFreeShipping ? '#059669' : '#E63985'} />
                  <span>
                    {isFreeShipping ? (
                      <strong>🎉 Selamat! Pembelianmu mencapai Rp 50.000+, kamu mendapatkan Gratis Ongkir!</strong>
                    ) : (
                      <>
                        Ongkir se-Palembang hanya <strong>Rp 5.000</strong>. Tambah belanja senilai <strong>{formatRupiah(50000 - subtotal)}</strong> lagi untuk <strong>GRATIS ONGKIR</strong>!
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Metode Pembayaran */}
            <div className="checkout-card">
              <div className="card-header-iconic">
                <div className="icon-circle">3</div>
                <h3>Metode Pembayaran</h3>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                background: '#F0FDF4',
                border: '2px solid #22C55E',
                borderRadius: '14px',
                padding: '18px',
                margin: '12px 0'
              }}>
                <Banknote size={28} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#15803D', fontSize: '15px', display: 'block', marginBottom: '6px' }}>
                    Bayar di Tempat (COD — Cash on Delivery)
                  </strong>
                  <p style={{ color: '#166534', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                    Siapkan uang tunai <strong>pas</strong> saat kurir tiba di depan pintumu. Pembayaran dilakukan langsung kepada kurir — tidak perlu transfer atau scan QRIS!
                  </p>
                </div>
              </div>

              <div className="security-guarantee-note">
                <ShieldCheck size={18} color="#059669" />
                <span>Transaksi dijamin aman 100%. Dilindungi Garansi 14 Hari Knot & Bloom.</span>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Order Summary (Matching Mockup Screen 6) */}
        <div className="checkout-right-col">
          <div className="checkout-summary-card">
            <h3 className="summary-card-title">
              Ringkasan Belanja <span className="item-count-chip">({resolvedCartItems.length} item)</span>
            </h3>

            {/* Compact items list */}
            <div className="checkout-items-preview">
              {resolvedCartItems.map((item, idx) => (
                <div key={idx} className="checkout-item-row">
                  <div className="preview-img-box">
                    <img
                      src={getSafeProductImage(item.image, item.name)}
                      alt={item.name}
                      onError={(e) => handleProductImageError(e, item.name, item.image)}
                    />
                    <span className="preview-qty-badge">{item.quantity}</span>
                  </div>
                  <div className="preview-info">
                    <h5 className="preview-name">{item.name}</h5>
                    {item.selectedColor && (
                      <span className="preview-color">{item.selectedColor.name}</span>
                    )}
                  </div>
                  <div className="preview-price">
                    {formatRupiah(Number(item.price) * Number(item.quantity))}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider-line" />

            {/* Calculations */}
            <div className="calc-rows">
              <div className="calc-row">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="calc-row">
                <span>Ongkir (Se-Palembang)</span>
                <span style={{ color: isFreeShipping ? '#059669' : '#1F2937', fontWeight: isFreeShipping ? '600' : 'normal' }}>
                  {isFreeShipping ? 'GRATIS (Rp 0)' : formatRupiah(shippingCost)}
                </span>
              </div>
              <div className="calc-row total-row">
                <span>Total Pembayaran</span>
                <span className="big-total-text">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Bayar Sekarang / Pesan Sekarang Button */}
            <button
              type="submit"
              form="checkout-form"
              className="btn-primary btn-pay-now-large"
              disabled={isProcessing}
            >
              <span>
                {isProcessing
                  ? "Memproses Pesanan..."
                  : "Buat Pesanan (COD — Bayar Saat Kurir Tiba)"}
              </span>
              <CheckCircle2 size={20} />
            </button>

            <div className="summary-footer-guarantee">
              <span>🛡️ Garansi kepuasan & pengerjaan rapi</span>
              <span>📦 Kemasan minim sampah & ramah lingkungan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal / Invoice */}
      {isSuccessModalOpen && completedOrder && (
        <div className="modal-backdrop">
          <div className="order-success-modal fade-in">
            <div className="success-badge-top">
              <CheckCircle2 size={42} color="#059669" />
            </div>

            <h2>Pesanan Berhasil Dibuat! ♡</h2>
            <p className="order-num-text">
              Nomor Pesanan: <strong>#{completedOrder.id}</strong>
            </p>
            <p className="order-submsg">
              Terima kasih, {completedOrder.customer.name}! Tim Knot & Bloom Unsri akan segera merajut dan menyiapkan pesananmu dengan sepenuh hati.
            </p>

            {/* Visual Tracking Stepper: Step 1 (Pesanan Diterima) */}
            <div style={{ margin: '18px 0', textAlign: 'left' }}>
              <OrderTrackingStepper
                status={completedOrder.status || 'Pesanan Diterima'}
                orderDate={completedOrder.date}
                orderId={completedOrder.id}
                shippingMethod={completedOrder.shippingCost === 0 ? 'Gratis Ongkir Se-Palembang' : 'Reguler Se-Palembang (Rp 5.000)'}
                customerAddress={completedOrder.customer?.address}
                customerName={completedOrder.customer?.name}
                items={completedOrder.items || []}
                compact={true}
              />
            </div>

            {/* Payment Instructions Box */}
            <div className="payment-instruction-box">
              <div className="instr-header">
                <Banknote size={20} color="#10B981" />
                <h4>Metode: COD (Bayar Tunai ke Kurir)</h4>
              </div>

              <div
                className="cash-payment-info-box"
                style={{
                  background: '#F0FDF4',
                  border: '1px dashed #22C55E',
                  borderRadius: '12px',
                  padding: '16px',
                  margin: '14px 0',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontWeight: '700',
                    color: '#15803D',
                    marginBottom: '6px',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Banknote size={20} />
                  <span>Siapkan Uang Tunai Pas Saat Kurir Tiba!</span>
                </div>
                <p style={{ color: '#166534', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  Siapkan uang tunai pas sebesar <strong>{formatRupiah(completedOrder.total)}</strong> untuk dibayarkan langsung ke kurir saat paket tiba di depan pintumu ya!
                </p>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#4B5563',
                    backgroundColor: '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #DCFCE7'
                  }}
                >
                  🌸 Pesananmu langsung masuk antrean studio dan akan kami proses secepatnya!
                </div>
              </div>

              <div className="total-to-pay-box">
                <span>Total yang Perlu Disiapkan (COD):</span>
                <strong>{formatRupiah(completedOrder.total)}</strong>
              </div>
            </div>

            <div className="modal-actions-success">
              <button
                className="btn-primary"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  onBackToCart('account');
                }}
              >
                <span>Lihat Pesanan di Akun Saya</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
