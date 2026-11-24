import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  X,
  Clock,
  ShieldCheck,
  Package,
  ArrowLeft
} from 'lucide-react';
import {
  getOrCreateCustomerConversation,
  getConversationMessages,
  sendChatMessage,
  markMessagesAsRead,
  subscribeToConversationMessages
} from '../services/adminChatService';

export default function CustomerAdminChat({
  currentUser,
  onNavigate,
  showToast,
  attachedOrder = null,
  onClearAttachedOrder = null,
  onBack = null
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentAttachedOrder, setCurrentAttachedOrder] = useState(attachedOrder);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Perbarui attached order jika prop berubah
  useEffect(() => {
    if (attachedOrder) {
      setCurrentAttachedOrder(attachedOrder);
    }
  }, [attachedOrder]);

  // Format jam / tanggal pesan
  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  // Helper deduplikasi pesan
  const mergeMessages = (prevList, incoming) => {
    const map = new Map();
    prevList.forEach((m) => map.set(m.id, m));
    if (Array.isArray(incoming)) {
      incoming.forEach((m) => map.set(m.id, m));
    } else if (incoming && incoming.id) {
      map.set(incoming.id, incoming);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  };

  // 1. Inisialisasi percakapan
  useEffect(() => {
    let isMounted = true;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const initConversation = async () => {
      setLoading(true);
      try {
        const conv = await getOrCreateCustomerConversation(
          currentUser.id,
          currentUser.name || currentUser.email?.split('@')[0]
        );

        if (isMounted && conv) {
          setConversation(conv);
          // Ambil riwayat pesan
          const msgs = await getConversationMessages(conv.id);
          if (isMounted) {
            setMessages(msgs);
            // Tandai pesan dari admin sebagai terbaca
            markMessagesAsRead(conv.id, 'customer');
          }
        }
      } catch (err) {
        console.error('[CustomerAdminChat] Gagal inisialisasi percakapan:', err);
        if (showToast) showToast('Gagal memuat percakapan dengan admin.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initConversation();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // 2. Realtime Subscription & 5s Polling Fallback
  useEffect(() => {
    if (!conversation?.id) return;

    // Realtime subscription
    const unsubscribe = subscribeToConversationMessages(
      conversation.id,
      (newMsg) => {
        setMessages((prev) => mergeMessages(prev, newMsg));
        // Jika pesan datang dari admin, tandai terbaca
        if (newMsg.sender_role === 'admin') {
          markMessagesAsRead(conversation.id, 'customer');
        }
      },
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    );

    // 5s Polling Fallback
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await getConversationMessages(conversation.id);
        setMessages((prev) => mergeMessages(prev, fresh));
      } catch (e) {
        // Abaikan polling error
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [conversation?.id]);

  // Auto scroll ke bawah
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending]);

  // Kirim Pesan
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();

    if (!currentUser) {
      if (showToast) showToast('Silakan login terlebih dahulu untuk mengirim pesan.');
      if (onNavigate) onNavigate('login');
      return;
    }

    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    if (textToSend.length > 1000) {
      if (showToast) showToast('Pesan melebihi batas maksimal 1000 karakter.');
      return;
    }

    setSending(true);

    try {
      // Pastikan percakapan sudah ada
      let convId = conversation?.id;
      if (!convId) {
        const conv = await getOrCreateCustomerConversation(
          currentUser.id,
          currentUser.name || currentUser.email?.split('@')[0]
        );
        setConversation(conv);
        convId = conv.id;
      }

      const orderIdToAttach = currentAttachedOrder?.id || null;

      const inserted = await sendChatMessage({
        conversationId: convId,
        senderId: currentUser.id,
        senderRole: 'customer',
        content: textToSend,
        orderId: orderIdToAttach
      });

      // Tambahkan ke state lokal dengan merge
      if (inserted) {
        setMessages((prev) => mergeMessages(prev, inserted));
        setInputText('');
        // Kosongkan attached order setelah terkirim
        setCurrentAttachedOrder(null);
        if (onClearAttachedOrder) onClearAttachedOrder();
      }
    } catch (err) {
      console.error('[CustomerAdminChat] Gagal mengirim pesan:', err);
      const errMsg = err?.message || 'Gagal mengirim pesan ke admin toko.';
      if (showToast) showToast(`❌ ${errMsg}`);
    } finally {
      setSending(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Jika belum login
  if (!currentUser) {
    return (
      <div className="customer-chat-container empty-auth-state">
        <div className="chat-auth-prompt-card">
          <div className="chat-auth-icon-wrap">
            <User size={36} color="#E63985" />
          </div>
          <h3>Masuk untuk Chat dengan Admin Toko</h3>
          <p>
            Hubungi langsung tim perajin &amp; admin Knot &amp; Bloom untuk konsultasi pesanan rajutan custom, tanya status paket, atau ketersediaan produk.
          </p>
          <button
            type="button"
            className="btn-primary btn-chat-login-action"
            onClick={() => onNavigate && onNavigate('login')}
          >
            Masuk / Daftar Akun
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-admin-chat-card">
      {/* Header Chat */}
      <div className="chat-panel-header">
        <div className="chat-panel-header-left">
          {onBack && (
            <button
              type="button"
              className="chat-back-btn"
              onClick={onBack}
              title="Kembali"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="chat-admin-avatar-ring">
            <User size={20} color="#E63985" />
            <span className="online-status-dot" title="Admin Online" />
          </div>
          <div className="chat-admin-header-info">
            <div className="chat-admin-title-row">
              <h4>Admin Toko Knot &amp; Bloom</h4>
              <span className="chat-badge-verified">
                <ShieldCheck size={12} /> Resmi Studio
              </span>
            </div>
            <span className="chat-admin-status-text">
              Biasanya membalas dalam beberapa menit • Palembang Studio
            </span>
          </div>
        </div>
      </div>

      {/* Area Pesan */}
      <div className="chat-messages-scroll-area">
        {loading ? (
          <div className="chat-loading-placeholder">
            <div className="loading-spinner-circle" />
            <span>Memuat percakapan dengan admin...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-conversation">
            <div className="chat-welcome-box">
              <div className="welcome-icon-circle">
                <Sparkles size={24} color="#E63985" />
              </div>
              <h5>Mulai Percakapan dengan Admin</h5>
              <p>
                Halo <strong>{currentUser.name?.split(' ')[0]}</strong>! Ada yang ingin ditanyakan seputar produk rajut, custom buket tulip, atau info pengiriman di Palembang? Tulis pesan di bawah ya 🌸
              </p>
            </div>
          </div>
        ) : (
          <div className="chat-bubbles-flow">
            {messages.map((msg) => {
              const isMe = msg.sender_role === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${isMe ? 'row-outgoing' : 'row-incoming'}`}
                >
                  {!isMe && (
                    <div className="chat-bubble-avatar-mini" title="Admin Toko">
                      <User size={14} color="#E63985" />
                    </div>
                  )}

                  <div className="chat-bubble-content-col">
                    {/* Kartu Pesanan Terkait jika ada order_id */}
                    {msg.order_id && (
                      <div className="chat-order-context-card">
                        <div className="order-context-header">
                          <Package size={14} color="#E63985" />
                          <span className="order-context-id">
                            Pesanan #{msg.order_id}
                          </span>
                        </div>
                        <span className="order-context-hint">
                          Pertanyaan terkait rincian pesanan ini
                        </span>
                      </div>
                    )}

                    {/* Teks Pesan Aman (Plain Text XSS Free) */}
                    <div className={`chat-bubble ${isMe ? 'bubble-pink' : 'bubble-white'}`}>
                      <p className="bubble-text">{msg.content}</p>
                      <span className="bubble-timestamp">
                        {formatMsgTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Banner Lampiran Pesanan Aktif jika user klik "Tanya soal pesanan ini" */}
      {currentAttachedOrder && (
        <div className="chat-attached-order-bar">
          <div className="attached-order-info">
            <ShoppingBag size={16} color="#E63985" />
            <div className="attached-order-text">
              <span className="attached-title">
                Menanyakan Pesanan <strong>#{currentAttachedOrder.id}</strong>
              </span>
              <span className="attached-status">
                Status: {currentAttachedOrder.status || 'Sedang Diproses'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-remove-attachment"
            onClick={() => {
              setCurrentAttachedOrder(null);
              if (onClearAttachedOrder) onClearAttachedOrder();
            }}
            title="Hapus lampiran pesanan"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="chat-input-box-wrapper">
          <textarea
            ref={inputRef}
            className="chat-textarea-input"
            rows="1"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ketik pesan untuk admin toko... (Tekan Enter untuk kirim)"
            maxLength={1000}
            disabled={sending}
          />
          {inputText.length > 800 && (
            <span className="char-counter-tag">{1000 - inputText.length}</span>
          )}
        </div>

        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputText.trim() || sending}
          title="Kirim Pesan"
        >
          {sending ? (
            <div className="btn-send-spinner" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  );
}
