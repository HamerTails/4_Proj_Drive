const express   = require("express");
const router    = express.Router();
const { Pool }  = require("pg");
const { v4: uuidv4 } = require("uuid");
const bcrypt    = require("bcrypt");
const path      = require("path");
const fs        = require("fs");
const pool      = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");

const STORAGE_PATH = process.env.STORAGE_PATH || "/data";

//créer un lien public
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { node_id, expires_at, password } = req.body;
        if (!node_id) return res.status(400).json({ error: "node_id requis" });

        const nodeCheck = await pool.query(
            "SELECT id FROM nodes WHERE id = $1 AND user_id = $2",
            [node_id, req.user.id]
        );
        if (nodeCheck.rows.length === 0)
            return res.status(404).json({ error: "Node introuvable" });

        const token = uuidv4();
        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await pool.query(
            "INSERT INTO shares (node_id, token, expires_at, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
            [node_id, token, expires_at || null, passwordHash]
        );

        const webUrl = process.env.WEB_URL || "http://localhost:3001";
        res.status(201).json({
            share: result.rows[0],
            link:  webUrl + "/public/" + token,
        });
    } catch (err) {
        console.error("Erreur création partage:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Accéder à un partage public
router.get("/public/:token", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT s.*, n.user_id, n.name, n.mime_type, n.storage_path, n.type, n.size " +
            "FROM shares s " +
            "JOIN nodes n ON n.id = s.node_id " +
            "WHERE s.token = $1",
            [req.params.token]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: "Lien introuvable" });

        const share = result.rows[0];

        if (share.expires_at && new Date(share.expires_at) < new Date())
            return res.status(410).json({ error: "Ce lien de partage a expiré" });

        // Vérifier le mot de passe si le partage en a un
        if (share.password_hash) {
            const providedPassword = req.query.password || req.headers['x-share-password'] || '';
            const passwordMatch = await bcrypt.compare(providedPassword, share.password_hash);
            if (!passwordMatch) {
                return res.status(403).json({ error: "Mot de passe incorrect" });
            }
        }

        const requestedFileId = req.query.file ? parseInt(req.query.file, 10) : null;

        // Téléchargement/affichage d'un fichier public
        if (requestedFileId) {
            let allowed = false;

            if (requestedFileId === share.node_id) {
                allowed = true;
            } else if (share.type === "folder") {
                const descendant = await pool.query(
                    "WITH RECURSIVE tree AS (" +
                    "  SELECT id, parent_id FROM nodes WHERE id = $1 " +
                    "  UNION ALL " +
                    "  SELECT n.id, n.parent_id FROM nodes n JOIN tree t ON n.parent_id = t.id" +
                    ") " +
                    "SELECT id FROM tree WHERE id = $2",
                    [share.node_id, requestedFileId]
                );
                allowed = descendant.rows.length > 0;
            }

            if (!allowed)
                return res.status(403).json({ error: "Accès refusé" });

            const targetResult = await pool.query(
                "SELECT id, name, type, mime_type, storage_path " +
                "FROM nodes WHERE id = $1 AND user_id = $2 AND is_trashed = FALSE",
                [requestedFileId, share.user_id]
            );

            if (targetResult.rows.length === 0)
                return res.status(404).json({ error: "Fichier introuvable" });

            const target = targetResult.rows[0];
            if (target.type !== "file")
                return res.status(400).json({ error: "Le noeud demandé n'est pas un fichier" });

            const absoluteFilePath = path.resolve(STORAGE_PATH, target.storage_path || "");
            if (!fs.existsSync(absoluteFilePath))
                return res.status(404).json({ error: "Fichier absent du stockage" });

            res.setHeader("Content-Type", target.mime_type || "application/octet-stream");
            return res.sendFile(absoluteFilePath);
        }

        // Vue JSON consommée par /public/:token côté frontend
        if (share.type === "folder") {
            const children = await pool.query(
                "SELECT id, name, type, mime_type, size " +
                "FROM nodes WHERE parent_id = $1 AND user_id = $2 AND is_trashed = FALSE " +
                "ORDER BY type DESC, name ASC",
                [share.node_id, share.user_id]
            );

            return res.json({
                folder: {
                    id: share.node_id,
                    name: share.name,
                    type: share.type,
                },
                children: children.rows,
            });
        }

        return res.json({
            folder: {
                id: share.node_id,
                name: share.name,
                type: share.type,
            },
            children: [{
                id: share.node_id,
                name: share.name,
                type: share.type,
                mime_type: share.mime_type,
                size: share.size,
            }],
        });
    } catch (err) {
        console.error("Erreur accès partage public:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Supprimer un lien public
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        await pool.query(
            "DELETE FROM shares s USING nodes n " +
            "WHERE s.id = $1 AND s.node_id = n.id AND n.user_id = $2",
            [req.params.id, req.user.id]
        );
        res.json({ message: "Partage supprimé" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Partager un node avec un autre utilisateur par email
router.post("/internal", authenticateToken, async (req, res) => {
    try {
        const { node_id, email } = req.body;
        if (!node_id || !email)
            return res.status(400).json({ error: "node_id et email requis" });

        const targetUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email.toLowerCase()]
        );
        if (targetUser.rows.length === 0)
            return res.status(404).json({ error: "Utilisateur introuvable" });

        if (targetUser.rows[0].id === req.user.id)
            return res.status(400).json({ error: "Vous ne pouvez pas partager avec vous-même" });

        const nodeCheck = await pool.query(
            "SELECT id FROM nodes WHERE id = $1 AND user_id = $2",
            [node_id, req.user.id]
        );
        if (nodeCheck.rows.length === 0)
            return res.status(404).json({ error: "Node introuvable" });

        // Eviter les doublons
        const existing = await pool.query(
            "SELECT id FROM internal_shares WHERE node_id = $1 AND to_user_id = $2",
            [node_id, targetUser.rows[0].id]
        );
        if (existing.rows.length > 0)
            return res.status(409).json({ error: "Déjà partagé avec cet utilisateur" });

        const result = await pool.query(
            "INSERT INTO internal_shares (node_id, from_user_id, to_user_id) VALUES ($1, $2, $3) RETURNING *",
            [node_id, req.user.id, targetUser.rows[0].id]
        );

        res.status(201).json({ share: result.rows[0] });
    } catch (err) {
        console.error("Erreur partage interne:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Lister les nodes partagés avec moi
router.get("/internal", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT n.*, u.email AS owner_email, ish.id AS share_id " +
            "FROM internal_shares ish " +
            "JOIN nodes n ON n.id = ish.node_id " +
            "JOIN users u ON u.id = ish.from_user_id " +
            "WHERE ish.to_user_id = $1 AND n.is_trashed = FALSE " +
            "ORDER BY ish.created_at DESC",
            [req.user.id]
        );
        res.json({ shared: result.rows });
    } catch (err) {
        console.error("Erreur liste partages internes:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Supprimer un partage interne
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
