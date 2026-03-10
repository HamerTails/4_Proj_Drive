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
const TOTAL_QUOTA = 30 * 1024 * 1024 * 1024; // 30 Go

// --- Configuration MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = path.join(STORAGE_PATH, `user_${req.user.id}`);
    if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// -----------------------------------------------------------------------
// B1-5 : Upload fichier avec vérification du quota
// POST /api/files/upload
// -----------------------------------------------------------------------
router.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

    await client.query("BEGIN");

    // Vérification quota (défensive : ignore si colonne absente)
    let storageUsed = 0;
    try {
      const userResult = await client.query(
        "SELECT storage_used FROM users WHERE id = $1",
        [req.user.id]
      );
      storageUsed = parseInt(userResult.rows[0]?.storage_used || 0);
    } catch (e) {
      // colonne storage_used pas encore migrée → on skip le check quota
      console.warn("[QUOTA] Colonne storage_used absente, vérification quota ignorée");
    }

    if (storageUsed + req.file.size > TOTAL_QUOTA) {
      await client.query("ROLLBACK");
      await fsPromises.unlink(req.file.path).catch(() => {});
      return res.status(413).json({
        error: "Quota dépassé. Vous ne disposez plus d'espace suffisant.",
        used: storageUsed,
        total: TOTAL_QUOTA,
      });
    }

    const { parent_id } = req.body;
    const relativePath = path.relative(STORAGE_PATH, req.file.path);

    const result = await client.query(
      `INSERT INTO nodes (user_id, parent_id, type, name, storage_path, mime_type, size)
       VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING *`,
      [req.user.id, parent_id || null, req.file.originalname, relativePath, req.file.mimetype, req.file.size]
    );

    // Mettre à jour le quota (défensif)
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
    // Nettoyer le fichier physique si la transaction a échoué
    if (req.file) await fsPromises.unlink(req.file.path).catch(() => {});
    console.error("Erreur upload:", err);
    res.status(500).json({ error: "Erreur upload" });
  } finally {
    client.release();
  }
});

// -----------------------------------------------------------------------
// B1-9 : Upload multiple fichiers
// POST /api/files/upload-multiple
// -----------------------------------------------------------------------
const uploadMultiple = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

router.post("/upload-multiple", authenticateToken, uploadMultiple.array("files", 10), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

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
    const inserted = [];

    for (const file of req.files) {
      const relativePath = path.relative(STORAGE_PATH, file.path);
      const result = await client.query(
        `INSERT INTO nodes (user_id, parent_id, type, name, storage_path, mime_type, size)
         VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING *`,
        [req.user.id, parent_id || null, file.originalname, relativePath, file.mimetype, file.size]
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

// -----------------------------------------------------------------------
// B1-2 : Preview (texte, image, PDF)
// GET /api/files/:id/preview
// -----------------------------------------------------------------------
router.get("/:id/preview", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND is_trashed = FALSE",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).send("Introuvable");

    const file = result.rows[0];
    const filePath = path.join(STORAGE_PATH, file.storage_path);

    // Texte brut (TXT, MD, CSV, HTML)
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

// -----------------------------------------------------------------------
// B1-3 : Streaming audio/vidéo avec Range Requests
// GET /api/files/:id/stream
// -----------------------------------------------------------------------
router.get("/:id/stream", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND is_trashed = FALSE",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).send("Introuvable");

    const file = result.rows[0];
    const filePath = path.join(STORAGE_PATH, file.storage_path);
    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", file.mime_type);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.status(206).setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
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

// -----------------------------------------------------------------------
// Téléchargement unitaire
// GET /api/files/:id/download
// -----------------------------------------------------------------------
router.get("/:id/download", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'file' AND is_trashed = FALSE",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Fichier introuvable" });

    const file = result.rows[0];
    res.download(path.join(STORAGE_PATH, file.storage_path), file.name);
  } catch (err) {
    console.error("Erreur download:", err);
    res.status(500).json({ error: "Erreur téléchargement" });
  }
});

// -----------------------------------------------------------------------
// B1-4 : Téléchargement dossier en ZIP (récursif)
// GET /api/files/folder/:id/download
// -----------------------------------------------------------------------
router.get("/folder/:id/download", authenticateToken, async (req, res) => {
  try {
    const folderId = req.params.id;

    // Vérifier que le dossier appartient à l'utilisateur
    const folderResult = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'folder'",
      [folderId, req.user.id]
    );
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ error: "Dossier introuvable" });
    }

    const folderName = folderResult.rows[0].name;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${folderName}.zip"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("Erreur archiver:", err);
      if (!res.headersSent) res.status(500).end();
    });
    archive.pipe(res);

    // Récupération récursive de tous les fichiers du dossier
    await addFolderToArchive(archive, folderId, folderName, req.user.id);

    archive.finalize();
  } catch (err) {
    console.error("Erreur ZIP dossier:", err);
    if (!res.headersSent) res.status(500).json({ error: "Erreur génération ZIP" });
  }
});

/**
 * Fonction récursive : ajoute tous les fichiers d'un dossier dans l'archive
 * en respectant l'arborescence.
 */
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
      // Récursion dans les sous-dossiers
      await addFolderToArchive(archive, node.id, path.join(currentPath, node.name), userId);
    }
  }
}

module.exports = router;