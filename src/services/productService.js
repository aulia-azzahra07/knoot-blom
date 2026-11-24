
import { supabase } from '../lib/supabase';
import { PRODUCTS } from '../data/products';

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

/**
 * Mengambil produk aktif untuk katalog publik.
 * Database menjadi sumber data utama.
 */
export const fetchProducts = async () => {
  // 1. Ambil langsung dari Supabase SDK
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((item) => ({
        ...item,
        image: item.image_url,
        originalPrice: item.original_price,
        reviewsCount: item.reviews_count,
        soldCount: item.sold_count,
        tagType: item.tag_type,
        variants: item.product_variants || []
      }));
    }
  } catch (err) {
    console.warn('Gagal fetch products langsung dari Supabase:', err.message);
  }

  // 2. Ambil dari Backend API
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    const result = await parseResponse(response);
    if (Array.isArray(result.products)) {
      return result.products;
    }
  } catch (err) {
    // Backend offline is normal in dev mode
  }

  return PRODUCTS;
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
