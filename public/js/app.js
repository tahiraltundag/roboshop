/* RoboShop - Global App Logic */

// --- Toast Notification System ---
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- Format Currency ---
function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(price);
}

// --- Stars HTML ---
function starsHTML(rating, count) {
  let html = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += i <= Math.round(rating) ? '★' : '☆';
  }
  html += '</span>';
  if (count !== undefined) html += ` <span style="color:var(--text-muted);font-size:0.8rem">(${count})</span>`;
  return html;
}

// --- Render Navbar ---
function renderNavbar() {
  const user = getUser();
  const nav = document.getElementById('navbar');
  if (!nav) return;

  nav.innerHTML = `
    <div class="container">
      <a href="/" class="nav-logo">
        <span class="logo-icon">🤖</span>
        <span>ROBOSHOP</span>
      </a>
      <nav class="nav-links" id="navLinks">
        <a href="/" class="nav-link">Ana Sayfa</a>
        <a href="/products.html" class="nav-link">Ürünler</a>
        <a href="/products.html?category=ai-gelistirme-kitleri" class="nav-link">AI Kitleri</a>
        <a href="/products.html?category=drone-sistemleri" class="nav-link">Droneler</a>
      </nav>
      <div class="nav-actions">
        <button class="nav-cart-btn" onclick="window.location.href='/cart.html'" title="Sepet" id="navCartBtn">
          🛒<span class="cart-badge" id="cartBadge" style="display:none">0</span>
        </button>
        ${user ? `
          <div style="position:relative">
            <button class="nav-user-btn" onclick="toggleDropdown()" id="userBtn">
              👤 ${user.name.split(' ')[0]}
            </button>
            <div class="nav-dropdown" id="userDropdown">
              <a href="/orders.html">📦 Siparişlerim</a>
              ${user.role === 'admin' ? '<a href="/admin.html">⚙️ Admin Paneli</a>' : ''}
              <button onclick="logout()">🚪 Çıkış Yap</button>
            </div>
          </div>
        ` : `
          <a href="/auth.html" class="btn btn-primary btn-sm">Giriş Yap</a>
        `}
        <button class="nav-toggle" onclick="toggleMobileNav()" id="navToggle">☰</button>
      </div>
    </div>
  `;

  // Highlight active nav link
  const fullPath = window.location.pathname + window.location.search;
  let hasExactMatch = false;
  
  nav.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === fullPath) {
      link.classList.add('active');
      hasExactMatch = true;
    }
  });

  // Fallback if no exact match (e.g., general products page)
  if (!hasExactMatch) {
    nav.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('href') === window.location.pathname) {
        link.classList.add('active');
      }
    });
  }

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  updateCartBadge();
}

function toggleDropdown() {
  document.getElementById('userDropdown')?.classList.toggle('active');
}

function toggleMobileNav() {
  document.getElementById('navLinks')?.classList.toggle('active');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const btn = document.getElementById('userBtn');
  if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

// --- Cart Badge ---
async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const user = getUser();
  if (!user) { badge.style.display = 'none'; return; }
  try {
    const data = await api.getCart();
    const count = data.items.reduce((s, i) => s + i.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch { badge.style.display = 'none'; }
}

// --- Add to Cart ---
async function addToCart(productId) {
  const user = getUser();
  if (!user) {
    showToast('Sepete eklemek için giriş yapmalısınız.', 'error');
    setTimeout(() => window.location.href = '/auth.html', 1500);
    return;
  }
  try {
    await api.addToCart(productId);
    showToast('Ürün sepete eklendi!', 'success');
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Logout ---
function logout() {
  removeToken();
  showToast('Çıkış yapıldı.', 'info');
  setTimeout(() => window.location.href = '/', 1000);
}

// --- Render Footer ---
function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="nav-logo"><span class="logo-icon">🤖</span><span>ROBOSHOP</span></a>
          <p>Türkiye'nin lider robotik cihaz platformu. Endüstriyel robotlardan AI geliştirme kitlerine kadar geniş ürün yelpazesi.</p>
        </div>
        <div>
          <h4 class="footer-title">Hızlı Linkler</h4>
          <div class="footer-links">
            <a href="/">Ana Sayfa</a>
            <a href="/products.html">Tüm Ürünler</a>
            <a href="/auth.html">Hesabım</a>
          </div>
        </div>
        <div>
          <h4 class="footer-title">Kategoriler</h4>
          <div class="footer-links">
            <a href="/products.html?category=endustriyel-robot-kollar">Robot Kollar</a>
            <a href="/products.html?category=drone-sistemleri">Droneler</a>
            <a href="/products.html?category=ai-gelistirme-kitleri">AI Kitleri</a>
            <a href="/products.html?category=egitim-robotlari">Eğitim</a>
          </div>
        </div>
        <div>
          <h4 class="footer-title">İletişim</h4>
          <div class="footer-links">
            <a href="#">📧 info@roboshop.com</a>
            <a href="#">📞 +90 212 555 0000</a>
            <a href="#">📍 İstanbul, Türkiye</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 RoboShop. Tüm hakları saklıdır.</span>
        <span>🤖 Geleceği bugünden inşa edin.</span>
      </div>
    </div>
  `;
}

// --- Product Card HTML ---
function productCardHTML(product) {
  const price = product.discount_price || product.price;
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discount = hasDiscount ? Math.round((1 - product.discount_price / product.price) * 100) : 0;

  return `
    <div class="product-card" onclick="window.location.href='/product-detail.html?id=${product.slug || product.id}'">
      <div class="product-card-image">
        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="product-placeholder" style="display:none">🤖</span>` : `<span class="product-placeholder">🤖</span>`}
        ${hasDiscount ? `<span class="product-card-badge"><span class="badge badge-red">%${discount} İndirim</span></span>` : ''}
      </div>
      <div class="product-card-body">
        <div class="product-card-category">${product.category_name || ''}</div>
        <h3 class="product-card-title">${product.name}</h3>
        <div class="product-card-rating">${starsHTML(product.rating)} <span>(${product.review_count})</span></div>
        <div class="product-card-price">
          <span class="current-price">${formatPrice(price)}</span>
          ${hasDiscount ? `<span class="original-price">${formatPrice(product.price)}</span>` : ''}
        </div>
      </div>
      <div class="product-card-footer">
        <span class="badge ${product.stock > 0 ? 'badge-green' : 'badge-red'}">${product.stock > 0 ? 'Stokta' : 'Tükendi'}</span>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();addToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>🛒 Sepete Ekle</button>
      </div>
    </div>
  `;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
});
