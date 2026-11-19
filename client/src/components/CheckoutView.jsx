import React, { useState, useEffect } from 'react';
import { apiGetLastAddress, apiSubmitOrder } from '../api';

const REGIONS = [
  'Yerevan',
  'Aragatsotn',
  'Ararat',
  'Armavir',
  'Gegharkunik',
  'Kotayk',
  'Lori',
  'Shirak',
  'Syunik',
  'Tavush',
  'Vayots Dzor'
];

export default function CheckoutView({
  cartData,
  onOrderSuccess,
  onBackToCart
}) {
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Yerevan');
  const [city, setCity] = useState('Yerevan');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [note, setNote] = useState('');

  const [loadingAddress, setLoadingAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill last address
  useEffect(() => {
    async function fetchLast() {
      try {
        const last = await apiGetLastAddress();
        if (last) {
          if (last.recipient) setRecipient(last.recipient);
          if (last.phone) setPhone(last.phone);
          if (last.region) setRegion(last.region);
          if (last.city) setCity(last.city);
          if (last.street) setStreet(last.street);
          if (last.apartment) setApartment(last.apartment);
          if (last.note) setNote(last.note);
        }
      } catch (err) {
        console.error('Error fetching last address:', err);
      } finally {
        setLoadingAddress(false);
      }
    }
    fetchLast();
  }, []);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (submitting) return; // Locks after 1 click!

    if (!recipient.trim() || !phone.trim() || !city.trim() || !street.trim() || !apartment.trim()) {
      setError('Խնդրում ենք լրացնել առաքման բոլոր պարտադիր դաշտերը։');
      return;
    }

    setSubmitting(true);
    setError(null);

    const requestKey = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await apiSubmitOrder({
        recipient: recipient.trim(),
        phone: phone.trim(),
        region,
        city: city.trim(),
        street: street.trim(),
        apartment: apartment.trim(),
        note: note ? note.trim() : null,
        request_key: requestKey
      });

      onOrderSuccess(res.order_id);
    } catch (err) {
      setError(err.message || 'Չհաջողվեց կատարել պատվերը։');
      setSubmitting(false);
    }
  };

  const { groups = [], grand_total_amd = 0 } = cartData || {};

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <button
        onClick={onBackToCart}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1rem'
        }}
      >
        ← Վերադառնալ զամբյուղ
      </button>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        Պատվերի ձևակերպում
      </h1>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            📍 Առաքման հասցե և տվյալներ
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Ստացողի անուն, ազգանուն *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Օրինակ՝ Արմեն Պետրոսյան"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Հեռախոսահամար *</label>
              <input
                type="text"
                className="form-control"
                placeholder="+374 91 000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Մարզ / Քաղաք *</label>
              <select
                className="form-control"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  if (e.target.value === 'Yerevan') setCity('Yerevan');
                }}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Քաղաք կամ գյուղ *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Քաղաք կամ գյուղ"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Փողոց *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Փողոցի անվանումը"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Շենք և բնակարան *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Շենք 12, բն. 4"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Նշում առաքիչի համար (ոչ պարտադիր)</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Դոմոֆոնի կոդը կամ այլ մանրամասներ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Order Summary & Items Per Seller */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            marginBottom: '2rem'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            📦 Պատվերի կազմը (ըստ վաճառողների)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {groups.map((g) => (
              <div
                key={g.seller_id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem'
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                  🏪 {g.store_name} ({g.subtotal_amd.toLocaleString()} ֏)
                </div>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#475569' }}>
                  {g.items.map((it) => (
                    <li key={it.product_id}>
                      {it.title} — {it.quantity} հատ × {it.current_price_amd.toLocaleString()} ֏
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Payment Notice */}
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 600
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>💵</span>
            <div>
              Վճարման եղանակ՝ <strong>Կանխիկ առաքման պահին</strong> (Payment: Cash on delivery)
            </div>
          </div>

          {/* Place Order Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ընդհանուր վճարման ենթակա՝</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                {grand_total_amd.toLocaleString()} ֏
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.9rem 2.5rem', fontSize: '1.15rem' }}
              disabled={submitting}
            >
              {submitting ? 'Ձևակերպվում է...' : '✓ Հաստատել պատվերը'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
