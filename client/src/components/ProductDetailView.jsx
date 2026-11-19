import React, { useEffect, useState } from 'react';
import { apiGetProduct, apiGetProductReviews } from '../api';

export default function ProductDetailView({
  productId,
  user,
  onAddToCart,
  onOpenAuth,
  onBack
}) {
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedMessage, setAddedMessage] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const prodData = await apiGetProduct(productId);
        const revData = await apiGetProductReviews(productId);
        setProduct(prodData);
        setReviews(revData);
        setQuantity(prodData.stock > 0 ? 1 : 0);
      } catch (err) {
        console.error('Error loading product details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Բեռնվում է ապրանքի էջը...</div>;
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Ապրանքը չի գտնվել</h2>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
          Վերադառնալ
        </button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [{ file_path: '/placeholder.png' }];
  const currentImage = images[selectedImageIndex] || images[0];

  const handleAddToCartClick = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    setAddingToCart(true);
    try {
      await onAddToCart(product.id, quantity);
      setAddedMessage(true);
      setTimeout(() => setAddedMessage(false), 3000);
    } catch (err) {
      alert(err.message || 'Չհաջողվեց ավելացնել զամբյուղ');
    } finally {
      setAddingToCart(false);
    }
  };

  const isOutOfStock = product.stock === 0;
  const isOwnProduct = user && user.id === product.seller_id;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}
      >
        ← Վերադառնալ կատալոգ
      </button>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 460px) 1fr',
          gap: '2.5rem',
          marginBottom: '2.5rem'
        }}
      >
        {/* Left: Image Gallery */}
        <div>
          <div
            style={{
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={currentImage.file_path}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23f1f5f9"><rect width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="24">Shuka Product</text></svg>';
              }}
            />
          </div>

          {/* Thumbnails (1 to 5 images) */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {images.map((img, idx) => (
                <div
                  key={img.id || idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: selectedImageIndex === idx ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={img.file_path}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info, Price, Actions */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.4rem' }}>
            Բաժին՝ <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.category_name}</span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {product.title}
          </h1>

          <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '1rem' }}>
            Վաճառող՝ <strong style={{ color: '#1e293b' }}>{product.store_name}</strong>
          </div>

          {/* Rating */}
          <div className="rating-row" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{'★'.repeat(Math.round(product.rating_avg || 0))}</span>
            <span style={{ fontSize: '1.2rem' }}>{'☆'.repeat(5 - Math.round(product.rating_avg || 0))}</span>
            <span style={{ fontWeight: 700, color: '#0f172a', marginLeft: '0.25rem' }}>
              {product.rating_avg ? product.rating_avg.toFixed(1) : '0.0'}
            </span>
            <span className="rating-count">({product.rating_count} կարծիք)</span>
          </div>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '0.5rem 0 1.5rem' }} />

          {/* Price */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              {product.price_amd.toLocaleString()} ֏
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Վճարումը կանխիկ՝ առաքման պահին (Cash on delivery)
            </div>
          </div>

          {/* Stock Status Badge */}
          <div style={{ marginBottom: '1.5rem' }}>
            {product.stock === 0 ? (
              <span className="badge badge-out-of-stock" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
                Սպառված է (Out of stock)
              </span>
            ) : product.stock <= 2 ? (
              <span className="badge badge-low-stock" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
                Մնացել է միայն {product.stock} հատ (Only {product.stock} left)
              </span>
            ) : (
              <span className="badge badge-in-stock" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
                Առկա է պահեստում (In stock)
              </span>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Նկարագրություն
            </h3>
            <p style={{ color: '#334155', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {product.description}
            </p>
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div
            style={{
              marginTop: 'auto',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}
          >
            {isOwnProduct ? (
              <div className="alert alert-warning" style={{ margin: 0 }}>
                Սա Ձեր սեփական ապրանքն է։ Դուք չեք կարող այն գնել։
              </div>
            ) : isOutOfStock ? (
              <div className="alert alert-danger" style={{ margin: 0 }}>
                Այս ապրանքը տվյալ պահին սպառված է։
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Քանակ՝</label>
                  <select
                    className="form-control"
                    style={{ width: '80px', padding: '0.5rem' }}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  >
                    {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem 1.5rem', fontSize: '1.05rem' }}
                  onClick={handleAddToCartClick}
                  disabled={addingToCart}
                >
                  {addingToCart ? 'Ավելացվում է...' : '🛒 Ավելացնել զամբյուղ'}
                </button>
              </div>
            )}

            {addedMessage && (
              <div className="alert alert-success" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                ✓ Ապրանքը հաջողությամբ ավելացվեց զամբյուղում։
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem'
        }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Հաճախորդների կարծիքներ ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <div style={{ color: '#64748b' }}>
            Այս ապրանքի համար դեռևս կարծիքներ չկան։ Կարծիք կարող են թողնել միայն այն գնորդները, ում պատվերն առաքվել է։
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 600 }}>{r.buyer_name}</div>
                  <div style={{ color: '#ca8a04', fontSize: '0.9rem' }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {new Date(r.created_at).toLocaleDateString('hy-AM')}
                  </div>
                </div>
                <p style={{ color: '#334155', fontSize: '0.95rem' }}>
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
