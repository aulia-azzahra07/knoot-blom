import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ShoppingBag,
  CheckCheck,
  Minimize2,
  Maximize2,
  User
} from 'lucide-react';
import {
  getChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  CHAT_QUICK_CHIPS
} from '../services/chatService';

export default function LiveChatWidget({
  currentRole = 'customer',
  currentUser = null,
  activeOrderContext = null,
  onClearOrderContext = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const customerName = currentUser?.name || 'Naila Alfathonah';
  const roleName = currentRole === 'admin' ? 'Admin Toko' : customerName;

  // Load chat messages on mount
  useEffect(() => {
    getChatMessages().then((msgs) => {
      setMessages(msgs);
    });

    const unsubscribe = subscribeToChatMessages((newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate IDs
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Increment unread if chat window is closed
      if (!isOpen && newMsg.senderRole !== currentRole) {
        setUnreadCount((c) => c + 1);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen, currentRole]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Open with active order context if provided
  useEffect(() => {
    if (activeOrderContext) {
      setIsOpen(true);
      setInputText(`Halo kak, saya mau tanya tentang pesanan saya #${activeOrderContext.id || activeOrderContext}: `);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [activeOrderContext]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      setUnreadCount(0);
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    } else {
      setIsOpen(false);
      if (onClearOrderContext) onClearOrderContext();
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const content = textToSend !== null ? textToSend : inputText;
    if (!content || !content.trim()) return;

    const payload = {
      senderRole: currentRole,
      senderName: currentRole === 'admin' ? 'Admin Knot & Bloom' : customerName,
      text: content.trim(),
      orderId: activeOrderContext?.id || null
    };

    setInputText('');
    const sent = await sendChatMessage(payload);

    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    }

    if (onClearOrderContext) onClearOrderContext();
  };

  const handleChipClick = (chip) => {
    // Send customer's question
    handleSendMessage(chip.label);

    // If customer sends a quick question, trigger immediate helpful auto-reply from Admin
    if (currentRole === 'customer') {
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        const replyPayload = {
          senderRole: 'admin',
          senderName: 'Admin Knot & Bloom',
          text: chip.reply
        };
        const autoReply = await sendChatMessage(replyPayload);
        if (autoReply) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === autoReply.id)) return prev;
            return [...prev, autoReply];
          });
        }
      }, 900);
    }
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="live-chat-root-container" aria-label="Layanan Chat Langsung Web">
      {/* Floating Toggle Button (Shopee Style) */}
      {!isOpen && (
        <button
          className="live-chat-floating-btn"
          onClick={handleToggleOpen}
          title="Buka Chat Web dengan Admin Studio"
          aria-label="Buka Chat Web dengan Admin Studio"
        >
          <div className="chat-btn-inner">
            <div className="chat-btn-icon-pulse">
              <MessageCircle size={24} className="chat-icon-svg" />
              <span className="chat-status-dot-ping" />
            </div>
            <div className="chat-btn-label-wrap">
              <span className="chat-btn-label">Chat Studio</span>
              <span className="chat-btn-sub">Respon Cepat 🌸</span>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="chat-floating-badge" aria-label={`${unreadCount} pesan belum dibaca`}>
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <section className="live-chat-window-box fade-in" aria-label="Jendela Chat Langsung Knot & Bloom">
          {/* Header */}
          <div className="live-chat-header">
            <div className="chat-header-profile">
              <div className="chat-avatar-ring icon-avatar-circle">
                <User size={18} color="#E63985" />
                <span className="chat-online-indicator" title="Online" />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-title-row">
                  <h3 className="chat-title-text">Knot & Bloom Studio</h3>
                  <span className="chat-official-badge">Resmi</span>
                </div>
                <span className="chat-subtitle-text">
                  <span className="dot-green">●</span> Online • Membalas dlm hitungan menit
                </span>
              </div>
            </div>

            <div className="chat-header-actions">
              <button
                className="chat-header-btn-close"
                onClick={handleToggleOpen}
                title="Tutup Chat"
                aria-label="Tutup Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Contextual Order Banner (if opened from an order) */}
          {activeOrderContext && (
            <div className="chat-order-context-banner">
              <div className="context-banner-text">
                <ShoppingBag size={14} color="#E63985" />
                <span>
                  Menanyakan Pesanan: <strong>#{activeOrderContext.id || activeOrderContext}</strong>
                </span>
              </div>
              {onClearOrderContext && (
                <button
                  type="button"
                  className="btn-clear-context"
                  onClick={onClearOrderContext}
                  title="Hapus referensi pesanan"
                  aria-label="Hapus referensi pesanan"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Messages List Body */}
          <div className="live-chat-messages-body">
            <div className="chat-welcome-notice">
              <Sparkles size={16} color="#E63985" />
              <span>
                Obrolan aman langsung di web Knot & Bloom. Tanyakan seputar pesanan, custom benang, atau estimasi ongkir!
              </span>
            </div>

            {messages.map((msg) => {
              const isMe = msg.senderRole === currentRole;
              return (
                <div
                  key={msg.id}
                  className={`chat-msg-row ${isMe ? 'msg-outgoing' : 'msg-incoming'}`}
                >
                  {!isMe && (
                    <div className="chat-msg-avatar-icon-circle">
                      <User size={13} color="#E63985" />
                    </div>
                  )}

                  <div className="chat-bubble-wrap">
                    <div className="chat-bubble-sender-name">
                      {isMe ? 'Kamu' : msg.senderName}
                    </div>

                    <div className={`chat-bubble-content ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                      <p className="bubble-text">{msg.text}</p>
                    </div>

                    <div className="chat-bubble-meta">
                      <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                      {isMe && <CheckCheck size={13} className="bubble-read-icon" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="chat-msg-row msg-incoming">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80"
                  alt="Admin"
                  className="chat-msg-avatar"
                />
                <div className="chat-typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Chips (Shopee Style) */}
          <div className="chat-quick-chips-scroller">
            {CHAT_QUICK_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="chat-quick-chip-pill"
                onClick={() => handleChipClick(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            className="live-chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="chat-input-field"
              placeholder={
                currentRole === 'admin'
                  ? 'Balas pesan sebagai Admin Toko...'
                  : 'Ketik pesan ke Admin Toko...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              className="btn-chat-send"
              disabled={!inputText.trim()}
              title="Kirim Pesan"
              aria-label="Kirim Pesan"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </aside>
  );
}

