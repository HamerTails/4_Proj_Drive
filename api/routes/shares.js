const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");

// -----------------------------------------------------------------------
// PARTAGE PUBLIC
// -----------------------------------------------------------------------

// POST /api/shares — créer un lien public
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { node_id, expires_at } = req.body;
    if (!node_id) return res.status(400).json({ error: "node_id requis" });

    const nodeCheck = await pool.query(
      "SELECT id FROM nodes WHERE id = $1 AND user_id = $2",
      [node_id, req.user.id]
    );
    if (nodeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Node introuvable" });
    }

    const token = uuidv4();

    const result = await pool.query(
      `INSERT INTO shares (node_id, token, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [node_id, token, expires_at || null]
    );

    res.status(201).json({
      share: result.rows[0],
      link: `${process.env.WEB_URL || "http://localhost:3001"}/public/${token}`,
    });
  } catch (err) {
    console.error("Erreur création partage:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/shares/public/:token — accéder à un fichier partagé
router.get("/public/:token", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, n.name, n.mime_type, n.storage_path, n.type, n.size
       FROM shares s
       JOIN nodes n ON n.id = s.node_id
       WHERE s.token = $1`,
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lien introuvable" });
    }

    const share = result.rows[0];

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: "Ce lien de partage a expiré" });
    }

    res.json({
      name: share.name,
      mime_type: share.mime_type,
      type: share.type,
      size: share.size,
      node_id: share.node_id,
      token: share.token,
    });
  } catch (err) {
    console.error("Erreur accès partage public:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/shares/:id — supprimer un lien public
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM shares s
       USING nodes n
       WHERE s.id = $1 AND s.node_id = n.id AND n.user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Partage supprimé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// -----------------------------------------------------------------------
// PARTAGE INTERNE
// Colonnes réelles : from_user_id, to_user_id
// -----------------------------------------------------------------------

// POST /api/shares/internal — partager avec un utilisateur par email
router.post("/internal", authenticateToken, async (req, res) => {
  try {
    const { node_id, email } = req.body;
    if (!node_id || !email) {
      return res.status(400).json({ error: "node_id et email requis" });
    }

    const targetUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    if (targetUser.rows[0].id === req.user.id) {
      return res.status(400).json({ error: "Vous ne pouvez pas partager avec vous-même" });
    }

    const nodeCheck = await pool.query(
      "SELECT id FROM nodes WHERE id = $1 AND user_id = $2",
      [node_id, req.user.id]
    );
    if (nodeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Node introuvable" });
    }

    // Éviter les doublons
    const existing = await pool.query(
      "SELECT id FROM internal_shares WHERE node_id = $1 AND to_user_id = $2",
      [node_id, targetUser.rows[0].id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Déjà partagé avec cet utilisateur" });
    }

    const result = await pool.query(
      `INSERT INTO internal_shares (node_id, from_user_id, to_user_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [node_id, req.user.id, targetUser.rows[0].id]
    );

    res.status(201).json({ share: result.rows[0] });
  } catch (err) {
    console.error("Erreur partage interne:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/shares/internal — lister les nodes partagés avec moi
router.get("/internal", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.email AS owner_email, ish.id AS share_id
       FROM internal_shares ish
       JOIN nodes n ON n.id = ish.node_id
       JOIN users u ON u.id = ish.from_user_id
       WHERE ish.to_user_id = $1
         AND n.is_trashed = FALSE
       ORDER BY ish.created_at DESC`,
      [req.user.id]
    );
    res.json({ shared: result.rows });
  } catch (err) {
    console.error("Erreur liste partages internes:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/shares/internal/:id — supprimer un partage interne
router.delete("/internal/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM internal_shares WHERE id = $1 AND from_user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Partage interne supprimé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
