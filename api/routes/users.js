const express   = require("express");
const router    = express.Router();
const bcrypt    = require("bcrypt");
const multer    = require("multer");
const path      = require("path");
const fs        = require("fs");
const { Pool }  = require("pg");
const pool      = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");

const STORAGE_PATH = process.env.STORAGE_PATH || "/data";

// --- Configuration multer pour l'avatar ---

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/avatars");
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const dir = path.join(__dirname, "../uploads/avatars");
        const baseName = "avatar_" + req.user.id;

        try {
            if (fs.existsSync(dir)) {
                const existingFiles = fs.readdirSync(dir).filter((name) => name.startsWith(baseName + '.'));
                existingFiles.forEach((name) => {
                    const filePath = path.join(dir, name);
                    try { fs.unlinkSync(filePath); } catch (err) { /* ignore */ }
                });
            }
        } catch (err) {
            /* ignore */
        }

        cb(null, baseName + ext);
    },
});
const upload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ───────────────────────────────────────────────
// POST /api/users/avatar — Uploader un avatar
// ───────────────────────────────────────────────
router.post("/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

        const avatarPath = "/uploads/avatars/" + req.file.filename;
        await pool.query(
            "UPDATE users SET avatar_path = $1 WHERE id = $2",
            [avatarPath, req.user.id]
        );
        res.json({ avatar_path: avatarPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ───────────────────────────────────────────────
// GET /api/users/avatar/:userId — Récupérer l'avatar (B2-6)
// ───────────────────────────────────────────────
router.get("/avatar/:userId", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT avatar_path FROM users WHERE id = $1",
            [req.params.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].avatar_path) {
            return res.status(404).json({ error: "Avatar non trouvé" });
        }

        const avatarPath = path.join(__dirname, "..", result.rows[0].avatar_path);

        if (!fs.existsSync(avatarPath)) {
            return res.status(404).json({ error: "Fichier avatar absent du disque" });
        }

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        });
        res.sendFile(path.resolve(avatarPath));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ───────────────────────────────────────────────
// PUT /api/users/email — Changer son email (B2-5 : avec vérification mot de passe)
// ───────────────────────────────────────────────
router.put("/email", authenticateToken, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !email.includes("@"))
        return res.status(400).json({ error: "Email invalide" });

    try {
        // Récupérer l'utilisateur pour vérifier le mot de passe
        const userRes = await pool.query(
            "SELECT password_hash, provider FROM users WHERE id = $1",
            [req.user.id]
        );
        const user = userRes.rows[0];

        // Si l'utilisateur a un mot de passe (pas un compte Google pur), on le vérifie
        if (user && user.password_hash) {
            if (!password) {
                return res.status(400).json({ error: "Mot de passe requis pour confirmer le changement" });
            }
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: "Mot de passe incorrect" });
            }
        }

        // Vérifier unicité du nouvel email
        const exists = await pool.query(
            "SELECT id FROM users WHERE email = $1 AND id != $2",
            [email.toLowerCase(), req.user.id]
        );
        if (exists.rows.length)
            return res.status(409).json({ error: "Cet email est déjà utilisé" });

        await pool.query(
            "UPDATE users SET email = $1 WHERE id = $2",
            [email.toLowerCase(), req.user.id]
        );
        res.json({ message: "Email mis à jour" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ───────────────────────────────────────────────
// PUT /api/users/password — Changer son mot de passe (B2-4 : avec vérification ancien mdp)
// ───────────────────────────────────────────────
router.put("/password", authenticateToken, async (req, res) => {
    const { currentPassword, password } = req.body;

    if (!password || password.length < 10)
        return res.status(400).json({ error: "Mot de passe trop court (10 car. min)" });

    try {
        // Récupérer le hash actuel
        const userRes = await pool.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [req.user.id]
        );
        const user = userRes.rows[0];

        // Si l'utilisateur a déjà un mot de passe, on exige l'ancien
        if (user && user.password_hash) {
            if (!currentPassword) {
                return res.status(400).json({ error: "Mot de passe actuel requis" });
            }
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: "Mot de passe actuel incorrect" });
            }
        }

        const hash = await bcrypt.hash(password, 12);
        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [hash, req.user.id]
        );
        res.json({ message: "Mot de passe mis à jour" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ───────────────────────────────────────────────
// GET /api/users/me — Infos utilisateur courantes (inclut thème)
// ───────────────────────────────────────────────
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, email, avatar_path, theme, provider, created_at FROM users WHERE id = $1",
            [req.user.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Utilisateur introuvable" });

        res.json({ user: result.rows[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ───────────────────────────────────────────────
// PUT /api/users/preferences — Sauvegarder préférences (thème) (B2-7)
// ───────────────────────────────────────────────
router.put("/preferences", authenticateToken, async (req, res) => {
    const { theme } = req.body;

    if (theme && theme !== "light" && theme !== "dark") {
        return res.status(400).json({ error: "Thème invalide (light ou dark)" });
    }

    try {
        if (theme) {
            await pool.query(
                "UPDATE users SET theme = $1 WHERE id = $2",
                [theme, req.user.id]
            );
        }

        res.json({ message: "Préférences mises à jour" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ───────────────────────────────────────────────
// DELETE /api/users/account — Supprimer son compte
// ───────────────────────────────────────────────
router.delete("/account", authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const filesRes = await client.query(
            "WITH RECURSIVE subordinates AS (" +
                "SELECT id, type, storage_path FROM nodes WHERE user_id = $1 " +
                "UNION " +
                "SELECT n.id, n.type, n.storage_path FROM nodes n " +
                "INNER JOIN subordinates s ON s.id = n.parent_id" +
            ") SELECT * FROM subordinates WHERE type = 'file' AND storage_path IS NOT NULL",
            [req.user.id]
        );

        // suppression en BDD
        await client.query("DELETE FROM internal_shares WHERE from_user_id = $1 OR to_user_id = $1", [req.user.id]);
        await client.query("DELETE FROM nodes WHERE user_id = $1", [req.user.id]);
        await client.query("DELETE FROM users WHERE id = $1",      [req.user.id]);

        await client.query("COMMIT");

        // suppression des fichiers physiques
        for (const row of filesRes.rows) {
            try { fs.unlinkSync(path.join(STORAGE_PATH, row.storage_path)); } catch (err) { /* absent */ }
        }

        // suppression des avatars
        const avatarDir = path.join(__dirname, "../uploads/avatars");
        for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
            try { fs.unlinkSync(path.join(avatarDir, "avatar_" + req.user.id + ext)); } catch (err) { /* absent */ }
        }

        res.json({ message: "Compte supprimé" });
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Erreur suppression compte:", e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;