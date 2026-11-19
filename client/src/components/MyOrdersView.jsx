import React, { useEffect, useState } from 'react';
import { apiGetOrders, apiGetOrderDetail, apiCancelSellerOrder, apiSubmitReview } from '../api';

export default function MyOrdersView({ onContinueShopping, initialOrderId = null }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await apiGetOrders();
      setOrders(data || []);

      if (initialOrderId) {
        const detail = await apiGetOrderDetail(initialOrderId);
        setSelectedOrder(detail);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [initialOrderId]);

  const handleSelectOrder = async (orderId) => {
    try {
      const detail = await apiGetOrderDetail(orderId);
      setSelectedOrder(detail);
    } catch (err) {
      alert(err.message || 'Չհաջողվեց բեռնել պատվերը');
    }
  };

  const handleCancelPart = async (sellerOrderId) => {
    if (!window.confirm('Իսկապե՞ս ցանկանում եք չեղարկել այս վաճառողի պատվերը։')) return;
    try {
      await apiCancelSellerOrder(selectedOrder.id, sellerOrderId);
      const updated = await apiGetOrderDetail(selectedOrder.id);
      setSelectedOrder(updated);
      loadOrders();
      alert('Պատվերը հաջողությամբ չեղարկվեց։');
    } catch (err) {
      alert(err.message || 'Չեղարկումը մերժվեց։');
    }
  };

  const handleOpenReview = (product) => {
    setReviewProduct(product);
    setReviewRating(5);
    setReviewBody('');
    setReviewMessage(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBody.trim()) return;

    setReviewSubmitting(true);
    setReviewMessage(null);

    try {
      await apiSubmitReview(reviewProduct.product_id, reviewRating, reviewBody);
      setReviewMessage({ type: 'success', text: 'Շնորհակալություն։ Կարծիքը հաջողությամբ ավելացվեց։' });
      setTimeout(() => {
        setReviewProduct(null);
      }, 1500);
    } catch (err) {
      setReviewMessage({ type: 'error', text: err.message || 'Չհաջողվեց ուղարկել կարծիքը' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'placed':
        return <span className="badge badge-status-placed">Ընդունված (Placed)</span>;
      case 'confirmed':
        return <span className="badge badge-status-confirmed">Հաստատված (Confirmed)</span>;
      case 'shipped':
        return <span className="badge badge-status-shipped">Ճանապարհին (Shipped)</span>;
      case 'delivered':
        return <span className="badge badge-status-delivered">Առաքված (Delivered)</span>;
      case 'cancelled':
        return <span className="badge badge-status-cancelled">Չեղարկված (Cancelled)</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        Իմ Պատվերները
      </h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Բեռնվում են պատվերները...</div>
      ) : orders.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '4rem 2rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Դուք դեռ չունեք պատվերներ
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Կատարեք Ձեր առաջին գնումը Shuka-ում։
          </p>
          <button className="btn btn-primary" onClick={onContinueShopping}>
            Սկսել գնումները →
          </button>
        </div>
      ) : selectedOrder ? (
        // Order Detail View
        <div>
          <button
            onClick={() => setSelectedOrder(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Բոլոր պատվերները
          </button>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '2rem',
              marginBottom: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  Պատվեր #{selectedOrder.id}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Գրանցման ամսաթիվ՝ {new Date(selectedOrder.created_at).toLocaleString('hy-AM')}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ընդհանուր գումար՝</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedOrder.total_amd.toLocaleString()} ֏
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '2rem'
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#334155' }}>
                📍 Առաքման հասցե
              </h3>
              <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                <div><strong>Ստացող՝</strong> {selectedOrder.recipient} ({selectedOrder.phone})</div>
                <div><strong>Հասցե՝</strong> {selectedOrder.region}, {selectedOrder.city}, {selectedOrder.street}, {selectedOrder.apartment}</div>
                {selectedOrder.note && <div><strong>Նշում՝</strong> {selectedOrder.note}</div>}
              </div>
            </div>

            {/* Seller Orders Breakdown */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
              Վաճառողների մասնաբաժինները
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {selectedOrder.seller_orders.map((so) => (
                <div
                  key={so.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      background: '#f1f5f9',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <strong>🏪 {so.store_name}</strong> ({so.subtotal_amd.toLocaleString()} ֏)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {getStatusBadge(so.status)}

                      {/* Cancel allowed only if placed or confirmed */}
                      {(so.status === 'placed' || so.status === 'confirmed') && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancelPart(so.id)}
                        >
                          Չեղարկել
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ padding: '1rem' }}>
                    {so.items.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0',
                          borderBottom: '1px solid #f8fafc'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{it.title}</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {it.quantity} հատ × {it.unit_price_amd.toLocaleString()} ֏
                          </div>
                        </div>

                        {so.status === 'delivered' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenReview(it)}
                          >
                            ✍️ Գրել կարծիք
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Status History */}
                  <div style={{ background: '#fafafa', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                      Կարգավիճակի պատմություն (Status History)՝
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {so.status_history.map((sh) => (
                        <div key={sh.id} style={{ fontSize: '0.8rem', color: '#475569' }}>
                          • <strong>{sh.to_status.toUpperCase()}</strong> — {new Date(sh.created_at).toLocaleString('hy-AM')}
                          {sh.changed_by_name && ` (${sh.changed_by_name})`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Orders List
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((o) => (
            <div
              key={o.id}
              onClick={() => handleSelectOrder(o.id)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Պատվեր #{o.id}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  {new Date(o.created_at).toLocaleDateString('hy-AM')} • Ստացող՝ {o.recipient}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {o.seller_orders?.map((so) => (
                    <span key={so.id} style={{ fontSize: '0.8rem' }}>
                      {so.store_name}: {getStatusBadge(so.status)}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  {o.total_amd.toLocaleString()} ֏
                </div>
                <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
                  Մանրամասն →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewProduct && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Գրել կարծիք</h3>
              <button className="close-btn" onClick={() => setReviewProduct(null)}>×</button>
            </div>

            <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
              {reviewProduct.title}
            </p>

            {reviewMessage && (
              <div className={`alert ${reviewMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                {reviewMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label className="form-label">Գնահատական (1-5 աստղ)</label>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.5rem', cursor: 'pointer' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setReviewRating(star)}
                      style={{ color: star <= reviewRating ? '#ca8a04' : '#cbd5e1' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ձեր կարծիքը *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Ինչպիսի՞ն էր ապրանքի որակը..."
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? 'Ուղարկվում է...' : 'Հրապարակել կարծիքը'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
