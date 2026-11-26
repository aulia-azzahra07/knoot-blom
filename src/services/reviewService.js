import { supabase } from '../lib/supabase';

/**
 * Ambil semua ulasan terbaru dari tabel `reviews` di Supabase.
 */
export const fetchAllReviews = async (limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, product_id, order_id, customer_name, rating, comment, created_at, products(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback tanpa join jika FK belum terdeteksi cache schema
      console.warn('[ReviewService] Query join products gagal, mencoba tanpa join:', error.message);
      const { data: plainData, error: plainErr } = await supabase
        .from('reviews')
        .select('id, user_id, product_id, order_id, customer_name, rating, comment, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (plainErr) {
        console.error('[ReviewService] Gagal memuat ulasan:', plainErr);
        return [];
      }
      return (plainData || []).map((r) => ({ ...r, product_name: '' }));
    }

    return (data || []).map((r) => ({
      ...r,
      product_name: r.products?.name || ''
    }));
  } catch (err) {
    console.error('[ReviewService] Error saat memuat ulasan:', err);
    return [];
  }
};

/**
 * Ambil semua ulasan untuk satu produk dari tabel `reviews`.
 */
export const fetchReviewsByProduct = async (productId) => {
  if (!productId) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, product_id, order_id, customer_name, rating, comment, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ReviewService] Gagal memuat ulasan produk:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[ReviewService] Error memuat ulasan produk:', err);
    return [];
  }
};

/**
 * Ambil ulasan yang sudah dikirim untuk sebuah pesanan (order_id = UUID orders.id).
 */
export const fetchReviewsByOrder = async (orderDbId) => {
  if (!orderDbId) return [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof orderDbId !== 'string' || !uuidRegex.test(orderDbId)) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, product_id, order_id, customer_name, rating, comment, created_at')
      .eq('order_id', orderDbId);

    if (error) {
      console.error('[ReviewService] Gagal memuat ulasan pesanan:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[ReviewService] Error memuat ulasan pesanan:', err);
    return [];
  }
};

/**
 * Ambil ringkasan rating rata-rata dan jumlah ulasan per product_id dari tabel `reviews`.
 */
export const fetchProductRatingStats = async () => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('product_id, rating');

    if (error) {
      console.warn('[ReviewService] Gagal memuat statistik rating:', error.message);
      return {};
    }

    const totals = {};
    (data || []).forEach((row) => {
      if (!row.product_id) return;
      const r = Number(row.rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) return;
      if (!totals[row.product_id]) {
        totals[row.product_id] = { sum: 0, count: 0 };
      }
      totals[row.product_id].sum += r;
      totals[row.product_id].count += 1;
    });

    const stats = {};
    Object.entries(totals).forEach(([pid, { sum, count }]) => {
      stats[pid] = {
        avgRating: Number((sum / count).toFixed(1)),
        reviewCount: count
      };
    });
    return stats;
  } catch (err) {
    console.warn('[ReviewService] Error statistik rating:', err.message);
    return {};
  }
};

/**
 * Kirim ulasan baru ke tabel `reviews` di Supabase.
 * RLS memastikan auth.uid() = user_id, pesanan milik user, status 'Selesai',
 * serta 1 ulasan per produk per pesanan.
 */
export const submitProductReview = async ({
  userId,
  productId,
  orderId,
  customerName,
  rating,
  comment
}) => {
  const cleanComment = (comment || '').trim();
  const numRating = Number(rating);

  if (!userId) throw new Error('Silakan login terlebih dahulu untuk mengirim ulasan.');
  if (!productId || !orderId) throw new Error('Data produk atau pesanan tidak lengkap.');
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    throw new Error('Rating harus antara 1 sampai 5 bintang.');
  }
  if (!cleanComment) throw new Error('Komentar ulasan tidak boleh kosong.');
  if (cleanComment.length > 1000) throw new Error('Komentar maksimal 1000 karakter.');

  const payload = {
    user_id: userId,
    product_id: productId,
    order_id: orderId,
    customer_name: (customerName || 'Pelanggan').trim(),
    rating: numRating,
    comment: cleanComment
  };

  const { data, error } = await supabase
    .from('reviews')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[ReviewService] Gagal mengirim ulasan:', error);
    if (error.code === '23505') {
      throw new Error('Kamu sudah memberikan ulasan untuk produk ini pada pesanan tersebut.');
    }
    if (error.code === '42501') {
      throw new Error('Ulasan hanya dapat dikirim untuk pesanan milikmu yang berstatus Selesai.');
    }
    throw new Error(error.message || 'Gagal menyimpan ulasan.');
  }

  return data;
};
