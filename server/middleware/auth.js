const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'roboshop_super_secret_key_2026_x7k9m2';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gereklidir.' });
  }
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // token geçersiz ama devam et
    }
  }
  next();
}

module.exports = { authenticate, adminOnly, optionalAuth, JWT_SECRET };
