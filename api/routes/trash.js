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

        res.json({ message: "Élément restauré", node: result.rows[0] });
    } catch (err) {
        console.error("Erreur restauration:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Suppression permanente (Optimisée pour Quota et Dossiers)
router.delete("/:id/permanent", authenticateToken, async (req, res) => {
    const client = await pool.connect(); // Utilisation d'un client pour une transaction
    try {
        const { id } = req.params;
        await client.query('BEGIN');

        // 1. Récupérer le node et tous ses descendants si c'est un dossier
        // On utilise une requête récursive (CTE) pour être sûr de tout supprimer
        const nodesToDelete = await client.query(
            `WITH RECURSIVE subordinates AS (
                SELECT id, type, storage_path, size FROM nodes WHERE id = $1 AND user_id = $2
                UNION
                SELECT n.id, n.type, n.storage_path, n.size FROM nodes n
                INNER JOIN subordinates s ON s.id = n.parent_id
            ) SELECT * FROM subordinates`,
            [id, req.user.id]
        );

        if (nodesToDelete.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Node non trouvé" });
        }

        let totalSizeFreed = 0;

        // 2. Supprimer les fichiers physiques et calculer la place libérée
        for (const node of nodesToDelete.rows) {
            if (node.type === "file") {
                totalSizeFreed += parseInt(node.size || 0);
                if (node.storage_path) {
                    await fs.unlink(path.join(STORAGE_PATH, node.storage_path)).catch(() => {});
                }
            }
        }

        // 3. Supprimer de la BDD (la cascade ou la boucle supprimera tout)
        await client.query("DELETE FROM nodes WHERE id = ANY($1)", [nodesToDelete.rows.map(n => n.id)]);

        // 4. B1-5 : Mettre à jour le quota de l'utilisateur
        await client.query(
            "UPDATE users SET storage_used = storage_used - $1 WHERE id = $2",
            [totalSizeFreed, req.user.id]
        );

        await client.query('COMMIT');
        res.json({ 
            message: "Suppression permanente effectuée", 
            freed_space: totalSizeFreed 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erreur suppression permanente:", err);
        res.status(500).json({ error: "Erreur serveur" });
    } finally {
        client.release();
    }
});

module.exports = router;