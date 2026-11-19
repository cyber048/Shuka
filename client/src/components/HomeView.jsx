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

  const getCategoryMeta = (slug) => {
    switch (slug) {
      case 'electronics':
        return { icon: '⚡', color: 'from-blue-600 to-indigo-700', bg: 'bg-blue-50 text-blue-700' };
      case 'home-kitchen':
        return { icon: '🍳', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 text-amber-700' };
      case 'food-delicacies':
        return { icon: '🍇', color: 'from-emerald-500 to-teal-700', bg: 'bg-emerald-50 text-emerald-700' };
      case 'handmade-crafts':
        return { icon: '🏺', color: 'from-rose-500 to-pink-700', bg: 'bg-rose-50 text-rose-700' };
      case 'books':
        return { icon: '📚', color: 'from-violet-500 to-purple-700', bg: 'bg-violet-50 text-violet-700' };
      case 'sports':
        return { icon: '🏔️', color: 'from-cyan-500 to-blue-700', bg: 'bg-cyan-50 text-cyan-700' };
      default:
        return { icon: '🛍️', color: 'from-slate-600 to-slate-800', bg: 'bg-slate-50 text-slate-700' };
    }
  };

  return (
    <div>
      {/* Hero Banner */}
      <div
        style={{
          background: 'radial-gradient(ellipse at top left, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ maxWidth: '750px', position: 'relative', zIndex: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '1.25rem'
            }}
          >
            🇦🇲 Հայաստանի №1 Տեղական Մարկետփլեյսը
          </div>

          <h1 style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '1rem', letterSpacing: '-0.5px' }}>
            Գնեք տեղականից՝ <span style={{ color: '#f59e0b' }}>մեկ զամբյուղով</span>, վճարեք կանխիկ
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', marginBottom: '2rem', lineHeight: '1.6' }}>
            Բացահայտեք 40+ հայկական արտադրանքներ, էլեկտրոնիկա, ձեռագործ աշխատանքներ և բարիքներ։ Պատվիրեք անմիջապես վաճառողներից առանց բանկային քարտերի։
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.8rem', fontSize: '1rem', borderRadius: '12px' }}
              onClick={() => onNavigate('catalog')}
            >
              Դիտել բոլոր ապրանքները →
            </button>

            {/* Quick search tags */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Հանրաճանաչ՝</span>
              {['Մեղր', 'Կերամիկա', 'Earbuds', 'Սրճեփ', 'Չիր'].map((tag) => (
                <span
                  key={tag}
                  onClick={() => onNavigate('catalog', { q: tag })}
                  style={{
                    fontSize: '0.78rem',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#e2e8f0',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f59e0b';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Features Bar */}
      <div className="trust-bar">
        <div className="trust-item">
          <div className="trust-icon">🚚</div>
          <div>
            <div className="trust-title">Առաքում ողջ ՀՀ-ում</div>
            <div className="trust-desc">Երևան և բոլոր 10 մարզեր</div>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon">💵</div>
          <div>
            <div className="trust-title">Կանխիկ առաքման պահին</div>
            <div className="trust-desc">100% ապահով առանց քարտի</div>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon">🛒</div>
          <div>
            <div className="trust-title">Multi-Seller Զամբյուղ</div>
            <div className="trust-desc">Մեկ պատվեր տարբեր խանութներից</div>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon">🛡️</div>
          <div>
            <div className="trust-title">Ստուգված Վաճառողներ</div>
            <div className="trust-desc">Որակի վերահսկողություն</div>
          </div>
        </div>
      </div>

      {/* Popular Categories */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Բաժիններ ըստ հետաքրքրության
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Ընտրեք Ձեզ անհրաժեշտ կատեգորիան
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}
        >
          {categories.map((c) => {
            const meta = getCategoryMeta(c.slug);
            return (
              <div
                key={c.id}
                onClick={() => onNavigate('catalog', { category: c.slug })}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.4rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: '0.6rem' }}>
                  {meta.icon}
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                  {c.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Newest Products Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
              ✨ Ամենանոր ապրանքները
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Թարմ ավելացված տեսականի
            </div>
          </div>

          <button
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#0f172a',
              fontWeight: 700,
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            onClick={() => onNavigate('catalog')}
          >
            <span>Տեսնել բոլորը</span>
            <span>→</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            Բեռնվում են ապրանքները...
          </div>
        ) : (
          <div className="product-grid">
            {newestProducts.map((p, idx) => (
              <div
                key={p.id}
                className="product-card"
                onClick={() => onSelectProduct(p.id)}
              >
                <div className="product-card-img-wrap">
                  <img
                    src={p.main_image || '/placeholder.png'}
                    alt={p.title}
                    className="product-card-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" fill="%23f1f5f9"><rect width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="20">Shuka Product</text></svg>';
                    }}
                  />
                  {idx % 3 === 0 && <span className="product-card-badge">ՀԱՆՐԱՃԱՆԱՉ</span>}
                  {idx % 3 === 1 && <span className="product-card-badge">ՏԵՂԱԿԱՆ</span>}
                </div>

                <div className="product-card-body">
                  <div className="product-card-store">
                    <span>🏪</span>
                    <span>{p.store_name}</span>
                  </div>

                  <div className="product-card-title">{p.title}</div>

                  <div className="rating-row">
                    <span>{'★'.repeat(Math.round(p.rating_avg || 0))}</span>
                    <span>{'☆'.repeat(5 - Math.round(p.rating_avg || 0))}</span>
                    <span className="rating-count">({p.rating_count || 0})</span>
                  </div>

                  <div className="product-card-bottom">
                    <div className="product-card-price">
                      {p.price_amd.toLocaleString()} ֏
                    </div>

                    {p.stock <= 2 && p.stock > 0 ? (
                      <span className="badge badge-low-stock">
                        Մնաց {p.stock}
                      </span>
                    ) : p.stock === 0 ? (
                      <span className="badge badge-out-of-stock">
                        Սպառված
                      </span>
                    ) : (
                      <span className="badge badge-in-stock">
                        Առկա է
                      </span>
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
