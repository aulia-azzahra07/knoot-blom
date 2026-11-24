-- =====================================================================
-- KNOT & BLOOM — Schema Fix + RLS Policy
-- Jalankan seluruhnya di Supabase SQL Editor (sekali saja)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: Pastikan kolom yang dibutuhkan ada di tabel orders
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_resi      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kurir        TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS alasan_batal TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 2: Buat tabel order_status_history (jika belum ada)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3: Buat tabel order_items (jika belum ada)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID,
  product_name TEXT,
  price        NUMERIC NOT NULL DEFAULT 0,
  quantity     INT     NOT NULL DEFAULT 1,
  subtotal     NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 4: Aktifkan Row Level Security
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 5: Hapus policy lama (agar tidak bentrok saat dijalankan ulang)
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customer_select_own_orders"      ON orders;
DROP POLICY IF EXISTS "customer_insert_own_orders"      ON orders;
DROP POLICY IF EXISTS "admin_select_all_orders"         ON orders;
DROP POLICY IF EXISTS "admin_update_all_orders"         ON orders;

DROP POLICY IF EXISTS "customer_select_own_items"       ON order_items;
DROP POLICY IF EXISTS "customer_insert_own_items"       ON order_items;
DROP POLICY IF EXISTS "admin_select_all_items"          ON order_items;

DROP POLICY IF EXISTS "customer_select_own_history"     ON order_status_history;
DROP POLICY IF EXISTS "customer_insert_own_history"     ON order_status_history;
DROP POLICY IF EXISTS "admin_select_all_history"        ON order_status_history;
DROP POLICY IF EXISTS "admin_insert_all_history"        ON order_status_history;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 6: Policy untuk tabel ORDERS
-- ─────────────────────────────────────────────────────────────────────

-- Customer: hanya bisa SELECT pesanan miliknya sendiri
CREATE POLICY "customer_select_own_orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Customer: hanya bisa INSERT pesanan dengan user_id miliknya
CREATE POLICY "customer_insert_own_orders" ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin: bisa SELECT semua pesanan
-- (Gunakan kolom role dari tabel profil/users, sesuaikan dengan struktur kamu)
-- Jika kamu punya tabel "profiles" dengan kolom "role":
CREATE POLICY "admin_select_all_orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admin: bisa UPDATE semua pesanan
CREATE POLICY "admin_update_all_orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 7: Policy untuk tabel ORDER_ITEMS
-- ─────────────────────────────────────────────────────────────────────

-- Customer: SELECT item dari pesanan miliknya
CREATE POLICY "customer_select_own_items" ON order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Customer: INSERT item untuk pesanan miliknya
CREATE POLICY "customer_insert_own_items" ON order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Admin: SELECT semua item
CREATE POLICY "admin_select_all_items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 8: Policy untuk tabel ORDER_STATUS_HISTORY
-- ─────────────────────────────────────────────────────────────────────

-- Customer: SELECT riwayat pesanan miliknya
CREATE POLICY "customer_select_own_history" ON order_status_history
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Customer: INSERT riwayat untuk pesanan miliknya (saat buat pesanan baru)
CREATE POLICY "customer_insert_own_history" ON order_status_history
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Admin: SELECT semua riwayat
CREATE POLICY "admin_select_all_history" ON order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admin: INSERT riwayat (saat update status)
CREATE POLICY "admin_insert_all_history" ON order_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- ⚠️  CATATAN PENTING
-- ─────────────────────────────────────────────────────────────────────
-- Policy admin di atas menggunakan tabel "profiles" dengan kolom "role".
-- Sesuaikan nama tabel/kolom dengan struktur database kamu.
--
-- Jika backend Express menggunakan SUPABASE_SECRET_KEY (service role key),
-- maka RLS otomatis di-bypass untuk operasi admin dari backend.
-- Pastikan SUPABASE_SECRET_KEY di server/.env adalah service_role key
-- (bukan anon key). Cek di: Supabase Dashboard → Settings → API → service_role
-- ─────────────────────────────────────────────────────────────────────
