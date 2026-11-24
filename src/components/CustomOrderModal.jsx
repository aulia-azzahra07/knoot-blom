import React, { useState } from 'react';
import { X, Sparkles, Check, Heart, Palette, Type, Upload } from 'lucide-react';

export default function CustomOrderModal({ isOpen, onClose, onAddToCart, showToast }) {
  if (!isOpen) return null;

  const [productType, setProductType] = useState('keychain');
  const [selectedColor1, setSelectedColor1] = useState('#FF86C1');
  const [selectedColor2, setSelectedColor2] = useState('#FEDEA4');
  const [initialText, setInitialText] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [giftBox, setGiftBox] = useState(false);

  const productOptions = [
    { id: 'keychain', name: 'Gantungan Kunci Tulip / Bunga', basePrice: 25000 },
    { id: 'bag', name: 'Mini Crochet Bag Custom', basePrice: 95000 },
    { id: 'amigurumi', name: 'Boneka Amigurumi Kustom', basePrice: 65000 },
    { id: 'pouch', name: 'Pouch Serut Buah / Bunga', basePrice: 50000 }
  ];

  const colorPalette = [
    { name: 'Soft Pink', hex: '#FF86C1' },
    { name: 'Warm Cream', hex: '#FEDEA4' },
    { name: 'Sky Blue', hex: '#A7D8FF' },
    { name: 'Mint Green', hex: '#5DE5AB' },
    { name: 'Lilac', hex: '#EEDBFF' },
    { name: 'Warm White', hex: '#FFF8F0' },
    { name: 'Mocha Brown', hex: '#A87954' },
    { name: 'Charcoal Grey', hex: '#7A8484' }
  ];

  const currentOption = productOptions.find((p) => p.id === productType);
  const totalPrice = (currentOption?.basePrice || 25000) + (giftBox ? 15000 : 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const customItem = {
      id: `custom-${Date.now()}`,
      name: `Custom ${currentOption.name} (${initialText ? 'Inisial: ' + initialText.toUpperCase() : 'Spesial'})`,
      price: totalPrice,
      image: '/images/tulip-keychain.jpg',
      category: 'aksesoris',
      selectedColor: {
        name: `Warna 1: ${selectedColor1}, Warna 2: ${selectedColor2}`,
        hex: selectedColor1
      },
      quantity: 1,
      isCustom: true,
      customDetails: {
        productType: currentOption.name,
        colors: [selectedColor1, selectedColor2],
        initial: initialText.toUpperCase(),
        note: customNote,
        giftBox
      }
    };

    onAddToCart(customItem);
    showToast(`Pesanan custom "${customItem.name}" berhasil ditambahkan ke keranjang!`);
    onClose();
  };

  const formatRupiah = (val) => 'Rp ' + Number(val).toLocaleString('id-ID');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="custom-order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Sparkles size={22} color="#FF86C1" />
            <h3>Buat Pesanan Custom Sendiri ♡</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="custom-modal-body">
          <p className="modal-intro">
            Rancang aksesoris rajutan impianmu! Tim pengrajin Knitty Craft di Palembang akan merajutnya khusus sesuai pilihan warna, inisial nama, dan desainmu.
          </p>

          {/* 1. Pilih Jenis Produk */}
          <div className="form-group-section">
            <label className="section-label">1. Pilih Jenis Produk Rajut</label>
            <div className="custom-options-grid">
              {productOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`custom-opt-card ${productType === opt.id ? 'active' : ''}`}
                  onClick={() => setProductType(opt.id)}
                >
                  <div className="opt-title">{opt.name}</div>
                  <div className="opt-price">{formatRupiah(opt.basePrice)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Pilih Palet Warna */}
          <div className="form-group-section">
            <label className="section-label">2. Pilih Kombinasi Warna Benang</label>
            <div className="color-selectors-row">
              <div className="color-pick-block">
                <span className="pick-label">Warna Utama (Kelopak / Bodi):</span>
                <div className="palette-dots-grid">
                  {colorPalette.map((col) => (
                    <button
                      type="button"
                      key={`c1-${col.hex}`}
                      className={`dot-select ${selectedColor1 === col.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: col.hex }}
                      onClick={() => setSelectedColor1(col.hex)}
                      title={col.name}
                    >
                      {selectedColor1 === col.hex && <Check size={14} color="#484F4F" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="color-pick-block">
                <span className="pick-label">Warna Aksen (Daun / Tali / Detail):</span>
                <div className="palette-dots-grid">
                  {colorPalette.map((col) => (
                    <button
                      type="button"
                      key={`c2-${col.hex}`}
                      className={`dot-select ${selectedColor2 === col.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: col.hex }}
                      onClick={() => setSelectedColor2(col.hex)}
                      title={col.name}
                    >
                      {selectedColor2 === col.hex && <Check size={14} color="#484F4F" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Inisial Huruf & Request Tambahan */}
          <div className="form-group-section">
            <label className="section-label">3. Personalisasi Inisial Huruf (Opsional)</label>
            <div className="input-with-icon">
              <Type size={18} className="input-icon" />
              <input
                type="text"
                placeholder="Contoh: A, NA, R & D (Maksimal 3 karakter)"
                maxLength={4}
                value={initialText}
                onChange={(e) => setInitialText(e.target.value)}
              />
            </div>
          </div>

          {/* 4. Catatan Desain */}
          <div className="form-group-section">
            <label className="section-label">4. Catatan atau Permintaan Khusus</label>
            <textarea
              rows={3}
              placeholder="Contoh: Tolong buatkan kelopak tulip sedikit lebih mekar, pengait warna emas..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </div>

          {/* 5. Kotak Kado & Pita Ekstra */}
          <div className="gift-box-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={giftBox}
                onChange={(e) => setGiftBox(e.target.checked)}
              />
              <div className="checkbox-text">
                <strong>Tambah Paket Kotak Kado Eksklusif (+Rp 15.000)</strong>
                <span>Hardbox estetik pita satin + kartu ucapan custom (cocok untuk hadiah kado)</span>
              </div>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="modal-submit-row">
            <div className="total-estimate">
              <span>Estimasi Harga:</span>
              <strong className="total-price-tag">{formatRupiah(totalPrice)}</strong>
              <small>• Estimasi pengerjaan 2-4 hari kerja (PO)</small>
            </div>

            <button type="submit" className="btn-primary">
              <Heart size={18} />
              <span>Simpan & Masukkan Keranjang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
