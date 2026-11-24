import React, { useState } from 'react';
import { X, Sparkles, Check, Package, Palette, CheckCircle2 } from 'lucide-react';

export default function CustomDiyKitModal({ isOpen, onClose, onAddToCart, showToast }) {
  if (!isOpen) return null;

  const [kitType, setKitType] = useState('tulip');
  const [selectedYarns, setSelectedYarns] = useState(['#FF86C1', '#5DE5AB', '#FEDEA4']);
  const [hookSize, setHookSize] = useState('2.5mm');
  const [includeVideoUsb, setIncludeVideoUsb] = useState(false);

  const kitTypes = [
    { id: 'tulip', name: 'Starter Kit: 3 Gantungan Kunci Bunga', price: 75000, desc: 'Paling cocok untuk pemula yang belum pernah memegang jarum rajut.' },
    { id: 'amigurumi', name: 'Amigurumi Kit: Boneka Hewan Imut', price: 95000, desc: 'Belajar rajut melingkar (magic ring), isi dakron empuk & safety eyes.' },
    { id: 'bag', name: 'Mini Bag Kit: Tas Rajut Daisy Cantik', price: 120000, desc: 'Termasuk benang tebal khusus tas, kancing magnet & handle kokoh.' }
  ];

  const yarnOptions = [
    { name: 'Rose Pink', hex: '#FF86C1' },
    { name: 'Peach Butter', hex: '#FEDEA4' },
    { name: 'Sky Blue', hex: '#A7D8FF' },
    { name: 'Mint Leaf', hex: '#5DE5AB' },
    { name: 'Lavender', hex: '#EEDBFF' },
    { name: 'Milk White', hex: '#FFF8F0' },
    { name: 'Caramel', hex: '#A87954' },
    { name: 'Sunflower Yellow', hex: '#F9C74F' }
  ];

  const currentKit = kitTypes.find((k) => k.id === kitType);
  const totalPrice = (currentKit?.price || 75000) + (includeVideoUsb ? 20000 : 0);

  const toggleYarn = (hex) => {
    if (selectedYarns.includes(hex)) {
      if (selectedYarns.length > 1) {
        setSelectedYarns(selectedYarns.filter((y) => y !== hex));
      }
    } else {
      if (selectedYarns.length < 4) {
        setSelectedYarns([...selectedYarns, hex]);
      }
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    const customKitItem = {
      id: `custom-kit-${Date.now()}`,
      name: `Custom ${currentKit.name} (${selectedYarns.length} Benang Pilihan)`,
      price: totalPrice,
      image: '/images/diy-crochet-kit.jpg',
      category: 'diy-kit',
      quantity: 1,
      selectedColor: {
        name: `${selectedYarns.length} Warna Benang Pilihan (Hakpen ${hookSize})`,
        hex: selectedYarns[0]
      },
      isCustomKit: true,
      kitDetails: {
        type: currentKit.name,
        yarns: selectedYarns,
        hookSize,
        includeVideoUsb
      }
    };

    onAddToCart(customKitItem);
    showToast(`Paket DIY Custom "${customKitItem.name}" berhasil dibuat & masuk keranjang!`);
    onClose();
  };

  const formatRupiah = (val) => 'Rp ' + Number(val).toLocaleString('id-ID');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="custom-order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Package size={22} color="#FF86C1" />
            <h3>Rakit Sendiri Paket DIY Kit Impianmu ✨</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAddToCart} className="custom-modal-body">
          <p className="modal-intro">
            Pilih pola favoritmu, pilih kombinasi gulungan benang katun kesukaan, dan tentukan ukuran jarum rajut ergonomis. Kami kemas rapi dalam pouch zipper estetik!
          </p>

          {/* 1. Pilih Jenis Proyek */}
          <div className="form-group-section">
            <label className="section-label">1. Pilih Proyek Rajut</label>
            <div className="custom-options-grid">
              {kitTypes.map((k) => (
                <div
                  key={k.id}
                  className={`custom-opt-card ${kitType === k.id ? 'active' : ''}`}
                  onClick={() => setKitType(k.id)}
                >
                  <div className="opt-title">{k.name}</div>
                  <div className="opt-desc">{k.desc}</div>
                  <div className="opt-price">{formatRupiah(k.price)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Pilih Warna Gulungan Benang */}
          <div className="form-group-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="section-label">2. Pilih 3-4 Warna Gulungan Benang Milk Cotton</label>
              <span style={{ fontSize: '0.85rem', color: '#E63985', fontWeight: 600 }}>
                {selectedYarns.length} dari maks 4 warna dipilih
              </span>
            </div>
            <div className="palette-yarn-grid">
              {yarnOptions.map((yarn) => {
                const isChecked = selectedYarns.includes(yarn.hex);
                return (
                  <div
                    key={yarn.hex}
                    className={`yarn-select-card ${isChecked ? 'selected' : ''}`}
                    onClick={() => toggleYarn(yarn.hex)}
                  >
                    <div
                      className="yarn-swatch"
                      style={{ backgroundColor: yarn.hex }}
                    >
                      {isChecked && <Check size={14} color="#484F4F" />}
                    </div>
                    <span>{yarn.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Ukuran Hakpen */}
          <div className="form-group-section">
            <label className="section-label">3. Pilih Ukuran Hakpen Ergonomis (Gagang Silikon Lembut)</label>
            <div className="hook-size-row">
              {['2.0mm', '2.5mm (Paling Pas)', '3.0mm', '4.0mm (Khusus Tas)'].map((sz) => (
                <button
                  type="button"
                  key={sz}
                  className={`hook-size-btn ${hookSize === sz ? 'active' : ''}`}
                  onClick={() => setHookSize(sz)}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Include USB Video Tutorial */}
          <div className="gift-box-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeVideoUsb}
                onChange={(e) => setIncludeVideoUsb(e.target.checked)}
              />
              <div className="checkbox-text">
                <strong>Tambah Flashdisk Kayu Berisi Video Tutorial HD (+Rp 20.000)</strong>
                <span>Cocok jika ingin menonton tutorial tanpa kuota internet atau sebagai hadiah kado premium! (Akses streaming via QR Code tetap gratis)</span>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="modal-submit-row">
            <div className="total-estimate">
              <span>Total Paket DIY:</span>
              <strong className="total-price-tag">{formatRupiah(totalPrice)}</strong>
              <small>• Termasuk jarum tapestry, peniti rajut & meteran gratis</small>
            </div>

            <button type="submit" className="btn-primary">
              <Package size={18} />
              <span>Masukkan ke Keranjang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
