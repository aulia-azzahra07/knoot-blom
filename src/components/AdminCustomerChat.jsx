import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  ShoppingBag,
  Search,
  MessageCircle,
  Clock,
  Sparkles,
  Package,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';
import {
  getAdminConversations,
  getConversationMessages,
  sendChatMessage,
  markMessagesAsRead,
  getAdminUnreadCountsByConversation,
  subscribeToConversationMessages,
  subscribeToAllMessages
} from '../services/adminChatService';

export default function AdminCustomerChat({
  currentUser,
  orders = [],
  showToast = null,
  onViewOrder = null,
  initialConversation = null,
  targetCustomerId = null,
  attachedOrder = null,
  chatRequestKey = 0,
  onClearAttachedOrder = null
}) {
  const [conversations, setConversations] = useState(
    initialConversation ? [initialConversation] : []
  );
  const [selectedConversation, setSelectedConversation] = useState(initialConversation || null);
  const [currentAttachedOrder, setCurrentAttachedOrder] = useState(attachedOrder || null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const targetConvRef = useRef(initialConversation);
  const targetCustomerIdRef = useRef(targetCustomerId);

  targetConvRef.current = initialConversation;
  targetCustomerIdRef.current = targetCustomerId;

  // Sinkronkan percakapan & konteks pesanan saat admin klik "Chat Pembeli di Web" dari kartu pesanan
  useEffect(() => {
    if (initialConversation?.id) {
      setSearchQuery('');
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === initialConversation.id);
        if (exists) {
          return prev.map((c) => (c.id === initialConversation.id ? { ...c, ...initialConversation } : c));
        }
        return [initialConversation, ...prev];
      });
      setSelectedConversation(initialConversation);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);
    }
  }, [initialConversation, chatRequestKey]);

  useEffect(() => {
    if (attachedOrder) {
      setCurrentAttachedOrder(attachedOrder);
    }
  }, [attachedOrder, chatRequestKey]);

  // Format jam / tanggal pesan
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    }
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
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

  // 1. Muat daftar percakapan & unread counts
  const loadConversations = async () => {
    try {
      const [convs, counts] = await Promise.all([
        getAdminConversations(),
        getAdminUnreadCountsByConversation()
      ]);

      // Pastikan percakapan target yang baru di-upsert tetap muncul di daftar kiri
      const targetConv = targetConvRef.current;
      const mergedConvs =
        targetConv?.id && !convs.some((c) => c.id === targetConv.id)
          ? [targetConv, ...convs]
          : convs;

      setConversations(mergedConvs);
      setUnreadCounts(counts);

      // Jika belum ada percakapan terpilih, prioritaskan targetCustomerId lalu percakapan pertama
      if (mergedConvs.length > 0) {
        setSelectedConversation((prev) => {
          if (prev?.id) {
            return mergedConvs.find((c) => c.id === prev.id) || prev;
          }
          if (targetCustomerIdRef.current) {
            const byCustomer = mergedConvs.find(
              (c) => c.customer_id === targetCustomerIdRef.current
            );
            if (byCustomer) return byCustomer;
          }
          return mergedConvs[0];
        });
      }
    } catch (err) {
      console.error('[AdminCustomerChat] Gagal memuat percakapan:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Listen untuk semua pesan baru agar daftar conversation & unread count selalu update
    const unsubscribeGlobal = subscribeToAllMessages((newMsg) => {
      loadConversations();
    });

    // 5s Polling fallback untuk daftar percakapan
    const convPoll = setInterval(() => {
      loadConversations();
    }, 5000);

    return () => {
      unsubscribeGlobal();
      clearInterval(convPoll);
    };
  }, []);

  // 2. Muat pesan ketika selectedConversation berganti
  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    const loadMessages = async () => {
      try {
        const msgs = await getConversationMessages(selectedConversation.id);
        if (isMounted) {
          setMessages(msgs);
          // Tandai pesan dari customer sebagai terbaca oleh admin
          markMessagesAsRead(selectedConversation.id, 'admin');
          // Kurangi unread count di lokal
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedConversation.id]: 0
          }));
        }
      } catch (err) {
        console.error('[AdminCustomerChat] Gagal memuat pesan:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    // Realtime subscription untuk percakapan yang sedang aktif dibuka
    const unsubscribeMessages = subscribeToConversationMessages(
      selectedConversation.id,
      (newMsg) => {
        setMessages((prev) => mergeMessages(prev, newMsg));
        // Jika pesan dari customer, tandai langsung terbaca
        if (newMsg.sender_role === 'customer') {
          markMessagesAsRead(selectedConversation.id, 'admin');
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedConversation.id]: 0
          }));
        }
      },
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    );

    // 5s Polling fallback untuk percakapan aktif
    const messagePoll = setInterval(async () => {
      try {
        const fresh = await getConversationMessages(selectedConversation.id);
        if (isMounted) {
          setMessages((prev) => mergeMessages(prev, fresh));
        }
      } catch (e) {}
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribeMessages();
      clearInterval(messagePoll);
    };
  }, [selectedConversation?.id]);

  // Auto scroll ke bawah
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending]);

  // 3. Kirim Balasan Admin
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();

    const textToSend = replyText.trim();
    if (!textToSend || !selectedConversation?.id || sending) return;

    if (textToSend.length > 1000) {
      if (showToast) showToast('Balasan maksimal 1000 karakter.');
      return;
    }

    setSending(true);

    try {
      const orderIdToAttach = currentAttachedOrder?.id || null;

      const inserted = await sendChatMessage({
        conversationId: selectedConversation.id,
        senderId: currentUser?.id || 'admin-user',
        senderRole: 'admin',
        content: textToSend,
        orderId: orderIdToAttach
      });

      if (inserted) {
        setMessages((prev) => mergeMessages(prev, inserted));
        setReplyText('');
        if (currentAttachedOrder) {
          setCurrentAttachedOrder(null);
          if (onClearAttachedOrder) onClearAttachedOrder();
        }
        // Update cuplikan last_message di daftar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  last_message: textToSend,
                  last_message_at: inserted.created_at || new Date().toISOString()
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error('[AdminCustomerChat] Gagal mengirim balasan:', err);
      const errMsg = err?.message || 'Gagal mengirim balasan.';
      if (showToast) showToast(`❌ ${errMsg}`);
    } finally {
      setSending(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Filter daftar percakapan berdasarkan input pencarian nama
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    );
  });

  // Cari informasi order jika pesan menyertakan order_id
  const getOrderInfo = (orderId) => {
    if (!orderId || !orders) return null;
    return (
      orders.find(
        (o) => String(o.id) === String(orderId) || String(o.dbId) === String(orderId)
      ) || null
    );
  };

  return (
    <div className="admin-chat-layout-2col">
      {/* ── KOLOM KIRI: DAFTAR PERCAKAPAN ── */}
      <aside className="admin-chat-sidebar-col">
        <div className="admin-chat-sidebar-header">
          <div className="sidebar-title-row">
            <h4>Pesan Masuk Pelanggan</h4>
            <span className="conv-total-tag">{conversations.length} Chat</span>
          </div>

          {/* Kolom Pencarian Nama */}
          <div className="admin-chat-search-wrap">
            <Search size={16} className="search-icon-inside" />
            <input
              type="text"
              placeholder="Cari nama customer / pesan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-chat-search-input"
            />
          </div>
        </div>

        {/* Daftar Percakapan */}
        <div className="admin-conv-list-scroll">
          {loadingConversations ? (
            <div className="conv-list-loading">
              <div className="loading-spinner-circle" />
              <span>Memuat percakapan...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="conv-list-empty">
              <MessageCircle size={24} color="#A0AEC0" />
              <p>
                {searchQuery
                  ? `Tidak ada chat yang cocok dengan "${searchQuery}"`
                  : 'Belum ada pesan customer masuk.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const unread = unreadCounts[conv.id] || 0;

              return (
                <div
                  key={conv.id}
                  className={`admin-conv-card-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="conv-avatar-icon-circle">
                    <User size={18} color="#E63985" />
                  </div>

                  <div className="conv-card-content">
                    <div className="conv-card-top-row">
                      <h5 className="conv-customer-name">
                        {conv.customer_name || 'Pelanggan'}
                      </h5>
                      <span className="conv-time-text">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>

                    <div className="conv-card-bottom-row">
                      <p className="conv-snippet-text">
                        {conv.last_message || 'Belum ada pesan'}
                      </p>
                      {unread > 0 && (
                        <span className="conv-unread-pill-badge">{unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── KOLOM KANAN: ISI CHAT & BALASAN ── */}
      <section className="admin-chat-main-stream-col">
        {selectedConversation ? (
          <>
            {/* Header Percakapan Aktif */}
            <div className="active-conv-header">
              <div className="active-conv-profile">
                <div className="conv-avatar-icon-circle big">
                  <User size={20} color="#E63985" />
                </div>
                <div className="active-conv-meta">
                  <h4>{selectedConversation.customer_name || 'Pelanggan'}</h4>
                  <span className="active-conv-sub">
                    Percakapan Pelanggan • Terhubung ke Database Supabase
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-refresh-stream"
                onClick={() => {
                  if (selectedConversation?.id) {
                    getConversationMessages(selectedConversation.id).then((fresh) => {
                      setMessages(fresh);
                    });
                  }
                }}
                title="Refresh Pesan"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Kartu Konteks Pesanan saat admin membuka chat dari kartu pesanan */}
            {currentAttachedOrder && (
              <div className="admin-attached-order-banner">
                <div className="admin-attached-order-info">
                  <Package size={16} color="#E63985" />
                  <div className="admin-attached-order-meta">
                    <span>
                      Konteks Pesanan: <strong>#{currentAttachedOrder.id}</strong>
                    </span>
                    <span
                      className={`order-status-chip ${
                        currentAttachedOrder.status === 'Selesai' ? 'status-green' : 'status-pink'
                      }`}
                    >
                      {currentAttachedOrder.status}
                    </span>
                    {currentAttachedOrder.total != null && (
                      <span>
                        Total: <strong>Rp {Number(currentAttachedOrder.total || 0).toLocaleString('id-ID')}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-attached-order-close"
                  onClick={() => {
                    setCurrentAttachedOrder(null);
                    if (onClearAttachedOrder) onClearAttachedOrder();
                  }}
                  title="Tutup konteks pesanan"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Area Pesan Chat */}
            <div className="admin-chat-messages-flow">
              {loadingMessages ? (
                <div className="chat-loading-placeholder">
                  <div className="loading-spinner-circle" />
                  <span>Memuat pesan...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-conversation">
                  <div className="chat-welcome-box">
                    <Sparkles size={24} color="#E63985" />
                    <h5>Belum ada pesan di percakapan ini</h5>
                    <p>Kirim pesan sapaan untuk memulai komunikasi dengan pelanggan.</p>
                  </div>
                </div>
              ) : (
                <div className="messages-stream-wrapper">
                  {messages.map((msg) => {
                    const isMe = msg.sender_role === 'admin';
                    const orderInfo = getOrderInfo(msg.order_id);

                    return (
                      <div
                        key={msg.id}
                        className={`admin-bubble-row ${isMe ? 'row-admin-me' : 'row-customer'}`}
                      >
                        {!isMe && (
                          <div className="admin-chat-avatar-mini" title={selectedConversation.customer_name}>
                            <User size={13} color="#E63985" />
                          </div>
                        )}

                        <div className="admin-bubble-content-col">
                          {/* Info Pesanan jika ada order_id */}
                          {msg.order_id && (
                            <div className="admin-order-context-card">
                              <div className="order-chip-top">
                                <Package size={14} color="#E63985" />
                                <span className="order-chip-id">
                                  Pesanan #{msg.order_id}
                                </span>
                                {orderInfo && (
                                  <span className={`order-status-chip ${orderInfo.status === 'Selesai' ? 'status-green' : 'status-pink'}`}>
                                    {orderInfo.status}
                                  </span>
                                )}
                              </div>
                              {orderInfo && (
                                <div className="order-chip-details">
                                  <span>Total: <strong>Rp {Number(orderInfo.total || 0).toLocaleString('id-ID')}</strong></span>
                                  {orderInfo.items && orderInfo.items.length > 0 && (
                                    <span> • {orderInfo.items.length} item produk</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bubble Pesan Aman */}
                          <div className={`admin-chat-bubble ${isMe ? 'bubble-admin' : 'bubble-customer'}`}>
                            <p className="admin-bubble-text">{msg.content}</p>
                            <span className="admin-bubble-time">
                              {formatTime(msg.created_at)}
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

            {/* Form Balasan Admin */}
            <form className="admin-reply-form" onSubmit={handleSendReply}>
              <div className="admin-reply-input-box">
                <textarea
                  ref={inputRef}
                  className="admin-reply-textarea"
                  rows="2"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder={`Tulis balasan untuk ${selectedConversation.customer_name || 'pelanggan'}... (Tekan Enter untuk kirim)`}
                  maxLength={1000}
                  disabled={sending}
                />
                {replyText.length > 800 && (
                  <span className="char-counter-tag">{1000 - replyText.length}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn-admin-send-reply"
                disabled={!replyText.trim() || sending}
                title="Kirim Balasan"
              >
                {sending ? (
                  <div className="btn-send-spinner" />
                ) : (
                  <>
                    <span>Kirim</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="admin-no-selected-conv">
            <MessageCircle size={48} color="#FF86C1" />
            <h3>Pilih Percakapan Pelanggan</h3>
            <p>Pilih salah satu chat di kolom sebelah kiri untuk membaca dan membalas pertanyaan pelanggan toko.</p>
          </div>
        )}
      </section>
    </div>
  );
}
