const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth"); // JWT si tu as un middleware

// Liste les nodes qui ne sont pas dans la corbeille
router.get("/", authenticateToken, async (req, res) => {
  const parentId = req.query.parent_id || null;
  try {
    const result = await pool.query(
      `SELECT * FROM nodes
       WHERE user_id = $1
       AND parent_id IS NOT DISTINCT FROM $2
       AND is_trashed = FALSE
       ORDER BY type DESC, name ASC`,
      [req.user.id, parentId]
    );
    res.json({ nodes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

const deleteExpiredTrash = async () => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodes WHERE is_trashed = TRUE AND trashed_at < NOW() - INTERVAL '30 days'"
    );

    for (const node of result.rows) {
      if (node.type === "file" && node.storage_path) {
        await fs.unlink(path.join(STORAGE_PATH, node.storage_path)).catch(() => {});
      }

      // Supprimer de la base
      await pool.query("DELETE FROM nodes WHERE id = $1", [node.id]);
    }

    console.log("Corbeille nettoyée");
  } catch (err) {
    console.error("Erreur nettoyage corbeille:", err);
  }
};

// Exécuter toutes les 24h
setInterval(deleteExpiredTrash, 24 * 60 * 60 * 1000);