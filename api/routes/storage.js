const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");

const TOTAL_QUOTA = 30 * 1024 * 1024 * 1024; // 30 Go en octets

/**
 * B1-5 : GET /api/storage/usage
 * Retourne l'espace utilisé, le total et la répartition par type MIME
 */
router.get("/usage", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT storage_used FROM users WHERE id = $1",
      [req.user.id]
    );

    const used = parseInt(result.rows[0]?.storage_used || 0);

    res.json({
      used,
      total: TOTAL_QUOTA,
      used_readable: formatBytes(used),
      total_readable: "30 Go",
      percentage: Math.min(100, ((used / TOTAL_QUOTA) * 100).toFixed(2)),
    });
  } catch (err) {
    console.error("Erreur storage/usage:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * B1-6 : GET /api/storage/breakdown
 * Retourne l'espace utilisé par catégorie MIME
 */
router.get("/breakdown", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        CASE
          WHEN mime_type LIKE 'image/%'       THEN 'Images'
          WHEN mime_type LIKE 'video/%'       THEN 'Vidéos'
          WHEN mime_type LIKE 'audio/%'       THEN 'Audio'
          WHEN mime_type IN (
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv', 'text/markdown'
          )                                   THEN 'Documents'
          ELSE 'Autres'
        END AS category,
        COALESCE(SUM(size), 0)::BIGINT AS total_size,
        COUNT(*)::INT AS file_count
      FROM nodes
      WHERE user_id = $1
        AND type = 'file'
        AND is_trashed = FALSE
      GROUP BY category
      ORDER BY total_size DESC`,
      [req.user.id]
    );

    // S'assurer que toutes les catégories sont présentes (même à 0)
    const categories = ["Images", "Vidéos", "Audio", "Documents", "Autres"];
    const breakdown = categories.map((cat) => {
      const row = result.rows.find((r) => r.category === cat);
      return {
        category: cat,
        total_size: row ? parseInt(row.total_size) : 0,
        readable: row ? formatBytes(parseInt(row.total_size)) : "0 o",
        file_count: row ? row.file_count : 0,
      };
    });

    res.json({ breakdown });
  } catch (err) {
    console.error("Erreur storage/breakdown:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * B1-7 : GET /api/storage/recent?limit=5
 * Retourne les N derniers fichiers uploadés
 */
router.get("/recent", authenticateToken, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 20); // max 20

  try {
    const result = await pool.query(
      `SELECT id, name, mime_type, size, created_at, parent_id
       FROM nodes
       WHERE user_id = $1
         AND type = 'file'
         AND is_trashed = FALSE
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.json({ recent: result.rows });
  } catch (err) {
    console.error("Erreur storage/recent:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- Utilitaire ---
function formatBytes(bytes) {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const sizes = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

module.exports = router;
