export const CATEGORIES = [
  { id: 'all', name: 'Semua Produk', icon: 'Sparkles', color: '#FF86C1' },
  { id: 'aksesoris', name: 'Aksesoris', icon: 'Heart', color: '#5DE5AB' },
  { id: 'tas-rajut', name: 'Tas Rajut', icon: 'ShoppingBag', color: '#A7D8FF' },
  { id: 'amigurumi', name: 'Amigurumi', icon: 'Smile', color: '#FEDEA4' },
];

// Data produk tidak lagi disimpan lokal agar tidak bentrok dengan database.
// Semua halaman (Home, Shop, Detail Produk, Keranjang, Checkout) mengambil produk dari tabel `products` di Supabase.
export const PRODUCTS = [];

// Ulasan diambil langsung dari tabel `reviews` di Supabase.
export const TESTIMONIALS = [];

export const BLOG_POSTS = [
  {
    id: 1,
    title: '5 Tips Merajut untuk Pemula: Dari Cara Pegang Hakpen Sampai Pola Pertama',
    date: '22 Okt 2026',
    readTime: '4 min baca',
    image: '/images/hero-bunny.jpg',
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
