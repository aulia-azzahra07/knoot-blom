-- ============================================================================
-- Knot & Bloom — Pengelolaan Produk Kategori DIY Kit di Tabel `products`
-- Jalankan secara manual di Supabase SQL Editor sesuai kebutuhan.
-- JANGAN ubah struktur tabel atau nama kolom lain.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (a) QUERY PENGECEKAN: Lihat semua produk DIY Kit di tabel `products`
--     beserta jumlah referensi di tabel `order_items`
-- ----------------------------------------------------------------------------
SELECT
  p.id,
  p.name,
  p.slug,
  p.category,
  p.is_active,
  COUNT(oi.id) AS jumlah_dirujuk_order_items
FROM public.products p
LEFT JOIN public.order_items oi ON oi.product_id = p.id
WHERE LOWER(COALESCE(p.category, '')) IN ('diy-kit', 'diykit')
   OR LOWER(COALESCE(p.slug, '')) LIKE '%diy%'
   OR LOWER(COALESCE(p.name, '')) LIKE '%diy%'
GROUP BY p.id, p.name, p.slug, p.category, p.is_active
ORDER BY p.name;


-- ----------------------------------------------------------------------------
-- (b) OPSI HAPUS PERMANEN (gunakan HANYA jika jumlah_dirujuk_order_items = 0)
--     Menghapus produk DIY Kit (dan variannya jika ada) secara permanen.
--     Jika masih ada referensi di `order_items` dengan FK constraint, query ini
--     dapat gagal atau merusak relasi riwayat pesanan.
-- ----------------------------------------------------------------------------
-- DELETE FROM public.product_variants
-- WHERE product_id IN (
--   SELECT id FROM public.products
--   WHERE LOWER(COALESCE(category, '')) IN ('diy-kit', 'diykit')
--      OR LOWER(COALESCE(slug, '')) LIKE '%diy%'
--      OR LOWER(COALESCE(name, '')) LIKE '%diy%'
-- );
--
-- DELETE FROM public.products
-- WHERE LOWER(COALESCE(category, '')) IN ('diy-kit', 'diykit')
--    OR LOWER(COALESCE(slug, '')) LIKE '%diy%'
--    OR LOWER(COALESCE(name, '')) LIKE '%diy%';


-- ----------------------------------------------------------------------------
-- (c) OPSI ALTERNATIF (AMAN / DISARANKAN jika sudah pernah dipesan di `order_items`):
--     Menonaktifkan produk DIY Kit saja (is_active = false) sehingga tidak lagi
--     muncul di katalog publik, tetapi riwayat pesanan lama tetap utuh.
-- ----------------------------------------------------------------------------
-- UPDATE public.products
-- SET is_active = false
-- WHERE LOWER(COALESCE(category, '')) IN ('diy-kit', 'diykit')
--    OR LOWER(COALESCE(slug, '')) LIKE '%diy%'
--    OR LOWER(COALESCE(name, '')) LIKE '%diy%';
