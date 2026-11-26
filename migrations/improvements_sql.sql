-- =====================================================================
-- KNOT & BLOOM — SQL Perbaikan Fitur (Jalankan BERURUTAN di Supabase SQL Editor)
-- =====================================================================

-- =====================================================================
-- LANGKAH 1: Tabel `reviews` (Ulasan Pelanggan) + Row Level Security
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id      UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name TEXT        NOT NULL,
  rating        INT         NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_unique_order_product UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id   ON public.reviews (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_select"        ON public.reviews;
DROP POLICY IF EXISTS "reviews_customer_insert_own"  ON public.reviews;

-- Semua orang (anon & authenticated) boleh membaca ulasan
CREATE POLICY "reviews_public_select"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Hanya user login yang boleh insert ulasan atas nama dirinya,
-- untuk pesanan miliknya yang berstatus 'Selesai' dan berisi produk tersebut.
CREATE POLICY "reviews_customer_insert_own"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      INNER JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.id = reviews.order_id
        AND o.user_id = auth.uid()
        AND LOWER(o.order_status) = 'selesai'
        AND oi.product_id = reviews.product_id
    )
  );

-- =====================================================================
-- LANGKAH 2: View `product_sales` (Jumlah Terjual Real dari Pesanan Selesai)
-- Customer biasa hanya membaca agregat total_sold tanpa bisa melihat
-- detail pesanan orang lain.
-- =====================================================================
CREATE OR REPLACE VIEW public.product_sales AS
SELECT
  oi.product_id,
  COALESCE(SUM(oi.quantity), 0)::INT AS total_sold
FROM public.order_items oi
INNER JOIN public.orders o ON o.id = oi.order_id
WHERE LOWER(o.order_status) = 'selesai'
  AND oi.product_id IS NOT NULL
GROUP BY oi.product_id;

GRANT SELECT ON public.product_sales TO anon, authenticated;

-- =====================================================================
-- LANGKAH 3: Tambah Produk "Keychain Bunga" ke Tabel `products`
-- PENTING: Ganti [ISI HARGA] dengan angka harga asli (contoh: 20000)
-- sebelum menjalankan bagian ini!
-- File gambar `keychain bunga.png` sudah tersedia di bucket `product-images`.
-- =====================================================================
INSERT INTO public.products (
  name,
  slug,
  description,
  category,
  price,
  original_price,
  stock,
  image_url,
  colors,
  specs,
  tag,
  tag_type,
  rating,
  reviews_count,
  sold_count,
  note,
  sort_order,
  is_active
)
SELECT
  'Keychain Bunga',
  'keychain-bunga',
  'Gantungan kunci rajut handmade berbentuk bunga yang manis dan estetik. Cocok untuk gantungan tas, kunci motor/mobil, atau kado spesial.',
  'aksesoris',
  [ISI HARGA],
  [ISI HARGA],
  2,
  'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bunga.png',
  '[
    {"name": "Pink", "hex": "#F472B6", "image": "https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bunga.png"}
  ]'::jsonb,
  '{
    "bahan": "Milk Cotton Yarn Premium",
    "tipe": "Handmade Crochet",
    "ukuran": "± 7-8 cm",
    "cocokUntuk": "Gantungan tas, gantungan kunci, kado spesial"
  }'::jsonb,
  'New Arrival',
  'new',
  0,
  0,
  0,
  'Setiap produk dibuat manual dengan tangan (handmade), sehingga setiap jahitan rapi dan memiliki keunikan tersendiri.',
  5,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.products
  WHERE slug = 'keychain-bunga' OR LOWER(name) = 'keychain bunga'
);

-- Pastikan kolom `images` untuk Keychain Bunga ikut terisi (mendukung JSONB & TEXT[])
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images';

  IF col_type = 'jsonb' THEN
    UPDATE public.products
    SET images = jsonb_build_array(
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bunga.png'
    )
    WHERE slug = 'keychain-bunga' OR LOWER(name) = 'keychain bunga';
  ELSIF col_type = 'ARRAY' THEN
    UPDATE public.products
    SET images = ARRAY[
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bunga.png'
    ]
    WHERE slug = 'keychain-bunga' OR LOWER(name) = 'keychain bunga';
  END IF;
END $$;

-- =====================================================================
-- LANGKAH 4: Pastikan Admin bisa upsert & membuka percakapan di `conversations`
-- (Jalankan jika admin belum memiliki policy INSERT/UPDATE di `conversations`)
-- =====================================================================
DROP POLICY IF EXISTS "admin_insert_conversations" ON public.conversations;
CREATE POLICY "admin_insert_conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_update_conversations" ON public.conversations;
CREATE POLICY "admin_update_conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- Verifikasi akhir
SELECT id, name, slug, price, stock, image_url, sort_order FROM public.products ORDER BY sort_order ASC;
SELECT * FROM public.product_sales;
