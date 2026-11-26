-- =====================================================================
-- KNOT & BLOOM — Perbaikan Data Tabel `products` & RLS Publik
-- Jalankan di Supabase Dashboard → SQL Editor → New Query → Run
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Pastikan RLS memperbolehkan publik (anon & authenticated) membaca
--    tabel `products` dan `product_variants` agar katalog di hosting
--    selalu membaca data langsung dari Supabase (tidak mengembalikan []).
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public_read_product_variants" ON product_variants;
CREATE POLICY "public_read_product_variants"
  ON product_variants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Perbarui harga & URL gambar resmi dari Supabase Storage
--    Bucket public: `product-images`
--    URL dasar: https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/
--
--    Pastikan file gambar berikut sudah ada di bucket `product-images`
--    (huruf kecil semua, tanpa spasi, cocok persis / case-sensitive):
--      - keychain-bintang.png  (atau tetap gunakan keychain%20bintang.png yang sudah ada)
--      - keychain-pita-kuning.png, keychain-pita-biru.png, keychain-pita-putih.png
--      - pouch-mini.png
--      - hairband-pink.png
--
--    CATATAN:
--    File yang saat ini SUDAH ADA di bucket (HTTP 200):
--      • keychain bintang.png      → keychain%20bintang.png
--      • keychain pita kuning.png  → keychain%20pita%20kuning.png
--      • keychain pita biru.png    → keychain%20pita%20biru.png
--      • keychain pita putih.png   → keychain%20pita%20putih.png
--      • hairdband pink.png        → (ada typo huruf 'd' pada hairdband)
--    Sedangkan `pouch-mini.png` dan `hairband-pink.png` perlu di-upload manual.
-- ─────────────────────────────────────────────────────────────────────

-- 2A. Keychain Bintang — Rp 15.000
UPDATE products
SET
  price          = 15000,
  original_price = 15000,
  image_url      = 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png',
  colors         = '[
    {"name": "Kuning", "hex": "#FCD34D", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png"},
    {"name": "Pink",   "hex": "#F472B6", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png"}
  ]'::jsonb,
  is_active      = true,
  sort_order     = 1
WHERE slug = 'keychain-bintang' OR LOWER(name) = 'keychain bintang';

-- 2B. Keychain Pita — Rp 25.500
UPDATE products
SET
  price          = 25500,
  original_price = 25500,
  image_url      = 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png',
  colors         = '[
    {"name": "Kuning", "hex": "#FCD34D", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png"},
    {"name": "Biru",   "hex": "#60A5FA", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png"},
    {"name": "Putih",  "hex": "#FFFFFF", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png"}
  ]'::jsonb,
  is_active      = true,
  sort_order     = 2
WHERE slug = 'keychain-pita' OR LOWER(name) = 'keychain pita';

-- 2C. Pouch Mini — Rp 45.000
--     Upload file `pouch-mini.png` (huruf kecil, tanpa spasi) ke bucket `product-images`
UPDATE products
SET
  price          = 45000,
  original_price = 45000,
  image_url      = 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/pouch-mini.png',
  colors         = '[
    {"name": "Pink", "hex": "#F472B6", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/pouch-mini.png"}
  ]'::jsonb,
  is_active      = true,
  sort_order     = 3
WHERE slug = 'pouch-mini' OR LOWER(name) = 'pouch mini';

-- 2D. Hairband — Rp 30.000
--     Upload file `hairband-pink.png` (huruf kecil, tanpa spasi, tanpa typo 'hairdband')
--     ke bucket `product-images`
UPDATE products
SET
  price          = 30000,
  original_price = 30000,
  image_url      = 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairband-pink.png',
  colors         = '[
    {"name": "Pink", "hex": "#F472B6", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairband-pink.png"}
  ]'::jsonb,
  is_active      = true,
  sort_order     = 4
WHERE slug = 'hairband' OR LOWER(name) = 'hairband';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Sinkronkan kolom `images` secara otomatis (mendukung tipe JSONB maupun TEXT[])
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'products'
    AND column_name  = 'images';

  IF col_type = 'jsonb' THEN
    UPDATE products
    SET images = jsonb_build_array(
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png'
    )
    WHERE slug = 'keychain-bintang' OR LOWER(name) = 'keychain bintang';

    UPDATE products
    SET images = jsonb_build_array(
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png'
    )
    WHERE slug = 'keychain-pita' OR LOWER(name) = 'keychain pita';

    UPDATE products
    SET images = jsonb_build_array(
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/pouch-mini.png'
    )
    WHERE slug = 'pouch-mini' OR LOWER(name) = 'pouch mini';

    UPDATE products
    SET images = jsonb_build_array(
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairband-pink.png'
    )
    WHERE slug = 'hairband' OR LOWER(name) = 'hairband';

  ELSIF col_type = 'ARRAY' THEN
    UPDATE products
    SET images = ARRAY[
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png'
    ]
    WHERE slug = 'keychain-bintang' OR LOWER(name) = 'keychain bintang';

    UPDATE products
    SET images = ARRAY[
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png'
    ]
    WHERE slug = 'keychain-pita' OR LOWER(name) = 'keychain pita';

    UPDATE products
    SET images = ARRAY[
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/pouch-mini.png'
    ]
    WHERE slug = 'pouch-mini' OR LOWER(name) = 'pouch mini';

    UPDATE products
    SET images = ARRAY[
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairband-pink.png'
    ]
    WHERE slug = 'hairband' OR LOWER(name) = 'hairband';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Verifikasi hasil akhir
-- ─────────────────────────────────────────────────────────────────────
SELECT id, name, slug, price, original_price, image_url, is_active, sort_order
FROM products
ORDER BY sort_order ASC;
