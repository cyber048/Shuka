import React, { useEffect, useState } from 'react';
import { apiGetProducts } from '../api';

export default function HomeView({ categories, onNavigate, onSelectProduct }) {
  const [newestProducts, setNewestProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGetProducts({ limit: 8, sort: 'newest' });
        setNewestProducts(data.products || []);
      } catch (err) {
        console.error('Failed to load newest products:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}
      >
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Բարի գալուստ <span style={{ color: '#f59e0b' }}>Shuka</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#cbd5e1', maxWidth: '650px', marginBottom: '1.5rem' }}>
          Հայաստանի առաջատար առցանց շուկան։ Գնեք անմիջապես տեղական վաճառողներից մեկ ընդհանուր զամբյուղով, վճարեք կանխիկ առաքման պահին։
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('catalog')}
          >
            Դիտել բոլոր ապրանքները →
          </button>
        </div>
      </div>

      {/* Category Pills/Cards */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>
          Հանրաճանաչ Բաժիններ
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}
        >
          {categories.map((c) => (
            <div
              key={c.id}
              onClick={() => onNavigate('catalog', { category: c.slug })}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                fontWeight: 600
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                {c.slug === 'electronics' ? '⚡' :
                 c.slug === 'home-kitchen' ? '🍳' :
                 c.slug === 'food-delicacies' ? '🍇' :
                 c.slug === 'handmade-crafts' ? '🏺' :
                 c.slug === 'books' ? '📚' : '🏔️'}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#1e293b' }}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Newest Products Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            ✨ Ամենանոր ապրանքները
          </h2>
          <button
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => onNavigate('catalog')}
          >
            Տեսնել բոլորը →
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Բեռնվում է...</div>
        ) : (
          <div className="product-grid">
            {newestProducts.map((p) => (
              <div
                key={p.id}
                className="product-card"
                onClick={() => onSelectProduct(p.id)}
              >
                <img
                  src={p.main_image || '/placeholder.png'}
                  alt={p.title}
                  className="product-card-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%23f1f5f9"><rect width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="20">Shuka Product</text></svg>';
                  }}
                />
                <div className="product-card-body">
                  <div className="product-card-title">{p.title}</div>
                  <div className="product-card-store">Խանութ՝ {p.store_name}</div>

                  <div className="rating-row">
                    <span>{'★'.repeat(Math.round(p.rating_avg || 0))}</span>
                    <span>{'☆'.repeat(5 - Math.round(p.rating_avg || 0))}</span>
                    <span className="rating-count">({p.rating_count || 0})</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="product-card-price">
                      {p.price_amd.toLocaleString()} ֏
                    </div>
                    {p.stock <= 2 && p.stock > 0 && (
                      <span className="badge badge-low-stock">Մնաց {p.stock} հատ</span>
                    )}
                    {p.stock === 0 && (
                      <span className="badge badge-out-of-stock">Սպառված է</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
