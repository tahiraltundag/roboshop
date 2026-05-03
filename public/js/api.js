/* RoboShop - API Wrapper */
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('roboshop_token');
}

function setToken(token) {
  localStorage.setItem('roboshop_token', token);
}

function removeToken() {
  localStorage.removeItem('roboshop_token');
  localStorage.removeItem('roboshop_user');
}

function getUser() {
  const u = localStorage.getItem('roboshop_user');
  return u ? JSON.parse(u) : null;
}

function setUser(user) {
  localStorage.setItem('roboshop_user', JSON.stringify(user));
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Bir hata oluştu.');
    }
    return data;
  } catch (err) {
    if (err.message === 'Geçersiz veya süresi dolmuş token.') {
      removeToken();
      window.location.href = '/auth.html';
    }
    throw err;
  }
}

const api = {
  // Auth
  register: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch('/auth/me'),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/products?${q}`);
  },
  getFeatured: () => apiFetch('/products/featured'),
  getProduct: (id) => apiFetch(`/products/${id}`),
  createProduct: (data) => apiFetch('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => apiFetch(`/products/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => apiFetch('/categories'),

  // Cart
  getCart: () => apiFetch('/cart'),
  addToCart: (product_id, quantity = 1) => apiFetch('/cart', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
  updateCartItem: (id, quantity) => apiFetch(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  removeFromCart: (id) => apiFetch(`/cart/${id}`, { method: 'DELETE' }),
  clearCart: () => apiFetch('/cart', { method: 'DELETE' }),

  // Orders
  createOrder: (data) => apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => apiFetch('/orders'),
  getOrder: (id) => apiFetch(`/orders/${id}`),
  updateOrderStatus: (id, status) => apiFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Reviews
  getReviews: (productId) => apiFetch(`/reviews/product/${productId}`),
  addReview: (data) => apiFetch('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Stats
  getStats: () => apiFetch('/stats'),
};
