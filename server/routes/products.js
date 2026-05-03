const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/products/featured
router.get('/featured', (req, res) => {
  try {
    const db = getDb();
    const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.featured = 1 
      ORDER BY p.rating DESC 
      LIMIT 8
    `).all();
    db.close();
    res.json({ products });
  } catch (err) {
    console.error('Featured products error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/products
router.get('/', (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'newest',
      min_price,
      max_price,
      page = 1,
      limit = 12
    } = req.query;

    const db = getDb();
    let whereConditions = ['1=1'];
    let params = [];

    if (category) {
      whereConditions.push('c.slug = ?');
      params.push(category);
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (min_price) {
      whereConditions.push('(COALESCE(p.discount_price, p.price)) >= ?');
      params.push(Number(min_price));
    }

    if (max_price) {
      whereConditions.push('(COALESCE(p.discount_price, p.price)) <= ?');
      params.push(Number(max_price));
    }

    const whereClause = whereConditions.join(' AND ');

    let orderClause;
    switch (sort) {
      case 'price_asc': orderClause = 'COALESCE(p.discount_price, p.price) ASC'; break;
      case 'price_desc': orderClause = 'COALESCE(p.discount_price, p.price) DESC'; break;
      case 'rating': orderClause = 'p.rating DESC'; break;
      case 'name': orderClause = 'p.name ASC'; break;
      default: orderClause = 'p.created_at DESC';
    }

    const offset = (Number(page) - 1) * Number(limit);

    const countResult = db.prepare(`
      SELECT COUNT(*) as total 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE ${whereClause}
    `).get(...params);

    const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE ${whereClause} 
      ORDER BY ${orderClause} 
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    db.close();

    res.json({
      products,
      pagination: {
        total: countResult.total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult.total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ? OR p.slug = ?
    `).get(req.params.id, req.params.id);

    if (!product) {
      db.close();
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    // Related products
    const related = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.category_id = ? AND p.id != ? 
      LIMIT 4
    `).all(product.category_id, product.id);

    // Reviews
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = ? 
      ORDER BY r.created_at DESC
    `).all(product.id);

    db.close();

    res.json({ product, related, reviews });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/products (Admin)
router.post('/', authenticate, adminOnly, (req, res) => {
  try {
    const { name, category_id, description, specs, price, discount_price, stock, image_url, featured } = req.body;

    if (!name || !category_id || !price) {
      return res.status(400).json({ error: 'Ürün adı, kategori ve fiyat gereklidir.' });
    }

    const slug = name.toLowerCase()
      .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO products (category_id, name, slug, description, specs, price, discount_price, stock, image_url, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(category_id, name, slug, description, specs ? JSON.stringify(specs) : null, price, discount_price || null, stock || 0, image_url, featured ? 1 : 0);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    db.close();

    res.status(201).json({ message: 'Ürün oluşturuldu.', product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// PUT /api/products/:id (Admin)
router.put('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const { name, category_id, description, specs, price, discount_price, stock, image_url, featured } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    db.prepare(`
      UPDATE products SET 
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        description = COALESCE(?, description),
        specs = COALESCE(?, specs),
        price = COALESCE(?, price),
        discount_price = ?,
        stock = COALESCE(?, stock),
        image_url = COALESCE(?, image_url),
        featured = COALESCE(?, featured)
      WHERE id = ?
    `).run(name, category_id, description, specs ? JSON.stringify(specs) : null, price, discount_price || null, stock, image_url, featured !== undefined ? (featured ? 1 : 0) : null, req.params.id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    db.close();

    res.json({ message: 'Ürün güncellendi.', product });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// DELETE /api/products/:id (Admin)
router.delete('/:id', authenticate, adminOnly, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    db.close();

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı.' });
    }

    res.json({ message: 'Ürün silindi.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
