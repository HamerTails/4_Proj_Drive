const express      = require("express");
const router       = express.Router();
const multer       = require("multer");
const path         = require("path");
const fs           = require("fs");
const fsPromises   = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const archiver     = require("archiver");
const { Pool }     = require("pg");
const authenticateToken = require("../middleware/auth");

const pool         = new Pool({ connectionString: process.env.DATABASE_URL });
const STORAGE_PATH = process.env.STORAGE_PATH || "/data";

// 30 Go
const TOTAL_QUOTA  = 30 * 1024 **3; 

// --- Configuration multer ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userFolder = path.join(STORAGE_PATH, "user_" + req.user.id);
        if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });
        cb(null, userFolder);
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Upload simple avec vérification quota
router.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
    const client = await pool.connect();
    try {
        if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

        await client.query("BEGIN");

        let storageUsed = 0;
        try {
            const userResult = await client.query(
                "SELECT storage_used FROM users WHERE id = $1",
                [req.user.id]
            );
            storageUsed = parseInt(userResult.rows[0]?.storage_used || 0);
        } catch (e) {
            console.warn("[QUOTA] Colonne storage_used absente, vérification quota ignorée");
        }

        if (storageUsed + req.file.size > TOTAL_QUOTA) {
            await client.query("ROLLBACK");
            await fsPromises.unlink(req.file.path).catch(() => {});
            return res.status(413).json({
                error: "Quota dépassé. Vous ne disposez plus d'espace suffisant.",
                used:  storageUsed,
                total: TOTAL_QUOTA,
            });
        }

        const { parent_id }  = req.body;
        const relativePath   = path.relative(STORAGE_PATH, req.file.path);

        // Correction encodage UTF-8 du nom de fichier (multer peut recevoir latin-1)
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        const result = await client.query(
            "INSERT INTO nodes (user_id, parent_id, type, name, storage_path, mime_type, size) " +
            "VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING *",
            [req.user.id, parent_id || null, originalName, relativePath, req.file.mimetype, req.file.size]
        );

        // Mise à jour quota
        try {
            await client.query(
                "UPDATE users SET storage_used = storage_used + $1 WHERE id = $2",
                [req.file.size, req.user.id]
            );
        } catch (e) {
            console.warn("[QUOTA] Mise à jour storage_used ignorée (colonne absente)");
        }

        await client.query("COMMIT");
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        if (req.file) await fsPromises.unlink(req.file.path).catch(() => {});
        console.error("Erreur upload:", err);
        res.status(500).json({ error: "Erreur upload" });
    } finally {
        client.release();
    }
});

const uploadMultiple = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

router.post("/upload-multiple", authenticateToken, uploadMultiple.array("files", 10), async (req, res) => {
    const client = await pool.connect();
    try {
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: "Aucun fichier fourni" });

        const totalNewSize = req.files.reduce((acc, f) => acc + f.size, 0);

        const userResult = await client.query(
            "SELECT storage_used FROM users WHERE id = $1",
            [req.user.id]
        );
        const storageUsed = parseInt(userResult.rows[0]?.storage_used || 0);

        if (storageUsed + totalNewSize > TOTAL_QUOTA) {
            for (const f of req.files) await fsPromises.unlink(f.path).catch(() => {});
            return res.status(413).json({ error: "Quota insuffisant pour cet upload." });
        }

        await client.query("BEGIN");

        const { parent_id } = req.body;
        const inserted      = [];

        for (const file of req.files) {
            const relativePath = path.relative(STORAGE_PATH, file.path);
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            const result = await client.query(
                "INSERT INTO nodes (user_id, parent_id, type, name, storage_path, mime_type, size) " +
                "VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING *",
                [req.user.id, parent_id || null, originalName, relativePath, file.mimetype, file.size]
            );
            inserted.push(result.rows[0]);
        }

        await client.query(
            "UPDATE users SET storage_used = storage_used + $1 WHERE id = $2",
            [totalNewSize, req.user.id]
        );

        await client.query("COMMIT");
        res.status(201).json({ uploaded: inserted });
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        for (const f of req.files || []) await fsPromises.unlink(f.path).catch(() => {});
        console.error("Erreur upload multiple:", err);
        res.status(500).json({ error: "Erreur upload" });
    } finally {
        client.release();
    }
});

router.get("/:id/preview", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND is_trashed = FALSE",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).send("Introuvable");

        const file     = result.rows[0];
        const filePath = path.join(STORAGE_PATH, file.storage_path);

        // texte brut : TXT, MD, CSV, HTML
        if (
            file.mime_type.startsWith("text/") ||
            file.name.endsWith(".md") ||
            file.name.endsWith(".csv")
        ) {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
        } else {
            res.setHeader("Content-Type", file.mime_type);
        }

        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error("Erreur preview:", err);
        res.status(500).send("Erreur preview");
    }
});

router.get("/:id/stream", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND is_trashed = FALSE",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).send("Introuvable");

        const file     = result.rows[0];
        const filePath = path.join(STORAGE_PATH, file.storage_path);
        const stat     = fs.statSync(filePath);
        const range    = req.headers.range;

        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Type", file.mime_type);

        if (range) {
            const parts     = range.replace(/bytes=/, "").split("-");
            const start     = parseInt(parts[0], 10);
            const end       = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunkSize = end - start + 1;

            res.status(206).setHeader("Content-Range", "bytes " + start + "-" + end + "/" + stat.size);
            res.setHeader("Content-Length", chunkSize);
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.setHeader("Content-Length", stat.size);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (err) {
        console.error("Erreur stream:", err);
        res.status(500).send("Erreur stream");
    }
});
router.get("/:id/download", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'file' AND is_trashed = FALSE",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Fichier introuvable" });

        const file = result.rows[0];
        res.download(path.join(STORAGE_PATH, file.storage_path), file.name);
    } catch (err) {
        console.error("Erreur download:", err);
        res.status(500).json({ error: "Erreur téléchargement" });
    }
});

// Téléchargement dossier en ZIP (récursif)
router.get("/folder/:id/download", authenticateToken, async (req, res) => {
    try {
        const folderId = req.params.id;

        const folderResult = await pool.query(
            "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'folder'",
            [folderId, req.user.id]
        );
        if (folderResult.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });

        const folderName = folderResult.rows[0].name;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=\"" + folderName + ".zip\"");

        const archive = archiver("zip", { zlib: { level: 6 } });
        archive.on("error", (err) => {
            console.error("Erreur archiver:", err);
            if (!res.headersSent) res.status(500).end();
        });
        archive.pipe(res);

        await addFolderToArchive(archive, folderId, folderName, req.user.id);

        archive.finalize();
    } catch (err) {
        console.error("Erreur ZIP dossier:", err);
        if (!res.headersSent) res.status(500).json({ error: "Erreur génération ZIP" });
    }
});

// Parcourt l'arborescence et ajoute chaque fichier à l'archive
async function addFolderToArchive(archive, folderId, currentPath, userId) {
    const children = await pool.query(
        "SELECT * FROM nodes WHERE parent_id = $1 AND user_id = $2 AND is_trashed = FALSE",
        [folderId, userId]
    );

    for (const node of children.rows) {
        if (node.type === "file") {
            const filePath = path.join(STORAGE_PATH, node.storage_path);
            archive.file(filePath, { name: path.join(currentPath, node.name) });
        } else if (node.type === "folder") {
            await addFolderToArchive(archive, node.id, path.join(currentPath, node.name), userId);
        }
    }
}

module.exports = router;