const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, (req, res) => {
  try {
    const { shipping_name, shipping_address, shipping_city, shipping_phone, payment_method } = req.body;
    if (!shipping_name || !shipping_address || !shipping_city || !shipping_phone) {
      return res.status(400).json({ error: 'Teslimat bilgileri gereklidir.' });
    }
    const db = getDb();
    const cartItems = db.prepare(`
      SELECT ci.*, p.name as product_name, p.price, p.discount_price, p.stock
      FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?
    `).all(req.user.id);
    if (cartItems.length === 0) { db.close(); return res.status(400).json({ error: 'Sepetiniz boş.' }); }

    const total = cartItems.reduce((s, i) => s + ((i.discount_price || i.price) * i.quantity), 0);

    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, status, total, shipping_name, shipping_address, shipping_city, shipping_phone, payment_method)
      VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, total, shipping_name, shipping_address, shipping_city, shipping_phone, payment_method || 'credit_card');

    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)');
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const item of cartItems) {
      insertItem.run(orderResult.lastInsertRowid, item.product_id, item.product_name, item.quantity, item.discount_price || item.price);
      updateStock.run(item.quantity, item.product_id);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    db.close();

    res.status(201).json({ message: 'Sipariş oluşturuldu!', orderId: orderResult.lastInsertRowid });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    let orders;
    if (req.user.role === 'admin') {
      orders = db.prepare(`SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`).all();
    } else {
      orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    }
    db.close();
    res.json({ orders });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) { db.close(); return res.status(404).json({ error: 'Sipariş bulunamadı.' }); }
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) { db.close(); return res.status(403).json({ error: 'Yetkisiz erişim.' }); }

    const items = db.prepare(`SELECT oi.*, p.image_url, p.slug FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`).all(order.id);
    db.close();
    res.json({ order, items });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.put('/:id/status', authenticate, adminOnly, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Geçersiz durum.' });
    const db = getDb();
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    db.close();
    res.json({ message: 'Sipariş durumu güncellendi.' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

module.exports = router;
