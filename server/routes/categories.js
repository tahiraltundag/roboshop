const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON p.category_id = c.id 
      GROUP BY c.id 
      ORDER BY c.name
    `).all();
    db.close();
    res.json({ categories });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/categories/:slug
router.get('/:slug', (req, res) => {
  try {
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
    if (!category) {
      db.close();
      return res.status(404).json({ error: 'Kategori bulunamadı.' });
    }
    db.close();
    res.json({ category });
  } catch (err) {
    console.error('Category detail error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/categories (Admin)
router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Kategori adı gereklidir.' });

    const slug = name.toLowerCase()
      .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO categories (name, slug, icon, description) VALUES (?, ?, ?, ?)'
    ).run(name, slug, icon, description);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    db.close();

    res.status(201).json({ message: 'Kategori oluşturuldu.', category });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
