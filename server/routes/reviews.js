const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/product/:id', (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name FROM reviews r
      JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC
    `).all(req.params.id);
    db.close();
    res.json({ reviews });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating) return res.status(400).json({ error: 'Ürün ve puan gereklidir.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Puan 1-5 arası olmalıdır.' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM reviews WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) { db.close(); return res.status(400).json({ error: 'Bu ürüne zaten yorum yaptınız.' }); }

    db.prepare('INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)').run(req.user.id, product_id, rating, comment);

    // Update product rating
    const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?').get(product_id);
    db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?').run(Math.round(stats.avg_rating * 10) / 10, stats.count, product_id);
    db.close();

    res.status(201).json({ message: 'Yorum eklendi.' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

module.exports = router;
