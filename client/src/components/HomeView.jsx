import React, { useEffect, useState } from 'react';
import { apiGetProducts } from '../api';

export default function HomeView({ categories, onNavigate, onSelectProduct, onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('newest'); // 'newest' | 'rating' | 'popular'
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const sortParam = activeTab === 'rating' ? 'rating' : activeTab === 'popular' ? 'price_desc' : 'newest';
        const data = await apiGetProducts({ limit: 12, sort: sortParam });
        setProducts(data.products || []);
      } catch (err) {
        console.error('Failed to load products for homepage:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeTab]);

  const handleQuickAdd = async (e, product) => {
    e.stopPropagation();
    if (!onAddToCart) {
      onSelectProduct(product.id);
      return;
    }
    try {
      await onAddToCart(product.id, 1);
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 2500);
    } catch (err) {
      alert(err.message || 'Չհաջողվեց ավելացնել');
    }
  };

  const getCategoryMeta = (slug) => {
    switch (slug) {
      case 'electronics':
        return { icon: '⚡', name: 'Էլեկտրոնիկա', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', count: '7+ ապրանք' };
      case 'home-kitchen':
        return { icon: '🍳', name: 'Տուն և Խոհանոց', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', count: '7+ ապրանք' };
      case 'food-delicacies':
        return { icon: '🍇', name: 'Հայկական Բարիքներ', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', count: '7+ ապրանք' };
      case 'handmade-crafts':
        return { icon: '🏺', name: 'Ձեռագործ & Արվեստ', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', count: '7+ ապրանք' };
      case 'books':
        return { icon: '📚', name: 'Գրքեր & Գրենական', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', count: '7+ ապրանք' };
      case 'sports':
        return { icon: '🏔️', name: 'Սպորտ & Տուրիզմ', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', count: '7+ ապրանք' };
      default:
        return { icon: '🛍️', name: 'Այլ', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', count: '42+ ապրանք' };
    }
  };

  const featuredDeal = products[0] || {
    id: 1,
    title: 'Wireless Bluetooth Earbuds Pro (Active Noise Cancellation)',
    price_amd: 18500,
    rating_avg: 5,
    rating_count: 18,
    main_image: '/uploads/real-prod-1.webp',
    store_name: 'Ararat Electronics'
  };

  return (
    <div className="home-view-container">
      {/* ===================== HERO SECTION ===================== */}
      <section className="hero-section">
        {/* Ambient Glow Orbs */}
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>

        <div className="hero-grid">
          {/* Hero Left Content */}
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-flag">🇦🇲</span>
              <span>ՀԱՅԱՍՏԱՆԻ #1 ՕՆԼԱՅՆ ՄԱՐԿԵՏՓԼԵՅՍԸ</span>
              <span className="hero-badge-pill">MULTI-SELLER</span>
            </div>

            <h1 className="hero-title">
              Գնեք տեղականից՝ <br />
              <span className="hero-highlight">մեկ զամբյուղով</span>, վճարեք կանխիկ
            </h1>

            <p className="hero-subtitle">
              42+ պրեմիում տեսականի հայկական արտադրողներից և առաջատար խանութներից։
              Պատվիրեք անմիջապես վաճառողներից՝ առանց բանկային քարտերի, 100% անվտանգ առաքմամբ։
            </p>

            <div className="hero-actions">
              <button
                className="btn-hero-primary"
                onClick={() => onNavigate('catalog')}
              >
                <span>Բացահայտել բոլոր ապրանքները</span>
                <span className="btn-arrow">→</span>
              </button>

              <button
                className="btn-hero-ghost"
                onClick={() => onNavigate('catalog', { sort: 'rating' })}
              >
                <span>⭐ Թոփ վարկանիշ</span>
              </button>
            </div>

            {/* Quick Keyword Pills */}
            <div className="hero-quick-tags">
              <span className="quick-tags-label">🔥 Թրենդային՝</span>
              {[
                { label: '🍯 Լոռվա Մեղր', query: 'մեղր' },
                { label: '🎧 Earbuds Pro', query: 'earbuds' },
                { label: '☕️ Կավե Սրճեփ', query: 'սրճեփ' },
                { label: '🏺 Կերամիկա', query: 'կերամիկա' },
                { label: '🍷 Չիր', query: 'չիր' },
                { label: '⌨️ Keyboard', query: 'keyboard' }
              ].map((item) => (
                <span
                  key={item.label}
                  className="quick-tag-pill"
                  onClick={() => onNavigate('catalog', { q: item.query })}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Hero Right: Interactive "Deal of the Day" Glass Card */}
          <div className="hero-card-column">
            <div className="featured-deal-card" onClick={() => onSelectProduct(featuredDeal.id)}>
              <div className="deal-card-header">
                <span className="deal-tag">⚡️ ՕՐՎԱ ԹՈՓ ԱՊՐԱՆՔ</span>
                <span className="deal-discount">-20% ԶԵՂՉ</span>
              </div>

              <div className="deal-img-container">
                <img
                  src={featuredDeal.main_image || '/uploads/real-prod-1.webp'}
                  alt={featuredDeal.title}
                  className="deal-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/uploads/real-prod-1.webp';
                  }}
                />
              </div>

              <div className="deal-card-body">
                <div className="deal-store-row">
                  <span className="store-badge">🏪 {featuredDeal.store_name}</span>
                  <span className="stock-pill">⚡️ Առկա է</span>
                </div>

                <h3 className="deal-title">{featuredDeal.title}</h3>

                <div className="deal-rating-row">
                  <span className="stars">★★★★★</span>
                  <span className="rating-val">5.0</span>
                  <span className="rating-sub">(Ստուգված գնորդներ)</span>
                </div>

                <div className="deal-price-row">
                  <div>
                    <div className="deal-price-old">
                      {Math.round(featuredDeal.price_amd * 1.25).toLocaleString()} ֏
                    </div>
                    <div className="deal-price-current">
                      {featuredDeal.price_amd.toLocaleString()} ֏
                    </div>
                  </div>

                  <button
                    className={`deal-add-btn ${addedIds[featuredDeal.id] ? 'btn-added' : ''}`}
                    onClick={(e) => handleQuickAdd(e, featuredDeal)}
                  >
                    {addedIds[featuredDeal.id] ? '✓ Ավելացվեց' : '+ Զամբյուղ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Bottom Live KPI Bar */}
        <div className="hero-kpi-bar">
          <div className="kpi-item">
            <div className="kpi-number">42+</div>
            <div className="kpi-label">Պրեմիում ապրանքներ</div>
          </div>
          <div className="kpi-divider"></div>
          <div className="kpi-item">
            <div className="kpi-number">3+</div>
            <div className="kpi-label">Ստուգված հայկական խանութներ</div>
          </div>
          <div className="kpi-divider"></div>
          <div className="kpi-item">
            <div className="kpi-number">24-48ժ</div>
            <div className="kpi-label">Արագ առաքում ողջ ՀՀ-ում</div>
          </div>
          <div className="kpi-divider"></div>
          <div className="kpi-item">
            <div className="kpi-number">100%</div>
            <div className="kpi-label">Կանխիկ վճարում ստանալիս</div>
          </div>
        </div>
      </section>

      {/* ===================== TRUST / VALUE BAR ===================== */}
      <section className="trust-section">
        <div className="trust-grid">
          <div className="trust-card">
            <div className="trust-icon-box trust-blue">🚚</div>
            <div>
              <h4 className="trust-heading">Արագ Առաքում ՀՀ-ում</h4>
              <p className="trust-text">Երևանում 24 ժամում, մարզերում՝ 48 ժամում անմիջապես հասցեին։</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box trust-amber">💵</div>
            <div>
              <h4 className="trust-heading">100% Կանխիկ Վճարում</h4>
              <p className="trust-text">Ոչ մի քարտային ռիսկ. վճարեք առաքիչին ապրանքը տեսնելուց հետո։</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box trust-emerald">🛒</div>
            <div>
              <h4 className="trust-heading">Multi-Seller Զամբյուղ</h4>
              <p className="trust-text">Պատվիրեք տարբեր վաճառողներից միաժամանակ՝ մեկ հարմար զամբյուղով։</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box trust-purple">🛡️</div>
            <div>
              <h4 className="trust-heading">Գնորդի Պաշտպանություն</h4>
              <p className="trust-text">Ստուգված տեղական խանութներ, որակի վերահսկում և հետվերադարձ։</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CATEGORY EXPLORER ===================== */}
      <section className="categories-section">
        <div className="section-header-row">
          <div>
            <div className="section-eyebrow">ՏԵՍԱԿԱՆԻ</div>
            <h2 className="section-title">Ընտրեք ըստ Կատեգորիաների</h2>
          </div>
          <button
            className="section-link-btn"
            onClick={() => onNavigate('catalog')}
          >
            Բոլոր կատեգորիաները →
          </button>
        </div>

        <div className="category-cards-grid">
          {categories.map((c) => {
            const meta = getCategoryMeta(c.slug);
            return (
              <div
                key={c.id}
                className="category-showcase-card"
                onClick={() => onNavigate('catalog', { category: c.slug })}
              >
                <div className="category-icon-bubble" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="category-card-info">
                  <div className="category-name">{c.name}</div>
                  <div className="category-count">{meta.count}</div>
                </div>
                <div className="category-arrow">→</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================== CURATED PRODUCTS SHOWCASE ===================== */}
      <section className="products-showcase-section">
        <div className="section-header-row">
          <div>
            <div className="section-eyebrow">ԼԱՎԱԳՈՒՅՆ ԸՆՏՐԱՆԻ</div>
            <h2 className="section-title">✨ Հանրաճանաչ և Թարմ Ապրանքներ</h2>
          </div>

          {/* Filter Tabs */}
          <div className="tab-pill-group">
            <button
              className={`tab-pill ${activeTab === 'newest' ? 'active' : ''}`}
              onClick={() => setActiveTab('newest')}
            >
              ✨ Ամենանորերը
            </button>
            <button
              className={`tab-pill ${activeTab === 'rating' ? 'active' : ''}`}
              onClick={() => setActiveTab('rating')}
            >
              ⭐ Բարձր վարկանիշ
            </button>
            <button
              className={`tab-pill ${activeTab === 'popular' ? 'active' : ''}`}
              onClick={() => setActiveTab('popular')}
            >
              🔥 Թոփ առաջարկներ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state-box">
            <div className="spinner"></div>
            <div>Բեռնվում են որակյալ ապրանքները...</div>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p, idx) => (
              <div
                key={p.id}
                className="premium-product-card"
                onClick={() => onSelectProduct(p.id)}
              >
                {/* Image Container with Badges */}
                <div className="prod-img-wrap">
                  <img
                    src={p.main_image || '/placeholder.png'}
                    alt={p.title}
                    className="prod-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/uploads/real-prod-1.webp';
                    }}
                  />

                  {/* Badges */}
                  <div className="prod-badge-stack">
                    {idx === 0 && <span className="prod-badge-deal">🔥 ԹՈՓ 1</span>}
                    {idx % 4 === 1 && <span className="prod-badge-new">✨ ՆՈՐՈՒՅԹ</span>}
                    {idx % 4 === 2 && <span className="prod-badge-armenian">🇦🇲 ՏԵՂԱԿԱՆ</span>}
                    {idx % 4 === 3 && <span className="prod-badge-discount">-15%</span>}
                  </div>

                  {/* Stock pill overlay */}
                  {p.stock <= 2 && p.stock > 0 ? (
                    <div className="prod-stock-badge low-stock">Մնաց {p.stock} հատ</div>
                  ) : p.stock === 0 ? (
                    <div className="prod-stock-badge out-stock">Սպառված է</div>
                  ) : (
                    <div className="prod-stock-badge in-stock">Առկա է</div>
                  )}
                </div>

                {/* Card Content */}
                <div className="prod-body">
                  <div className="prod-store-row">
                    <span className="prod-store-name">🏪 {p.store_name}</span>
                    <span className="prod-category-name">{p.category_name}</span>
                  </div>

                  <h3 className="prod-title" title={p.title}>
                    {p.title}
                  </h3>

                  {/* Rating */}
                  <div className="prod-rating-row">
                    <span className="prod-stars">
                      {'★'.repeat(Math.round(p.rating_avg || 0))}
                      {'☆'.repeat(5 - Math.round(p.rating_avg || 0))}
                    </span>
                    <span className="prod-rating-num">
                      {(p.rating_avg || 0).toFixed(1)}
                    </span>
                    <span className="prod-rating-count">
                      ({p.rating_count || 0})
                    </span>
                  </div>

                  {/* Bottom: Price + Quick Add */}
                  <div className="prod-bottom">
                    <div className="prod-price-box">
                      <span className="prod-price-amount">
                        {p.price_amd.toLocaleString()}
                      </span>
                      <span className="prod-currency">֏</span>
                    </div>

                    <button
                      className={`prod-quick-add-btn ${addedIds[p.id] ? 'btn-added' : ''}`}
                      onClick={(e) => handleQuickAdd(e, p)}
                      title="Ավելացնել զամբյուղ"
                      disabled={p.stock === 0}
                    >
                      {addedIds[p.id] ? '✓' : '+ 🛒'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="catalog-cta-footer">
          <button
            className="btn-view-all-catalog"
            onClick={() => onNavigate('catalog')}
          >
            <span>Տեսնել բոլոր 42+ ապրանքները կատալոգում</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* ===================== SOCIAL PROOF / REVIEWS ===================== */}
      <section className="testimonials-section">
        <div className="testimonials-header">
          <div className="section-eyebrow">ԻՍԿԱԿԱՆ ԿԱՐԾԻՔՆԵՐ</div>
          <h2 className="section-title">Ինչ են ասում մեր գնորդները</h2>
          <p className="testimonials-sub">
            Հազարավոր գոհ հաճախորդներ Երևանում և ՀՀ բոլոր մարզերում
          </p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">
              «Առաջին անգամ առանց բանկային քարտ մուտքագրելու հանգիստ պատվիրեցի։ Ապրանքը հասավ հաջորդ օրը, տեղում ստուգեցի ու կանխիկ վճարեցի։ Շատ ապահով է ու հարմար։»
            </p>
            <div className="testi-author">
              <div className="testi-avatar">ԱԳ</div>
              <div>
                <div className="testi-name">Արմեն Գասպարյան</div>
                <div className="testi-location">📍 Երևան, Կենտրոն</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">
              «Հայկական տեղական արտադրանքի ընտրանին ուղղակի հրաշալի է։ Մեղրը և կավե սրճեփը գերազանց որակի էին, փաթեթավորումն էլ շատ խնամքով էր արված։»
            </p>
            <div className="testi-author">
              <div className="testi-avatar" style={{ background: '#ec4899' }}>ԱՄ</div>
              <div>
                <div className="testi-name">Անահիտ Մելքոնյան</div>
                <div className="testi-location">📍 Գյումրի</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-text">
              «Մեկ զամբյուղով տարբեր խանութներից պատվիրեցի միաժամանակ՝ և՛ տեխնիկա, և՛ ձեռագործ նվերներ։ Կատարյալ հարթակ է, Amazon-ից ոչնչով չի զիջում։»
            </p>
            <div className="testi-author">
              <div className="testi-avatar" style={{ background: '#3b82f6' }}>ԴՍ</div>
              <div>
                <div className="testi-name">Դավիթ Սարգսյան</div>
                <div className="testi-location">📍 Վանաձոր</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SELLER CTA BANNER ===================== */}
      <section className="seller-cta-section">
        <div className="seller-cta-inner">
          <div className="seller-cta-content">
            <span className="seller-badge">🏪 ԳՈՐԾԸՆԿԵՐՈՒԹՅՈՒՆ</span>
            <h2 className="seller-cta-title">
              Ունե՞ք սեփական արտադրանք կամ խանութ Հայաստանում
            </h2>
            <p className="seller-cta-desc">
              Միացեք Shuka-ին անվճար, տեղադրեք Ձեր ապրանքները հաշված րոպեներում և վաճառեք հազարավոր գնորդների ողջ Հայաստանով։
            </p>
            <div className="seller-perks-row">
              <span>✓ 0֏ Գրանցման վճար</span>
              <span>✓ Հարմար Seller Dashboard</span>
              <span>✓ Ավտոմատ առաքման կառավարում</span>
            </div>
          </div>
          <div className="seller-cta-action">
            <button
              className="btn-become-seller"
              onClick={() => onNavigate('catalog')}
            >
              Սկսել վաճառել Shuka-ում →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
