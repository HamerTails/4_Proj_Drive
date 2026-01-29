const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_PATH = "/data";

// =====================
// Passport Google OAuth2
// =====================
passport.use(new GoogleStrategy({
  clientID: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  callbackURL: process.env.OAUTH_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value.toLowerCase();
    const provider_id = profile.id;
    const provider = 'google';
    // Vérifier si un utilisateur existe déjà avec ce provider_id
    const userRes = await pool.query(
      "SELECT * FROM users WHERE provider = $1 AND provider_id = $2",
      [provider, provider_id]
    );
    let user;
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
    } else {
      // Vérifier si un utilisateur existe déjà avec cet email (inscription classique)
      const emailRes = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (emailRes.rows.length > 0) {
        // Associer le provider à l'utilisateur existant
        const updateRes = await pool.query(
          "UPDATE users SET provider = $1, provider_id = $2 WHERE id = $3 RETURNING *",
          [provider, provider_id, emailRes.rows[0].id]
        );
        user = updateRes.rows[0];
      } else {
        // Sinon, créer un nouvel utilisateur
        const insertRes = await pool.query(
          "INSERT INTO users (email, provider, provider_id) VALUES ($1, $2, $3) RETURNING *",
          [email, provider, provider_id]
        );
        user = insertRes.rows[0];
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

app.use(passport.initialize());

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test de connexion
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Erreur de connexion a la base de donnees:", err);
  } else {
    console.log("Connecte a PostgreSQL:", res.rows[0].now);
  }
});


// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// =====================
// Routes Google OAuth2
// =====================
app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/api/auth/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/?error=oauth" }), (req, res) => {
  // Générer un JWT pour l'utilisateur
  const user = req.user;
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  // Rediriger vers le client web avec le token en query
  const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || "http://localhost:3001/login?token=" + token;
  res.redirect(redirectUrl + (redirectUrl.includes('?') ? '&' : '?') + "token=" + token);
});

// Configuration Multer pour upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userFolder = path.join(STORAGE_PATH, `user_${req.user.id}`);
    try {
      await fs.mkdir(userFolder, { recursive: true });
      cb(null, userFolder);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

// Middleware d'authentification JWT (accepte aussi ?token=...)
const authenticateToken = (req, res, next) => {
  let token = null;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token invalide" });
    }
    req.user = user;
    next();
  });
};

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

// Inscription
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email invalide" });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    // Hachage du mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insertion dans la base de données
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email.toLowerCase(), passwordHash]
    );

    const newUser = result.rows[0];

    // Génération du token JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        id: newUser.id,
        email: newUser.email,
        createdAt: newUser.created_at,
      },
      token,
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
  }
});

// Connexion
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    // Recherche de l'utilisateur
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const user = result.rows[0];

    // Vérifier si l'utilisateur a un mot de passe (pas OAuth)
    if (!user.password_hash) {
      return res.status(401).json({ error: "Ce compte utilise OAuth. Connectez-vous avec votre fournisseur." });
    }

    // Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Génération du token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Connexion réussie",
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ error: "Erreur serveur lors de la connexion" });
  }
});

// Récupérer les informations de l'utilisateur connecté
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, provider, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Vérifier si le token est valide
app.get("/api/auth/verify", authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ============================================
// ROUTES DE GESTION DES FICHIERS ET DOSSIERS
// ============================================

// Créer un dossier
app.post("/api/folders", authenticateToken, async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Le nom du dossier est requis" });
    }

    // Vérifier que le parent existe et appartient à l'utilisateur
    if (parent_id) {
      const parentCheck = await pool.query(
        "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'folder'",
        [parent_id, req.user.id]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Dossier parent non trouvé" });
      }
    }

    // Créer le dossier
    const result = await pool.query(
      "INSERT INTO nodes (user_id, parent_id, type, name) VALUES ($1, $2, 'folder', $3) RETURNING *",
      [req.user.id, parent_id || null, name.trim()]
    );

    res.status(201).json({ folder: result.rows[0] });
  } catch (error) {
    console.error("Erreur création dossier:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Lister le contenu d'un dossier (ou racine)
app.get("/api/nodes", authenticateToken, async (req, res) => {
  try {
    const parent_id = req.query.parent_id || null;

    // Si parent_id spécifié, vérifier qu'il appartient à l'utilisateur
    if (parent_id) {
      const parentCheck = await pool.query(
        "SELECT * FROM nodes WHERE id = $1 AND user_id = $2",
        [parent_id, req.user.id]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Dossier non trouvé" });
      }
    }

    const result = await pool.query(
      "SELECT * FROM nodes WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 ORDER BY type DESC, name ASC",
      [req.user.id, parent_id]
    );

    res.json({ nodes: result.rows });
  } catch (error) {
    console.error("Erreur liste nodes:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer le chemin (breadcrumbs) d'un node
app.get("/api/nodes/:id/path", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const path = [];

    let currentId = id;
    while (currentId) {
      const result = await pool.query(
        "SELECT id, name, parent_id FROM nodes WHERE id = $1 AND user_id = $2",
        [currentId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Node non trouvé" });
      }

      const node = result.rows[0];
      path.unshift({ id: node.id, name: node.name });
      currentId = node.parent_id;
    }

    res.json({ path });
  } catch (error) {
    console.error("Erreur récupération path:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Upload de fichiers
app.post("/api/files/upload", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    const { parent_id } = req.body;

    // Vérifier que le parent existe
    if (parent_id) {
      const parentCheck = await pool.query(
        "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'folder'",
        [parent_id, req.user.id]
      );
      if (parentCheck.rows.length === 0) {
        // Supprimer le fichier uploadé
        await fs.unlink(req.file.path);
        return res.status(404).json({ error: "Dossier parent non trouvé" });
      }
    }

    // Enregistrer en base de données
    const relativePath = path.relative(STORAGE_PATH, req.file.path);
    const result = await pool.query(
      "INSERT INTO nodes (user_id, parent_id, type, name, storage_path, mime_type, size) VALUES ($1, $2, 'file', $3, $4, $5, $6) RETURNING *",
      [
        req.user.id,
        parent_id || null,
        req.file.originalname,
        relativePath,
        req.file.mimetype,
        req.file.size
      ]
    );

    res.status(201).json({ file: result.rows[0] });
  } catch (error) {
    console.error("Erreur upload fichier:", error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Renommer un node
app.put("/api/nodes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    const result = await pool.query(
      "UPDATE nodes SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [name.trim(), id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Node non trouvé" });
    }

    res.json({ node: result.rows[0] });
  } catch (error) {
    console.error("Erreur renommage:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Déplacer un node
app.put("/api/nodes/:id/move", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { parent_id } = req.body;

    // Vérifier que le node existe
    const nodeCheck = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (nodeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Node non trouvé" });
    }

    // Vérifier que le parent existe
    if (parent_id) {
      const parentCheck = await pool.query(
        "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'folder'",
        [parent_id, req.user.id]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Dossier parent non trouvé" });
      }

      // Empêcher de déplacer un dossier dans lui-même ou ses enfants
      if (nodeCheck.rows[0].type === 'folder') {
        let checkId = parent_id;
        while (checkId) {
          if (checkId === parseInt(id)) {
            return res.status(400).json({ error: "Impossible de déplacer un dossier dans lui-même" });
          }
          const parentResult = await pool.query(
            "SELECT parent_id FROM nodes WHERE id = $1",
            [checkId]
          );
          checkId = parentResult.rows[0]?.parent_id;
        }
      }
    }

    const result = await pool.query(
      "UPDATE nodes SET parent_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [parent_id || null, id, req.user.id]
    );

    res.json({ node: result.rows[0] });
  } catch (error) {
    console.error("Erreur déplacement:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un node
app.delete("/api/nodes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le node
    const nodeResult = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: "Node non trouvé" });
    }

    const node = nodeResult.rows[0];

    // Si c'est un fichier, supprimer le fichier physique
    if (node.type === 'file' && node.storage_path) {
      const filePath = path.join(STORAGE_PATH, node.storage_path);
      await fs.unlink(filePath).catch(() => {});
    }

    // Supprimer de la base (CASCADE supprimera les enfants)
    await pool.query(
      "DELETE FROM nodes WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    res.json({ message: "Suppression réussie" });
  } catch (error) {
    console.error("Erreur suppression:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Télécharger un fichier
app.get("/api/files/:id/download", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'file'",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fichier non trouvé" });
    }

    const file = result.rows[0];
    const filePath = path.join(STORAGE_PATH, file.storage_path);

    res.download(filePath, file.name);
  } catch (error) {
    console.error("Erreur téléchargement:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Prévisualisation d'un fichier (image/PDF)
app.get("/api/files/:id/preview", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2 AND type = 'file'",
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fichier non trouvé" });
    }
    const file = result.rows[0];
    const filePath = path.join(STORAGE_PATH, file.storage_path);
    // Autoriser seulement images et PDF
    if (!file.mime_type.startsWith('image/') && file.mime_type !== 'application/pdf') {
      return res.status(415).json({ error: "Type de fichier non supporté pour la prévisualisation" });
    }
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', 'inline; filename="' + file.name + '"');
    require('fs').createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Erreur preview:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ============================================
// PARTAGE EXTERNE VIA LIENS PUBLICS
// ============================================


// Générer un lien public pour un fichier ou dossier
app.post("/api/shares", authenticateToken, async (req, res) => {
  try {
    const { node_id, expires_at } = req.body;
    // Vérifier que le node appartient à l'utilisateur
    const nodeRes = await pool.query(
      "SELECT * FROM nodes WHERE id = $1 AND user_id = $2",
      [node_id, req.user.id]
    );
    if (nodeRes.rows.length === 0) {
      return res.status(404).json({ error: "Fichier ou dossier non trouvé" });
    }
    // Générer un token unique
    const token = crypto.randomBytes(24).toString('hex');
    // Enregistrer le partage
    const shareRes = await pool.query(
      "INSERT INTO shares (node_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *",
      [node_id, token, expires_at || null]
    );
    res.status(201).json({
      link: `${process.env.PUBLIC_SHARE_URL || 'http://localhost:3000/api/public/'}${token}`,
      share: shareRes.rows[0]
    });
  } catch (error) {
    console.error("Erreur création lien public:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Accès public à un fichier ou dossier via token
app.get("/api/public/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { file: fileId } = req.query;
    const shareRes = await pool.query(
      "SELECT * FROM shares WHERE token = $1 AND (expires_at IS NULL OR expires_at > NOW())",
      [token]
    );
    if (shareRes.rows.length === 0) {
      return res.status(404).json({ error: "Lien public invalide ou expiré" });
    }
    const share = shareRes.rows[0];
    // Récupérer le node partagé
    const nodeRes = await pool.query(
      "SELECT * FROM nodes WHERE id = $1",
      [share.node_id]
    );
    if (nodeRes.rows.length === 0) {
      return res.status(404).json({ error: "Fichier ou dossier non trouvé" });
    }
    const node = nodeRes.rows[0];

    // Si ?file=ID est présent, vérifier que ce fichier est bien enfant du dossier partagé
    if (fileId) {
      // On autorise uniquement les fichiers enfants du dossier partagé
      const fileRes = await pool.query(
        "SELECT * FROM nodes WHERE id = $1 AND parent_id = $2 AND type = 'file'",
        [fileId, node.id]
      );
      if (fileRes.rows.length === 0) {
        return res.status(404).json({ error: "Fichier non trouvé ou accès interdit" });
      }
      const fileNode = fileRes.rows[0];
      const filePath = path.join(STORAGE_PATH, fileNode.storage_path);
      res.setHeader('Content-Type', fileNode.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline; filename="' + fileNode.name + '"');
      require('fs').createReadStream(filePath).pipe(res);
      return;
    }

    if (node.type === 'file') {
      // Télécharger ou prévisualiser le fichier
      const filePath = path.join(STORAGE_PATH, node.storage_path);
      res.setHeader('Content-Type', node.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline; filename="' + node.name + '"');
      require('fs').createReadStream(filePath).pipe(res);
    } else {
      // Lister le contenu du dossier partagé
      const childrenRes = await pool.query(
        "SELECT * FROM nodes WHERE parent_id = $1 ORDER BY type DESC, name ASC",
        [node.id]
      );
      res.json({ folder: node, children: childrenRes.rows });
    }
  } catch (error) {
    console.error("Erreur accès public:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =====================
// PARTAGE INTERNE ENTRE UTILISATEURS
// =====================

// Partager un node avec un utilisateur (par email)
app.post('/api/internal-shares', authenticateToken, async (req, res) => {
  try {
    const { node_id, email } = req.body;
    if (!node_id || !email) return res.status(400).json({ error: 'node_id et email requis' });
    // Trouver l'utilisateur destinataire
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const to_user_id = userRes.rows[0].id;
    // Vérifier que le node existe et appartient à l'utilisateur courant
    const nodeRes = await pool.query('SELECT * FROM nodes WHERE id = $1 AND user_id = $2', [node_id, req.user.id]);
    if (nodeRes.rows.length === 0) return res.status(403).json({ error: 'Accès refusé' });
    // Vérifier doublon
    const already = await pool.query('SELECT * FROM internal_shares WHERE node_id = $1 AND to_user_id = $2', [node_id, to_user_id]);
    if (already.rows.length > 0) return res.status(409).json({ error: 'Déjà partagé avec cet utilisateur' });
    // Créer le partage
    await pool.query('INSERT INTO internal_shares (node_id, from_user_id, to_user_id) VALUES ($1, $2, $3)', [node_id, req.user.id, to_user_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur partage interne:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lister les nodes partagés avec l'utilisateur connecté
app.get('/api/internal-shares', authenticateToken, async (req, res) => {
  try {
    const sharesRes = await pool.query(
      `SELECT s.id as share_id, n.*,
        u.email as shared_by_email, s.created_at as shared_at
       FROM internal_shares s
       JOIN nodes n ON s.node_id = n.id
       JOIN users u ON s.from_user_id = u.id
       WHERE s.to_user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(sharesRes.rows);
  } catch (err) {
    console.error('Erreur liste partages internes:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Oublier un partage (supprimer de la liste "Partagés avec moi")
app.delete('/api/internal-shares/:shareId', authenticateToken, async (req, res) => {
  try {
    const { shareId } = req.params;
    // Vérifier que le partage existe et appartient à l'utilisateur
    const shareRes = await pool.query('SELECT * FROM internal_shares WHERE id = $1 AND to_user_id = $2', [shareId, req.user.id]);
    if (shareRes.rows.length === 0) return res.status(404).json({ error: 'Partage non trouvé' });
    // Supprimer le partage
    await pool.query('DELETE FROM internal_shares WHERE id = $1', [shareId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur suppression partage interne:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES DE TEST
// ============================================

app.get("/", (req, res) => {
  res.json({
    message: "SUPFILE API is running",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (protected)",
        verify: "GET /api/auth/verify (protected)"
      }
    }
  });
});

// Route protégée de test
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ 
    message: "Vous êtes authentifié!", 
    user: req.user 
  });
});

// ============================================
// GESTION DES ERREURS
// ============================================

app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur interne" });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

app.listen(PORT, () => {
  console.log(`API SUPFILE demarree sur le port ${PORT}`);
  console.log(`Documentation: http://localhost:${PORT}`);
});
