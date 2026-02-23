const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const archiver = require("archiver");
const { Pool } = require("pg");
const authenticateToken = require("../middleware/auth");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const STORAGE_PATH = process.env.STORAGE_PATH || "/data";

// --- Configuration MULTER (B2-12) ---
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const userFolder = path.join(STORAGE_PATH, `user_${req.user.id}`);
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }
        cb(null, userFolder);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// --- ROUTES ---

// 1. Upload (B1-5: Quota à vérifier ici plus tard)
router.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Fichier manquant" });
        const { parent_id } = req.body;

        const relativePath = path.relative(STORAGE_PATH, req.file.path);
        const result = await pool.query(
            "INSERT INTO nodes (user_id, parent_id, type, name, storage_path, mime_type, size) VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING *",
            [req.user.id, parent_id || null, req.file.originalname, relativePath, req.file.mimetype, req.file.size]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erreur upload" });
    }
});

// 2. Preview Texte, Image, PDF (B1-2)
router.get("/:id/preview", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM nodes WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).send("Introuvable");

        const file = result.rows[0];
        const filePath = path.join(STORAGE_PATH, file.storage_path);

        // Si c'est du texte, on veut l'envoyer proprement pour le frontend
        if (file.mime_type.startsWith('text/') || file.name.endsWith('.md')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        } else {
            res.setHeader('Content-Type', file.mime_type);
        }
        
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        res.status(500).send("Erreur preview");
    }
});

// 3. Streaming Vidéo/Audio (B1-3)
router.get("/:id/stream", authenticateToken, async (req, res) => {
    const result = await pool.query("SELECT * FROM nodes WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).send();

    const filePath = path.join(STORAGE_PATH, result.rows[0].storage_path);
    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.status(206).header({
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
            "Content-Type": result.rows[0].mime_type,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
        res.header({ "Content-Length": stat.size, "Content-Type": result.rows[0].mime_type });
        fs.createReadStream(filePath).pipe(res);
    }
});

// 4. Download ZIP (B1-4)
router.get("/download-folder/:id", authenticateToken, async (req, res) => {
    const folderId = req.params.id;
    const archive = archiver("zip");
    
    res.attachment(`folder_export.zip`);
    archive.pipe(res);

    const files = await pool.query("SELECT * FROM nodes WHERE parent_id = $1 AND type = 'file'", [folderId]);
    for (const file of files.rows) {
        archive.file(path.join(STORAGE_PATH, file.storage_path), { name: file.name });
    }
    archive.finalize();
});

module.exports = router;