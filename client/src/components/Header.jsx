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

  return (
    <header className="navbar">
      <div className="nav-top">
        {/* Logo */}
        <div className="logo-area" onClick={() => onNavigate('home')}>
          <div>
            <div className="logo-text">SHU<span>KA</span></div>
            <div className="logo-sub">Մարկետփլեյս Հայաստանում</div>
          </div>
        </div>

        {/* Search Bar */}
        <form className="search-bar-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="Որոնել ապրանքներ (օր.՝ սուրճ, մեղր, ականջակալ)..."
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
                👤 <span>{user.name.split(' ')[0]}</span> ▾
              </button>

              {showAccountMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                    minWidth: '200px',
                    zIndex: 60,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0'
                  }}
                  onClick={() => setShowAccountMenu(false)}
                >
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                  </div>

                  <div
                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', hover: { background: '#f1f5f9' } }}
                    onClick={() => onNavigate('my-orders')}
                  >
                    📦 Իմ պատվերները
                  </div>

                  {user.is_seller ? (
                    <div
                      style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: '#b45309', fontWeight: 600 }}
                      onClick={() => onNavigate('seller')}
                    >
                      🏪 Վաճառողի վահանակ
                    </div>
                  ) : (
                    <div
                      style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: '#2563eb' }}
                      onClick={() => onOpenAuth('seller_activate')}
                    >
                      🚀 Վաճառել Shuka-ում
                    </div>
                  )}

                  <div
                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderTop: '1px solid #e2e8f0', color: '#dc2626' }}
                    onClick={onLogout}
                  >
                    🚪 Ելք
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-btn" onClick={() => onOpenAuth('login')}>
              🔑 Մուտք / Գրանցվել
            </button>
          )}

          {/* Cart Icon */}
          <button className="cart-btn" onClick={() => onNavigate('cart')}>
            🛒 Զամբյուղ
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Sub-nav: Category Links */}
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
