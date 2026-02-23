const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");

const STORAGE_PATH = path.join(__dirname, "../data");

/**
 * B1-1 & B1-7 : Liste les nodes (fichiers/dossiers)
 * Gère le filtrage par parent et exclut la corbeille.
 */
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
        console.error("Erreur listing nodes:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

/**
 * B1-8 : Détails techniques d'un node
 * Retourne les infos BDD + infos réelles du système de fichiers (fs.stat)
 */
router.get("/:id/details", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT * FROM nodes WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Node non trouvé" });
        
        const node = result.rows[0];
        let stats = {};

        if (node.type === 'file') {
            const fullPath = path.join(STORAGE_PATH, node.storage_path);
            const fileInfo = await fs.stat(fullPath).catch(() => null);
            if (fileInfo) {
                stats = {
                    size: fileInfo.size,
                    lastModified: fileInfo.mtime,
                    birthtime: fileInfo.birthtime
                };
            }
        }

        res.json({ ...node, fs_details: stats });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

/**
 * B1-1 : Déplacer vers la corbeille (Soft Delete)
 */
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE nodes 
             SET is_trashed = TRUE, trashed_at = NOW() 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Node non trouvé" });
        }

        res.json({ message: "Node déplacé vers la corbeille", node: result.rows[0] });
    } catch (err) {
        console.error("Erreur soft delete:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// --- LOGIQUE DE NETTOYAGE AUTOMATIQUE ---

const deleteExpiredTrash = async () => {
    try {
        // 1. Trouver les nodes à supprimer (plus de 30 jours)
        const result = await pool.query(
            "SELECT * FROM nodes WHERE is_trashed = TRUE AND trashed_at < NOW() - INTERVAL '30 days'"
        );

        if (result.rows.length === 0) return;

        for (const node of result.rows) {
            // 2. Supprimer le fichier physique si c'est un fichier
            if (node.type === "file" && node.storage_path) {
                const filePath = path.join(STORAGE_PATH, node.storage_path);
                await fs.unlink(filePath).catch((err) => {
                    console.warn(`Fichier physique déjà absent: ${node.storage_path}`);
                });
            }

            // 3. Supprimer l'entrée en BDD
            await pool.query("DELETE FROM nodes WHERE id = $1", [node.id]);
        }
        console.log(`[CRON] Corbeille nettoyée : ${result.rows.length} éléments supprimés.`);
    } catch (err) {
        console.error("[CRON] Erreur nettoyage corbeille:", err);
    }
};

// Exécuter le nettoyage une fois au démarrage, puis toutes les 24h
deleteExpiredTrash(); 
setInterval(deleteExpiredTrash, 24 * 60 * 60 * 1000);

module.exports = router;