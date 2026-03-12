const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { Pool } = require('pg');
const pool     = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require('../middleware/auth');

const STORAGE_PATH = process.env.STORAGE_PATH || '/data';

// stockage avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}${ext}`);
  },
});
const upload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/users/avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_path = $1 WHERE id = $2', [avatarPath, req.user.id]);
    res.json({ avatar_path: avatarPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/users/email
router.put('/email', authenticateToken, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email invalide' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
    if (exists.rows.length) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);
    res.json({ message: 'Email mis à jour' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/users/password
router.put('/password', authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 10)
    return res.status(400).json({ error: 'Mot de passe trop court (10 car. min)' });
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/account
router.delete('/account', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // récupérer tous les fichiers physiques via CTE récursive (même pattern que trash.js)
    const filesRes = await client.query(
      `WITH RECURSIVE subordinates AS (
        SELECT id, type, storage_path FROM nodes WHERE user_id = $1
        UNION
        SELECT n.id, n.type, n.storage_path FROM nodes n
        INNER JOIN subordinates s ON s.id = n.parent_id
      ) SELECT * FROM subordinates WHERE type = 'file' AND storage_path IS NOT NULL`,
      [req.user.id]
    );

    // supprimer nodes (cascade supprime shares + internal_shares via FK)
    await client.query('DELETE FROM nodes WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM users WHERE id = $1',      [req.user.id]);

    await client.query('COMMIT');

    // supprimer fichiers physiques après commit
    for (const row of filesRes.rows) {
      try { fs.unlinkSync(path.join(STORAGE_PATH, row.storage_path)); } catch { /* absent */ }
    }

    // supprimer avatars
    const avatarDir = path.join(__dirname, '../uploads/avatars');
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      try { fs.unlinkSync(path.join(avatarDir, `avatar_${req.user.id}${ext}`)); } catch { /* absent */ }
    }

    res.json({ message: 'Compte supprimé' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erreur suppression compte:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
