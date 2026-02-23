const archiver = require('archiver');

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const crypto = require('crypto');
const archiver = require("archiver");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_PATH = "/data";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// =====================
// Passport Google OAuth2 (Inchangé)
// =====================
passport.use(new GoogleStrategy({
  clientID: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  callbackURL: process.env.OAUTH_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value.toLowerCase();
    const provider_id = profile.id;
    const userRes = await pool.query("SELECT * FROM users WHERE provider = 'google' AND provider_id = $1", [provider_id]);
    let user;
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
    } else {
      const emailRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (emailRes.rows.length > 0) {
        const updateRes = await pool.query("UPDATE users SET provider = 'google', provider_id = $1 WHERE id = $2 RETURNING *", [provider_id, emailRes.rows[0].id]);
        user = updateRes.rows[0];
      } else {
        const insertRes = await pool.query("INSERT INTO users (email, provider, provider_id) VALUES ($1, 'google', $2) RETURNING *", [email, provider_id]);
        user = insertRes.rows[0];
      }
    }
    return done(null, user);
  } catch (err) { return done(err); }
}));

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(passport.initialize());

// Middleware d'authentification (Inchangé)
const authenticateToken = (req, res, next) => {
  let token = req.headers["authorization"]?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).json({ error: "Token manquant" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token invalide" });
    req.user = user;
    next();
  });
};

// ============================================
// LOGIQUE DE LA CORBEILLE (B1-1)
// ============================================

// Nettoyage automatique toutes les heures (fichiers > 30 jours)
const deleteExpiredTrash = async () => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodes WHERE is_trashed = TRUE AND trashed_at < NOW() - INTERVAL '30 days'"
    );
    for (const node of result.rows) {
      if (node.type === 'file' && node.storage_path) {
        await fs.unlink(path.join(STORAGE_PATH, node.storage_path)).catch(() => {});
      }
      await pool.query("DELETE FROM nodes WHERE id = $1", [node.id]);
    }
    if(result.rows.length > 0) console.log(`[CRON] ${result.rows.length} éléments supprimés de la corbeille.`);
  } catch (err) { console.error("[CRON] Erreur nettoyage corbeille:", err); }
};
setInterval(deleteExpiredTrash, 3600000); // Toutes les heures

// Mettre à la corbeille
app.post("/api/nodes/:id/trash", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "UPDATE nodes SET is_trashed = TRUE, trashed_at = NOW() WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Mis à la corbeille" });
  } catch (err) { res.status(500).json({ error: "Erreur corbeille" }); }
});

// Restaurer de la corbeille
app.post("/api/nodes/:id/restore", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "UPDATE nodes SET is_trashed = FALSE, trashed_at = NULL WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Élément restauré" });
  } catch (err) { res.status(500).json({ error: "Erreur restauration" }); }
});

// ============================================
// STREAMING ET PREVIEW (B1-2, B1-3)
// ============================================

app.get("/api/files/:id/stream", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM nodes WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).send();

    const filePath = path.join(STORAGE_PATH, result.rows[0].storage_path);
    const stat = fsSync.statSync(filePath);
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
      fsSync.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.header({ "Content-Length": stat.size, "Content-Type": result.rows[0].mime_type });
      fsSync.createReadStream(filePath).pipe(res);
    }
  } catch (err) { res.status(500).send("Erreur de streaming"); }
});

// ============================================
// EXPORT ZIP (B1-4)
// ============================================
app.get("/api/folders/:id/zip", authenticateToken, async (req, res) => {
  try {
    const archive = archiver("zip");
    res.attachment(`export_${req.params.id}.zip`);
    archive.pipe(res);

    const files = await pool.query("SELECT * FROM nodes WHERE parent_id = $1 AND type = 'file' AND user_id = $2", [req.params.id, req.user.id]);
    for (const file of files.rows) {
      archive.file(path.join(STORAGE_PATH, file.storage_path), { name: file.name });
    }
    archive.finalize();
  } catch (err) { res.status(500).send("Erreur ZIP"); }
});

// ============================================
// ROUTES EXISTANTES (MODIFIÉES POUR LA CORBEILLE)
// ============================================

// Lister les nodes (On filtre pour ne PAS afficher les éléments à la corbeille par défaut)
app.get("/api/nodes", authenticateToken, async (req, res) => {
  const parent_id = req.query.parent_id || null;
  const showTrashed = req.query.trashed === 'true'; 

  const result = await pool.query(
    "SELECT * FROM nodes WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND is_trashed = $3 ORDER BY type DESC, name ASC",
    [req.user.id, parent_id, showTrashed]
  );
  res.json({ nodes: result.rows });
});

// --- RESTE DE TES ROUTES (Copie-colle ici tes routes Auth, Google, Shares, etc.) ---
// ... (Garde tes routes /api/auth/*, /api/shares/* telles quelles)

app.listen(PORT, () => {
  console.log(`🚀 API SUPFILE prête sur le port ${PORT}`);
  deleteExpiredTrash(); // Lance un nettoyage au démarrage
});