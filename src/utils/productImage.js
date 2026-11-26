/**
 * Helper gambar produk dengan placeholder netral (bukan gambar produk lain)
 * dan logging warning di console saat URL gagal dimuat.
 */

export const PRODUCT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
      <rect width="400" height="400" fill="#F8F4F6"/>
      <rect x="135" y="130" width="130" height="100" rx="14" stroke="#D1C4CB" stroke-width="6" fill="#FFFFFF"/>
      <circle cx="172" cy="164" r="11" fill="#E5D5DD"/>
      <path d="M148 216L182 184L206 204L228 186L252 216H148Z" fill="#E5D5DD"/>
      <text x="200" y="266" text-anchor="middle" fill="#9E8C95" font-family="sans-serif" font-size="16" font-weight="600">Gambar Tidak Tersedia</text>
    </svg>`
  );

/**
 * Mengembalikan URL gambar produk yang aman.
 * Jika URL kosong/tidak valid, mengembalikan placeholder netral.
 */
export const getSafeProductImage = (imageUrl, productName = "") => {
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    return imageUrl.trim();
  }
  if (productName) {
    console.warn(
      `[ProductImage] URL gambar kosong untuk produk "${productName}". Menampilkan placeholder netral.`
    );
  }
  return PRODUCT_IMAGE_PLACEHOLDER;
};

/**
 * Handler onError untuk elemen <img> produk.
 * Menampilkan placeholder netral (bukan gambar produk lain) dan menulis warning di console.
 */
export const handleProductImageError = (event, productName = "Produk", originalUrl = "") => {
  const img = event?.currentTarget;
  if (!img || img.dataset.fallbackApplied === "1") return;

  const failedUrl = originalUrl || img.getAttribute("src") || "(kosong)";
  console.warn(
    `[ProductImage] Gagal memuat gambar produk "${productName}". URL gagal: ${failedUrl}`
  );

  img.dataset.fallbackApplied = "1";
  img.src = PRODUCT_IMAGE_PLACEHOLDER;
};
