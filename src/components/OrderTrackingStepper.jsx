import React, { useState } from 'react';
import {
  CheckCircle2,
  Package,
  Bike,
  Clock,
  Sparkles,
  MessageCircle,
  Heart,
  Star,
  Info,
  XCircle,
  Banknote,
  User
} from 'lucide-react';

// Ikon benang rajut (cocok dengan gaya garis lucide-react)
function YarnIcon({ size = 19, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M5.5 9.5c3.5-1.5 9.5-1.5 13 0" />
      <path d="M5.5 14.5c3.5 1.5 9.5 1.5 13 0" />
      <path d="M10 4.3c-1.5 4.2-1.5 11.2 0 15.4" />
      <path d="M17.5 17.5c1.5 1 2.8 1.5 4 1" />
    </svg>
  );
}

const formatRupiah = (val) => 'Rp ' + Number(val || 0).toLocaleString('id-ID');

/**
 * Menghitung indeks langkah aktif berdasarkan status pesanan (4 tahap):
 * 0 = Dirajut, 1 = Packing, 2 = Diantar, 3 = Selesai
 */
export const getActiveTrackingStepIndex = (rawStatus = '') => {
  const status = (rawStatus || '').toLowerCase().trim();

  if (status === 'selesai' || status === 'completed' || status === 'delivered') {
    return 3; // Selesai
  }
  if (status === 'diantar' || status.includes('diantar') || status === 'delivering') {
    return 2; // Diantar
  }
  if (status === 'packing') {
    return 1; // Packing
  }
  return 0; // Default: Dirajut
};

export default function OrderTrackingStepper({
  status = 'Dirajut',
  orderDate = '',
  orderId = '',
  customerAddress = '',
  customerName = '',
  estimasiAntar = '',
  pengantar = '',
  alasanBatal = '',
  total = 0,
  onChatOrder = null,
  onScrollToReview = null,
  compact = false
}) {
  const effectiveActiveIndex = getActiveTrackingStepIndex(status);
  const [userSelectedStep, setUserSelectedStep] = useState(null);
  const selectedStepIndex =
    userSelectedStep !== null ? userSelectedStep : effectiveActiveIndex;

  const isCancelled = (status || '').toLowerCase().includes('batal');
  const isCompletedOrder = effectiveActiveIndex === 3 && !isCancelled;

  const steps = [
    {
      key: 'dirajut',
      title: 'Dirajut',
      shortTitle: 'Dirajut',
      icon: YarnIcon,
      duration: '1-3 Hari Pengerjaan',
      description:
        'Tim Knot & Bloom sedang merajut pesananmu secara handmade dengan benang katun pilihan dan penuh ketelitian.',
      checklist: [
        'Pesanan COD terdaftar dan masuk antrean studio Knot & Bloom',
        'Benang milk cotton & aksesoris pilihan disiapkan perajin',
        'Proses merajut manual helai demi helai oleh tim perajin',
        'Pemeriksaan kerapian jahitan (QC) sebelum tahap packing'
      ],
      artisanNote:
        'Setiap rajutan dibuat dengan tangan dan sepenuh hati — siap membawa senyuman ♡'
    },
    {
      key: 'packing',
      title: 'Packing',
      shortTitle: 'Packing',
      icon: Package,
      duration: 'Siap Diantar',
      description:
        'Rajutan sudah selesai! Pesananmu sedang dikemas rapi dalam kemasan estetik dan siap diantar langsung oleh tim Knot & Bloom.',
      checklist: [
        'Produk lulus pengecekan kualitas & kerapian rajutan',
        'Dikemas rapi dengan kotak/kemasan pelindung estetik',
        'Label alamat & rincian pesanan ditempel lengkap',
        'Siap dijadwalkan untuk pengantaran langsung ke alamatmu'
      ],
      artisanNote:
        'Kemasan disiapkan dengan rapi agar bentuk rajutan tetap sempurna sampai di tanganmu.'
    },
    {
      key: 'diantar',
      title: 'Diantar',
      shortTitle: 'Diantar',
      icon: Bike,
      duration: estimasiAntar || 'Diantar Langsung oleh Toko',
      description: `Pesananmu sedang diantar langsung oleh tim Knot & Bloom ke alamat tujuan.${
        estimasiAntar ? ` Estimasi waktu antar: ${estimasiAntar}.` : ''
      }${pengantar ? ` Pengantar: ${pengantar}.` : ''}${
        Number(total) > 0
          ? ` Mohon siapkan uang tunai pas sebesar ${formatRupiah(total)} untuk pembayaran COD saat barang diterima.`
          : ' Mohon siapkan uang tunai pas saat pesanan tiba.'
      }`,
      checklist: [
        'Pesanan dibawa langsung oleh tim pengantar Knot & Bloom',
        estimasiAntar
          ? `Estimasi tiba: ${estimasiAntar}`
          : 'Menuju alamat tujuan di wilayah Palembang',
        pengantar
          ? `Diantar oleh: ${pengantar}`
          : 'Tim akan menghubungi nomor HP-mu sebelum tiba',
        Number(total) > 0
          ? `Siapkan uang tunai pas ${formatRupiah(total)} (COD)`
          : 'Siapkan pembayaran tunai pas (COD)'
      ],
      artisanNote:
        'Mohon pastikan nomor HP-mu aktif dan siapkan uang tunai pas saat pengantar tiba ya ♡'
    },
    {
      key: 'selesai',
      title: 'Selesai',
      shortTitle: 'Selesai',
      icon: CheckCircle2,
      duration: 'Selesai',
      description:
        'Terima kasih telah berbelanja di Knot & Bloom! Pesananmu telah diterima dengan baik dan pembayaran tunai (COD) telah selesai dibayar.',
      checklist: [
        'Pesanan diterima langsung oleh pembeli',
        'Pembayaran tunai (COD) telah dibayar lunas',
        'Garansi kerapian rajutan 14 hari Knot & Bloom aktif',
        'Kamu bisa membagikan pengalamanmu lewat ulasan produk'
      ],
      artisanNote:
        'Terima kasih telah mendukung karya rajut handmade Knot & Bloom! Semoga produk ini membawa kebahagiaan ♡'
    }
  ];

  const progressPercent = (effectiveActiveIndex / (steps.length - 1)) * 100;
  const activeStepData = steps[selectedStepIndex] || steps[0];
  const ActiveStepIcon = activeStepData.icon;

  return (
    <div className={`order-tracking-interactive-card ${compact ? 'tracking-compact-mode' : ''}`}>
      {/* 1. Header Bar */}
      <div className="tracking-card-header">
        <div className="tracking-header-left">
          <div className="tracking-live-pill">
            <span className="pulsing-radar-dot" />
            <span>Status Pesanan Realtime</span>
          </div>
          <h4 className="tracking-current-status-title">
            Status:{' '}
            <span className="status-highlight-text">
              {isCancelled ? 'Dibatalkan' : steps[effectiveActiveIndex].title}
            </span>
          </h4>
          {!isCancelled && (
            <span className="tracking-eta-badge">
              <Clock size={13} />
              <span>Estimasi: {steps[effectiveActiveIndex].duration}</span>
            </span>
          )}
        </div>

        <div className="tracking-header-actions">
          {onChatOrder && (
            <button
              type="button"
              className="btn-track-action-pill btn-chat-admin-pill"
              onClick={onChatOrder}
              title="Tanyakan langsung status pesanan ke Admin Toko"
            >
              <MessageCircle size={14} />
              <span>Tanya Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Khusus Jika Pesanan Dibatalkan */}
      {isCancelled ? (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: '14px',
            padding: '18px 20px',
            marginTop: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <XCircle size={26} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h5 style={{ margin: '0 0 6px', color: '#991B1B', fontSize: '1rem' }}>
              Pesanan #{orderId} Dibatalkan
            </h5>
            <p style={{ margin: 0, color: '#7F1D1D', fontSize: '0.9rem', lineHeight: 1.5 }}>
              <strong>Alasan pembatalan:</strong>{' '}
              {alasanBatal || 'Pesanan dibatalkan oleh toko.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Stepper 4 Tahap: Dirajut, Packing, Diantar, Selesai */}
          <div className="tracking-stepper-container">
            <div className="stepper-helper-hint">
              <Info size={13} color="#FF86C1" />
              <span>Klik salah satu tahap untuk melihat detail pengerjaan & pengantaran</span>
            </div>

            <div className="stepper-track-bg">
              <div
                className="stepper-track-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="stepper-steps-wrapper">
              {steps.map((step, index) => {
                const isCompleted = index < effectiveActiveIndex;
                const isCurrent = index === effectiveActiveIndex;
                const isSelected = index === selectedStepIndex;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setUserSelectedStep(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setUserSelectedStep(index);
                    }}
                    className={`stepper-node-col ${
                      isCompleted ? 'step-completed' : isCurrent ? 'step-active' : 'step-upcoming'
                    } ${isSelected ? 'step-selected-highlight' : ''}`}
                    title={`Klik untuk melihat detail: ${step.title}`}
                  >
                    <div className="stepper-icon-bubble">
                      {isCompleted ? (
                        <CheckCircle2 size={19} className="icon-complete-check" />
                      ) : (
                        <StepIcon size={19} />
                      )}
                      {isCurrent && <span className="stepper-pulse-ring" />}
                    </div>

                    <div className="stepper-text-col">
                      <span className="stepper-step-number">Tahap {index + 1}</span>
                      <strong className="stepper-step-title">{step.shortTitle}</strong>
                      <span className="stepper-step-badge-mini">
                        {isCompleted
                          ? '✓ Selesai'
                          : isCurrent
                          ? '⚡ Sedang Berjalan'
                          : '⏳ Antrean'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Khusus Saat Status "Diantar" */}
          {effectiveActiveIndex === 2 && (
            <div
              style={{
                background: '#FFF7FB',
                border: '1.5px solid #FBCFE8',
                borderRadius: '14px',
                padding: '16px 18px',
                marginTop: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BE185D', fontWeight: 700, fontSize: '0.95rem' }}>
                <Bike size={18} color="#E63985" />
                <span>Pesanan Sedang Diantar Langsung oleh Tim Knot & Bloom</span>
              </div>
              {estimasiAntar && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#374151' }}>
                  <Clock size={15} color="#E63985" />
                  <span>Estimasi Waktu Antar: <strong>{estimasiAntar}</strong></span>
                </div>
              )}
              {pengantar && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#374151' }}>
                  <User size={15} color="#E63985" />
                  <span>Pengantar: <strong>{pengantar}</strong></span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '8px 12px', marginTop: '4px' }}>
                <Banknote size={16} color="#15803D" style={{ flexShrink: 0 }} />
                <span>
                  Mohon siapkan uang tunai pas sebesar{' '}
                  <strong>{Number(total) > 0 ? formatRupiah(total) : 'total pesanan'}</strong> saat pesanan tiba (COD).
                </span>
              </div>
            </div>
          )}

          {/* 3. Detail Panel untuk Tahap yang Dipilih */}
          <div className="interactive-step-detail-card fade-in">
            <div className="detail-card-head">
              <div className="detail-head-left">
                <div className="detail-icon-wrap">
                  <ActiveStepIcon size={20} color="#FF86C1" />
                </div>
                <div>
                  <div className="detail-head-sub">
                    <span>Tahap {selectedStepIndex + 1} dari 4</span> •{' '}
                    <span className="detail-status-pill">
                      {selectedStepIndex < effectiveActiveIndex
                        ? 'Sudah Dilewati & Selesai'
                        : selectedStepIndex === effectiveActiveIndex
                        ? 'Sedang Dalam Proses Saat Ini'
                        : 'Akan Datang'}
                    </span>
                  </div>
                  <h5 className="detail-title">{activeStepData.title}</h5>
                </div>
              </div>

              <div className="detail-duration-box">
                <Clock size={14} color="#6B7280" />
                <span>Estimasi: <strong>{activeStepData.duration}</strong></span>
              </div>
            </div>

            <p className="detail-desc-paragraph">{activeStepData.description}</p>

            <div className="detail-checklist-grid">
              {activeStepData.checklist.map((item, idx) => {
                const isItemDone = selectedStepIndex <= effectiveActiveIndex;
                return (
                  <div
                    key={idx}
                    className={`checklist-item-pill ${isItemDone ? 'item-checked' : 'item-pending'}`}
                  >
                    <div className="chk-icon-wrap">
                      {isItemDone ? (
                        <CheckCircle2 size={14} color="#059669" />
                      ) : (
                        <Clock size={13} color="#9CA3AF" />
                      )}
                    </div>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>

            <div className="artisan-warm-quote">
              <Heart size={15} color="#FF86C1" className="quote-heart-icon" />
              <p>"{activeStepData.artisanNote}"</p>
            </div>
          </div>

          {/* 4. Banner Selesai + Tombol Beri Ulasan */}
          {isCompletedOrder && (
            <div className="tracking-footer-bar">
              <div className="delivery-completed-banner fade-in">
                <div className="completed-badge-icon">
                  <CheckCircle2 size={24} color="#059669" />
                </div>
                <div className="completed-text">
                  <h5>Terima Kasih Telah Berbelanja di Knot & Bloom! ♡</h5>
                  <p>
                    Pesanan telah diterima dan pembayaran tunai (COD) telah selesai. Yuk bagikan pengalamanmu lewat ulasan produk!
                  </p>
                </div>
                {onScrollToReview && (
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={onScrollToReview}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                  >
                    <Star size={15} />
                    <span>Beri Ulasan</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
