
import { supabase } from '../lib/supabase';
import { fetchProductRatingStats } from './reviewService';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Helper untuk membaca respons API
const parseResponse = async (response) => {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Permintaan gagal (${response.status})`
    );
  }

  return result;
};

// Helper khusus permintaan Admin
const adminRequest = async (path, options = {}) => {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Sesi login admin tidak ditemukan. Silakan login kembali.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  return parseResponse(response);
};

// Ambil total terjual real per product_id dari view `product_sales` (hanya pesanan status 'Selesai')
export const fetchProductSalesMap = async () => {
  try {
    const { data, error } = await supabase
      .from('product_sales')
      .select('product_id, total_sold');

    if (error) {
      console.warn('[ProductService] View product_sales belum tersedia atau gagal dimuat:', error.message);
      return {};
    }

    const salesMap = {};
    (data || []).forEach((row) => {
      if (row.product_id) {
        salesMap[row.product_id] = Number(row.total_sold) || 0;
      }
    });
    return salesMap;
  } catch (err) {
    console.warn('[ProductService] Error saat memuat product_sales:', err.message);
    return {};
  }
};

const isDiscontinuedCategoryItem = (item) => {
  if (!item) return false;
  const cat = String(item.category || '').toLowerCase().trim();
  const slug = String(item.slug || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  return (
    cat === 'diy-kit' ||
    cat === 'diykit' ||
    slug.includes('diy-kit') ||
    slug.includes('diy-crochet') ||
    name.includes('diy kit') ||
    name.includes('diy crochet')
  );
};

// Normalisasi satu record produk dari tabel Supabase `products`
const mapSupabaseProduct = (item, salesMap = {}, ratingStatsMap = {}) => {
  const price = Number(item.price) || 0;
  const originalPrice =
    item.original_price !== null && item.original_price !== undefined
      ? Number(item.original_price)
      : price;
  const imageUrl = typeof item.image_url === 'string' ? item.image_url.trim() : '';
  const rawImages = Array.isArray(item.images)
    ? item.images.filter((url) => typeof url === 'string' && url.trim())
    : [];
  const images = rawImages.length > 0 ? rawImages : (imageUrl ? [imageUrl] : []);
  const variants = Array.isArray(item.product_variants) ? item.product_variants : [];
  const colors =
    Array.isArray(item.colors) && item.colors.length > 0
      ? item.colors
      : variants.map((v) => ({
          name: v.name,
          hex: v.color_hex || '#FF86C1',
          image: v.image_url || v.image || undefined,
          stock: v.stock,
        }));

  const ratingInfo = ratingStatsMap[item.id] || null;
  const realSold = salesMap[item.id] ?? 0;

  return {
    ...item,
    price,
    originalPrice,
    image: imageUrl || images[0] || '',
    image_url: imageUrl || images[0] || '',
    images,
    colors,
    rating: ratingInfo ? ratingInfo.avgRating : null,
    reviewsCount: ratingInfo ? ratingInfo.reviewCount : 0,
    soldCount: realSold,
    tagType: item.tag_type,
    variants,
  };
};

/**
 * Mengambil produk aktif untuk katalog publik.
 * SATU SUMBER SAJA: tabel `products` + view `product_sales` + tabel `reviews` di Supabase.
 */
export const fetchProducts = async () => {
  try {
    const [productsRes, salesMap, ratingStatsMap] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      fetchProductSalesMap(),
      fetchProductRatingStats()
    ]);

    const { data, error } = productsRes;

    if (error) {
      console.error('[ProductService] Gagal memuat produk dari Supabase:', error);
      return [];
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => !isDiscontinuedCategoryItem(item))
      .map((item) => mapSupabaseProduct(item, salesMap, ratingStatsMap));
  } catch (err) {
    console.error('[ProductService] Error koneksi saat memuat produk dari Supabase:', err);
    return [];
  }
};

/**
 * Mengambil map produk (id -> { id, name, price, image_url }) langsung dari Supabase
 * untuk verifikasi harga resmi saat checkout & pencatatan order_items.
 */
export const fetchProductsByIds = async (productIds = []) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = [...new Set(productIds.filter((id) => typeof id === 'string' && uuidRegex.test(id)))];
  if (validIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, price, original_price, image_url')
      .in('id', validIds);

    if (error) {
      console.error('[ProductService] Gagal memverifikasi harga produk dari Supabase:', error);
      return {};
    }

    if (!Array.isArray(data)) return {};
    return Object.fromEntries(
      data.map((p) => [
        p.id,
        {
          ...p,
          price: Number(p.price) || 0,
          image: typeof p.image_url === 'string' ? p.image_url.trim() : '',
        },
      ])
    );
  } catch (err) {
    console.error('[ProductService] Error verifikasi harga produk:', err);
    return {};
  }
};

/**
 * Mengambil semua produk untuk halaman Admin,
 * termasuk produk yang tidak aktif.
 */
export const fetchAdminProducts = async () => {
  const result = await adminRequest('/api/admin/products');
  return result.products || [];
};

/**
 * Menambahkan produk baru.
 */
export const createProduct = async (productData) => {
  const result = await adminRequest('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });

  return result.product;
};

/**
 * Memperbarui produk.
 */
export const updateProduct = async (productId, productData) => {
  const result = await adminRequest(
    `/api/admin/products/${encodeURIComponent(productId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(productData),
    }
  );

  return result.product;
};

/**
 * Menghapus produk.
 */
export const deleteProduct = async (productId) => {
  const result = await adminRequest(
    `/api/admin/products/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
    }
  );

  return result;
};
