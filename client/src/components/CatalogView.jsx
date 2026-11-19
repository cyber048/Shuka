import React, { useEffect, useState } from 'react';
import { apiGetProducts } from '../api';

export default function CatalogView({
  categories,
  filterParams,
  onUpdateFilters,
  onSelectProduct
}) {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [minPriceInput, setMinPriceInput] = useState(filterParams.minPrice || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filterParams.maxPrice || '');

  useEffect(() => {
    async function fetchCatalog() {
      setLoading(true);
      try {
        const res = await apiGetProducts({
          q: filterParams.q || '',
          category: filterParams.category || '',
          minPrice: filterParams.minPrice || '',
          maxPrice: filterParams.maxPrice || '',
          sort: filterParams.sort || 'newest',
          page: filterParams.page || 1,
          limit: 12
        });

        setProducts(res.products || []);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      } catch (err) {
        console.error('Error fetching catalog products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCatalog();
  }, [filterParams]);

  const handlePriceApply = (e) => {
    e.preventDefault();
    onUpdateFilters({
      minPrice: minPriceInput,
      maxPrice: maxPriceInput,
      page: 1
    });
  };

  const handleClearFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    onUpdateFilters({
      q: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      page: 1
    });
  };

  return (
    <div>
      {/* Top Bar: Title, Count, Sort */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          background: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            {filterParams.q ? `Որոնման արդյունքներ՝ «${filterParams.q}»` : 'Ապրանքների կատալոգ'}
          </h1>
          <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Գտնվել է {totalCount} ապրանք
          </div>
        </div>

        {/* Sort selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>Տեսակավորել՝</label>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
            value={filterParams.sort || 'newest'}
            onChange={(e) => onUpdateFilters({ sort: e.target.value, page: 1 })}
          >
            <option value="newest">Նորերը սկզբից</option>
            <option value="price_asc">Գինը՝ աճման կարգով</option>
            <option value="price_desc">Գինը՝ նվազման կարգով</option>
            <option value="rating">Ըստ բարձր վարկանիշի</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
        {/* Filters Sidebar */}
        <aside
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.25rem',
            height: 'fit-content'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Ֆիլտրեր</h3>
            {(filterParams.category || filterParams.minPrice || filterParams.maxPrice || filterParams.q) && (
              <button
                onClick={handleClearFilters}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Մաքրել
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
              Բաժին
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="category"
                  checked={!filterParams.category}
                  onChange={() => onUpdateFilters({ category: '', page: 1 })}
                />
                Բոլոր բաժինները
              </label>
              {categories.map((c) => (
                <label key={c.id} style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="category"
                    checked={filterParams.category === c.slug}
                    onChange={() => onUpdateFilters({ category: c.slug, page: 1 })}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
              Գնային միջակայք (֏)
            </h4>
            <form onSubmit={handlePriceApply}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input
                  type="number"
                  placeholder="Սկսած"
                  className="form-control"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                />
                <span style={{ color: '#94a3b8' }}>-</span>
                <input
                  type="number"
                  placeholder="Մինչև"
                  className="form-control"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Կիրառել գինը
              </button>
            </form>
          </div>
        </aside>

        {/* Product List / Empty State */}
        <main>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              Բեռնվում են ապրանքները...
            </div>
          ) : products.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '3rem 1.5rem',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Ապրանքներ չեն գտնվել
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                Փորձեք փոխել որոնման բառը կամ մաքրել ֆիլտրերը։
              </p>
              <button className="btn btn-primary" onClick={handleClearFilters}>
                Վերադառնալ բոլոր ապրանքներին
              </button>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {products.map((p) => (
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
                          <span className="badge badge-low-stock">Մնաց {p.stock}</span>
                        )}
                        {p.stock === 0 && (
                          <span className="badge badge-out-of-stock">Սպառված</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={filterParams.page <= 1}
                    onClick={() => onUpdateFilters({ page: Math.max(1, (filterParams.page || 1) - 1) })}
                  >
                    ← Նախորդ
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    Էջ {filterParams.page || 1} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={(filterParams.page || 1) >= totalPages}
                    onClick={() => onUpdateFilters({ page: (filterParams.page || 1) + 1 })}
                  >
                    Հաջորդ →
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
