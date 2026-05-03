const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.slug, p.price, 
             p.discount_price, p.stock, p.image_url, c.name as category_name
      FROM cart_items ci JOIN products p ON ci.product_id = p.id
      JOIN categories c ON p.category_id = c.id WHERE ci.user_id = ? ORDER BY ci.id DESC
    `).all(req.user.id);
    const total = items.reduce((s, i) => s + ((i.discount_price || i.price) * i.quantity), 0);
    db.close();
    res.json({ items, total, count: items.length });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Ürün ID gereklidir.' });
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) { db.close(); return res.status(404).json({ error: 'Ürün bulunamadı.' }); }
    if (product.stock < quantity) { db.close(); return res.status(400).json({ error: 'Yeterli stok yok.' }); }
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) { db.close(); return res.status(400).json({ error: 'Stok limiti aşıldı.' }); }
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
    }
    const count = db.prepare('SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?').get(req.user.id);
    db.close();
    res.json({ message: 'Ürün sepete eklendi.', cartCount: count.count || 0 });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Geçerli miktar giriniz.' });
    const db = getDb();
    const item = db.prepare('SELECT ci.*, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.id = ? AND ci.user_id = ?').get(req.params.id, req.user.id);
    if (!item) { db.close(); return res.status(404).json({ error: 'Sepet öğesi bulunamadı.' }); }
    if (quantity > item.stock) { db.close(); return res.status(400).json({ error: 'Stok limiti aşıldı.' }); }
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
    db.close();
    res.json({ message: 'Miktar güncellendi.' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    db.close();
    if (result.changes === 0) return res.status(404).json({ error: 'Sepet öğesi bulunamadı.' });
    res.json({ message: 'Ürün sepetten çıkarıldı.' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.delete('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    db.close();
    res.json({ message: 'Sepet temizlendi.' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

module.exports = router;
