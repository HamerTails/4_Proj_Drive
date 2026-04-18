const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

const STORAGE_PATH = process.env.STORAGE_PATH || "/data";

// Liste les nodes d'un dossier (exclut la corbeille)

router.get("/", authenticateToken, async (req, res) => {
    const parentId = req.query.parent_id || null;
    try {
        const result = await pool.query(
            'SELECT * FROM nodes WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND is_trashed = FALSE ORDER BY type DESC, name ASC',
            [req.user.id, parentId]
        );
        res.json({ nodes: result.rows });
    } catch (err) {
        console.error("Erreur listing nodes:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Retourne le chemin complet vers un dossier
router.get("/breadcrumb", authenticateToken, async (req, res) => {
    const { id } = req.query;
    if (!id) return res.json({ path: [] });

    try {
        const result = await pool.query(
            'WITH RECURSIVE parents AS (' +
                'SELECT id, name, parent_id FROM nodes WHERE id = $1 AND user_id = $2 ' +
                'UNION ' +
                'SELECT n.id, n.name, n.parent_id FROM nodes n ' +
                'INNER JOIN parents p ON p.parent_id = n.id WHERE n.user_id = $2' +
            ') SELECT id, name FROM parents ORDER BY id ASC',
            [id, req.user.id]
        );
        res.json({ path: result.rows });
    } catch (err) {
        console.error("Erreur breadcrumb:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Détails techniques d'un node

router.get("/:id/details", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM nodes WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Node non trouvé" });

        const node = result.rows[0];
        let stats = {};

        if (node.type === 'file' && node.storage_path) {
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

//Créer un nouveau dossier

router.post("/folder", authenticateToken, validate(schemas.createFolder), async (req, res) => {
    try {
        const { name, parent_id } = req.body;

        const result = await pool.query(
            "INSERT INTO nodes (user_id, parent_id, type, name) VALUES ($1, $2, 'folder', $3) RETURNING *",
            [req.user.id, parent_id || null, name.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erreur création dossier:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Renommer un node

router.put("/:id/rename", authenticateToken, validate(schemas.renameNode), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const result = await pool.query(
            'UPDATE nodes SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 AND is_trashed = FALSE RETURNING *',
            [name.trim(), id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Node non trouvé" });
        res.json({ message: "Renommé avec succès", node: result.rows[0] });
    } catch (err) {
        console.error("Erreur renommage:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Déplacer un node dans un autre dossier
router.put("/:id/move", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { parent_id } = req.body;

        if (parent_id) {
            const loopCheck = await pool.query(
                'WITH RECURSIVE children AS (' +
                    'SELECT id FROM nodes WHERE id = $1 ' +
                    'UNION ' +
                    'SELECT n.id FROM nodes n INNER JOIN children c ON c.id = n.parent_id' +
                ') SELECT id FROM children WHERE id = $2',
                [id, parent_id]
            );
            if (loopCheck.rows.length > 0) {
                return res.status(400).json({ error: "Impossible : déplacement circulaire détecté" });
            }
        }

        const result = await pool.query(
            'UPDATE nodes SET parent_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 AND is_trashed = FALSE RETURNING *',
            [parent_id || null, id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Node non trouvé" });
        res.json({ message: "Déplacé avec succès", node: result.rows[0] });
    } catch (err) {
        console.error("Erreur déplacement:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// DELETE /api/nodes/:id
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE nodes SET is_trashed = TRUE, trashed_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Node non trouvé" });
        res.json({ message: "Déplacé vers la corbeille", node: result.rows[0] });
    } catch (err) {
        console.error("Erreur soft delete:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// nettoyage automatique corbeille (30 jours)

const deleteExpiredTrash = async () => {
    try {
        const result = await pool.query(
            "SELECT * FROM nodes WHERE is_trashed = TRUE AND trashed_at < NOW() - INTERVAL '30 days'"
        );
        if (result.rows.length === 0) return;

        for (const node of result.rows) {
            if (node.type === "file" && node.storage_path) {
                const filePath = path.join(STORAGE_PATH, node.storage_path);
                await fs.unlink(filePath).catch(() => {
                    console.warn("[CRON] Fichier physique absent: " + node.storage_path);
                });
            }
            await pool.query("DELETE FROM nodes WHERE id = $1", [node.id]);
        }
        console.log("[CRON] Corbeille nettoyée : " + result.rows.length + " élément(s) supprimé(s)");
    } catch (err) {
        console.error("[CRON] Erreur nettoyage corbeille:", err);
    }
};

deleteExpiredTrash();
setInterval(deleteExpiredTrash, 24 * 60 * 60 * 1000);

module.exports = router;