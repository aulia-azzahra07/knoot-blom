import { supabase } from '../lib/supabase';
import { fetchProductRatingStats } from './reviewService';

const PRODUCT_IMAGES_BUCKET = 'product-images';
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

export const generateSlugFromName = (name = '') =>
  String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// Ambil total terjual real per product_id dari view `product_sales` (hanya pesanan status 'Selesai')
export const fetchProductSalesMap = async () => {
  try {
    const { data, error } = await supabase
      .from('product_sales')
      .select('product_id, total_sold');

    if (error) {
      console.error('[ProductService] Gagal memuat view product_sales:', error);
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
    console.error('[ProductService] Error saat memuat product_sales:', err);
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

// Normalisasi satu record produk dari tabel Supabase `products` & `product_variants`
// Kolom `products.colors` TIDAK dipakai lagi; warna dibaca sepenuhnya dari `product_variants`.
const mapSupabaseProduct = (
  item,
  salesMap = {},
  ratingStatsMap = {},
  { includeInactiveVariants = false } = {}
) => {
  const price = Number(item.price) || 0;
  const originalPrice =
    item.original_price !== null && item.original_price !== undefined && Number(item.original_price) > 0
      ? Number(item.original_price)
      : null;

  const imageUrl = typeof item.image_url === 'string' ? item.image_url.trim() : '';
  const rawImages = Array.isArray(item.images)
    ? item.images.filter((url) => typeof url === 'string' && url.trim()).map((url) => url.trim())
    : [];
  const images = rawImages.length > 0 ? rawImages : (imageUrl ? [imageUrl] : []);

  const rawVariants = Array.isArray(item.product_variants) ? item.product_variants : [];
  const normalizedAllVariants = rawVariants
    .map((v) => ({
      id: v.id,
      product_id: v.product_id || item.id,
      name: v.name || '',
      color_hex: typeof v.color_hex === 'string' ? v.color_hex.trim() : '',
      hex: typeof v.color_hex === 'string' ? v.color_hex.trim() : '',
      stock: Math.max(0, Number(v.stock) || 0),
      is_active: v.is_active !== false,
      created_at: v.created_at || null,
    }))
    .sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tA - tB;
    });

  const visibleVariants = includeInactiveVariants
    ? normalizedAllVariants
    : normalizedAllVariants.filter((v) => v.is_active);

  const activeVariants = normalizedAllVariants.filter((v) => v.is_active);
  const hasVariants = normalizedAllVariants.length > 0;
  const computedStock = hasVariants
    ? activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : Math.max(0, Number(item.stock) || 0);

  const ratingInfo = ratingStatsMap[item.id] || null;
  const realSold = salesMap[item.id] ?? 0;

  return {
    id: item.id,
    name: item.name || '',
    slug: item.slug || '',
    description: item.description || '',
    note: item.note || '',
    category: item.category || '',
    price,
    originalPrice,
    original_price: originalPrice,
    stock: computedStock,
    dbStock: Math.max(0, Number(item.stock) || 0),
    is_active: item.is_active !== false,
    sort_order: Number(item.sort_order) || 0,
    tag: item.tag || '',
    tagType: item.tag_type || '',
    tag_type: item.tag_type || '',
    image: imageUrl || images[0] || '',
    image_url: imageUrl || images[0] || '',
    images,
    specs: item.specs && typeof item.specs === 'object' ? item.specs : {},
    // Rating, ulasan, dan terjual SELALU dihitung dari tabel `reviews` & `product_sales`
    rating: ratingInfo ? ratingInfo.avgRating : null,
    reviewsCount: ratingInfo ? ratingInfo.reviewCount : 0,
    soldCount: realSold,
    // Sumber varian tunggal: `product_variants` (alias `colors` diturunkan darinya untuk kompatibilitas keranjang)
    variants: visibleVariants,
    allVariants: normalizedAllVariants,
    colors: visibleVariants,
    created_at: item.created_at || null,
  };
};

/**
 * Validasi dan upload gambar produk ke Supabase Storage bucket `product-images` (public).
 * Format: jpg/png/webp, ukuran maksimal 2 MB.
 */
export const uploadProductImage = async (file) => {
  if (!file) {
    throw new Error('File gambar belum dipilih.');
  }

  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_IMAGE_EXTS.includes(ext)) {
    throw new Error('Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Ukuran gambar melebihi batas maksimal 2 MB.');
  }

  const safeExt = ALLOWED_IMAGE_EXTS.includes(ext)
    ? ext
    : file.type === 'image/png'
    ? 'png'
    : file.type === 'image/webp'
    ? 'webp'
    : 'jpg';
  const baseName = (file.name || 'product')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName || 'img'}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type || `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
      upsert: false,
    });

  if (uploadError) {
    console.error('[ProductService] Gagal upload gambar ke Supabase Storage:', uploadError);
    throw new Error(uploadError.message || 'Gagal mengunggah gambar ke Supabase Storage.');
  }

  const { data: urlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Gagal mendapatkan URL publik gambar setelah upload.');
  }

  return urlData.publicUrl;
};

/**
 * Validasi payload produk & varian sebelum dikirim ke database.
 */
const validateProductPayload = (payload) => {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Nama produk wajib diisi.');

  const slug = generateSlugFromName(payload.slug || name);
  if (!slug) throw new Error('Slug produk wajib valid.');

  const price = Math.round(Number(payload.price));
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Harga jual wajib berupa angka lebih besar dari 0.');
  }

  let originalPrice = null;
  if (
    payload.original_price !== '' &&
    payload.original_price !== null &&
    payload.original_price !== undefined
  ) {
    const parsedOrig = Math.round(Number(payload.original_price));
    if (!Number.isFinite(parsedOrig) || parsedOrig < price) {
      throw new Error('Harga coret (original_price) harus lebih besar atau sama dengan harga jual.');
    }
    originalPrice = parsedOrig;
  }

  const images = Array.isArray(payload.images)
    ? payload.images.map((u) => String(u || '').trim()).filter(Boolean)
    : [];
  const imageUrl = images[0] || String(payload.image_url || '').trim() || null;

  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenNames = new Set();
  const variants = rawVariants.map((v) => {
    const vName = String(v.name || '').trim();
    if (!vName) {
      throw new Error('Nama setiap varian wajib diisi.');
    }
    const lower = vName.toLowerCase();
    if (seenNames.has(lower)) {
      throw new Error(`Nama varian "${vName}" duplikat dalam produk ini.`);
    }
    seenNames.add(lower);

    const vStock = Math.round(Number(v.stock));
    if (!Number.isFinite(vStock) || vStock < 0) {
      throw new Error(`Stok varian "${vName}" harus 0 atau lebih.`);
    }

    const vHex = String(v.color_hex || '').trim() || null;
    return {
      ...(v.id ? { id: v.id } : {}),
      name: vName,
      color_hex: vHex,
      stock: vStock,
      is_active: v.is_active !== false,
    };
  });

  const hasVariants = variants.length > 0;
  let manualStock = 0;
  if (!hasVariants) {
    const parsedStock = Math.round(Number(payload.stock ?? 0));
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      throw new Error('Stok produk harus 0 atau lebih.');
    }
    manualStock = parsedStock;
  }

  const sortOrder = Math.round(Number(payload.sort_order ?? 0)) || 0;
  const specs = payload.specs && typeof payload.specs === 'object' ? payload.specs : {};

  // TIDAK menulis ke `colors`, `rating`, `reviews_count`, atau `sold_count`!
  const productData = {
    name,
    slug,
    category: String(payload.category || '').trim() || 'aksesoris',
    description: String(payload.description || '').trim(),
    note: String(payload.note || '').trim() || null,
    price,
    original_price: originalPrice,
    image_url: imageUrl,
    images,
    tag: String(payload.tag || '').trim() || null,
    tag_type: String(payload.tag_type || '').trim() || null,
    sort_order: sortOrder,
    specs,
    is_active: payload.is_active !== false,
    ...(!hasVariants ? { stock: manualStock } : {}),
  };

  return { productData, variants, hasVariants };
};

const isMissingRpcError = (error) => {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
};

/**
 * Mengambil produk aktif untuk katalog publik (pembeli & guest).
 * Hanya menampilkan produk dengan `is_active = true` dan varian `is_active = true`.
 */
export const fetchProducts = async () => {
  const [productsRes, salesMap, ratingStatsMap] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    fetchProductSalesMap(),
    fetchProductRatingStats(),
  ]);

  const { data, error } = productsRes;

  if (error) {
    console.error('[ProductService] Gagal memuat produk dari Supabase:', error);
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => !isDiscontinuedCategoryItem(item))
    .map((item) =>
      mapSupabaseProduct(item, salesMap, ratingStatsMap, { includeInactiveVariants: false })
    );
};

/**
 * Mengambil SEMUA produk untuk halaman Admin (termasuk `is_active = false` dan seluruh varian).
 */
export const fetchAdminProducts = async () => {
  const [productsRes, salesMap, ratingStatsMap] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_variants(*)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    fetchProductSalesMap(),
    fetchProductRatingStats(),
  ]);

  const { data, error } = productsRes;

  if (error) {
    console.error('[ProductService] Gagal memuat produk admin dari Supabase:', error);
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => !isDiscontinuedCategoryItem(item))
    .map((item) =>
      mapSupabaseProduct(item, salesMap, ratingStatsMap, { includeInactiveVariants: true })
    );
};

/**
 * Mengambil map produk (id -> { id, name, price, image_url, is_active }) langsung dari Supabase
 * untuk verifikasi harga resmi saat checkout & pencatatan order_items.
 */
export const fetchProductsByIds = async (productIds = []) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = [...new Set(productIds.filter((id) => typeof id === 'string' && uuidRegex.test(id)))];
  if (validIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, price, original_price, image_url, is_active')
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
 * Menambahkan produk baru beserta variannya dalam satu transaksi/RPC.
 */
export const createProduct = async (payload) => {
  const { productData, variants, hasVariants } = validateProductPayload(payload);

  // 1. Prioritas Utama: Transaksi atomik via RPC create_product_with_variants
  const { data: rpcId, error: rpcError } = await supabase.rpc('create_product_with_variants', {
    p_product: productData,
    p_variants: variants,
  });

  if (!rpcError && rpcId) {
    return { id: rpcId };
  }

  if (rpcError && !isMissingRpcError(rpcError)) {
    console.error('[ProductService] Gagal membuat produk (RPC):', rpcError);
    throw new Error(rpcError.message || 'Gagal menambahkan produk ke database.');
  }

  // 2. Fallback langsung ke Supabase SDK jika SQL RPC belum dijalankan (dengan rollback manual)
  const { data: insertedProduct, error: prodError } = await supabase
    .from('products')
    .insert([productData])
    .select('id')
    .single();

  if (prodError || !insertedProduct?.id) {
    console.error('[ProductService] Gagal insert ke tabel products:', prodError);
    throw new Error(prodError?.message || 'Gagal menambahkan produk ke tabel products.');
  }

  if (hasVariants) {
    const variantRows = variants.map((v) => ({
      product_id: insertedProduct.id,
      name: v.name,
      color_hex: v.color_hex,
      stock: v.stock,
      is_active: v.is_active,
    }));

    const { error: varError } = await supabase
      .from('product_variants')
      .insert(variantRows);

    if (varError) {
      console.error('[ProductService] Gagal insert varian, melakukan rollback produk:', varError);
      await supabase.from('products').delete().eq('id', insertedProduct.id);
      throw new Error(varError.message || 'Gagal menyimpan varian produk.');
    }
  }

  return insertedProduct;
};

/**
 * Memperbarui produk & melakukan smart diff pada product_variants
 * (update existing by ID, insert new, dan soft-disable/delete varian yang dihapus).
 */
export const updateProduct = async (productId, payload) => {
  if (!productId) throw new Error('ID produk tidak valid.');
  const { productData, variants } = validateProductPayload(payload);

  // 1. Prioritas Utama: Transaksi atomik via RPC update_product_with_variants
  const { data: rpcId, error: rpcError } = await supabase.rpc('update_product_with_variants', {
    p_product_id: productId,
    p_product: productData,
    p_variants: variants,
  });

  if (!rpcError && rpcId) {
    return { id: rpcId };
  }

  if (rpcError && !isMissingRpcError(rpcError)) {
    console.error('[ProductService] Gagal memperbarui produk (RPC):', rpcError);
    throw new Error(rpcError.message || 'Gagal memperbarui produk di database.');
  }

  // 2. Fallback langsung ke Supabase SDK jika SQL RPC belum dijalankan
  const { error: prodUpdateErr } = await supabase
    .from('products')
    .update(productData)
    .eq('id', productId);

  if (prodUpdateErr) {
    console.error('[ProductService] Gagal update tabel products:', prodUpdateErr);
    throw new Error(prodUpdateErr.message || 'Gagal memperbarui produk.');
  }

  const { data: existingVariants, error: fetchVarErr } = await supabase
    .from('product_variants')
    .select('id, name')
    .eq('product_id', productId);

  if (fetchVarErr) {
    console.error('[ProductService] Gagal memuat varian lama:', fetchVarErr);
    throw new Error(fetchVarErr.message || 'Gagal memuat varian produk.');
  }

  const existingById = new Map((existingVariants || []).map((v) => [v.id, v]));
  const keptIds = new Set();

  for (const v of variants) {
    if (v.id && existingById.has(v.id)) {
      const { error: updVarErr } = await supabase
        .from('product_variants')
        .update({
          name: v.name,
          color_hex: v.color_hex,
          stock: v.stock,
          is_active: v.is_active,
        })
        .eq('id', v.id)
        .eq('product_id', productId);

      if (updVarErr) {
        console.error('[ProductService] Gagal update varian:', updVarErr);
        throw new Error(updVarErr.message || `Gagal memperbarui varian "${v.name}".`);
      }
      keptIds.add(v.id);
    } else {
      const { data: newVar, error: insVarErr } = await supabase
        .from('product_variants')
        .insert([
          {
            product_id: productId,
            name: v.name,
            color_hex: v.color_hex,
            stock: v.stock,
            is_active: v.is_active,
          },
        ])
        .select('id')
        .single();

      if (insVarErr) {
        console.error('[ProductService] Gagal menambah varian baru:', insVarErr);
        throw new Error(insVarErr.message || `Gagal menambah varian "${v.name}".`);
      }
      if (newVar?.id) keptIds.add(newVar.id);
    }
  }

  const removedVariants = (existingVariants || []).filter((ev) => !keptIds.has(ev.id));
  if (removedVariants.length > 0) {
    const { data: orderItemsForProd } = await supabase
      .from('order_items')
      .select('id, product_name')
      .eq('product_id', productId);

    for (const rv of removedVariants) {
      const wasOrdered = (orderItemsForProd || []).some((oi) =>
        String(oi.product_name || '').toLowerCase().includes(String(rv.name || '').toLowerCase())
      );

      if (wasOrdered) {
        const { error: softErr } = await supabase
          .from('product_variants')
          .update({ is_active: false })
          .eq('id', rv.id);
        if (softErr) {
          console.error('[ProductService] Gagal menonaktifkan varian:', softErr);
          throw new Error(softErr.message || `Gagal menonaktifkan varian "${rv.name}".`);
        }
      } else {
        const { error: delErr } = await supabase
          .from('product_variants')
          .delete()
          .eq('id', rv.id);
        if (delErr) {
          console.error('[ProductService] Gagal menghapus varian:', delErr);
          throw new Error(delErr.message || `Gagal menghapus varian "${rv.name}".`);
        }
      }
    }
  }

  return { id: productId };
};

/**
 * Menghapus produk dengan aman:
 * - Jika pernah ada di `order_items` -> soft delete (`is_active = false`).
 * - Jika belum pernah dipesan -> hapus permanen beserta variannya.
 */
export const deleteProduct = async (productId) => {
  if (!productId) throw new Error('ID produk tidak valid.');

  // 1. Prioritas Utama: RPC delete_product_safely
  const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_product_safely', {
    p_product_id: productId,
  });

  if (!rpcError && rpcResult) {
    return rpcResult;
  }

  if (rpcError && !isMissingRpcError(rpcError)) {
    console.error('[ProductService] Gagal menghapus produk (RPC):', rpcError);
    throw new Error(rpcError.message || 'Gagal menghapus produk.');
  }

  // 2. Fallback langsung ke Supabase SDK jika SQL RPC belum dijalankan
  const { data: refs, error: refErr } = await supabase
    .from('order_items')
    .select('id')
    .eq('product_id', productId)
    .limit(1);

  if (refErr) {
    console.error('[ProductService] Gagal mengecek referensi order_items:', refErr);
    throw new Error(refErr.message || 'Gagal mengecek riwayat pesanan produk.');
  }

  const hasOrderRefs = Array.isArray(refs) && refs.length > 0;

  if (hasOrderRefs) {
    const { error: varSoftErr } = await supabase
      .from('product_variants')
      .update({ is_active: false })
      .eq('product_id', productId);
    if (varSoftErr) {
      console.error('[ProductService] Gagal menonaktifkan varian produk:', varSoftErr);
      throw new Error(varSoftErr.message || 'Gagal menonaktifkan varian produk.');
    }

    const { error: prodSoftErr } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId);
    if (prodSoftErr) {
      console.error('[ProductService] Gagal menonaktifkan produk:', prodSoftErr);
      throw new Error(prodSoftErr.message || 'Gagal menonaktifkan produk.');
    }

    return {
      mode: 'soft_deleted',
      product_id: productId,
      message: 'Produk pernah dipesan sehingga dinonaktifkan (is_active = false).',
    };
  }

  const { error: varDelErr } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId);
  if (varDelErr) {
    console.error('[ProductService] Gagal menghapus varian produk:', varDelErr);
    throw new Error(varDelErr.message || 'Gagal menghapus varian produk.');
  }

  const { error: prodDelErr } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  if (prodDelErr) {
    console.error('[ProductService] Gagal menghapus produk:', prodDelErr);
    throw new Error(prodDelErr.message || 'Gagal menghapus produk.');
  }

  return {
    mode: 'hard_deleted',
    product_id: productId,
    message: 'Produk berhasil dihapus permanen beserta variannya.',
  };
};
