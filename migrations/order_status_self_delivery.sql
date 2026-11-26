-- =====================================================================
-- KNOT & BLOOM — Migrasi Alur Status Pengantaran Toko (Tanpa Kurir Ekspedisi)
-- Urutan: Dirajut -> Packing -> Diantar -> Selesai (atau Dibatalkan)
-- Jalankan di Supabase Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

-- 1. Pastikan kolom baru tersedia (kolom no_resi & kurir TIDAK dihapus)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimasi_antar TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pengantar      TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alasan_batal   TEXT;

-- 2. Atur default order_status menjadi 'Dirajut'
ALTER TABLE public.orders ALTER COLUMN order_status SET DEFAULT 'Dirajut';

-- 3. Perbarui CHECK constraint pada order_status (jika sebelumnya ada constraint lama)
DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%order_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('Dirajut', 'Packing', 'Diantar', 'Selesai', 'Dibatalkan'));

-- 4. Fungsi RPC Transaksional: validasi urutan status di server + update `orders`
--    dan insert `order_status_history` dalam SATU transaksi atomik.
CREATE OR REPLACE FUNCTION public.update_order_status_tx(
  p_order_id       TEXT,
  p_new_status     TEXT,
  p_estimasi_antar TEXT DEFAULT NULL,
  p_pengantar      TEXT DEFAULT NULL,
  p_alasan_batal   TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order          public.orders%ROWTYPE;
  v_updated_order  public.orders%ROWTYPE;
  v_current_status TEXT;
  v_allowed        BOOLEAN := FALSE;
  v_estimasi       TEXT := NULLIF(BTRIM(COALESCE(p_estimasi_antar, '')), '');
  v_pengantar      TEXT := NULLIF(BTRIM(COALESCE(p_pengantar, '')), '');
  v_alasan         TEXT := NULLIF(BTRIM(COALESCE(p_alasan_batal, '')), '');
  v_keterangan     TEXT;
  v_is_admin       BOOLEAN := FALSE;
BEGIN
  -- Verifikasi hak akses: jika dipanggil user login (bukan service_role), wajib admin
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Akses ditolak: hanya Admin Toko yang dapat mengubah status pesanan.';
    END IF;
  END IF;

  -- Kunci baris pesanan agar tidak ada race condition
  SELECT * INTO v_order
  FROM public.orders
  WHERE id::TEXT = p_order_id OR order_number = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan #% tidak ditemukan.', p_order_id;
  END IF;

  v_current_status := COALESCE(v_order.order_status, 'Dirajut');

  -- Status akhir tidak bisa diubah lagi
  IF v_current_status IN ('Selesai', 'Dibatalkan') THEN
    RAISE EXCEPTION 'Pesanan berstatus "%" tidak dapat diubah lagi.', v_current_status;
  END IF;

  -- Validasi urutan status secara ketat (tidak boleh melompati tahap)
  IF v_current_status = 'Dirajut' AND p_new_status IN ('Packing', 'Dibatalkan') THEN
    v_allowed := TRUE;
  ELSIF v_current_status = 'Packing' AND p_new_status IN ('Diantar', 'Dibatalkan') THEN
    v_allowed := TRUE;
  ELSIF v_current_status = 'Diantar' AND p_new_status IN ('Selesai', 'Dibatalkan') THEN
    v_allowed := TRUE;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Urutan status tidak valid: "%" tidak dapat diubah menjadi "%". Urutan wajib: Dirajut -> Packing -> Diantar -> Selesai (atau Dibatalkan).',
      v_current_status, p_new_status;
  END IF;

  -- Validasi input wajib per tahap
  IF p_new_status = 'Diantar' AND v_estimasi IS NULL THEN
    RAISE EXCEPTION 'Estimasi waktu antar wajib diisi sebelum mengubah status ke Diantar.';
  END IF;

  IF p_new_status = 'Dibatalkan' AND v_alasan IS NULL THEN
    RAISE EXCEPTION 'Alasan pembatalan wajib diisi saat membatalkan pesanan.';
  END IF;

  -- Update tabel orders dalam transaksi yang sama
  UPDATE public.orders
  SET
    order_status   = p_new_status,
    estimasi_antar = CASE WHEN p_new_status = 'Diantar' THEN v_estimasi ELSE estimasi_antar END,
    pengantar      = CASE WHEN p_new_status = 'Diantar' THEN v_pengantar ELSE pengantar END,
    alasan_batal   = CASE WHEN p_new_status = 'Dibatalkan' THEN v_alasan ELSE alasan_batal END,
    payment_status = CASE WHEN p_new_status = 'Selesai' THEN 'dibayar' ELSE payment_status END,
    updated_at     = NOW()
  WHERE id = v_order.id
  RETURNING * INTO v_updated_order;

  -- Susun keterangan riwayat
  IF p_new_status = 'Packing' THEN
    v_keterangan := 'Rajutan selesai! Pesanan sedang dikemas rapi oleh tim Knot & Bloom dan siap diantar.';
  ELSIF p_new_status = 'Diantar' THEN
    v_keterangan := 'Pesanan sedang diantar langsung oleh tim Knot & Bloom. Estimasi tiba: ' || v_estimasi ||
      CASE WHEN v_pengantar IS NOT NULL THEN ' (Pengantar: ' || v_pengantar || ').' ELSE '.' END;
  ELSIF p_new_status = 'Selesai' THEN
    v_keterangan := 'Pesanan telah diterima pembeli dan pembayaran COD tunai telah dibayar lunas.';
  ELSIF p_new_status = 'Dibatalkan' THEN
    v_keterangan := 'Pesanan dibatalkan. Alasan: ' || v_alasan;
  ELSE
    v_keterangan := 'Status pesanan diperbarui menjadi ' || p_new_status || '.';
  END IF;

  -- Insert 1 baris riwayat di order_status_history dalam transaksi yang sama
  INSERT INTO public.order_status_history (order_id, status, keterangan, created_at)
  VALUES (v_order.id, p_new_status, v_keterangan, NOW());

  RETURN v_updated_order;
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status_tx(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status_tx(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
