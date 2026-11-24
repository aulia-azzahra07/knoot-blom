import React, { useState } from 'react';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Clock,
  Sparkles,
  Copy,
  Check,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Navigation,
  Share2,
  ShieldCheck,
  Heart,
  Star,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TRACKING_STEPS = [
  {
    key: 'packing',
    title: 'Dikemas',
    shortTitle: 'Dikemas',
    subtitle: 'Pesanan diterima & sedang dirajut lalu dikemas',
    icon: Package,
    duration: '1-2 Hari Pengerjaan',
    location: 'Studio Knot & Bloom Unsri, Palembang',
    description:
      'Pesananmu telah diterima dan masuk antrean studio. Tim perajin Knot & Bloom sedang merajut produk satu per satu dengan tangan, kemudian dikemas rapi dalam gift box estetik.',
    checklist: [
      'Pesanan COD terdaftar & masuk antrean pengerjaan studio',
      'Benang katun susu pilihan & aksesoris disiapkan perajin',
      'Proses merajut manual helai demi helai dengan teliti',
      'Pengemasan dalam kotak kado estetik & bubble wrap'
    ],
    artisanNote:
      'Setiap rajutan dibuat dengan tangan dan sepenuh hati — siap membawa senyuman ♡'
  },
  {
    key: 'shipping',
    title: 'Dikirim',
    shortTitle: 'Dikirim',
    subtitle: 'Paket diserahkan ke kurir & nomor resi aktif',
    icon: Truck,
    duration: '1 Hari (Se-Palembang)',
    location: 'Hub Drop Point / Kurir Lokal Palembang',
    description:
      'Admin telah menyerahkan paket ke kurir pengiriman. Nomor resi sudah aktif dan paket sedang dalam perjalanan dari studio Knot & Bloom menuju area tempat tinggalmu.',
    checklist: [
      'Paket di-pickup oleh kurir resmi dari studio',
      'Nomor resi diterbitkan & aktif di sistem pelacakan',
      'Paket melewati sortasi Hub Palembang',
      'Dijadwalkan antar langsung ke alamat tujuan'
    ],
    artisanNote:
      'Kemasan dirancang kokoh berlapis agar bunga rajutan tidak tertekan selama di jalan.'
  },
  {
    key: 'delivering',
    title: 'Diantar Kurir',
    shortTitle: 'Diantar',
    subtitle: 'Kurir sedang menuju alamat pengirimanmu',
    icon: Navigation,
    duration: 'Hari Ini (Dalam Pengantaran)',
    location: 'Menuju Alamat Penerima',
    description:
      'Kurir sedang dalam perjalanan membawa paketmu. Pastikan nomor ponselmu aktif agar kurir bisa menghubungimu sebelum tiba. Siapkan uang tunai pas sesuai total pesanan untuk pembayaran COD.',
    checklist: [
      'Kurir membawa paket menuju titik alamat penerima',
      'Kurir menghubungi nomor telepon penerima sebelum tiba',
      'Siapkan pembayaran tunai COD sesuai total pesanan',
      'Paket diserahterimakan ke tangan penerima'
    ],
    artisanNote:
      'Siapkan uang tunai pas ya! Pembayaran COD dilakukan saat kurir tiba di depan pintumu ♡'
  },
  {
    key: 'done',
    title: 'Selesai',
    shortTitle: 'Selesai',
    subtitle: 'Paket diterima & pembayaran COD lunas',
    icon: CheckCircle2,
    duration: 'Selesai',
    location: 'Alamat Penerima',
    description:
      'Pesanan telah selesai! Paket diterima dan pembayaran COD telah dilunaskan ke kurir. Terima kasih telah berbelanja di Knot & Bloom Unsri!',
    checklist: [
      'Paket diterima langsung oleh pembeli',
      'Pembayaran COD tunai lunas ke kurir',
      'Garansi 14 hari Knot & Bloom aktif',
      'Pesanan selesai & terarsip di sistem'
    ],
    artisanNote:
      'Terima kasih telah mendukung karya kerajinan tangan lokal mahasiswi Unsri! Semoga produk ini membawa senyuman ♡'
  }
];

/**
 * Menghitung indeks langkah aktif berdasarkan teks status pesanan
 */
export const getActiveTrackingStepIndex = (rawStatus = '') => {
  const status = (rawStatus || '').toLowerCase();

  if (status.includes('selesai') || status.includes('completed') || status.includes('done')) {
    return 3; // Selesai
  }
  if (status.includes('diantar') || status.includes('delivering')) {
    return 2; // Diantar Kurir
  }
  if (
    status.includes('dikirim') ||
    status.includes('shipping') ||
    status.includes('shipped') ||
    status.includes('perjalanan')
  ) {
    return 1; // Dikirim
  }
  // Default: Dikemas (semua pesanan COD mulai dari sini)
  return 0;
};

export default function OrderTrackingStepper({
  status = 'Dikemas',
  trackingNumber = '',
  orderDate = '',
  orderId = '',
  shippingMethod = 'Reguler Se-Palembang (Rp 5.000)',
  customerAddress = '',
  customerName = '',
  items = [],
  onChatOrder = null,
  onConfirmDelivery = null,
  compact = false,
  showSimulateControls = true
}) {
  // Status simulasi lokal (memungkinkan user mengklik simulasi status secara instan)
  const [simulatedStep, setSimulatedStep] = useState(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Milestone yang sedang dibuka detailnya oleh user
  const effectiveActiveIndex =
    simulatedStep !== null ? simulatedStep : getActiveTrackingStepIndex(status);

  const [userSelectedStep, setUserSelectedStep] = useState(null);
  const selectedStepIndex =
    userSelectedStep !== null ? userSelectedStep : effectiveActiveIndex;
  const setSelectedStepIndex = setUserSelectedStep;
  const [isMapExpanded, setIsMapExpanded] = useState(!compact);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);

  // Animasi simulasi kendaraan bergerak
  const [isDriving, setIsDriving] = useState(false);
  const [customScooterPosition, setCustomScooterPosition] = useState(null);

  // Feedback modal kepuasan setelah konfirmasi terima
  const [hasConfirmedDelivery, setHasConfirmedDelivery] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [hasRated, setHasRated] = useState(false);

  const isCancelled = (status || '').toLowerCase().includes('batal');
  const isDelivered = effectiveActiveIndex === 3 && !isCancelled;

  // Persentase posisi garis stepper & kurir:
  // Step 0: 5%, Step 1: 35%, Step 2: 68%, Step 3: 98%
  const getWaypointPercent = (index) => {
    switch (index) {
      case 0:
        return 8;
      case 1:
        return 36;
      case 2:
        return 68;
      case 3:
        return 96;
      default:
        return (index / 3) * 100;
    }
  };

  const currentScooterPercent =
    customScooterPosition !== null ? customScooterPosition : getWaypointPercent(effectiveActiveIndex);

  const progressPercent = (effectiveActiveIndex / (TRACKING_STEPS.length - 1)) * 100;

  // Salin Nomor Resi
  const handleCopyResi = () => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  // Bagikan Info Tracking ke WhatsApp / Clipboard
  const handleShareTracking = () => {
    const textToShare = `🌸 *Tracking Pesanan Knot & Bloom* 🌸\n` +
      `No. Pesanan: #${orderId || 'KB-UNSRI'}\n` +
      `Status: *${TRACKING_STEPS[effectiveActiveIndex].title}*\n` +
      `Estimasi: ${TRACKING_STEPS[effectiveActiveIndex].duration}\n` +
      (trackingNumber ? `No. Resi: ${trackingNumber}\n` : '') +
      `Lacak secara realtime di website resmi Knot & Bloom Unsri ♡`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToShare);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
    window.open(waUrl, '_blank');
  };

  // Putar Simulasi Kurir Bergerak (Interactive Animation)
  const handlePlayCourierSimulation = () => {
    if (isDriving) return;
    setIsDriving(true);
    setCustomScooterPosition(8);

    const steps = [
      { pos: 15, delay: 300 },
      { pos: 36, delay: 800 },
      { pos: 52, delay: 1400 },
      { pos: 68, delay: 2000 },
      { pos: 84, delay: 2600 },
      { pos: 96, delay: 3200 }
    ];

    steps.forEach(({ pos, delay }) => {
      setTimeout(() => {
        setCustomScooterPosition(pos);
      }, delay);
    });

    setTimeout(() => {
      setIsDriving(false);
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }, 3600);
  };

  // Reset Simulasi
  const handleResetSimulation = () => {
    setCustomScooterPosition(null);
    setSimulatedStep(null);
    setIsDriving(false);
  };

  // Konfirmasi Terima Pesanan
  const handleConfirmReceived = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 }
      });
    } catch (e) {}

    setHasConfirmedDelivery(true);
    setSimulatedStep(3);

    if (onConfirmDelivery && orderId) {
      onConfirmDelivery(orderId);
    }
  };

  // Riwayat Log Aktivitas Perjalanan (Dinamis & Realistis Berbasis Palembang)
  const trackingLogs = [
    {
      stepIdx: 0,
      time: orderDate || 'Hari Ini, 08:30 WIB',
      title: 'Pesanan Dikemas & Diproses',
      desc: 'Pesanan COD terdaftar dan masuk antrean studio. Perajin Knot & Bloom mulai menyiapkan bahan dan merajut produk sesuai pesanan.',
      location: 'Studio Knot & Bloom Unsri, Kampus Bukit Besar Palembang',
      isDone: effectiveActiveIndex >= 0
    },
    {
      stepIdx: 1,
      time: 'Hari Ini, 14:10 WIB',
      title: 'Paket Dikirim ke Kurir',
      desc: `Paket diserahkan ke kurir pengiriman (No. Resi: ${trackingNumber || 'KB-EXP-XXXXXX'}). Paket menuju hub sortasi Palembang.`,
      location: 'Drop Point / Kurir Lokal Palembang',
      isDone: effectiveActiveIndex >= 1
    },
    {
      stepIdx: 2,
      time: 'Hari Ini, 16:30 WIB',
      title: 'Kurir Menuju Alamat Tujuan',
      desc: 'Kurir sedang membawa paket ke alamat penerimamu. Siapkan pembayaran tunai COD sesuai total pesanan.',
      location: customerAddress || 'Alamat Penerima di Palembang',
      isDone: effectiveActiveIndex >= 2
    },
    {
      stepIdx: 3,
      time: 'Hari Ini, 18:00 WIB',
      title: 'Pesanan Selesai & COD Lunas',
      desc: 'Paket diterima dan pembayaran COD telah dilunaskan. Terima kasih telah berbelanja di Knot & Bloom!',
      location: customerAddress || 'Alamat Penerima',
      isDone: effectiveActiveIndex >= 3
    }
  ];

  const activeStepData = TRACKING_STEPS[selectedStepIndex] || TRACKING_STEPS[0];
  const ActiveStepIcon = activeStepData.icon;

  return (
    <div className={`order-tracking-interactive-card ${compact ? 'tracking-compact-mode' : ''}`}>
      {/* 1. Header Bar: Status Realtime & Live Pulsing Indicator */}
      <div className="tracking-card-header">
        <div className="tracking-header-left">
          <div className="tracking-live-pill">
            <span className="pulsing-radar-dot" />
            <span>Tracking Pesanan Realtime</span>
          </div>
          <h4 className="tracking-current-status-title">
            Status:{' '}
            <span className="status-highlight-text">
              {isCancelled
                ? 'Pesanan Dibatalkan'
                : TRACKING_STEPS[effectiveActiveIndex].title}
            </span>
          </h4>
          <span className="tracking-eta-badge">
            <Clock size={13} />
            <span>Estimasi: {TRACKING_STEPS[effectiveActiveIndex].duration}</span>
          </span>
        </div>

        <div className="tracking-header-actions">
          {onChatOrder && (
            <button
              type="button"
              className="btn-track-action-pill btn-chat-admin-pill"
              onClick={onChatOrder}
              title="Tanyakan langsung status pesanan ke Admin Studio di Web Chat"
            >
              <MessageCircle size={14} />
              <span>Tanya Admin</span>
            </button>
          )}

          <button
            type="button"
            className="btn-track-action-pill btn-share-track-pill"
            onClick={handleShareTracking}
            title="Bagikan status pesanan ke WhatsApp"
          >
            {copiedShare ? <Check size={14} color="#059669" /> : <Share2 size={14} />}
            <span>{copiedShare ? 'Tersalin!' : 'Bagikan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive 4-Milestone Horizontal Stepper Bar */}
      <div className="tracking-stepper-container">
        <div className="stepper-helper-hint">
          <Info size={13} color="#FF86C1" />
          <span>Klik salah satu tahap untuk melihat detail pengerjaan & checklist perajin</span>
        </div>

        {/* Progress Background Line */}
        <div className="stepper-track-bg">
          <div
            className="stepper-track-fill"
            style={{ width: isCancelled ? '0%' : `${progressPercent}%` }}
          />
        </div>

        {/* 4 Interactive Milestone Nodes */}
        <div className="stepper-steps-wrapper">
          {TRACKING_STEPS.map((step, index) => {
            const isCompleted = !isCancelled && index < effectiveActiveIndex;
            const isCurrent = !isCancelled && index === effectiveActiveIndex;
            const isSelected = index === selectedStepIndex;
            const StepIcon = step.icon;

            return (
              <div
                key={step.key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStepIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedStepIndex(index);
                }}
                className={`stepper-node-col ${
                  isCompleted ? 'step-completed' : isCurrent ? 'step-active' : 'step-upcoming'
                } ${isSelected ? 'step-selected-highlight' : ''}`}
                title={`Klik untuk melihat detail: ${step.title}`}
              >
                {/* Milestone Bubble Icon */}
                <div className="stepper-icon-bubble">
                  {isCompleted ? (
                    <CheckCircle2 size={19} className="icon-complete-check" />
                  ) : (
                    <StepIcon size={19} />
                  )}
                  {isCurrent && <span className="stepper-pulse-ring" />}
                </div>

                {/* Milestone Label */}
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

      {/* 3. Interactive Detail Panel untuk Tahap yang Dipilih */}
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
            <span>Estimasi Durasi: <strong>{activeStepData.duration}</strong></span>
          </div>
        </div>

        <p className="detail-desc-paragraph">{activeStepData.description}</p>

        {/* Checklist Kegiatan di Tahap Ini */}
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
                    <Check size={14} color="#059669" />
                  ) : (
                    <Clock size={13} color="#9CA3AF" />
                  )}
                </div>
                <span>{item}</span>
              </div>
            );
          })}
        </div>

        {/* Catatan Hangat dari Perajin */}
        <div className="artisan-warm-quote">
          <Heart size={15} color="#FF86C1" className="quote-heart-icon" />
          <p>"{activeStepData.artisanNote}"</p>
        </div>
      </div>

      {/* 4. Visual Delivery Route Map & Live Courier Simulation (Palembang Context) */}
      <div className="delivery-route-map-card">
        <div className="route-map-header">
          <div className="route-header-left">
            <Navigation size={18} color="#FF86C1" />
            <div>
              <h5>Simulasi Rute & Posisi Kurir Se-Palembang</h5>
              <span className="route-header-sub">
                Pengiriman dari Studio Unsri ke alamat tujuan Anda
              </span>
            </div>
          </div>

          <div className="route-header-right">
            <button
              type="button"
              className={`btn-play-simulation ${isDriving ? 'driving-active' : ''}`}
              onClick={handlePlayCourierSimulation}
              disabled={isDriving}
              title="Putar animasi perjalanan kurir di peta"
            >
              <Play size={14} />
              <span>{isDriving ? 'Kurir Berjalan...' : 'Simulasi Gerak Kurir 🛵'}</span>
            </button>

            <button
              type="button"
              className="btn-toggle-map-collapse"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              title={isMapExpanded ? 'Tutup Peta' : 'Buka Peta'}
            >
              {isMapExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isMapExpanded && (
          <div className="route-map-body fade-in">
            {/* Visual Road Line & Moving Courier */}
            <div className="road-track-canvas">
              {/* Garis Jalan Aspal dengan Marka Putus-putus */}
              <div className="road-asphalt-bar">
                <div
                  className="road-progress-fill"
                  style={{ width: `${currentScooterPercent}%` }}
                />
                <div className="road-dashed-center-line" />
              </div>

              {/* Kurir Bergerak (Animated Scooter with Crochet Box) */}
              <div
                className={`moving-courier-vehicle ${isDriving ? 'vehicle-is-driving' : ''}`}
                style={{ left: `${currentScooterPercent}%` }}
              >
                <div className="scooter-avatar-badge">
                  <span className="scooter-icon-emoji">🛵</span>
                  <span className="scooter-smoke-puff" />
                </div>
                <div className="scooter-status-tag">
                  <strong>Kurir Knot & Bloom</strong>
                  <span>{effectiveActiveIndex === 3 ? 'Tiba di Alamat 🏠' : 'Sedang Bergerak ⚡'}</span>
                </div>
              </div>

              {/* 4 Waypoints on Road */}
              <div className="road-waypoints-wrapper">
                {/* Waypoint 1: Studio */}
                <div className="road-waypoint wp-studio">
                  <div className="wp-dot-ring">🌸</div>
                  <strong className="wp-title">Studio Unsri</strong>
                  <span className="wp-sub">Indralaya / Bukit</span>
                </div>

                {/* Waypoint 2: Sorting Hub */}
                <div className="road-waypoint wp-hub">
                  <div className="wp-dot-ring">📦</div>
                  <strong className="wp-title">Hub Palembang</strong>
                  <span className="wp-sub">Pusat Sortasi</span>
                </div>

                {/* Waypoint 3: In Transit */}
                <div className="road-waypoint wp-transit">
                  <div className="wp-dot-ring">🛣️</div>
                  <strong className="wp-title">Dalam Perjalanan</strong>
                  <span className="wp-sub">Jl. Sudirman / R. Sukamto</span>
                </div>

                {/* Waypoint 4: Destination */}
                <div className="road-waypoint wp-destination">
                  <div className="wp-dot-ring">🏡</div>
                  <strong className="wp-title">Alamat Kamu</strong>
                  <span className="wp-sub">{customerName || 'Penerima'}</span>
                </div>
              </div>
            </div>

            {/* Courier & Vehicle Quick Info */}
            <div className="courier-driver-card">
              <div className="driver-info-left">
                <div className="driver-avatar-circle">
                  <Truck size={18} color="#FF86C1" />
                </div>
                <div>
                  <h6>Kurir Ekspedisi: <strong>J&T Express / Kurir Kampus Unsri</strong></h6>
                  <p>Driver: <strong>Bayu Pratama</strong> (Motor Honda Beat • Plat: BG 4812 AA)</p>
                </div>
              </div>

              <div className="driver-actions-right">
                {trackingNumber && (
                  <button
                    type="button"
                    className="btn-inline-resi-copy"
                    onClick={handleCopyResi}
                    title="Salin Nomor Resi"
                  >
                    <code>{trackingNumber}</code>
                    {copiedResi ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-courier-info-pill"
                  onClick={() => setIsCourierModalOpen(true)}
                >
                  <ShieldCheck size={14} />
                  <span>Cek Info Ekspedisi</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Chronological Travel History Log (Expandable Timeline) */}
      <div className="tracking-timeline-section">
        <button
          type="button"
          className="btn-toggle-timeline"
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
        >
          <div className="toggle-timeline-label">
            <Clock size={16} color="#FF86C1" />
            <span>Lihat Riwayat Lengkap Perjalanan & Titik Lokasi ({trackingLogs.length} Titik)</span>
          </div>
          {isTimelineExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isTimelineExpanded && (
          <div className="timeline-log-list fade-in">
            {trackingLogs.map((log, lIdx) => (
              <div
                key={lIdx}
                className={`timeline-log-row ${log.isDone ? 'log-row-done' : 'log-row-pending'}`}
              >
                <div className="log-node-column">
                  <div className="log-node-dot">
                    {log.isDone ? <Check size={12} color="#fff" /> : <Clock size={11} />}
                  </div>
                  {lIdx < trackingLogs.length - 1 && <div className="log-node-line" />}
                </div>

                <div className="log-content-column">
                  <div className="log-head-meta">
                    <span className="log-timestamp">{log.time}</span>
                    <span className="log-location-tag">
                      <MapPin size={12} />
                      {log.location}
                    </span>
                  </div>
                  <strong className="log-title-text">{log.title}</strong>
                  <p className="log-desc-text">{log.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Footer Actions: Konfirmasi Terima Pesanan & Interactive Demo Switcher */}
      <div className="tracking-footer-bar">
        {/* Tombol Konfirmasi Terima Pesanan (Muncul saat dikirim / diantar) */}
        {!hasConfirmedDelivery && !isDelivered && effectiveActiveIndex >= 2 && (
          <div className="confirm-delivery-banner fade-in">
            <div className="confirm-text-wrap">
              <Sparkles size={18} color="#FF86C1" />
              <div>
                <strong>Paket sudah sampai di tanganmu?</strong>
                <p>Klik tombol di samping untuk konfirmasi penerimaan & mengaktifkan garansi produk.</p>
              </div>
            </div>

            <button
              type="button"
              className="btn-confirm-received-now"
              onClick={handleConfirmReceived}
            >
              <CheckCircle2 size={16} />
              <span>Konfirmasi Pesanan Diterima ♡</span>
            </button>
          </div>
        )}

        {/* Jika sudah konfirmasi terima / selesai */}
        {(hasConfirmedDelivery || isDelivered) && (
          <div className="delivery-completed-banner fade-in">
            <div className="completed-badge-icon">
              <CheckCircle2 size={24} color="#059669" />
            </div>
            <div className="completed-text">
              <h5>Pesanan Telah Selesai Diterima! ♡</h5>
              <p>Terima kasih telah berbelanja di Knot & Bloom. Berikan ulasan bintang untuk perajin kami:</p>
            </div>

            <div className="star-rating-selector">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= ratingStars ? 'star-active' : ''}`}
                  onClick={() => {
                    setRatingStars(star);
                    setHasRated(true);
                  }}
                  title={`Beri ${star} Bintang`}
                >
                  <Star size={18} fill={star <= ratingStars ? '#F59E0B' : 'none'} color={star <= ratingStars ? '#F59E0B' : '#D1D5DB'} />
                </button>
              ))}
              {hasRated && <span className="rated-thankyou-badge">Ulasan Tersimpan! ✨</span>}
            </div>
          </div>
        )}

        {/* 7. Interactive Test / Simulation Control Pills (Khusus Memudahkan Demo & Testing) */}
        {showSimulateControls && (
          <div className="interactive-simulation-controller">
            <div className="sim-controller-label">
              <Sparkles size={14} color="#FF86C1" />
              <span>Uji Coba Interaktif Status (Klik untuk lihat transisi visual):</span>
            </div>

            <div className="sim-buttons-group">
              {TRACKING_STEPS.map((step, sIdx) => (
                <button
                  key={step.key}
                  type="button"
                  className={`btn-sim-pill ${
                    effectiveActiveIndex === sIdx ? 'sim-pill-active' : ''
                  }`}
                  onClick={() => {
                    setSimulatedStep(sIdx);
                    setSelectedStepIndex(sIdx);
                    setCustomScooterPosition(getWaypointPercent(sIdx));
                    if (sIdx === 3) {
                      try {
                        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                      } catch (e) {}
                    }
                  }}
                >
                  <span>{sIdx + 1}. {step.shortTitle}</span>
                </button>
              ))}

              {simulatedStep !== null && (
                <button
                  type="button"
                  className="btn-sim-reset"
                  onClick={handleResetSimulation}
                  title="Kembalikan ke status asli"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Courier Modal Popup */}
      {isCourierModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCourierModalOpen(false)}>
          <div
            className="courier-detail-modal-box fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="courier-modal-head">
              <div className="c-head-icon">
                <Truck size={22} color="#FF86C1" />
              </div>
              <div>
                <h4>Informasi Ekspedisi & Pengiriman</h4>
                <p>Knot & Bloom Mitra Logistik Resmi Se-Palembang</p>
              </div>
            </div>

            <div className="courier-modal-content">
              <div className="c-info-grid">
                <div className="c-info-item">
                  <span className="c-label">Jasa Pengiriman:</span>
                  <strong className="c-val">{shippingMethod}</strong>
                </div>
                <div className="c-info-item">
                  <span className="c-label">Nomor Resi:</span>
                  <strong className="c-val">{trackingNumber || 'KB-JNT-998124'}</strong>
                </div>
                <div className="c-info-item">
                  <span className="c-label">Nama Kurir:</span>
                  <strong className="c-val">Bayu Pratama (J&T Palembang)</strong>
                </div>
                <div className="c-info-item">
                  <span className="c-label">Kontak Kurir:</span>
                  <strong className="c-val">0812-7890-4411 (WhatsApp)</strong>
                </div>
              </div>

              <div className="c-tips-box">
                <ShieldCheck size={18} color="#059669" />
                <p>
                  Paket rajutan dikemas dalam kotak tebal tahan tindih dan disegel stiker segel Knot & Bloom untuk menjaga keutuhan bentuk rajutan sampai ke tanganmu.
                </p>
              </div>
            </div>

            <div className="courier-modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsCourierModalOpen(false)}
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
