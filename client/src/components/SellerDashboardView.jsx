import React, { useState, useEffect } from 'react';
import {
  apiGetSellerOverview,
  apiGetSellerProducts,
  apiCreateSellerProduct,
  apiUpdateSellerProduct,
  apiUploadProductImage,
  apiDeleteProductImage,
  apiGetSellerOrders,
  apiGetSellerOrderDetail,
  apiUpdateOrderStatus
} from '../api';

export default function SellerDashboardView({ user, categories, onBackToStore }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'products' | 'orders'

  // Overview State
  const [overview, setOverview] = useState(null);

  // Products State
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null); // null or product object or 'new'
  const [productForm, setProductForm] = useState({
    title: '',
    category_id: categories[0]?.id || 1,
    description: '',
    price_amd: '',
    stock: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Orders State
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [ordersData, setOrdersData] = useState({ counts: {}, orders: [] });
  const [selectedSellerOrder, setSelectedSellerOrder] = useState(null);

  // Load Overview
  const loadOverview = async () => {
    try {
      const data = await apiGetSellerOverview();
      setOverview(data);
    } catch (err) {
      console.error('Error loading seller overview:', err);
    }
  };

  // Load Products
  const loadProducts = async () => {
    try {
      const data = await apiGetSellerProducts();
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading seller products:', err);
    }
  };

  // Load Orders
  const loadOrders = async (status = orderStatusFilter) => {
    try {
      const data = await apiGetSellerOrders(status === 'all' ? '' : status);
      setOrdersData(data);
    } catch (err) {
      console.error('Error loading seller orders:', err);
    }
  };

  useEffect(() => {
    loadOverview();
    loadProducts();
    loadOrders('all');
  }, []);

  // Handle Product Edit / Add
  const handleOpenAddProduct = () => {
    setProductForm({
      title: '',
      category_id: categories[0]?.id || 1,
      description: '',
      price_amd: '',
      stock: ''
    });
    setFormErrors({});
    setEditingProduct('new');
  };

  const handleOpenEditProduct = (prod) => {
    setProductForm({
      title: prod.title,
      category_id: prod.category_id,
      description: prod.description,
      price_amd: prod.price_amd,
      stock: prod.stock
    });
    setFormErrors({});
    setEditingProduct(prod);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!productForm.title.trim()) errors.title = 'Անվանումը պարտադիր է';
    if (!productForm.description.trim()) errors.description = 'Նկարագրությունը պարտադիր է';
    if (!productForm.price_amd || parseInt(productForm.price_amd, 10) <= 0) errors.price_amd = 'Գինը պետք է լինի դրական թիվ';
    if (productForm.stock === '' || parseInt(productForm.stock, 10) < 0) errors.stock = 'Քանակը չի կարող բացասական լինել';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSavingProduct(true);
    setFormErrors({});

    try {
      if (editingProduct === 'new') {
        const created = await apiCreateSellerProduct({
          ...productForm,
          price_amd: parseInt(productForm.price_amd, 10),
          stock: parseInt(productForm.stock, 10)
        });
        setEditingProduct(created);
      } else {
        const updated = await apiUpdateSellerProduct(editingProduct.id, {
          ...productForm,
          price_amd: parseInt(productForm.price_amd, 10),
          stock: parseInt(productForm.stock, 10)
        });
        setEditingProduct(updated);
      }
      loadProducts();
      alert('Ապրանքը հաջողությամբ պահպանվեց։');
    } catch (err) {
      setFormErrors({ general: err.message || 'Չհաջողվեց պահպանել' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleTogglePublish = async (prod) => {
    try {
      await apiUpdateSellerProduct(prod.id, {
        is_published: prod.is_published === 1 ? 0 : 1
      });
      loadProducts();
    } catch (err) {
      alert(err.message || 'Չհաջողվեց փոխել հրապարակման կարգավիճակը');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingProduct || editingProduct === 'new') return;

    setUploadingImage(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      await apiUploadProductImage(editingProduct.id, formData);
      loadProducts();
      // Reload current product images
      const prodList = await apiGetSellerProducts();
      const cur = prodList.find((p) => p.id === editingProduct.id);
      if (cur) setEditingProduct(cur);
    } catch (err) {
      setUploadError(err.message || 'Նկարի բեռնման սխալ');
    } finally {
      setUploadingImage(false);
    }
  };

  // Orders Status change
  const handleStatusChange = async (sellerOrderId, toStatus) => {
    try {
      await apiUpdateOrderStatus(sellerOrderId, toStatus);
      const updated = await apiGetSellerOrderDetail(sellerOrderId);
      setSelectedSellerOrder(updated);
      loadOrders(orderStatusFilter);
      loadOverview();
      alert(`Կարգավիճակը փոխվեց՝ ${toStatus}`);
    } catch (err) {
      alert(err.message || 'Կարգավիճակի փոփոխությունը մերժվեց');
    }
  };

  const handleSelectSellerOrder = async (id) => {
    try {
      const detail = await apiGetSellerOrderDetail(id);
      setSelectedSellerOrder(detail);
    } catch (err) {
      alert(err.message || 'Չհաջողվեց բեռնել պատվերը');
    }
  };

  return (
    <div>
      {/* Dashboard Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          background: '#ffffff',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            🏪 {user.store_name}
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Վաճառողի վահանակ • Հեռ.՝ {user.phone}
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={onBackToStore}>
          ← Դեպի Խանութ
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Ընդհանուր վիճակագրություն
        </button>
        <button
          className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => {
            setActiveTab('products');
            setEditingProduct(null);
          }}
        >
          📦 Ապրանքներ ({products.length})
        </button>
        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => {
            setActiveTab('orders');
            setSelectedSellerOrder(null);
          }}
        >
          📋 Պատվերներ ({ordersData.counts?.all || 0})
        </button>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                borderLeft: '4px solid #f59e0b'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                ՀԱՍՏԱՏՄԱՆ ԵՆԹԱԿԱ ՊԱՏՎԵՐՆԵՐ
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0' }}>
                {overview?.orders_to_confirm || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Placed կարգավիճակում գտնվող պատվերներ
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                borderLeft: '4px solid #2563eb'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                ԱՌԱՔՄԱՆ ԵՆԹԱԿԱ ՊԱՏՎԵՐՆԵՐ
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0' }}>
                {overview?.orders_to_ship || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Confirmed կարգավիճակում գտնվող պատվերներ
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                borderLeft: '4px solid #16a34a'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                ԵԿԱՄՈՒՏ ՎԵՐՋԻՆ 30 ՕՐՈՒՄ
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#16a34a', margin: '0.5rem 0' }}>
                {(overview?.delivered_revenue_30d_amd || 0).toLocaleString()} ֏
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Առաքված (Delivered) պատվերներից
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: PRODUCTS */}
      {activeTab === 'products' && !editingProduct && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Իմ Ապրանքները</h2>
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddProduct}>
              + Ավելացնել նոր ապրանք
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Նկար</th>
                  <th>Անվանում</th>
                  <th>Բաժին</th>
                  <th>Գին (AMD)</th>
                  <th>Ստոկ</th>
                  <th>Կարգավիճակ</th>
                  <th>Վաճառված</th>
                  <th>Գործողություն</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <img
                        src={p.thumbnail || '/placeholder.png'}
                        alt=""
                        style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td>{p.category_name}</td>
                    <td style={{ fontWeight: 700 }}>{p.price_amd.toLocaleString()} ֏</td>
                    <td>
                      <span className={`badge ${p.stock === 0 ? 'badge-out-of-stock' : p.stock <= 2 ? 'badge-low-stock' : 'badge-in-stock'}`}>
                        {p.stock} հատ
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.is_published ? 'badge-in-stock' : 'badge-out-of-stock'}`}>
                        {p.is_published ? 'Հրապարակված' : 'Թաքցված'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.units_sold || 0} հատ</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditProduct(p)}
                        >
                          Խմբագրել
                        </button>
                        <button
                          className={`btn ${p.is_published ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                          onClick={() => handleTogglePublish(p)}
                        >
                          {p.is_published ? 'Ապահրապարակել' : 'Հրապարակել'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT EDITOR (Add / Edit) */}
      {activeTab === 'products' && editingProduct && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            maxWidth: '750px',
            margin: '0 auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              {editingProduct === 'new' ? 'Ավելացնել նոր ապրանք' : 'Խմբագրել ապրանքը'}
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditingProduct(null)}>
              ✕ Փակել
            </button>
          </div>

          {formErrors.general && (
            <div className="alert alert-danger">{formErrors.general}</div>
          )}

          <form onSubmit={handleSaveProduct}>
            <div className="form-group">
              <label className="form-label">Անվանում (Title) *</label>
              <input
                type="text"
                className="form-control"
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
              />
              {formErrors.title && <div className="form-error">{formErrors.title}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Բաժին (Category) *</label>
                <select
                  className="form-control"
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: parseInt(e.target.value, 10) })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Գին AMD (Price) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={productForm.price_amd}
                  onChange={(e) => setProductForm({ ...productForm, price_amd: e.target.value })}
                />
                {formErrors.price_amd && <div className="form-error">{formErrors.price_amd}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ստոկ / Քանակ պահեստում (Stock) *</label>
              <input
                type="number"
                className="form-control"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              />
              {formErrors.stock && <div className="form-error">{formErrors.stock}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Նկարագրություն (Description) *</label>
              <textarea
                className="form-control"
                rows="4"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
              {formErrors.description && <div className="form-error">{formErrors.description}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingProduct(null)}
              >
                Չեղարկել
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProduct}
              >
                {savingProduct ? 'Պահպանվում է...' : '💾 Պահպանել տվյալները'}
              </button>
            </div>
          </form>

          {/* Image Upload section for existing product */}
          {editingProduct !== 'new' && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                📸 Ապրանքի նկարներ (առավելագույնը 5 նկար)
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Նկարները ավտոմատ օպտիմիզացվում են WebP ֆորմատի և ստեղծվում են thumbnail-ներ։
              </p>

              {uploadError && <div className="alert alert-danger">{uploadError}</div>}

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage && <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem' }}>Բեռնվում է...</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: ORDERS */}
      {activeTab === 'orders' && !selectedSellerOrder && (
        <div>
          {/* Order Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {[
              { id: 'all', label: 'Բոլորը' },
              { id: 'placed', label: 'Placed' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'shipped', label: 'Shipped' },
              { id: 'delivered', label: 'Delivered' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`btn ${orderStatusFilter === tab.id ? 'btn-dark' : 'btn-secondary'} btn-sm`}
                onClick={() => {
                  setOrderStatusFilter(tab.id);
                  loadOrders(tab.id);
                }}
              >
                {tab.label} ({ordersData.counts?.[tab.id] || 0})
              </button>
            ))}
          </div>

          {/* Orders Table */}
          {ordersData.orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '8px' }}>
              Այս կարգավիճակում պատվերներ չկան։
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Պատվերի #</th>
                    <th>Ստացող</th>
                    <th>Հասցե</th>
                    <th>Ապրանքներ</th>
                    <th>Գումար (AMD)</th>
                    <th>Կարգավիճակ</th>
                    <th>Ամսաթիվ</th>
                    <th>Գործողություն</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData.orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700 }}>#{o.id}</td>
                      <td>
                        <div>{o.recipient}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.recipient_phone}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{o.region}, {o.city}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {o.items?.map((it) => `${it.title} (${it.quantity})`).join(', ')}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{o.subtotal_amd.toLocaleString()} ֏</td>
                      <td>
                        <span className={`badge badge-status-${o.status}`}>
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(o.created_at).toLocaleDateString('hy-AM')}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSelectSellerOrder(o.id)}
                        >
                          Դիտել
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SELLER ORDER DETAIL */}
      {activeTab === 'orders' && selectedSellerOrder && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <button
                onClick={() => setSelectedSellerOrder(null)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem' }}
              >
                ← Բոլոր պատվերները
              </button>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                Վաճառողի պատվեր #{selectedSellerOrder.id} (Հիմնական #{selectedSellerOrder.order_id})
              </h2>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Կանխիկ գանձման ենթակա՝</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>
                {selectedSellerOrder.subtotal_amd.toLocaleString()} ֏
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>📍 Առաքման տվյալներ</h3>
            <div style={{ fontSize: '0.9rem', color: '#334155' }}>
              <div><strong>Ստացող՝</strong> {selectedSellerOrder.recipient}</div>
              <div><strong>Հեռախոս՝</strong> {selectedSellerOrder.recipient_phone}</div>
              <div><strong>Հասցե՝</strong> {selectedSellerOrder.region}, {selectedSellerOrder.city}, {selectedSellerOrder.street}, {selectedSellerOrder.apartment}</div>
              {selectedSellerOrder.note && <div><strong>Նշում՝</strong> {selectedSellerOrder.note}</div>}
            </div>
          </div>

          {/* Items */}
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Պատվիրված ապրանքներ</h3>
          <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {selectedSellerOrder.items?.map((it) => (
              <div
                key={it.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{it.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {it.quantity} հատ × {it.unit_price_amd.toLocaleString()} ֏
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {(it.quantity * it.unit_price_amd).toLocaleString()} ֏
                </div>
              </div>
            ))}
          </div>

          {/* State Machine Transition Actions */}
          <div
            style={{
              background: '#f1f5f9',
              padding: '1.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Ընթացիկ կարգավիճակ՝ <span className={`badge badge-status-${selectedSellerOrder.status}`}>{selectedSellerOrder.status.toUpperCase()}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {selectedSellerOrder.allowed_moves?.includes('confirmed') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStatusChange(selectedSellerOrder.id, 'confirmed')}
                >
                  ✓ Հաստատել պատվերը (Confirm)
                </button>
              )}
              {selectedSellerOrder.allowed_moves?.includes('shipped') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStatusChange(selectedSellerOrder.id, 'shipped')}
                >
                  🚚 Առաքել (Ship)
                </button>
              )}
              {selectedSellerOrder.allowed_moves?.includes('delivered') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStatusChange(selectedSellerOrder.id, 'delivered')}
                >
                  🎉 Առաքված և վճարված (Delivered)
                </button>
              )}
              {selectedSellerOrder.allowed_moves?.includes('cancelled') && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleStatusChange(selectedSellerOrder.id, 'cancelled')}
                >
                  ✕ Չեղարկել (Cancel & Restore Stock)
                </button>
              )}
            </div>
          </div>

          {/* Status History */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
              Կարգավիճակի պատմություն (Status History)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {selectedSellerOrder.status_history?.map((sh) => (
                <div key={sh.id} style={{ fontSize: '0.85rem', color: '#475569' }}>
                  • <strong>{sh.to_status.toUpperCase()}</strong> — {new Date(sh.created_at).toLocaleString('hy-AM')}
                  {sh.changed_by_name && ` (կատարեց՝ ${sh.changed_by_name})`}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
