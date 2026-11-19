import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Logo from './components/Logo';
import HomeView from './components/HomeView';
import CatalogView from './components/CatalogView';
import ProductDetailView from './components/ProductDetailView';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import MyOrdersView from './components/MyOrdersView';
import SellerDashboardView from './components/SellerDashboardView';
import AuthModal from './components/AuthModal';
import {
  apiGetMe,
  apiLogout,
  apiGetCategories,
  apiGetCart,
  apiAddToCart,
  apiRemoveCartItem
} from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cartData, setCartData] = useState(null);

  // Navigation State
  const [view, setView] = useState('home'); // 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'order-confirmed' | 'my-orders' | 'seller'
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [lastConfirmedOrderId, setLastConfirmedOrderId] = useState(null);

  // Catalog Filters State (synced with URL)
  const [filterParams, setFilterParams] = useState({
    q: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    page: 1
  });

  // Modals & Toasts
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | 'seller_activate' | null
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const cats = await apiGetCategories();
        setCategories(cats || []);
      } catch (e) {
        console.error('Failed to load categories:', e);
      }

      try {
        const me = await apiGetMe();
        setUser(me);
        loadCart();
      } catch {
        // Not logged in
        setUser(null);
      }
    }

    // Parse URL on init
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const qParam = params.get('q');
    const catParam = params.get('category');
    const prodParam = params.get('product');

    if (prodParam) {
      setSelectedProductId(parseInt(prodParam, 10));
      setView('product');
    } else if (viewParam) {
      setView(viewParam);
    } else if (qParam || catParam) {
      setView('catalog');
      setFilterParams((prev) => ({
        ...prev,
        q: qParam || '',
        category: catParam || ''
      }));
    }

    init();
  }, []);

  const loadCart = async () => {
    try {
      const data = await apiGetCart();
      setCartData(data);
    } catch {
      setCartData(null);
    }
  };

  // Navigation helper
  const navigate = (newView, params = {}) => {
    setView(newView);
    if (newView === 'catalog') {
      setFilterParams((prev) => ({
        ...prev,
        ...params,
        page: params.page || 1
      }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (term) => {
    setFilterParams((prev) => ({
      ...prev,
      q: term,
      page: 1
    }));
    navigate('catalog');
  };

  const handleSelectProduct = (id) => {
    setSelectedProductId(id);
    navigate('product');
  };

  const handleAddToCart = async (productId, qty) => {
    if (!user) {
      setAuthModalMode('login');
      return;
    }
    await apiAddToCart(productId, qty);
    await loadCart();
    showToast('Ապրանքը հաջողությամբ ավելացվեց զամբյուղում');
  };

  const handleUpdateCartQuantity = async (productId, qty) => {
    try {
      await apiAddToCart(productId, qty);
      await loadCart();
    } catch (err) {
      showToast(err.message || 'Չհաջողվեց թարմացնել քանակը', 'error');
    }
  };

  const handleRemoveCartItem = async (productId) => {
    try {
      await apiRemoveCartItem(productId);
      await loadCart();
      showToast('Ապրանքը հեռացվեց զամբյուղից');
    } catch (err) {
      showToast(err.message || 'Չհաջողվեց հեռացնել', 'error');
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setCartData(null);
    navigate('home');
    showToast('Դուք դուրս եկաք համակարգից');
  };

  const handleAuthSuccess = (userData, message) => {
    setUser(userData);
    loadCart();
    showToast(message);
    if (userData.is_seller && view === 'home') {
      // stay or navigate
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: toast.type === 'error' ? '#dc2626' : '#16a34a',
            color: '#ffffff',
            padding: '0.85rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 600
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Main Header */}
      <Header
        user={user}
        cartCount={cartData?.item_count || 0}
        categories={categories}
        onNavigate={navigate}
        onSearch={handleSearch}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onLogout={handleLogout}
      />

      {/* Main Content Pages */}
      <main className="main-content">
        {view === 'home' && (
          <HomeView
            categories={categories}
            onNavigate={navigate}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
          />
        )}

        {view === 'catalog' && (
          <CatalogView
            categories={categories}
            filterParams={filterParams}
            onUpdateFilters={(updates) => setFilterParams((prev) => ({ ...prev, ...updates }))}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {view === 'product' && selectedProductId && (
          <ProductDetailView
            productId={selectedProductId}
            user={user}
            onAddToCart={handleAddToCart}
            onOpenAuth={(mode) => setAuthModalMode(mode)}
            onBack={() => navigate('catalog')}
          />
        )}

        {view === 'cart' && (
          <CartView
            cartData={cartData}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onProceedToCheckout={() => navigate('checkout')}
            onSelectProduct={handleSelectProduct}
            onContinueShopping={() => navigate('catalog')}
          />
        )}

        {view === 'checkout' && (
          <CheckoutView
            cartData={cartData}
            onOrderSuccess={(orderId) => {
              setLastConfirmedOrderId(orderId);
              loadCart();
              navigate('order-confirmed');
            }}
            onBackToCart={() => navigate('cart')}
          />
        )}

        {view === 'order-confirmed' && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '4rem 2rem',
              textAlign: 'center',
              maxWidth: '650px',
              margin: '2rem auto'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>
              Պատվերը հաջողությամբ գրանցվեց!
            </h1>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
              Ձեր պատվերի համարն է՝ #{lastConfirmedOrderId}
            </p>
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
              Վաճառողները կստանան իրենց պատվերները և կպատրաստեն առաքման համար։ Վճարումը կկատարեք կանխիկ՝ ապրանքները ստանալիս։
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('my-orders')}
              >
                Դիտել «Իմ պատվերները»
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('catalog')}
              >
                Շարունակել գնումները
              </button>
            </div>
          </div>
        )}

        {view === 'my-orders' && (
          <MyOrdersView
            initialOrderId={lastConfirmedOrderId}
            onContinueShopping={() => navigate('catalog')}
          />
        )}

        {view === 'seller' && user?.is_seller && (
          <SellerDashboardView
            user={user}
            categories={categories}
            onBackToStore={() => navigate('home')}
          />
        )}
      </main>

      {/* Auth Modal */}
      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* World-Class Modern Footer */}
      <footer className="footer">
        <div className="footer-top-grid">
          {/* Col 1: Brand & Bio */}
          <div className="footer-col brand-col">
            <Logo
              size="normal"
              theme="dark"
              showSubtitle={true}
              onClick={() => navigate('home')}
            />
            <p className="footer-desc">
              Հայաստանի առաջատար էլեկտրոնային մարկետփլեյսը։ Տեղական արտադրողների բարձրորակ ապրանքներ, 100% կանխիկ վճարում ստանալիս և արագ առաքում ողջ Հանրապետությունով։
            </p>
            <div className="footer-contact-info">
              <div className="contact-item">
                <span>📍</span> <span>ք. Երևան, Արշակունյաց 15</span>
              </div>
              <div className="contact-item">
                <span>📞</span> <span>+374 10 00-00-00 (Շուրջօրյա)</span>
              </div>
              <div className="contact-item">
                <span>✉️</span> <span>support@shuka.am</span>
              </div>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="footer-col">
            <h4 className="footer-heading">Բաժիններ</h4>
            <ul className="footer-links">
              {categories.map((c) => (
                <li key={c.id}>
                  <span onClick={() => navigate('catalog', { category: c.slug })}>
                    {c.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Customer Service */}
          <div className="footer-col">
            <h4 className="footer-heading">Գնորդներին</h4>
            <ul className="footer-links">
              <li>
                <span onClick={() => navigate('catalog')}>Բոլոր ապրանքները</span>
              </li>
              <li>
                <span onClick={() => navigate('my-orders')}>Իմ պատվերները</span>
              </li>
              <li>
                <span onClick={() => navigate('cart')}>Զամբյուղ</span>
              </li>
              <li>
                <span onClick={() => alert('Առաքումն իրականացվում է Երևանում 24 ժամում, մարզերում՝ 48 ժամում։ Վճարումը՝ կանխիկ առաքիչին։')}>
                  Առաքման պայմաններ
                </span>
              </li>
              <li>
                <span onClick={() => alert('Բոլոր ապրանքների համար գործում է 14 օրվա վերադարձի և փոխանակման երաշխիք։')}>
                  Երաշխիք և վերադարձ
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: For Sellers & Guarantees */}
          <div className="footer-col">
            <h4 className="footer-heading">Վաճառողներին</h4>
            <ul className="footer-links">
              {user?.is_seller ? (
                <li>
                  <span onClick={() => navigate('seller')} style={{ color: '#f59e0b', fontWeight: 700 }}>
                    🏪 Վաճառողի վահանակ
                  </span>
                </li>
              ) : (
                <li>
                  <span onClick={() => (user ? setAuthModalMode('seller_activate') : setAuthModalMode('register_seller'))}>
                    🚀 Դարձեք Shuka-ի գործընկեր
                  </span>
                </li>
              )}
              <li>
                <span onClick={() => alert('Վաճառողի գրանցումն անվճար է։ Կարող եք ավելացնել անսահմանափակ ապրանքներ և կառավարել պատվերները։')}>
                  Ինչպես վաճառել Shuka-ում
                </span>
              </li>
            </ul>

            <div className="footer-trust-badges">
              <div className="trust-mini-badge">
                <span>💵</span>
                <span>100% Կանխիկ Առաքման Պահին</span>
              </div>
              <div className="trust-mini-badge">
                <span>🛡️</span>
                <span>100% Գնորդի Պաշտպանություն</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="footer-bottom-bar">
          <div className="footer-copy">
            © 2026 <strong>Shuka.am</strong> — Հայաստանի #1 Օնլայն Շուկա։ Բոլոր իրավունքները պաշտպանված են։
          </div>
          <div className="footer-badges-row">
            <span className="footer-secure-tag">🇦🇲 Տեղական Արտադրություն</span>
            <span className="footer-secure-tag">⚡️ SQLite WAL Powered</span>
            <span className="footer-secure-tag">🔒 SSL Անվտանգ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
