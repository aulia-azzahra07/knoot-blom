import React from 'react';
import { BookOpen, Calendar, Clock, ArrowRight } from 'lucide-react';
import { BLOG_POSTS } from '../data/products';

export default function BlogPage({ onNavigate, onOpenCustomKit }) {
  return (
    <div className="blog-page-view container fade-in">
      <div className="section-title-wrap">
        <div className="hero-badge-pill" style={{ margin: '0 auto 12px' }}>
          <BookOpen size={16} color="#FF86C1" />
          <span>Tips & Inspirasi Merajut</span>
        </div>
        <h1 className="section-title">Blog & Panduan Rajut</h1>
        <p className="section-subtitle">
          Kumpulan artikel bermanfaat seputar cara merajut untuk pemula, perawatan aksesoris handmade, dan ide kado spesial.
        </p>
      </div>

      <div className="blog-posts-grid">
        {BLOG_POSTS.map((post) => (
          <article key={post.id} className="blog-card">
            <div className="blog-img-wrap">
              <img src={post.image} alt={post.title} />
            </div>
            <div className="blog-content">
              <div className="blog-meta-row">
                <span className="blog-meta-item">
                  <Calendar size={14} />
                  {post.date}
                </span>
                <span>•</span>
                <span className="blog-meta-item">
                  <Clock size={14} />
                  {post.readTime}
                </span>
              </div>
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <button
                className="blog-read-btn"
                onClick={() => onOpenCustomKit()}
              >
                <span>Baca Selengkapnya</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="blog-newsletter-banner">
        <h3>Ingin Dapatkan Pola Rajut Gratis Setiap Minggu?</h3>
        <p>Daftarkan emailmu untuk menerima pola amigurumi baru dan diskon khusus anggota komunitas!</p>
        <div className="newsletter-form-row">
          <input type="email" placeholder="Masukkan alamat email kamu..." />
          <button className="btn-primary">Langganan</button>
        </div>
      </div>
    </div>
  );
}
