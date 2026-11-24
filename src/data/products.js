export const CATEGORIES = [
  { id: 'all', name: 'Semua Produk', icon: 'Sparkles', color: '#FF86C1' },
  { id: 'aksesoris', name: 'Aksesoris', icon: 'Heart', color: '#5DE5AB' },
  { id: 'tas-rajut', name: 'Tas Rajut', icon: 'ShoppingBag', color: '#A7D8FF' },
  { id: 'amigurumi', name: 'Amigurumi', icon: 'Smile', color: '#FEDEA4' },
  { id: 'diy-kit', name: 'DIY Kit', icon: 'Package', color: '#EEDBFF' },
  { id: 'alat-benang', name: 'Alat & Benang', icon: 'Scissors', color: '#FEDEA4' }
];

export const PRODUCTS = [
  {
    id: '8c5127a2-e11e-4040-a9f0-9d29a5625537',
    slug: 'keychain-bintang',
    name: 'Keychain Bintang',
    category: 'aksesoris',
    price: 15000,
    originalPrice: 15000,
    stock: 2,
    rating: 5.0,
    reviewsCount: 0,
    soldCount: 0,
    tag: 'Best Seller',
    tagType: 'bestseller',
    image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png',
    images: [
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairdband%20pink.png'
    ],
    colors: [
      {
        name: 'Kuning',
        hex: '#FCD34D',
        image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png'
      },
      {
        name: 'Pink',
        hex: '#F472B6',
        image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairdband%20pink.png'
      }
    ],
    variants: [
      { id: '728e63f1-4d73-45a8-a27d-a91ebb3b5bf6', name: 'Kuning', color_hex: '#FCD34D', stock: 1, is_active: true, image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20bintang.png' },
      { id: 'aa9a539c-573f-47a5-9a55-63a0b4cb31f0', name: 'Pink', color_hex: '#F472B6', stock: 1, is_active: true, image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/hairdband%20pink.png' }
    ],
    description: 'Gantungan kunci rajut handmade berbentuk bintang yang imut dan manis. Cocok untuk gantungan tas, kunci motor/mobil, atau kado spesial untuk orang tersayang.',
    specs: {
      ukuran: '± 7-8 cm',
      bahan: 'Milk Cotton Yarn Premium',
      tipe: 'Handmade Crochet',
      cocokUntuk: 'Gantungan tas, gantungan kunci, kado spesial'
    },
    note: 'Setiap produk dibuat manual dengan tangan (handmade), sehingga setiap jahitan rapi dan memiliki keunikan tersendiri.'
  },
  {
    id: '0d5e7ae0-5eec-4fbd-b4e6-5a89e7952b52',
    slug: 'keychain-pita',
    name: 'Keychain Pita',
    category: 'aksesoris',
    price: 15000,
    originalPrice: 15000,
    stock: 3,
    rating: 5.0,
    reviewsCount: 0,
    soldCount: 0,
    tag: 'New Arrival',
    tagType: 'new',
    image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png',
    images: [
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png',
      'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png'
    ],
    colors: [
      {
        name: 'Kuning',
        hex: '#FCD34D',
        image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png'
      },
      {
        name: 'Biru',
        hex: '#60A5FA',
        image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png'
      },
      {
        name: 'Putih',
        hex: '#FFFFFF',
        image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png'
      }
    ],
    variants: [
      { id: '39cfebc7-d05f-471c-8779-52c3dda71295', name: 'Kuning', color_hex: '#FCD34D', stock: 1, is_active: true, image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20kuning.png' },
      { id: '433dda25-0751-4aa5-85ab-57462fa397d0', name: 'Biru', color_hex: '#60A5FA', stock: 1, is_active: true, image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20biru.png' },
      { id: '1773d13d-f78f-4721-ad74-65cbfff14e4e', name: 'Putih', color_hex: '#FFFFFF', stock: 1, is_active: true, image: 'https://izukypsdyhxvixeynjzb.supabase.co/storage/v1/object/public/product-images/keychain%20pita%20putih.png' }
    ],
    description: 'Gantungan kunci rajut motif pita yang cantik, feminin, dan elegan. Menggunakan benang berkualitas tinggi dengan rajutan kokoh dan rapi.',
    specs: {
      ukuran: '± 8 x 6 cm',
      bahan: 'Milk Cotton Yarn Premium',
      tipe: 'Handmade Crochet',
      cocokUntuk: 'Gantungan tas, pouch, aksesoris kunci'
    },
    note: 'Warna pastel lembut dan tahan lama, tidak mudah pudar.'
  },
  {
    id: '72e6cd63-2a03-41b4-9a37-494a1a8b6a57',
    slug: 'pouch-mini',
    name: 'Pouch Mini',
    category: 'tas-rajut',
    price: 15000,
    originalPrice: 15000,
    stock: 1,
    rating: 5.0,
    reviewsCount: 0,
    soldCount: 0,
    tag: 'Limited Stock',
    tagType: 'hot',
    image: '/images/strawberry-pouch.jpg',
    images: [
      '/images/strawberry-pouch.jpg',
      '/images/mini-crochet-bag.jpg'
    ],
    colors: [
      { name: 'Pink', hex: '#F472B6' }
    ],
    variants: [
      { id: 'e9e8489f-387e-4278-bcb1-8b0fd08aaea9', name: 'Pink', color_hex: '#F472B6', stock: 1, is_active: true }
    ],
    description: 'Pouch mini rajut aesthetic warna pink manis. Pas untuk menyimpan koin, earphone, perhiasan, lip balm, atau pernak-pernik kecil Anda.',
    specs: {
      ukuran: '± 10 x 9 cm',
      bahan: 'Milk Cotton Yarn 5 ply & penutup serut',
      tipe: 'Handmade Crochet Pouch',
      cocokUntuk: 'Tempat koin, earphone, lipstick/lip balm, perhiasan'
    },
    note: 'Desain serut praktis dan fleksibel dibawa ke mana-mana.'
  },
  {
    id: '7a5a9b5c-2627-4752-bd1e-46db0ba87029',
    slug: 'hairband',
    name: 'Hairband',
    category: 'aksesoris',
    price: 15000,
    originalPrice: 15000,
    stock: 1,
    rating: 5.0,
    reviewsCount: 0,
    soldCount: 0,
    tag: 'Favorite',
    tagType: 'bestseller',
    image: '/images/mini-crochet-bag.jpg',
    images: [
      '/images/mini-crochet-bag.jpg',
      '/images/hero-bunny.jpg'
    ],
    colors: [
      { name: 'Pink', hex: '#F472B6' }
    ],
    variants: [
      { id: '12bbe85b-c8a8-4c71-b07c-19f7b246da94', name: 'Pink', color_hex: '#F472B6', stock: 1, is_active: true }
    ],
    description: 'Bando rambut rajut warna pink yang lembut, nyaman di kepala, dan tidak menyebabkan sakit. Memberikan sentuhan vintage dan manis pada penampilan Anda.',
    specs: {
      ukuran: 'All Size Remaja/Dewasa',
      bahan: 'Milk Cotton Yarn lembut melapisi bando fleksibel',
      tipe: 'Handmade Hair Accessory',
      cocokUntuk: 'Aksesoris harian, hangout, pelengkap hijab/rambut'
    },
    note: 'Bahan sangat empuk sehingga nyaman digunakan seharian.'
  }
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Aisyah',
    location: 'Jakarta',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    comment: 'Barangnya lucu banget, kualitasnya bagus, pengemasannya juga rapi! Gantungan pita dan bintangnya kencang dan detailnya halus. Bakal order lagi pasti!',
    product: 'Keychain Bintang',
    date: '15 Okt 2026'
  },
  {
    id: 2,
    name: 'Nadia Putri',
    location: 'Palembang',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    comment: 'Bangga banget sama produk rintisan anak Unsri! Pouch mini dan Hairband-nya cantik banget dipake jalan, muat lipstik & koin. Jahitan rajutannya rapi banget!',
    product: 'Pouch Mini',
    date: '20 Okt 2026'
  },
  {
    id: 3,
    name: 'Clara Michelle',
    location: 'Bandung',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    comment: 'Suka banget sama bando rajutnya, lembut nggak bikin pusing di kepala seharian. Warnanya pink pastel manis banget. Recommended!',
    product: 'Hairband',
    date: '24 Okt 2026'
  }
];

export const BLOG_POSTS = [
  {
    id: 1,
    title: '5 Tips Merajut untuk Pemula: Dari Cara Pegang Hakpen Sampai Pola Pertama',
    date: '22 Okt 2026',
    readTime: '4 min baca',
    image: '/images/diy-crochet-kit.jpg',
    excerpt: 'Baru mau mulai belajar merajut? Simak trik mengatur tegangan benang agar hasil jahitan rajutmu rapi dan tidak terlalu ketat.'
  },
  {
    id: 2,
    title: 'Cara Merawat Aksesoris Rajut Handmade Agar Tetap Cantik & Tahan Lama',
    date: '18 Okt 2026',
    readTime: '3 min baca',
    image: '/images/tulip-keychain.jpg',
    excerpt: 'Hindari mencuci dengan mesin cuci! Ini cara mencuci produk rajut dengan air dingin dan sabun bayi agar bentuknya tetap sempurna.'
  },
  {
    id: 3,
    title: 'Ide Kado Wisuda dan Ulang Tahun Unik: Gantungan Kunci & Pouch Rajut Handmade',
    date: '12 Okt 2026',
    readTime: '5 min baca',
    image: '/images/strawberry-pouch.jpg',
    excerpt: 'Koleksi rajut handmade Knot & Bloom cocok disimpan selamanya sebagai kenangan manis bagi sahabat dan keluarga.'
  }
];
