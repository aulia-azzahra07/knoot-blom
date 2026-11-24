import { supabase } from '../lib/supabase';

// Channel nama untuk BroadcastChannel realtime antar-tab/jendela browser
const BROADCAST_CHANNEL_NAME = 'kb_live_chat_channel';

// Storage key untuk riwayat chat lokal
const CHAT_STORAGE_KEY = 'kb_live_chat_messages_v1';

// Flag: apakah tabel chat_messages tersedia di Supabase?
// Set ke FALSE untuk menonaktifkan semua request Supabase chat
// (tabel belum dibuat). Ubah ke null jika tabel sudah dibuat.
let chatTableExists = false;

// Pesan awal bawaan dari admin toko Knot & Bloom
const DEFAULT_INITIAL_MESSAGES = [
  {
    id: 'msg-init-1',
    senderRole: 'admin',
    senderName: 'Admin Knot & Bloom',
    senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80',
    text: 'Halo kak! Selamat datang di Knot & Bloom Studio Palembang 🌸\nAda yang bisa kami bantu seputar produk rajut handmade, kustomisasi warna, atau cek status pesananmu?',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    orderId: null
  }
];

let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }
}

/**
 * Mengambil semua pesan chat yang tersimpan
 */
export const getChatMessages = async () => {
  // 1. Coba ambil dari Supabase tabel chat_messages — hanya jika tabel tersedia
  if (chatTableExists !== false) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        // 404 / relasi tidak ada → tandai tabel tidak tersedia, jangan ulangi request
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
          chatTableExists = false;
        }
        // Lanjut ke fallback localStorage
      } else {
        chatTableExists = true;
        if (Array.isArray(data) && data.length > 0) {
          return data.map((m) => ({
            id: m.id || `msg-${m.created_at}`,
            senderRole: m.sender_role || 'customer',
            senderName: m.sender_name || (m.sender_role === 'admin' ? 'Admin Knot & Bloom' : 'Pelanggan'),
            senderAvatar: m.sender_avatar || (m.sender_role === 'admin'
              ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'),
            text: m.message || m.text || '',
            timestamp: m.created_at || new Date().toISOString(),
            orderId: m.order_id || null
          }));
        }
      }
    } catch (err) {
      chatTableExists = false; // network error atau tabel tidak ada
    }
  }

  // 2. Ambil dari localStorage
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  return DEFAULT_INITIAL_MESSAGES;
};

/**
 * Mengirim pesan baru (bisa dari Customer atau Admin)
 */
export const sendChatMessage = async ({
  senderRole = 'customer',
  senderName = 'Naila Alfathonah',
  senderAvatar = null,
  text = '',
  orderId = null
}) => {
  if (!text || !text.trim()) return null;

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    senderRole,
    senderName,
    senderAvatar: senderAvatar || (senderRole === 'admin'
      ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'),
    text: text.trim(),
    timestamp: new Date().toISOString(),
    orderId: orderId || null
  };

  // 1. Simpan ke localStorage segera
  try {
    const existing = await getChatMessages();
    const updated = [...existing, newMsg];
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  // 2. Broadcast ke semua tab/window lain secara instan via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: newMsg });
    } catch (e) {}
  }

  // 3. Simpan ke Supabase tabel chat_messages jika tabel ada
  if (chatTableExists === true) {
    try {
      await supabase.from('chat_messages').insert({
        id: newMsg.id,
        sender_role: senderRole,
        sender_name: senderName,
        message: newMsg.text,
        order_id: orderId || null,
        created_at: newMsg.timestamp
      });
    } catch (e) {
      // Non-blocking if table not yet migrated
    }
  }

  return newMsg;
};

/**
 * Berlangganan pesan chat masuk secara realtime
 */
export const subscribeToChatMessages = (onNewMessage) => {
  const handler = (event) => {
    if (event?.data?.type === 'NEW_CHAT_MESSAGE' && event.data.message) {
      onNewMessage(event.data.message);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handler);
  }

  // Storage event listener fallback (untuk tab lain di browser sama)
  const storageHandler = (e) => {
    if (e.key === CHAT_STORAGE_KEY && e.newValue) {
      try {
        const msgs = JSON.parse(e.newValue);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const latest = msgs[msgs.length - 1];
          onNewMessage(latest);
        }
      } catch (err) {}
    }
  };
  window.addEventListener('storage', storageHandler);

  // Supabase realtime channel — hanya subscribe jika tabel terkonfirmasi ada
  let sbChannel = null;
  if (chatTableExists === true) {
    try {
      sbChannel = supabase
        .channel('chat-messages-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            if (payload.new) {
              onNewMessage({
                id: payload.new.id,
                senderRole: payload.new.sender_role,
                senderName: payload.new.sender_name,
                text: payload.new.message,
                timestamp: payload.new.created_at,
                orderId: payload.new.order_id
              });
            }
          }
        )
        .subscribe();
    } catch (e) {}
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handler);
    }
    window.removeEventListener('storage', storageHandler);
    if (sbChannel) {
      try {
        supabase.removeChannel(sbChannel);
      } catch (e) {}
    }
  };
};

/**
 * Quick FAQ Suggestions (Shopee-style)
 */
export const CHAT_QUICK_CHIPS = [
  { id: 'resi', label: '📦 Cek status & resi pesanan', reply: 'Untuk melihat tracking pesananmu, silakan klik menu "Pesanan Saya" di akunmu ya kak! Status pesanan dimulai dari Diterima, Dikemas, Dikirim, hingga Diantar oleh Kurir.' },
  { id: 'ongkir', label: '🚚 Info ongkir Palembang', reply: 'Kabar gembira kak! Ongkir se-Palembang hanya Rp 5.000 flat, dan GRATIS ONGKIR untuk minimal pembelian Rp 50.000 ✨' },
  { id: 'custom', label: '🎨 Bisa custom warna?', reply: 'Bisa banget kak! Kakak bisa request warna di kolom catatan saat checkout atau kirim preferensi warna langsung di chat ini ya ♡' },
  { id: 'estimasi', label: '🧶 Berapa lama pengerjaan?', reply: 'Untuk produk ready-stock dikirim 1 hari kerja, sedangkan produk rajut custom butuh 2-3 hari pengerjaan rapi dan teliti kak.' }
];

