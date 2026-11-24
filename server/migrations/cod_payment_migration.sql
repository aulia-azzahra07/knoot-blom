-- =====================================================================
-- KNOT & BLOOM — COD Payment Migration
-- Jalankan di Supabase SQL Editor (sekali saja)
-- =====================================================================

-- 1. Tambah kolom baru ke tabel orders (jika belum ada)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_resi TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kurir TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS alasan_batal TEXT;

-- 2. Pastikan order_status_history ada
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pastikan order_items ada (dengan kolom yang dipakai kode)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Aktifkan RLS pada tabel utama
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (agar tidak bentrok saat re-run)
DROP POLICY IF EXISTS "customer_own_orders_select" ON orders;
DROP POLICY IF EXISTS "customer_own_orders_insert" ON orders;
DROP POLICY IF EXISTS "read_own_history" ON order_status_history;
DROP POLICY IF EXISTS "read_own_items" ON order_items;

-- Customer hanya bisa SELECT pesanan miliknya sendiri
CREATE POLICY "customer_own_orders_select" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Customer hanya bisa INSERT pesanan dengan user_id miliknya
CREATE POLICY "customer_own_orders_insert" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Customer hanya bisa baca riwayat status dari pesanannya sendiri
CREATE POLICY "read_own_history" ON order_status_history
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Customer hanya bisa baca item dari pesanannya sendiri
CREATE POLICY "read_own_items" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- CATATAN PENTING:
-- Backend Express (server/server.js) harus menggunakan SUPABASE_SERVICE_ROLE_KEY
-- (bukan anon key) agar Admin bisa baca & update semua pesanan tanpa terblokir RLS.
-- Set di server/.env:
--   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
