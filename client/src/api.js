export async function req(endpoint, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.code = data?.error?.code || 'UNKNOWN_ERROR';
    err.data = data;
    throw err;
  }

  return data;
}

// Auth
export const apiLogin = (email, password) =>
  req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const apiRegister = (userData) =>
  req('/auth/register', { method: 'POST', body: JSON.stringify(userData) });

export const apiLogout = () =>
  req('/auth/logout', { method: 'POST' });

export const apiGetMe = () =>
  req('/auth/me');

export const apiUpdateMe = (data) =>
  req('/auth/me', { method: 'PATCH', body: JSON.stringify(data) });

export const apiActivateSeller = (data) =>
  req('/seller/activate', { method: 'POST', body: JSON.stringify(data) });

// Catalog
export const apiGetCategories = () =>
  req('/categories');

export const apiGetProducts = (params = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  }
  return req(`/products?${query.toString()}`);
};

export const apiGetProduct = (id) =>
  req(`/products/${id}`);

export const apiGetProductReviews = (id) =>
  req(`/products/${id}/reviews`);

// Cart
export const apiGetCart = () =>
  req('/cart');

export const apiAddToCart = (productId, quantity = 1) =>
  req(`/cart/items/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity }) });

export const apiRemoveCartItem = (productId) =>
  req(`/cart/items/${productId}`, { method: 'DELETE' });

// Orders & Checkout
export const apiGetLastAddress = () =>
  req('/orders/last-address');

export const apiSubmitOrder = (orderData) =>
  req('/orders', { method: 'POST', body: JSON.stringify(orderData) });

export const apiGetOrders = () =>
  req('/orders');

export const apiGetOrderDetail = (id) =>
  req(`/orders/${id}`);

export const apiCancelSellerOrder = (orderId, sellerOrderId) =>
  req(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`, { method: 'POST' });

export const apiSubmitReview = (productId, rating, body) =>
  req(`/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify({ rating, body }) });

// Seller Dashboard
export const apiGetSellerOverview = () =>
  req('/seller/overview');

export const apiGetSellerProducts = () =>
  req('/seller/products');

export const apiCreateSellerProduct = (productData) =>
  req('/seller/products', { method: 'POST', body: JSON.stringify(productData) });

export const apiUpdateSellerProduct = (id, productData) =>
  req(`/seller/products/${id}`, { method: 'PATCH', body: JSON.stringify(productData) });

export const apiUploadProductImage = (productId, formData) =>
  req(`/seller/products/${productId}/images`, { method: 'POST', body: formData });

export const apiDeleteProductImage = (productId, imageId) =>
  req(`/seller/products/${productId}/images/${imageId}`, { method: 'DELETE' });

export const apiGetSellerOrders = (status = '') =>
  req(`/seller/orders?status=${status}`);

export const apiGetSellerOrderDetail = (id) =>
  req(`/seller/orders/${id}`);

export const apiUpdateOrderStatus = (sellerOrderId, toStatus) =>
  req(`/seller/orders/${sellerOrderId}/status`, { method: 'POST', body: JSON.stringify({ to: toStatus }) });
