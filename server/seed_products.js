require("dotenv").config();
const https = require("https");

const url = new URL(process.env.SUPABASE_URL.trim());
const key = process.env.SUPABASE_SECRET_KEY.trim();

function supabaseRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey": key,
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };
    if (postData) {
      headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: `/rest/v1/${path}`,
      method,
      headers
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const productsToSeed = [
  {
    product: {
      name: "Keychain Bintang",
      slug: "keychain-bintang",
      description: "Gantungan kunci rajut handmade berbentuk bintang yang imut dan manis. Cocok untuk gantungan tas, kunci motor/mobil, atau kado spesial untuk orang tersayang.",
      category: "aksesoris",
      price: 15000,
      original_price: 15000,
      stock: 2,
      image_url: "/images/tulip-keychain.jpg",
      images: [
        "/images/tulip-keychain.jpg",
        "/images/hero-bunny.jpg"
      ],
      colors: [
        { name: "Kuning", hex: "#FCD34D" },
        { name: "Pink", hex: "#F472B6" }
      ],
      specs: {
        bahan: "Milk Cotton Yarn Premium",
        tipe: "Handmade Crochet",
        ukuran: "± 7-8 cm",
        cocokUntuk: "Gantungan tas, gantungan kunci, kado spesial"
      },
      tag: "Best Seller",
      tag_type: "bestseller",
      rating: 5.0,
      reviews_count: 0,
      sold_count: 0,
      note: "Setiap produk dibuat manual dengan tangan (handmade), sehingga setiap jahitan rapi dan memiliki keunikan tersendiri.",
      sort_order: 1,
      is_active: true
    },
    variants: [
      { name: "Kuning", color_hex: "#FCD34D", stock: 1, is_active: true },
      { name: "Pink", color_hex: "#F472B6", stock: 1, is_active: true }
    ]
  },
  {
    product: {
      name: "Keychain Pita",
      slug: "keychain-pita",
      description: "Gantungan kunci rajut motif pita yang cantik, feminin, dan elegan. Menggunakan benang berkualitas tinggi dengan rajutan kokoh dan rapi.",
      category: "aksesoris",
      price: 15000,
      original_price: 15000,
      stock: 3,
      image_url: "/images/tulip-keychain.jpg",
      images: [
        "/images/tulip-keychain.jpg",
        "/images/mini-crochet-bag.jpg"
      ],
      colors: [
        { name: "Kuning", hex: "#FCD34D" },
        { name: "Biru", hex: "#60A5FA" },
        { name: "Putih", hex: "#FFFFFF" }
      ],
      specs: {
        bahan: "Milk Cotton Yarn Premium",
        tipe: "Handmade Crochet",
        ukuran: "± 8 x 6 cm",
        cocokUntuk: "Gantungan tas, pouch, aksesoris kunci"
      },
      tag: "New Arrival",
      tag_type: "new",
      rating: 5.0,
      reviews_count: 0,
      sold_count: 0,
      note: "Warna pastel lembut dan tahan lama, tidak mudah pudar.",
      sort_order: 2,
      is_active: true
    },
    variants: [
      { name: "Kuning", color_hex: "#FCD34D", stock: 1, is_active: true },
      { name: "Biru", color_hex: "#60A5FA", stock: 1, is_active: true },
      { name: "Putih", color_hex: "#FFFFFF", stock: 1, is_active: true }
    ]
  },
  {
    product: {
      name: "Pouch Mini",
      slug: "pouch-mini",
      description: "Pouch mini rajut aesthetic warna pink manis. Pas untuk menyimpan koin, earphone, perhiasan, lip balm, atau pernak-pernik kecil Anda.",
      category: "tas-rajut",
      price: 15000,
      original_price: 15000,
      stock: 1,
      image_url: "/images/strawberry-pouch.jpg",
      images: [
        "/images/strawberry-pouch.jpg",
        "/images/mini-crochet-bag.jpg"
      ],
      colors: [
        { name: "Pink", hex: "#F472B6" }
      ],
      specs: {
        bahan: "Milk Cotton Yarn 5 ply & penutup serut",
        tipe: "Handmade Crochet Pouch",
        ukuran: "± 10 x 9 cm",
        cocokUntuk: "Tempat koin, earphone, lipstick/lip balm, perhiasan"
      },
      tag: "Limited Stock",
      tag_type: "hot",
      rating: 5.0,
      reviews_count: 0,
      sold_count: 0,
      note: "Desain serut praktis dan fleksibel dibawa ke mana-mana.",
      sort_order: 3,
      is_active: true
    },
    variants: [
      { name: "Pink", color_hex: "#F472B6", stock: 1, is_active: true }
    ]
  },
  {
    product: {
      name: "Hairband",
      slug: "hairband",
      description: "Bando rambut rajut warna pink yang lembut, nyaman di kepala, dan tidak menyebabkan sakit. Memberikan sentuhan vintage dan manis pada penampilan Anda.",
      category: "aksesoris",
      price: 15000,
      original_price: 15000,
      stock: 1,
      image_url: "/images/mini-crochet-bag.jpg",
      images: [
        "/images/mini-crochet-bag.jpg",
        "/images/hero-bunny.jpg"
      ],
      colors: [
        { name: "Pink", hex: "#F472B6" }
      ],
      specs: {
        bahan: "Milk Cotton Yarn lembut melapisi bando fleksibel",
        tipe: "Handmade Hair Accessory",
        ukuran: "All Size Remaja/Dewasa",
        cocokUntuk: "Aksesoris harian, hangout, pelengkap hijab/rambut"
      },
      tag: "Favorite",
      tag_type: "bestseller",
      rating: 5.0,
      reviews_count: 0,
      sold_count: 0,
      note: "Bahan sangat empuk sehingga nyaman digunakan seharian.",
      sort_order: 4,
      is_active: true
    },
    variants: [
      { name: "Pink", color_hex: "#F472B6", stock: 1, is_active: true }
    ]
  }
];

async function seed() {
  console.log("🌸 Memulai proses seeding data produk Knot & Bloom ke Supabase...");

  for (const item of productsToSeed) {
    console.log(`\nMenambahkan produk: ${item.product.name}...`);
    const insertedProducts = await supabaseRequest("products", "POST", item.product);
    const createdProduct = insertedProducts[0];
    console.log(`✅ Produk berhasil disimpan dengan ID: ${createdProduct.id}`);

    const variantsWithProductId = item.variants.map(v => ({
      ...v,
      product_id: createdProduct.id
    }));

    console.log(`Menambahkan ${variantsWithProductId.length} varian untuk ${item.product.name}...`);
    const insertedVariants = await supabaseRequest("product_variants", "POST", variantsWithProductId);
    console.log(`✅ Varian berhasil disimpan:`, insertedVariants.map(v => `${v.name} (stok: ${v.stock})`).join(", "));
  }

  console.log("\n🎉 SEEDING BERHASIL! Seluruh 4 produk dan 7 varian telah masuk ke Supabase.");
}

seed().catch(err => {
  console.error("❌ Gagal seeding data:", err);
  process.exit(1);
});

