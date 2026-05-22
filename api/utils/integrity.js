const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const STORAGE_PATH = process.env.STORAGE_PATH || "/data";


const checkIntegrity = async () => {
    console.log("[INTEGRITY] Démarrage de la vérification...");

    const result = await pool.query(
        "SELECT id, name, storage_path, user_id FROM nodes WHERE type = 'file' AND is_trashed = FALSE AND storage_path IS NOT NULL"
    );

    const missing = [];
    const ok = [];

    for (const node of result.rows) {
        const fullPath = path.join(STORAGE_PATH, node.storage_path);
        try {
            await fs.access(fullPath);
            ok.push(node.id);
        } catch {
            missing.push({ id: node.id, name: node.name, storage_path: node.storage_path, user_id: node.user_id });
        }
    }

    if (missing.length === 0) {
        console.log(`[INTEGRITY] ✅ Tous les fichiers sont OK (${ok.length} vérifiés)`);
    } else {
        console.warn(`[INTEGRITY] ⚠️  ${missing.length} fichier(s) manquant(s) sur le disque :`);
        missing.forEach(f => console.warn(`  - [id=${f.id}] ${f.name} → ${f.storage_path}`));
    }

    return { total: result.rows.length, ok: ok.length, missing };
};

module.exports = checkIntegrity;
