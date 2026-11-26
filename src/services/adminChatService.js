import { supabase } from '../lib/supabase';

/**
 * 1. Mendapatkan atau membuat percakapan untuk customer
 * Upsert berdasarkan customer_id (1 customer = 1 percakapan)
 */
export const getOrCreateCustomerConversation = async (customerId, customerName) => {
  if (!customerId) throw new Error('Customer ID wajib disertakan.');

  const resolvedName = (customerName || '').trim() || 'Pelanggan Knot & Bloom';

  // 1. Cek apakah percakapan sudah ada (pakai limit(1) agar tidak error jika ada data lama ganda)
  const { data: existingList, error: fetchErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('customer_id', customerId)
    .order('last_message_at', { ascending: false })
    .limit(1);

  if (fetchErr) {
    console.error('[adminChatService] Gagal mencari percakapan:', fetchErr);
    throw fetchErr;
  }

  const existing = Array.isArray(existingList) && existingList.length > 0 ? existingList[0] : null;

  if (existing) {
    if (customerName && existing.customer_name !== resolvedName) {
      const { error: updErr } = await supabase
        .from('conversations')
        .update({ customer_name: resolvedName })
        .eq('id', existing.id);
      if (updErr) {
        console.warn('[adminChatService] Gagal memperbarui nama customer:', updErr);
      } else {
        existing.customer_name = resolvedName;
      }
    }
    return existing;
  }

  // 2. Belum ada → Upsert berdasarkan customer_id
  const newConv = {
    customer_id: customerId,
    customer_name: resolvedName,
    last_message: '',
    last_message_at: new Date().toISOString()
  };

  const { data: created, error: upsertErr } = await supabase
    .from('conversations')
    .upsert([newConv], { onConflict: 'customer_id' })
    .select()
    .single();

  if (!upsertErr && created) {
    return created;
  }

  // Fallback jika constraint unique customer_id belum ada (kode 42P10) → coba insert biasa
  if (upsertErr?.code === '42P10') {
    console.warn('[adminChatService] Fallback ke insert biasa karena constraint unique belum ditemukan:', upsertErr.message);
    const { data: inserted, error: insertErr } = await supabase
      .from('conversations')
      .insert([newConv])
      .select()
      .single();

    if (!insertErr && inserted) {
      return inserted;
    }
    console.error('[adminChatService] Gagal insert percakapan baru:', insertErr);
    throw insertErr;
  }

  // Jika race condition duplicate key (23505) → ambil ulang yang sudah ada
  if (upsertErr?.code === '23505') {
    const { data: retryList } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .limit(1);
    if (Array.isArray(retryList) && retryList.length > 0) {
      return retryList[0];
    }
  }

  console.error('[adminChatService] Gagal upsert percakapan baru:', upsertErr);
  throw upsertErr;
};

/**
 * 2. Mengambil semua percakapan untuk Sisi Admin
 * Diurutkan dari percakapan terbaru
 */
export const getAdminConversations = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('[adminChatService] Gagal mengambil daftar percakapan admin:', error);
    throw error;
  }

  return data || [];
};

/**
 * 3. Mengambil daftar pesan dalam sebuah percakapan
 */
export const getConversationMessages = async (conversationId) => {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[adminChatService] Gagal mengambil pesan percakapan:', error);
    throw error;
  }

  return data || [];
};

/**
 * 4. Mengirim pesan (Customer atau Admin)
 * Validasi <= 1000 karakter, update conversations.last_message & last_message_at
 */
export const sendChatMessage = async ({
  conversationId,
  senderId,
  senderRole, // 'customer' | 'admin'
  content,
  orderId = null
}) => {
  const cleanContent = (content || '').trim();
  if (!cleanContent) {
    throw new Error('Pesan tidak boleh kosong.');
  }
  if (cleanContent.length > 1000) {
    throw new Error('Pesan maksimal 1000 karakter.');
  }
  if (!conversationId || !senderId) {
    throw new Error('Data percakapan tidak lengkap.');
  }

  const payload = {
    conversation_id: conversationId,
    sender_id: senderId,
    sender_role: senderRole,
    content: cleanContent,
    order_id: orderId || null,
    is_read: false
  };

  // 1. Insert pesan baru
  const { data: inserted, error: insertErr } = await supabase
    .from('messages')
    .insert([payload])
    .select()
    .single();

  if (insertErr) {
    console.error('[adminChatService] Gagal mengirim pesan:', insertErr);
    throw insertErr;
  }

  // 2. Update status percakapan terakhir
  const { error: convErr } = await supabase
    .from('conversations')
    .update({
      last_message: cleanContent,
      last_message_at: inserted.created_at || new Date().toISOString()
    })
    .eq('id', conversationId);

  if (convErr) {
    console.warn('[adminChatService] Gagal update last_message percakapan:', convErr);
  }

  return inserted;
};

/**
 * 5. Tandai pesan sebagai sudah dibaca (is_read = true)
 * Jika readerRole === 'admin', tandai pesan dari 'customer'
 * Jika readerRole === 'customer', tandai pesan dari 'admin'
 */
export const markMessagesAsRead = async (conversationId, readerRole) => {
  if (!conversationId || !readerRole) return;

  const targetSenderRole = readerRole === 'admin' ? 'customer' : 'admin';

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', targetSenderRole)
    .eq('is_read', false);

  if (error) {
    console.warn('[adminChatService] Gagal menandai pesan terbaca:', error);
  }
};

/**
 * 6. Mengambil jumlah total pesan belum dibaca untuk Admin
 */
export const getAdminTotalUnreadCount = async () => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_role', 'customer')
    .eq('is_read', false);

  if (error) {
    console.warn('[adminChatService] Gagal menghitung unread messages admin:', error);
    return 0;
  }

  return count || 0;
};

/**
 * 7. Mengambil rekap jumlah unread per conversation untuk Admin
 */
export const getAdminUnreadCountsByConversation = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('sender_role', 'customer')
    .eq('is_read', false);

  if (error) {
    console.warn('[adminChatService] Gagal mengambil unread per conv:', error);
    return {};
  }

  const counts = {};
  (data || []).forEach((row) => {
    counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1;
  });
  return counts;
};

/**
 * 8. Mengambil jumlah pesan belum dibaca untuk Customer tertentu
 */
export const getCustomerUnreadCount = async (conversationId) => {
  if (!conversationId) return 0;

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'admin')
    .eq('is_read', false);

  if (error) {
    console.warn('[adminChatService] Gagal menghitung unread customer:', error);
    return 0;
  }

  return count || 0;
};

/**
 * 9. Realtime Subscription untuk sebuah percakapan (messages postgres_changes)
 */
export const subscribeToConversationMessages = (conversationId, onInsert, onUpdate) => {
  if (!supabase || !conversationId) return () => {};

  const channel = supabase
    .channel(`messages_conv_${conversationId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload?.new && onInsert) {
          onInsert(payload.new);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload?.new && onUpdate) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.warn('[adminChatService] Realtime subscription error:', err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * 10. Realtime Subscription untuk semua pesan (Admin notification badge)
 */
export const subscribeToAllMessages = (onAnyInsert) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`admin_global_messages_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        if (payload?.new && onAnyInsert) {
          onAnyInsert(payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.warn('[adminChatService] Global messages subscription error:', err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};
