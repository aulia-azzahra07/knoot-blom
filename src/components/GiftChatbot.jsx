import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  RotateCcw,
  Heart,
  Bot
} from 'lucide-react';
import { getSafeProductImage, handleProductImageError } from '../utils/productImage';

export default function GiftChatbot({
  products = [],
  onSelectProduct,
  onAddToCart,
  onNavigate,
  showToast
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initial welcome message
  const initialMessages = [
    {
      id: 1,
      sender: 'bot',
      text: 'Halo beb! Selamat datang di Knot & Bloom 🧶💗\n\nAku **BloomBot**, asisten belanjamu. Lagi bingung mau cari kado buat siapa, atau butuh ide barang rajut yang cocok? Ceritakan ke aku ya!',
      timestamp: 'Baru saja',
      recommendations: []
    }
  ];

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kb_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialMessages;
  });

  // Quick suggestion chips
  const suggestionChips = [
    { label: '🎂 Kado Ultah Sahabat', query: 'rekomendasi kado ulang tahun buat sahabat cewek' },
    { label: '💰 Budget Rp 15 Ribu', query: 'ada kado apa aja yang harganya 15 ribu?' },
    { label: '✨ Gantungan Kunci Gemas', query: 'mau lihat koleksi keychain rajut lucu' },
    { label: '🎀 Bando & Pouch Aesthetic', query: 'rekomendasi pouch dan bando rajut' },
    { label: '💝 Kado Buat Pacar', query: 'ide hadiah manis dan romantis buat pacar' },
    { label: '🌸 Kado Warna Pink', query: 'rekomendasi barang rajut warna pink gemas' }
  ];

  // Save chat to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem('kb_chat_history', JSON.stringify(messages));
    } catch (e) {}
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasUnread(false);
    }
  };

  const formatRupiah = (val) => 'Rp ' + Number(val || 0).toLocaleString('id-ID');

  // Intelligent Recommendation Engine
  const generateBotReply = (userQuery) => {
    const q = userQuery.toLowerCase();
    let replyText = '';
    let matchedProducts = [];

    // Helper to find product by slug or keyword
    const findProd = (keyword) =>
      products.find(
        (p) =>
          p.slug?.toLowerCase().includes(keyword) ||
          p.name?.toLowerCase().includes(keyword)
      );

    const bintang = findProd('bintang');
    const pita = findProd('pita');
    const pouch = findProd('pouch');
    const hairband = findProd('hairband') || findProd('bando');

    // 1. Ultah / Sahabat / Bestie
    if (q.includes('ultah') || q.includes('ulang tahun') || q.includes('sahabat') || q.includes('bestie') || q.includes('teman')) {
      replyText =
        'Wah, manis banget mau kasih kado untuk sahabat! 🥰\n\nUntuk sahabat tercinta, pilihan paling favorit adalah **Keychain Pita** yang elegan atau **Pouch Mini** yang serbaguna untuk simpan printilan kosmetik/koin.\n\nSemua produk kami dirajut handmade dengan benang *Milk Cotton Premium*, jadi jahitannya sangat halus dan awet! ✨';
      matchedProducts = [pita, pouch, bintang].filter(Boolean);

    // 2. Pacar / Ayang / Gebetan
    } else if (q.includes('pacar') || q.includes('ayang') || q.includes('gebetan') || q.includes('cewek') || q.includes('romantis')) {
      replyText =
        'Aaww, kado rajut handmade itu dijamin bikin doi tersenyum beb! 💕\n\nKarena rajutan itu melambangkan kehangatan & perhatian khusus. Rekomendasi terbaikku adalah **Keychain Pita** (sangat feminin & aesthetic) dipadukan dengan **Hairband Pink** atau **Pouch Mini**. Pasti dipakai setiap hari!';
      matchedProducts = [pita, hairband, pouch].filter(Boolean);

    // 3. Budget / Harga / Murah / 15
    } else if (q.includes('budget') || q.includes('harga') || q.includes('murah') || q.includes('15') || q.includes('hemat')) {
      replyText =
        'Kabar baik banget beb! 🎉\n\nDi Knot & Bloom, **SEMUA PRODUK KAMI dibanderol cuma Rp 15.000 saja per item!**\n\nMulai dari Keychain Bintang, Keychain Pita, Pouch Mini, sampai Hairband semuanya Rp 15.000 dengan kualitas rajutan premium handmade. Jadi kamu bisa pilih sesukamu tanpa khawatir kantong jebol! 💸💖';
      matchedProducts = products.slice(0, 4);

    // 4. Gantungan Kunci / Keychain
    } else if (q.includes('gantungan') || q.includes('keychain') || q.includes('kunci') || q.includes('tas')) {
      replyText =
        'Koleksi gantungan kunci rajut kita super best-seller lho! ✨\n\nAda **Keychain Bintang** (tersedia warna Kuning & Pink) yang imut ceria, dan **Keychain Pita** (warna Kuning, Biru, & Putih) yang manis dan aesthetic. Cocok banget digantung di tas ransel, totebag, atau kunci motor.';
      matchedProducts = [bintang, pita].filter(Boolean);

    // 5. Pouch / Dompet / Tempat Koin
    } else if (q.includes('pouch') || q.includes('dompet') || q.includes('tempat koin') || q.includes('tas')) {
      replyText =
        'Pouch Mini rajut kita gemas banget beb! 🌸\n\nDilengkapi tali serut praktis, pas banget buat simpan koin, earphone, perhiasan, atau lipstik agar tasmu tetap rapi dan estetik. Warnanya Soft Pink manis!';
      matchedProducts = [pouch].filter(Boolean);

    // 6. Hairband / Bando
    } else if (q.includes('hairband') || q.includes('bando') || q.includes('rambut') || q.includes('hijab')) {
      replyText =
        'Bando rajut (Hairband) kami menggunakan benang rajut lembut yang melapisi bando fleksibel! 🎀\n\nNggak bikin kepala sakit atau pusing saat dipakai seharian. Warnanya pink pastel yang manis banget dipakai buat hangout atau kuliah!';
      matchedProducts = [hairband].filter(Boolean);

    // 7. Warna Pink
    } else if (q.includes('pink') || q.includes('merah muda')) {
      replyText =
        'Pecinta warna Pink merapat! 💗 Hampir semua produk kami punya varian warna Pink gemas:\n- **Keychain Bintang (Pink)**\n- **Pouch Mini (Pink)**\n- **Hairband (Pink)**\n\nSemuanya pakai warna pastel lembut yang estetik!';
      matchedProducts = [pouch, hairband, bintang].filter(Boolean);

    // 8. Warna Kuning / Biru / Putih
    } else if (q.includes('kuning') || q.includes('biru') || q.includes('putih')) {
      replyText =
        'Untuk nuansa ceria dan netral:\n- **Warna Kuning & Biru & Putih**: Ada di **Keychain Pita**!\n- **Warna Kuning Ceria**: Ada juga di **Keychain Bintang**!\n\nWarna-warnanya tahan lama dan benangnya tidak mudah luntur saat dicuci.';
      matchedProducts = [pita, bintang].filter(Boolean);

    // 9. Bahan / Kualitas / Perawatan
    } else if (q.includes('bahan') || q.includes('benang') || q.includes('kualitas') || q.includes('awet') || q.includes('cuci')) {
      replyText =
        'Produk Knot & Bloom dirajut menggunakan **Milk Cotton Yarn Premium 5-ply** 🧶.\n\nKarakteristiknya sangat lembut di tangan, empuk, tidak berbulu kasar, dan tidak luntur saat dicuci air dingin secara manual.';
      matchedProducts = products.slice(0, 2);

    // 10. Pengiriman & Pembayaran
    } else if (q.includes('ongkir') || q.includes('kirim') || q.includes('bayar') || q.includes('qris') || q.includes('midtrans')) {
      replyText =
        'Pembayaran di Knot & Bloom sudah terintegrasi instan dengan **QRIS Midtrans** 💳 (bisa scan pakai GoPay, OVO, Dana, ShopeePay, BCA Mobile, dll).\n\nPengiriman aman ke seluruh Indonesia dengan opsi Reguler maupun Instant. Paket dikemas rapi & estetik siap untuk kado!';

    // 11. Salam / Greeting
    } else if (q.includes('halo') || q.includes('hai') || q.includes('pagi') || q.includes('siang') || q.includes('malam') || q.includes('assalam')) {
      replyText =
        'Halo juga bebbb! Senang banget bisa ngobrol sama kamu 🌸\n\nLagi ada acara apa nih? Mau cari kado wisuda, ulang tahun, atau sekadar treat yourself dengan pernak-pernik rajutan lucu?';
      matchedProducts = products.slice(0, 3);

    // Default Fallback
    } else {
      replyText =
        'Pertanyaan yang menarik! ✨ Di Knot & Bloom, kami punya koleksi gantungan kunci bintang, pita, bando rambut, dan pouch mini rajut handmade dengan harga serba Rp 15.000.\n\nKamu bisa intip beberapa produk rekomendasi terfavorit di bawah ini ya beb:';
      matchedProducts = products.slice(0, 3);
    }

    return { replyText, matchedProducts };
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate smart thinking delay
    setTimeout(() => {
      const { replyText, matchedProducts } = generateBotReply(query);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        recommendations: matchedProducts
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleResetChat = () => {
    setMessages(initialMessages);
    try {
      sessionStorage.removeItem('kb_chat_history');
    } catch (e) {}
    if (showToast) showToast('Percakapan telah diatur ulang.');
  };

  const handleSelectProductClick = (prod) => {
    if (onSelectProduct) {
      onSelectProduct(prod);
      if (onNavigate) onNavigate('product-detail');
      setIsOpen(false);
    }
  };

  const handleAddToCartClick = (prod) => {
    if (onAddToCart) {
      onAddToCart({
        ...prod,
        quantity: 1,
        selectedColor: prod.variants?.[0] || prod.colors?.[0] || null
      });
      if (showToast) {
        showToast(`1x ${prod.name} berhasil ditambahkan ke keranjang!`);
      }
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="chatbot-launcher-container">
        {!isOpen && hasUnread && (
          <div className="chatbot-floating-badge" onClick={handleOpenToggle}>
            <span>Tanya BloomBot! 🌸</span>
          </div>
        )}
        <button
          className={`chatbot-launcher-btn ${isOpen ? 'active' : ''}`}
          onClick={handleOpenToggle}
          aria-label="Tanya BloomBot"
          title="Tanya Rekomendasi Kado ke BloomBot"
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <>
              <MessageCircle size={26} />
              <span className="chatbot-sparkle-icon">
                <Sparkles size={14} />
              </span>
            </>
          )}
        </button>
      </div>

      {/* Chat Window Drawer / Modal */}
      {isOpen && (
        <div className="chatbot-window-card fade-in">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-circle">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="chatbot-title">
                  BloomBot 🌸 <span className="chatbot-status-dot"></span>
                </h4>
                <p className="chatbot-subtitle">Konsultan Kado & Belanja Knot & Bloom</p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-icon-btn"
                onClick={handleResetChat}
                title="Mulai percakapan baru"
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="chatbot-icon-btn"
                onClick={handleOpenToggle}
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="chatbot-messages-area">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-row ${msg.sender === 'user' ? 'user' : 'bot'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="chat-avatar-mini">🌸</div>
                )}
                <div className="chat-bubble-content">
                  <div className="chat-text-box">
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx}>
                        {line.split('**').map((part, i) =>
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Product Cards embedded inside Bot reply */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="chat-recommendations-list">
                      {msg.recommendations.map((prod) => (
                        <div key={prod.id || prod.name} className="chat-product-card">
                          <img
                            src={getSafeProductImage(prod.image || prod.image_url, prod.name)}
                            alt={prod.name}
                            className="chat-product-thumb"
                            onError={(e) => handleProductImageError(e, prod.name, prod.image || prod.image_url)}
                          />
                          <div className="chat-product-info">
                            <h5 className="chat-product-name">{prod.name}</h5>
                            <div className="chat-product-meta">
                              <span className="chat-product-price">
                                {formatRupiah(prod.price)}
                              </span>
                              {prod.variants && prod.variants.length > 0 && (
                                <span className="chat-product-variants-count">
                                  {prod.variants.length} warna
                                </span>
                              )}
                            </div>
                            <div className="chat-product-actions">
                              <button
                                className="chat-btn-view"
                                onClick={() => handleSelectProductClick(prod)}
                              >
                                <ExternalLink size={12} />
                                <span>Detail</span>
                              </button>
                              <button
                                className="chat-btn-cart"
                                onClick={() => handleAddToCartClick(prod)}
                              >
                                <ShoppingBag size={12} />
                                <span>Beli</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="chat-time">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-bubble-row bot">
                <div className="chat-avatar-mini">🌸</div>
                <div className="chat-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="chatbot-chips-scroll">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className="chatbot-chip-btn"
                onClick={() => handleSendMessage(chip.query)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <form
            className="chatbot-footer-input"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              placeholder="Tanya kado atau barang rajut impianmu..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!inputText.trim()}
              title="Kirim pesan"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

