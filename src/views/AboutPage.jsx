import React from 'react';
import { Heart, Sparkles, ShieldCheck, Users, CheckCircle, Leaf, Award, MapPin } from 'lucide-react';
import { PROPOSAL_DATA } from '../data/proposalData';

export default function AboutPage({ onNavigate }) {
  return (
    <div className="about-page-view container fade-in">
      {/* Hero Header */}
      <div className="about-hero-box">
        <div className="about-badge-pill">
          <Sparkles size={16} color="#FF86C1" />
          <span>Mini Marketing Plan & Proposal UMKM Aksesori Rajut Handmade</span>
        </div>
        <h1 className="about-title">
          Dirajut dengan Hati, Dibawa Setiap Hari ♡
        </h1>
        <p className="about-subtitle">
          Knot & Bloom (Knitty Craft) adalah rintisan wirausaha kreatif karya 5 mahasiswi Manajemen Informatika Universitas Sriwijaya, Palembang. Mengisi celah antara produk massal yang seragam dan kriya premium yang mahal.
        </p>
      </div>

      {/* Visi & Misi */}
      <section className="about-visi-misi-section">
        <div className="visi-misi-grid">
          <div className="visi-card">
            <div className="card-badge-header">VISI KAMI</div>
            <h3>Pilihan Aksesori Rajut No. 1</h3>
            <p className="visi-text">
              "{PROPOSAL_DATA.visi}"
            </p>
          </div>

          <div className="misi-card">
            <div className="card-badge-header">MISI UTAMA</div>
            <ul className="misi-list">
              {PROPOSAL_DATA.misi.map((m, idx) => (
                <li key={idx}>
                  <CheckCircle size={18} color="#059669" className="misi-check-icon" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Nilai Utama & Keamanan Produk */}
      <section className="about-values-section">
        <h2 className="section-title text-center">Komitmen & Keunggulan Produk</h2>
        <p className="section-subtitle text-center">
          Standar tinggi yang kami terapkan untuk setiap karya rajutan yang sampai ke tanganmu
        </p>

        <div className="values-grid">
          {PROPOSAL_DATA.values.map((val, idx) => (
            <div key={idx} className="value-box-card">
              <div className="value-icon-circle">
                <Sparkles size={24} color="#E63985" />
              </div>
              <h4>{val.title}</h4>
              <p>{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Profil Tim (Kelompok 3 Unsri) */}
      <section className="about-team-section">
        <div className="section-title-wrap">
          <h2 className="section-title">Struktur Tim & Pembagian Peran</h2>
          <p className="section-subtitle">
            Kelompok 3 — Program Studi Manajemen Informatika, Fakultas Ilmu Komputer, Universitas Sriwijaya (Dosen Pengampu: Iin Seprina, M. Kom.)
          </p>
        </div>

        <div className="team-cards-grid">
          {PROPOSAL_DATA.team.map((member, idx) => (
            <div key={idx} className="team-member-card">
              <div className="member-avatar-badge">
                {member.code}
              </div>
              <h4 className="member-name">{member.name}</h4>
              <span className="member-role">{member.role}</span>
              <p className="member-desc">{member.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alur Kerja Pesanan (8 Langkah Berdasarkan Proposal) */}
      <section className="workflow-section">
        <div className="section-title-wrap">
          <h2 className="section-title">Alur Kerja Standar Operasional</h2>
          <p className="section-subtitle">
            Alur baku berbasis Pre-Order (PO) & Ready Stock mulai dari pemesanan hingga layanan purna jual
          </p>
        </div>

        <div className="workflow-timeline-grid">
          {PROPOSAL_DATA.orderWorkflow.map((step) => (
            <div key={step.step} className="workflow-step-card">
              <div className="step-number-bubble">{step.step}</div>
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Box */}
      <section className="about-cta-box">
        <Heart size={36} color="#FF86C1" />
        <h2>Dukung Produk Lokal & UMKM Mahasiswa</h2>
        <p>
          Beli karya orisinal anak bangsa atau mulai belajar merajut bersama paket DIY Kit Knot & Bloom sekarang juga!
        </p>
        <button className="btn-primary" onClick={() => onNavigate('shop')}>
          Jelajahi Katalog Produk Sekarang
        </button>
      </section>
    </div>
  );
}
