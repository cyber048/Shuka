import React, { useState } from 'react';
import { apiLogin, apiRegister, apiActivateSeller } from '../api';

export default function AuthModal({ initialMode = 'login', onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'seller_activate'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+374 ');
  const [storeName, setStoreName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const user = await apiLogin(email.trim(), password);
        onSuccess(user, 'Մուտքը հաջողվեց։');
      } else if (mode === 'register') {
        const user = await apiRegister({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim()
        });
        onSuccess(user, 'Գրանցումը հաջողվեց։ Բարի գալուստ Shuka!');
      } else if (mode === 'seller_activate') {
        const user = await apiActivateSeller({
          store_name: storeName.trim(),
          phone: phone.trim()
        });
        onSuccess(user, 'Շնորհավորում ենք։ Դուք ակտիվացրիք վաճառողի պրոֆիլը։');
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Գործողությունը ձախողվեց։');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'login' && 'Մուտք Shuka'}
            {mode === 'register' && 'Ստեղծել նոր հաշիվ'}
            {mode === 'seller_activate' && 'Դառնալ վաճառող Shuka-ում'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Mode Switcher */}
        {mode !== 'seller_activate' && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                background: 'none',
                fontWeight: mode === 'login' ? 700 : 500,
                borderBottom: mode === 'login' ? '2px solid #f59e0b' : 'none',
                color: mode === 'login' ? '#0f172a' : '#64748b'
              }}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              Մուտք
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                background: 'none',
                fontWeight: mode === 'register' ? 700 : 500,
                borderBottom: mode === 'register' ? '2px solid #f59e0b' : 'none',
                color: mode === 'register' ? '#0f172a' : '#64748b'
              }}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
            >
              Գրանցում
            </button>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'seller_activate' ? (
            <>
              <div className="form-group">
                <label className="form-label">Խանութի անվանում (Store Name) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Օրինակ՝ Արցախ Բարիքներ"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Վաճառողի կոնտակտային հեռախոսահամար *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+374 91 000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Անուն, ազգանուն *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Օրինակ՝ Կարեն Պետրոսյան"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Էլ. հասցե (Email) *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Հեռախոսահամար *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+374 77 000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Գաղտնաբառ (Password) *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Առնվազն 6 նիշ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Կատարվում է...' : mode === 'login' ? 'Մուտք գործել' : mode === 'register' ? 'Գրանցվել' : 'Ակտիվացնել վաճառողի հաշիվը'}
          </button>
        </form>

        {mode === 'login' && (
          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
            Փորձարկման համար կարող եք օգտագործել՝<br />
            <strong>buyer1@shuka.am</strong> կամ <strong>ararat.tech@shuka.am</strong><br />
            Գաղտնաբառ՝ <code>password123</code>
          </div>
        )}
      </div>
    </div>
  );
}
