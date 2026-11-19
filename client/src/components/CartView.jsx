import React from 'react';

export default function CartView({
  cartData,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onSelectProduct,
  onContinueShopping
}) {
  const { groups = [], grand_total_amd = 0, item_count = 0, has_warnings = false } = cartData || {};

  if (!cartData || item_count === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '4rem 2rem',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '2rem auto'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Ձեր զամբյուղը դատարկ է
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Շարունակեք գնումները և ավելացրեք ապրանքներ մեր տեղական վաճառողներից։
        </p>
        <button className="btn btn-primary" onClick={onContinueShopping}>
          Սկսել գնումները →
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          Զամբյուղ ({item_count} ապրանք)
        </h1>
        <button
          style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
          onClick={onContinueShopping}
        >
          ← Շարունակել գնումները
        </button>
      </div>

      {has_warnings && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          ⚠️ Զամբյուղի որոշ ապրանքների գներ կամ ստոկեր փոխվել են։ Խնդրում ենք ստուգել մինչև պատվիրելը։
        </div>
      )}

      {/* Seller Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        {groups.map((group) => (
          <div
            key={group.seller_id}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Group Header */}
            <div
              style={{
                background: '#f8fafc',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏪 <span>Վաճառող՝ {group.store_name}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Ենթագումար՝ <strong style={{ color: '#0f172a' }}>{group.subtotal_amd.toLocaleString()} ֏</strong>
              </div>
            </div>

            {/* Items in this seller group */}
            <div style={{ padding: '1rem 1.25rem' }}>
              {group.items.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr auto auto',
                    gap: '1.25rem',
                    alignItems: 'center',
                    padding: '1rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  {/* Thumbnail */}
                  <img
                    src={item.main_image || '/placeholder.png'}
                    alt={item.title}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => onSelectProduct(item.product_id)}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23f1f5f9"><rect width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Item</text></svg>';
                    }}
                  />

                  {/* Title & Warning */}
                  <div>
                    <div
                      style={{ fontWeight: 600, fontSize: '1rem', color: '#0f172a', cursor: 'pointer', marginBottom: '0.25rem' }}
                      onClick={() => onSelectProduct(item.product_id)}
                    >
                      {item.title}
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.25rem' }}>
                      {item.current_price_amd.toLocaleString()} ֏ / հատ
                    </div>

                    {item.warning && (
                      <div style={{ color: '#b45309', fontSize: '0.82rem', fontWeight: 600 }}>
                        ⚠️ {item.warning}
                      </div>
                    )}
                  </div>

                  {/* Quantity selector */}
                  <div>
                    <select
                      className="form-control"
                      style={{ width: '75px', padding: '0.4rem' }}
                      value={item.quantity}
                      disabled={item.is_sold_out}
                      onChange={(e) => onUpdateQuantity(item.product_id, parseInt(e.target.value, 10))}
                    >
                      {Array.from({ length: Math.min(item.current_stock, 10) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Total & Remove */}
                  <div style={{ textAlign: 'right', minWidth: '110px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                      {(item.current_price_amd * item.quantity).toLocaleString()} ֏
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onRemoveItem(item.product_id)}
                    >
                      Ջնջել
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Summary Footer */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Ընդհանուր վճարման գումարը՝</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
            {grand_total_amd.toLocaleString()} ֏
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '0.85rem 2rem', fontSize: '1.1rem' }}
          onClick={onProceedToCheckout}
        >
          Անցնել պատվերի ձևակերպմանը →
        </button>
      </div>
    </div>
  );
}
