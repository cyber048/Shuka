import React, { useState } from 'react';
import Logo from './Logo';

export default function Header({
  user,
  cartCount,
  categories,
  onNavigate,
  onSearch,
  onOpenAuth,
  onLogout
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm, selectedCat);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <header className="navbar">
      {/* Top Utility Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-inner">
          <div className="announcement-left">
            <span className="badge-pulse">🇦🇲 ՀԱՅԱՍՏԱՆԻ #1 ՕՆԼԱՅՆ ՇՈՒԿԱ</span>
            <span className="announcement-divider">•</span>
            <span className="announcement-item">🚚 Անվճար առաքում 15,000֏-ից</span>
            <span className="announcement-divider">•</span>
            <span className="announcement-item">💵 100% Կանխիկ վճարում ստանալիս</span>
          </div>
          <div className="announcement-right">
            {!user?.is_seller && (
              <span
                className="announcement-link"
                onClick={() => (user ? onOpenAuth('seller_activate') : onOpenAuth('register_seller'))}
              >
                🏪 Դարձեք Վաճառող Shuka-ում
              </span>
            )}
            <span className="announcement-phone">📞 +374 10 00-00-00</span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="nav-top">
        {/* Brand Logo */}
        <Logo onClick={() => onNavigate('home')} size="normal" theme="dark" showSubtitle={true} />

        {/* Amazon-style Search Bar with Category Select */}
        <form className="search-bar-form" onSubmit={handleSearchSubmit}>
          <div className="search-cat-dropdown">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="search-cat-select"
            >
              <option value="">Բոլորը</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="Որոնել 40+ ապրանքներ (մեղր, earbuds, սրճեփ, կերամիկա)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button type="submit" className="search-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="search-btn-text">Որոնել</span>
          </button>
        </form>

        {/* Right Navigation Actions */}
        <div className="nav-actions">
          {/* Quick Orders Button if Logged In */}
          {user && (
            <button
              className="nav-ghost-btn"
              onClick={() => onNavigate('my-orders')}
              title="Իմ պատվերները"
            >
              <span className="nav-icon">📦</span>
              <span className="nav-label">Պատվերներ</span>
            </button>
          )}

          {/* User Account / Auth */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="nav-btn user-pill-btn"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
              >
                <div className="user-avatar-circle">
                  {getInitials(user.name)}
                </div>
                <div className="user-info-text">
                  <div className="user-greeting">Բարև,</div>
                  <div className="user-name-bold">{user.name.split(' ')[0]}</div>
                </div>
                <span className="chevron-icon">▼</span>
              </button>

              {showAccountMenu && (
                <div
                  className="account-menu-popover"
                  onClick={() => setShowAccountMenu(false)}
                >
                  <div className="account-popover-header">
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{user.email}</div>
                  </div>

                  <div
                    className="account-menu-item"
                    onClick={() => onNavigate('my-orders')}
                  >
                    <span>📦</span>
                    <span>Իմ պատվերները</span>
                  </div>

                  {user.is_seller ? (
                    <div
                      className="account-menu-item seller-item"
                      onClick={() => onNavigate('seller')}
                    >
                      <span>🏪</span>
                      <span>Վաճառողի վահանակ</span>
                    </div>
                  ) : (
                    <div
                      className="account-menu-item activate-item"
                      onClick={() => onOpenAuth('seller_activate')}
                    >
                      <span>🚀</span>
                      <span>Վաճառել Shuka-ում</span>
                    </div>
                  )}

                  <div
                    className="account-menu-item logout-item"
                    onClick={onLogout}
                  >
                    <span>🚪</span>
                    <span>Ելք</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-btn auth-trigger-btn" onClick={() => onOpenAuth('login')}>
              <span className="nav-icon">👤</span>
              <div className="user-info-text">
                <div className="user-greeting">Բարև, Մուտք</div>
                <div className="user-name-bold">Հաշիվ & Ցանկ</div>
              </div>
            </button>
          )}

          {/* Modern Cart Button */}
          <button className="cart-btn" onClick={() => onNavigate('cart')}>
            <div className="cart-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span className={`cart-badge ${cartCount > 0 ? 'badge-bounce' : ''}`}>{cartCount}</span>
            </div>
            <div className="cart-text-group">
              <span className="cart-sub">Զամբյուղ</span>
            </div>
          </button>
        </div>
      </div>

      {/* Sub-nav: Category Pills with Icons */}
      <nav className="nav-sub">
        <div className="nav-sub-inner">
          <span className="sub-link sub-link-all" onClick={() => onNavigate('catalog', { category: '' })}>
            <span style={{ fontSize: '1.1rem' }}>☰</span> Բոլոր բաժինները
          </span>

          <span className="sub-link hot-deal" onClick={() => onNavigate('catalog', { sort: 'price_asc' })}>
            🔥 Թեժ առաջարկներ
          </span>

          {categories.map((c) => (
            <span
              key={c.id}
              className="sub-link"
              onClick={() => onNavigate('catalog', { category: c.slug })}
            >
              {c.name}
            </span>
          ))}

          <span className="sub-link best-sellers" onClick={() => onNavigate('catalog', { sort: 'rating' })}>
            ⭐ Լավագույն վարկանիշ
          </span>
        </div>
      </nav>
    </header>
  );
}
