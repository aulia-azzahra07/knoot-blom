-- ============================================================================
-- Knot & Bloom — Transactional RPC Functions untuk CRUD Produk & Varian
-- Jalankan di Supabase SQL Editor.
-- Struktur tabel asli:
--   products(id, name, description, price, stock, image_url, category,
--            is_active, created_at, slug, original_price, rating,
--            reviews_count, sold_count, tag, tag_type, images, colors,
--            specs, note, sort_order)
--   product_variants(id, product_id, name, color_hex, stock, is_active, created_at)
-- Catatan:
--   - Kolom products.colors TIDAK ditulis lagi (warna dibaca dari product_variants).
--   - Kolom rating, reviews_count, sold_count TIDAK diubah oleh form admin.
--   - products.stock otomatis diisi oleh trigger sync_product_stock bila ada varian.
-- ============================================================================

-- 1. CREATE PRODUCT + VARIANTS DALAM SATU TRANSAKSI
CREATE OR REPLACE FUNCTION public.create_product_with_variants(
  p_product  JSONB,
  p_variants JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin      BOOLEAN;
  v_product_id    UUID;
  v_name          TEXT;
  v_slug          TEXT;
  v_price         BIGINT;
  v_orig_price    BIGINT;
  v_has_variants  BOOLEAN;
  v_manual_stock  INT;
  v_variant       JSONB;
  v_v_name        TEXT;
  v_v_hex         TEXT;
  v_v_stock       INT;
  v_v_active      BOOLEAN;
  v_seen_names    TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verifikasi caller adalah admin terdaftar di admin_users
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Akses ditolak: hanya admin yang dapat menambah produk.';
  END IF;

  v_name := NULLIF(BTRIM(COALESCE(p_product->>'name', '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Nama produk wajib diisi.';
  END IF;

  v_slug := NULLIF(BTRIM(COALESCE(p_product->>'slug', '')), '');
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Slug produk wajib diisi.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.products WHERE LOWER(slug) = LOWER(v_slug)) THEN
    RAISE EXCEPTION 'Slug "%" sudah digunakan produk lain. Gunakan slug yang unik.', v_slug;
  END IF;

  v_price := (p_product->>'price')::BIGINT;
  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'Harga jual produk wajib lebih besar dari 0.';
  END IF;

  IF p_product ? 'original_price' AND NULLIF(BTRIM(COALESCE(p_product->>'original_price', '')), '') IS NOT NULL THEN
    v_orig_price := (p_product->>'original_price')::BIGINT;
    IF v_orig_price < v_price THEN
      RAISE EXCEPTION 'Harga coret (original_price) harus lebih besar atau sama dengan harga jual.';
    END IF;
  ELSE
    v_orig_price := NULL;
  END IF;

  v_has_variants := jsonb_typeof(COALESCE(p_variants, '[]'::jsonb)) = 'array'
                    AND jsonb_array_length(COALESCE(p_variants, '[]'::jsonb)) > 0;

  IF v_has_variants THEN
    v_manual_stock := 0; -- Akan dihitung otomatis oleh trigger sync_product_stock
  ELSE
    v_manual_stock := GREATEST(0, COALESCE((p_product->>'stock')::INT, 0));
  END IF;

  INSERT INTO public.products (
    name,
    slug,
    category,
    description,
    note,
    price,
    original_price,
    stock,
    image_url,
    images,
    tag,
    tag_type,
    sort_order,
    specs,
    is_active
  ) VALUES (
    v_name,
    v_slug,
    NULLIF(BTRIM(COALESCE(p_product->>'category', '')), ''),
    COALESCE(p_product->>'description', ''),
    NULLIF(BTRIM(COALESCE(p_product->>'note', '')), ''),
    v_price,
    v_orig_price,
    v_manual_stock,
    NULLIF(BTRIM(COALESCE(p_product->>'image_url', '')), ''),
    COALESCE(p_product->'images', '[]'::jsonb),
    NULLIF(BTRIM(COALESCE(p_product->>'tag', '')), ''),
    NULLIF(BTRIM(COALESCE(p_product->>'tag_type', '')), ''),
    COALESCE((p_product->>'sort_order')::INT, 0),
    COALESCE(p_product->'specs', '{}'::jsonb),
    COALESCE((p_product->>'is_active')::BOOLEAN, TRUE)
  )
  RETURNING id INTO v_product_id;

  -- Insert semua varian dengan product_id yang baru dibuat (atomic dalam 1 transaksi)
  IF v_has_variants THEN
    FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
    LOOP
      v_v_name := NULLIF(BTRIM(COALESCE(v_variant->>'name', '')), '');
      IF v_v_name IS NULL THEN
        RAISE EXCEPTION 'Nama varian tidak boleh kosong.';
      END IF;

      IF LOWER(v_v_name) = ANY(v_seen_names) THEN
        RAISE EXCEPTION 'Nama varian "%" duplikat dalam satu produk.', v_v_name;
      END IF;
      v_seen_names := array_append(v_seen_names, LOWER(v_v_name));

      v_v_hex := NULLIF(BTRIM(COALESCE(v_variant->>'color_hex', '')), '');
      v_v_stock := COALESCE((v_variant->>'stock')::INT, 0);
      IF v_v_stock < 0 THEN
        RAISE EXCEPTION 'Stok varian "%" tidak boleh negatif.', v_v_name;
      END IF;
      v_v_active := COALESCE((v_variant->>'is_active')::BOOLEAN, TRUE);

      INSERT INTO public.product_variants (
        product_id,
        name,
        color_hex,
        stock,
        is_active
      ) VALUES (
        v_product_id,
        v_v_name,
        v_v_hex,
        v_v_stock,
        v_v_active
      );
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$$;


-- 2. UPDATE PRODUCT + SMART DIFF VARIANTS DALAM SATU TRANSAKSI
--    - Baris baru -> INSERT
--    - Baris yang ada -> UPDATE (mempertahankan ID varian)
--    - Baris yang dihapus admin -> soft deactivate (is_active = false) jika pernah dipesan,
--      atau DELETE permanen jika belum pernah dipesan.
CREATE OR REPLACE FUNCTION public.update_product_with_variants(
  p_product_id UUID,
  p_product    JSONB,
  p_variants   JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin           BOOLEAN;
  v_name               TEXT;
  v_slug               TEXT;
  v_price              BIGINT;
  v_orig_price         BIGINT;
  v_has_variants       BOOLEAN;
  v_manual_stock       INT;
  v_variant            JSONB;
  v_v_id               UUID;
  v_v_name             TEXT;
  v_v_hex              TEXT;
  v_v_stock            INT;
  v_v_active           BOOLEAN;
  v_seen_names         TEXT[] := ARRAY[]::TEXT[];
  v_kept_ids           UUID[] := ARRAY[]::UUID[];
  v_removed            RECORD;
  v_has_variant_id_col BOOLEAN;
  v_was_ordered        BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Akses ditolak: hanya admin yang dapat mengubah produk.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Produk tidak ditemukan.';
  END IF;

  v_name := NULLIF(BTRIM(COALESCE(p_product->>'name', '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Nama produk wajib diisi.';
  END IF;

  v_slug := NULLIF(BTRIM(COALESCE(p_product->>'slug', '')), '');
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Slug produk wajib diisi.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE LOWER(slug) = LOWER(v_slug) AND id <> p_product_id
  ) THEN
    RAISE EXCEPTION 'Slug "%" sudah digunakan produk lain. Gunakan slug yang unik.', v_slug;
  END IF;

  v_price := (p_product->>'price')::BIGINT;
  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'Harga jual produk wajib lebih besar dari 0.';
  END IF;

  IF p_product ? 'original_price' AND NULLIF(BTRIM(COALESCE(p_product->>'original_price', '')), '') IS NOT NULL THEN
    v_orig_price := (p_product->>'original_price')::BIGINT;
    IF v_orig_price < v_price THEN
      RAISE EXCEPTION 'Harga coret (original_price) harus lebih besar atau sama dengan harga jual.';
    END IF;
  ELSE
    v_orig_price := NULL;
  END IF;

  v_has_variants := jsonb_typeof(COALESCE(p_variants, '[]'::jsonb)) = 'array'
                    AND jsonb_array_length(COALESCE(p_variants, '[]'::jsonb)) > 0;

  -- Update produk TANPA menyentuh colors, rating, reviews_count, sold_count.
  -- Jika produk punya varian, JANGAN timpa kolom stock (diurus trigger sync_product_stock).
  IF v_has_variants THEN
    UPDATE public.products
    SET
      name           = v_name,
      slug           = v_slug,
      category       = NULLIF(BTRIM(COALESCE(p_product->>'category', '')), ''),
      description    = COALESCE(p_product->>'description', ''),
      note           = NULLIF(BTRIM(COALESCE(p_product->>'note', '')), ''),
      price          = v_price,
      original_price = v_orig_price,
      image_url      = NULLIF(BTRIM(COALESCE(p_product->>'image_url', '')), ''),
      images         = COALESCE(p_product->'images', '[]'::jsonb),
      tag            = NULLIF(BTRIM(COALESCE(p_product->>'tag', '')), ''),
      tag_type       = NULLIF(BTRIM(COALESCE(p_product->>'tag_type', '')), ''),
      sort_order     = COALESCE((p_product->>'sort_order')::INT, 0),
      specs          = COALESCE(p_product->'specs', '{}'::jsonb),
      is_active      = COALESCE((p_product->>'is_active')::BOOLEAN, TRUE)
    WHERE id = p_product_id;
  ELSE
    v_manual_stock := GREATEST(0, COALESCE((p_product->>'stock')::INT, 0));
    UPDATE public.products
    SET
      name           = v_name,
      slug           = v_slug,
      category       = NULLIF(BTRIM(COALESCE(p_product->>'category', '')), ''),
      description    = COALESCE(p_product->>'description', ''),
      note           = NULLIF(BTRIM(COALESCE(p_product->>'note', '')), ''),
      price          = v_price,
      original_price = v_orig_price,
      stock          = v_manual_stock,
      image_url      = NULLIF(BTRIM(COALESCE(p_product->>'image_url', '')), ''),
      images         = COALESCE(p_product->'images', '[]'::jsonb),
      tag            = NULLIF(BTRIM(COALESCE(p_product->>'tag', '')), ''),
      tag_type       = NULLIF(BTRIM(COALESCE(p_product->>'tag_type', '')), ''),
      sort_order     = COALESCE((p_product->>'sort_order')::INT, 0),
      specs          = COALESCE(p_product->'specs', '{}'::jsonb),
      is_active      = COALESCE((p_product->>'is_active')::BOOLEAN, TRUE)
    WHERE id = p_product_id;
  END IF;

  -- Proses upsert varian (UPDATE yang lama, INSERT yang baru)
  IF v_has_variants THEN
    FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
    LOOP
      v_v_name := NULLIF(BTRIM(COALESCE(v_variant->>'name', '')), '');
      IF v_v_name IS NULL THEN
        RAISE EXCEPTION 'Nama varian tidak boleh kosong.';
      END IF;

      IF LOWER(v_v_name) = ANY(v_seen_names) THEN
        RAISE EXCEPTION 'Nama varian "%" duplikat dalam satu produk.', v_v_name;
      END IF;
      v_seen_names := array_append(v_seen_names, LOWER(v_v_name));

      v_v_hex := NULLIF(BTRIM(COALESCE(v_variant->>'color_hex', '')), '');
      v_v_stock := COALESCE((v_variant->>'stock')::INT, 0);
      IF v_v_stock < 0 THEN
        RAISE EXCEPTION 'Stok varian "%" tidak boleh negatif.', v_v_name;
      END IF;
      v_v_active := COALESCE((v_variant->>'is_active')::BOOLEAN, TRUE);

      v_v_id := NULL;
      IF NULLIF(BTRIM(COALESCE(v_variant->>'id', '')), '') IS NOT NULL THEN
        BEGIN
          v_v_id := (v_variant->>'id')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
          v_v_id := NULL;
        END;
      END IF;

      IF v_v_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE id = v_v_id AND product_id = p_product_id
      ) THEN
        UPDATE public.product_variants
        SET
          name      = v_v_name,
          color_hex = v_v_hex,
          stock     = v_v_stock,
          is_active = v_v_active
        WHERE id = v_v_id AND product_id = p_product_id;

        v_kept_ids := array_append(v_kept_ids, v_v_id);
      ELSE
        INSERT INTO public.product_variants (
          product_id,
          name,
          color_hex,
          stock,
          is_active
        ) VALUES (
          p_product_id,
          v_v_name,
          v_v_hex,
          v_v_stock,
          v_v_active
        )
        RETURNING id INTO v_v_id;

        v_kept_ids := array_append(v_kept_ids, v_v_id);
      END IF;
    END LOOP;
  END IF;

  -- Cek apakah order_items punya kolom variant_id
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'variant_id'
  ) INTO v_has_variant_id_col;

  -- Proses varian lama yang dihapus admin:
  -- Jika pernah dipesan -> is_active = false; jika belum -> DELETE permanen
  FOR v_removed IN
    SELECT id, name
    FROM public.product_variants
    WHERE product_id = p_product_id
      AND NOT (id = ANY(v_kept_ids))
  LOOP
    v_was_ordered := FALSE;

    IF v_has_variant_id_col THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.order_items WHERE variant_id = $1)'
        INTO v_was_ordered
        USING v_removed.id;
    END IF;

    IF NOT v_was_ordered THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.product_id = p_product_id
          AND LOWER(COALESCE(oi.product_name, '')) LIKE '%' || LOWER(v_removed.name) || '%'
      ) INTO v_was_ordered;
    END IF;

    IF v_was_ordered THEN
      UPDATE public.product_variants
      SET is_active = FALSE
      WHERE id = v_removed.id;
    ELSE
      DELETE FROM public.product_variants
      WHERE id = v_removed.id;
    END IF;
  END LOOP;

  RETURN p_product_id;
END;
$$;


-- 3. DELETE PRODUCT SAFELY:
--    Jika pernah dirujuk order_items -> soft delete (is_active = false)
--    Jika belum pernah dipesan -> hapus permanen beserta variannya
CREATE OR REPLACE FUNCTION public.delete_product_safely(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin    BOOLEAN;
  v_has_orders  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Akses ditolak: hanya admin yang dapat menghapus produk.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Produk tidak ditemukan.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.order_items WHERE product_id = p_product_id
  ) INTO v_has_orders;

  IF v_has_orders THEN
    UPDATE public.product_variants
    SET is_active = FALSE
    WHERE product_id = p_product_id;

    UPDATE public.products
    SET is_active = FALSE
    WHERE id = p_product_id;

    RETURN jsonb_build_object(
      'mode', 'soft_deleted',
      'product_id', p_product_id,
      'message', 'Produk pernah dipesan sehingga dinonaktifkan (is_active = false).'
    );
  ELSE
    DELETE FROM public.product_variants
    WHERE product_id = p_product_id;

    DELETE FROM public.products
    WHERE id = p_product_id;

    RETURN jsonb_build_object(
      'mode', 'hard_deleted',
      'product_id', p_product_id,
      'message', 'Produk berhasil dihapus permanen beserta variannya.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_product_with_variants(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_product_with_variants(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_safely(UUID) TO authenticated;
