const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");
const STORAGE_PATH = path.join(__dirname, "../data");

// Lister la corbeille
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodes WHERE user_id = $1 AND is_trashed = TRUE ORDER BY trashed_at DESC",
      [req.user.id]
    );
    res.json({ trash: result.rows });
  } catch (err) {
    console.error("Erreur liste corbeille:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Restaurer un node
router.put("/:id/restore", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE nodes SET is_trashed = FALSE, trashed_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Node non trouvé" });

    res.json({ node: result.rows[0] });
  } catch (err) {
    console.error("Erreur restauration:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Suppression permanente
router.delete("/:id/permanent", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const nodeRes = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (nodeRes.rows.length === 0)
      return res.status(404).json({ error: "Node non trouvé" });

    const node = nodeRes.rows[0];

    if (node.type === "file" && node.storage_path) {
      await fs.unlink(path.join(STORAGE_PATH, node.storage_path)).catch(() => {});
    }

    await pool.query("DELETE FROM nodes WHERE id = $1 AND user_id = $2", [
      id,
      req.user.id,
    ]);

    res.json({ message: "Suppression permanente effectuée" });
  } catch (err) {
    console.error("Erreur suppression permanente:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});