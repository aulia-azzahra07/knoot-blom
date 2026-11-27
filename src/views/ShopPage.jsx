import React, { useState, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function ShopPage({
  products,
  onSelectProduct,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  initialCategory = 'all',
  searchQuery,
  setSearchQuery
}) {
  const PRICE_MIN_LIMIT = 10000;
  const PRICE_MAX_LIMIT = 50000;
  const PRICE_STEP = 5000;

  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory && initialCategory !== 'diy-kit' && initialCategory !== 'alat-benang'
      ? initialCategory
      : 'all'
  );
  const [minPrice, setMinPrice] = useState(PRICE_MIN_LIMIT);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX_LIMIT);
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Filter categories list
  const categoryFilters = [
    { id: 'all', label: 'Semua Kategori' },
    { id: 'amigurumi', label: 'Amigurumi' },
    { id: 'tas-rajut', label: 'Tas Rajut' },
    { id: 'aksesoris', label: 'Aksesoris' },
  ];

  const isPriceFiltered = minPrice > PRICE_MIN_LIMIT || maxPrice < PRICE_MAX_LIMIT;
  const formatRupiah = (val) => 'Rp ' + Number(val || 0).toLocaleString('id-ID');

  const tagFilters = [
    { id: 'all', label: 'Semua Tanda' },
    { id: 'bestseller', label: 'Best Seller' },
    { id: 'new', label: 'New Arrival' },
    { id: 'madetoorder', label: 'Made to Order' }
  ];

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (prod.name || '').toLowerCase().includes(q);
        const matchDesc = (prod.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
        return false;
      }

      // 3. Price (selalu gunakan harga real dari database Supabase)
      const dbPrice = Number(prod.price) || 0;
      if (dbPrice < minPrice || dbPrice > maxPrice) return false;

      // 4. Tag
      if (selectedTag !== 'all' && prod.tagType !== selectedTag) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === 'price-high') return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortBy === 'sold') return (b.soldCount || 0) - (a.soldCount || 0);
      return (b.soldCount || 0) - (a.soldCount || 0); // default popular
    });
  }, [products, searchQuery, selectedCategory, minPrice, maxPrice, selectedTag, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSelectedCategory('all');
    setMinPrice(PRICE_MIN_LIMIT);
    setMaxPrice(PRICE_MAX_LIMIT);
    setSelectedTag('all');
    setSearchQuery('');
    setSortBy('popular');
    setCurrentPage(1);
  };

  return (
    <div className="shop-page-view container fade-in">
      {/* Header */}
      <div className="shop-header">
        <div>
          <h1 className="shop-title">Semua Produk</h1>
          <p className="shop-subtitle">Temukan produk rajut handmade favoritmu di sini!</p>
        </div>

        {/* Top Quick Filter & Search Bar */}
        <div className="shop-top-controls">
          <div className="shop-search-input-wrap">
            <Search size={18} className="search-icon-inside" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="shop-select-wrap">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="shop-sort-select"
            >
              <option value="popular">Urutkan: Terpopuler</option>
              <option value="rating">Rating Tertinggi</option>
              <option value="price-low">Harga: Terendah ke Tertinggi</option>
              <option value="price-high">Harga: Tertinggi ke Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="shop-layout-grid">
        {/* Left Filter Sidebar */}
        <aside className="shop-sidebar">
          <div className="sidebar-box">
            <div className="sidebar-head">
              <h3>Filter Produk</h3>
              {(selectedCategory !== 'all' || isPriceFiltered || selectedTag !== 'all' || searchQuery) && (
                <button className="reset-filter-btn" onClick={resetFilters}>
                  Reset
                </button>
              )}
            </div>

            {/* Filter: Kategori */}
            <div className="filter-group">
              <h4 className="filter-title">Kategori</h4>
              <ul className="filter-list">
                {categoryFilters.map((cat) => (
                  <li key={cat.id}>
                    <label className="filter-label">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === cat.id}
                        onChange={() => {
                          setSelectedCategory(cat.id);
                          setCurrentPage(1);
                        }}
                      />
                      <span>{cat.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filter: Harga (Rp 10.000 - Rp 50.000, step Rp 5.000) */}
            <div className="filter-group">
              <h4 className="filter-title">Rentang Harga</h4>
              <div className="price-range-filter-box">
                <div className="price-range-values">
                  <span>{formatRupiah(minPrice)}</span>
                  <span>–</span>
                  <span>{formatRupiah(maxPrice)}</span>
                </div>

                <label className="price-slider-label">
                  <span>Minimum: <strong>{formatRupiah(minPrice)}</strong></span>
                  <input
                    type="range"
                    className="price-range-slider"
                    min={PRICE_MIN_LIMIT}
                    max={PRICE_MAX_LIMIT}
                    step={PRICE_STEP}
                    value={minPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinPrice(Math.min(val, maxPrice));
                      setCurrentPage(1);
                    }}
                  />
                </label>

                <label className="price-slider-label">
                  <span>Maksimum: <strong>{formatRupiah(maxPrice)}</strong></span>
                  <input
                    type="range"
                    className="price-range-slider"
                    min={PRICE_MIN_LIMIT}
                    max={PRICE_MAX_LIMIT}
                    step={PRICE_STEP}
                    value={maxPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxPrice(Math.max(val, minPrice));
                      setCurrentPage(1);
                    }}
                  />
                </label>

                <div className="price-range-scale">
                  <span>Rp 10rb</span>
                  <span>Rp 30rb</span>
                  <span>Rp 50rb</span>
                </div>
              </div>
            </div>

            {/* Filter: Tanda */}
            <div className="filter-group">
              <h4 className="filter-title">Tanda</h4>
              <ul className="filter-list">
                {tagFilters.map((tag) => (
                  <li key={tag.id}>
                    <label className="filter-label">
                      <input
                        type="radio"
                        name="tagFilter"
                        checked={selectedTag === tag.id}
                        onChange={() => {
                          setSelectedTag(tag.id);
                          setCurrentPage(1);
                        }}
                      />
                      <span>{tag.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Promo Sidebar Callout */}
            <div className="sidebar-promo-card">
              <Sparkles size={20} color="#FF86C1" />
              <h5>Butuh Custom Ukuran?</h5>
              <p>Kamu bisa minta ukuran khusus, inisial nama, atau warna favoritmu!</p>
            </div>
          </div>
        </aside>

        {/* Right Product Grid */}
        <main className="shop-main-content">
          <div className="results-count-bar">
            <span>
              Menampilkan <strong>{filteredProducts.length}</strong> produk
              {selectedCategory !== 'all' && ` dalam kategori "${categoryFilters.find(c => c.id === selectedCategory)?.label}"`}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="no-products-state">
              <div className="no-prod-circle">
                <Search size={36} color="#A7D8FF" />
              </div>
              <h3>Tidak ada produk yang cocok</h3>
              <p>Coba gunakan kata kunci lain atau bersihkan filter pencarianmu.</p>
              <button className="btn-primary" onClick={resetFilters} style={{ marginTop: '14px' }}>
                Bersihkan Filter
              </button>
            </div>
          ) : (
            <>
              <div className="products-grid-3">
                {paginatedProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelectProduct={onSelectProduct}
                    onAddToCart={onAddToCart}
                    isWishlisted={wishlist.includes(prod.id)}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    className="pagination-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    className="pagination-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
