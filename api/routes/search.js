const express = require("express");
const router  = express.Router();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const authenticateToken = require("../middleware/auth");
const { validateQuery, schemas } = require("../middleware/validate");

// GET /api/search?q=xxx&type=image&date=week
router.get("/", authenticateToken, validateQuery(schemas.search), async (req, res) => {
    try {
        var q    = req.query.q;
        var type = req.query.type;
        var date = req.query.date;

        var conditions = [
            "user_id = $1",
            "is_trashed = FALSE",
        ];
        var params = [req.user.id];
        var paramIndex = 2;

        if (q && q.trim()) {
            conditions.push("name ILIKE $" + paramIndex);
            params.push("%" + q.trim() + "%");
            paramIndex++;
        }

        if (type) {
            switch (type.toLowerCase()) {
                case "image":
                    conditions.push("mime_type LIKE $" + paramIndex);
                    params.push("image/%");
                    paramIndex++;
                    break;
                case "video":
                    conditions.push("mime_type LIKE $" + paramIndex);
                    params.push("video/%");
                    paramIndex++;
                    break;
                case "audio":
                    conditions.push("mime_type LIKE $" + paramIndex);
                    params.push("audio/%");
                    paramIndex++;
                    break;
                case "pdf":
                    conditions.push("mime_type = $" + paramIndex);
                    params.push("application/pdf");
                    paramIndex++;
                    break;
                case "text":
                    conditions.push("mime_type LIKE $" + paramIndex);
                    params.push("text/%");
                    paramIndex++;
                    break;
                case "document":
                    conditions.push(
                        "(mime_type LIKE 'application/pdf' OR mime_type LIKE 'text/%' OR mime_type LIKE '%wordprocessing%' OR mime_type LIKE '%spreadsheet%' OR mime_type LIKE '%msword%')"
                    );
                    break;
            }
        }

        if (date) {
            switch (date.toLowerCase()) {
                case "today":
                    conditions.push("created_at >= CURRENT_DATE");
                    break;
                case "week":
                    conditions.push("created_at >= NOW() - INTERVAL '7 days'");
                    break;
                case "month":
                    conditions.push("created_at >= NOW() - INTERVAL '30 days'");
                    break;
                case "year":
                    conditions.push("created_at >= NOW() - INTERVAL '365 days'");
                    break;
            }
        }

        var sql =
            "SELECT id, name, type, mime_type, size, parent_id, created_at, updated_at " +
            "FROM nodes WHERE " + conditions.join(" AND ") +
            " ORDER BY type DESC, name ASC LIMIT 100";

        var result = await pool.query(sql, params);

        res.json({
            query:   (q || '').trim(),
            filters: { type: type || null, date: date || null },
            count:   result.rows.length,
            results: result.rows,
        });
    } catch (err) {
        console.error("Erreur recherche:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;