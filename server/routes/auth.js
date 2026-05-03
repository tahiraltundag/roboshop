const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/schema');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre gereklidir.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      db.close();
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).run(name, email, passwordHash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, email, name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    db.close();
    res.status(201).json({
      message: 'Kayıt başarılı!',
      token,
      user: { id: result.lastInsertRowid, name, email, role: 'user' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    db.close();

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Giriş başarılı!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    db.close();

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
