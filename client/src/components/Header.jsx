import React, { useState } from 'react';

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
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="nav-top">
        {/* Logo */}
        <div className="logo-area" onClick={() => onNavigate('home')}>
          <div className="logo-icon">🛒</div>
          <div>
            <div className="logo-text">SHU<span>KA</span></div>
            <div className="logo-sub">Հայկական Մարկետփլեյս</div>
          </div>
        </div>

        {/* Search Bar */}
        <form className="search-bar-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="Որոնել 40+ ապրանքներ (օր.՝ մեղր, կերամիկա, earbuds, jazzve)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-btn">
            🔍 Որոնել
          </button>
        </form>

        {/* Right Actions */}
        <div className="nav-actions">
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="nav-btn"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem'
                  }}
                >
                  {getInitials(user.name)}
                </div>
                <span>{user.name.split(' ')[0]}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▼</span>
              </button>

              {showAccountMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '120%',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    minWidth: '230px',
                    zIndex: 60,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    animation: 'modalEnter 0.15s ease'
                  }}
                  onClick={() => setShowAccountMenu(false)}
                >
                  <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{user.email}</div>
                  </div>

                  <div
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
                    onClick={() => onNavigate('my-orders')}
                  >
                    📦 <span>Իմ պատվերները</span>
                  </div>

                  {user.is_seller ? (
                    <div
                      style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                      onClick={() => onNavigate('seller')}
                    >
                      🏪 <span>Վաճառողի վահանակ</span>
                    </div>
                  ) : (
                    <div
                      style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                      onClick={() => onOpenAuth('seller_activate')}
                    >
                      🚀 <span>Վաճառել Shuka-ում</span>
                    </div>
                  )}

                  <div
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderTop: '1px solid #e2e8f0', color: '#dc2626', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={onLogout}
                  >
                    🚪 <span>Ելք</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-btn" onClick={() => onOpenAuth('login')}>
              <span>👤 Մուտք / Գրանցվել</span>
            </button>
          )}

          {/* Cart Icon */}
          <button className="cart-btn" onClick={() => onNavigate('cart')}>
            <span>🛒</span>
            <span style={{ display: 'none', md: 'inline' }}>Զամբյուղ</span>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Sub-nav: Category Pills */}
      <nav className="nav-sub">
        <div className="nav-sub-inner">
          <span className="sub-link" onClick={() => onNavigate('catalog', { category: '' })}>
            ☰ Բոլոր բաժինները
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
        </div>
      </nav>
    </header>
  );
}
