require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initializeDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDb();

// Middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));

// API stats for admin dashboard
app.get('/api/stats', (req, res) => {
  try {
    const { getDb } = require('./db/schema');
    const db = getDb();
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const revenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != ?').get('cancelled');
    db.close();
    res.json({ products: products.count, users: users.count, orders: orders.count, revenue: revenue.total });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint bulunamadı.' });
  }
  // Check if a specific html file exists
  const htmlPath = path.join(__dirname, '..', 'public', req.path.endsWith('.html') ? req.path : req.path + '.html');
  const fs = require('fs');
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 RoboShop sunucusu çalışıyor: http://0.0.0.0:${PORT}\n`);
});
