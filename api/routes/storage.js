const express   = require("express");
const router    = express.Router();
const { Pool }  = require("pg");
const pool      = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");

// Quota par utilisateur (configurable via QUOTA_BYTES env var)
// Par defaut 30 Go. En demo VPS limite, mettre 1 Go = 1073741824.
const TOTAL_QUOTA = parseInt(process.env.QUOTA_BYTES) || (30 * 1024 ** 3);

function bytesToReadable(bytes) {
    if (!bytes || bytes < 1024) return (bytes || 0) + " o";
    const sizes = ["o", "Ko", "Mo", "Go", "To"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i];
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 o";
    const k     = 1024;
    const sizes = ["o", "Ko", "Mo", "Go"];
    const i     = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function mimeToCategory(mime) {
    if (!mime) return "Autres";
    if (mime.startsWith("image/")) return "Images";
    if (mime.startsWith("video/")) return "Vidéos";
    if (mime.startsWith("audio/")) return "Audio";
    if (
        mime === "application/pdf" ||
        mime.includes("msword") ||
        mime.includes("spreadsheet") ||
        mime.includes("wordprocessing") ||
        mime.startsWith("text/")
    ) return "Documents";
    return "Autres";
}

// Espace utilisé + compteurs fichiers/dossiers
router.get("/usage", authenticateToken, async (req, res) => {
    try {
        const [usageRes, countRes] = await Promise.all([
            pool.query(
                "SELECT storage_used FROM users WHERE id = $1",
                [req.user.id]
            ),
            pool.query(
                "SELECT " +
                "COUNT(*) FILTER (WHERE type = 'file')   AS file_count, " +
                "COUNT(*) FILTER (WHERE type = 'folder') AS folder_count " +
                "FROM nodes WHERE user_id = $1 AND is_trashed = FALSE",
                [req.user.id]
            ),
        ]);

        const storage_used = parseInt(usageRes.rows[0]?.storage_used || 0);
        const file_count   = parseInt(countRes.rows[0]?.file_count   || 0);
        const folder_count = parseInt(countRes.rows[0]?.folder_count || 0);

        res.json({
            storage_used,
            used: storage_used,   
            total: TOTAL_QUOTA,
            used_readable: formatBytes(storage_used),
            total_readable: bytesToReadable(TOTAL_QUOTA),
            percentage: Math.min(100, ((storage_used / TOTAL_QUOTA) * 100).toFixed(2)),
            file_count,
            folder_count,
        });
    } catch (err) {
        console.error("Erreur storage/usage:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Répartition par type de fichier
router.get("/breakdown", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT mime_type, " +
            "COALESCE(SUM(size), 0)::BIGINT AS total_size, " +
            "COUNT(*)::INT AS file_count " +
            "FROM nodes " +
            "WHERE user_id = $1 AND type = 'file' AND is_trashed = FALSE " +
            "GROUP BY mime_type " +
            "ORDER BY total_size DESC",
            [req.user.id]
        );

        const categories = ["Images", "Vidéos", "Audio", "Documents", "Autres"];
        const grouped    = {};

        for (const row of result.rows) {
            const cat = mimeToCategory(row.mime_type);
            if (!grouped[cat]) grouped[cat] = { total_size: 0, file_count: 0 };
            grouped[cat].total_size += parseInt(row.total_size);
            grouped[cat].file_count += row.file_count;
        }

        const breakdown = categories.map((cat) => ({
            category:   cat,
            mime_type:  cat,
            total_size: grouped[cat]?.total_size  || 0,
            readable:   formatBytes(grouped[cat]?.total_size || 0),
            file_count: grouped[cat]?.file_count  || 0,
        }));

        res.json({
            breakdown,
            raw: result.rows,   
        });
    } catch (err) {
        console.error("Erreur storage/breakdown:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// limit=5 => Derniers fichiers uploadés
router.get("/recent", authenticateToken, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    try {
        const result = await pool.query(
            "SELECT id, name, mime_type, size, created_at, parent_id " +
            "FROM nodes " +
            "WHERE user_id = $1 AND type = 'file' AND is_trashed = FALSE " +
            "ORDER BY created_at DESC " +
            "LIMIT $2",
            [req.user.id, limit]
        );

        res.json({
            files:  result.rows,
            recent: result.rows,
        });
    } catch (err) {
        console.error("Erreur storage/recent:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
