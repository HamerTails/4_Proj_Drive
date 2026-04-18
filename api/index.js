require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),

      "media-src": ["'self'", "http://localhost:3000", process.env.API_URL].filter(Boolean),
      "img-src":   ["'self'", "data:", "http://localhost:3000", process.env.API_URL].filter(Boolean),
      "frame-src": ["'self'", "http://localhost:3000", process.env.API_URL].filter(Boolean),
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// En dev on accepte tout, en prod on restreint
const isDev = process.env.NODE_ENV !== 'production';

const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://192.168.1.119:8081",
  "http://192.168.1.119:19006",
  process.env.WEB_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (isDev || !origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS bloqué pour : ' + origin));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 5, // en dev on est large, en prod on restreint
  message: { error: "Trop de tentatives, réessayez dans une minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// -----------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------
const authRouter    = require("./routes/auth_logic");
const nodesRouter   = require("./routes/nodes");
const filesRouter   = require("./routes/files");
const trashRouter   = require("./routes/trash");
const storageRouter = require("./routes/storage");
const sharesRouter  = require("./routes/shares");
const usersRouter   = require("./routes/users");

app.use("/api/auth",    authLimiter, authRouter);
app.use("/api/nodes",   nodesRouter);
app.use("/api/files",   filesRouter);
app.use("/api/trash",   trashRouter);
app.use("/api/storage", storageRouter);
app.use("/api/shares",  sharesRouter);
app.use("/api/users",   usersRouter);

app.use("/api/internal-shares", (req, res, next) => {
  req.url = "/internal" + (req.url === "/" ? "" : req.url);
  sharesRouter(req, res, next);
});

function safeMount(app, path, modulePath) {
  try {
    const router = require(modulePath);
    app.use(path, router);
    console.log('✅ Route montée : ' + path);
  } catch {
    console.warn('⚠️  Route ignorée (fichier absent) : ' + modulePath);
  }
}

safeMount(app, "/api/search",   "./routes/search");
safeMount(app, "/api/settings", "./routes/settings");

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


app.get("/api/admin/integrity", async (req, res) => {
  try {
    const checkIntegrity = require("./utils/integrity");
    const result = await checkIntegrity();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur vérification intégrité" });
  }
});


app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Fichier trop lourd (max 100 Mo)" });
  }
  if (err.message?.startsWith("CORS bloqué")) {
    return res.status(403).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: err.message || "Erreur serveur interne",
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log('✅ API SUPFile démarrée sur le port ' + PORT);
  try {
    const checkIntegrity = require("./utils/integrity");
    checkIntegrity().catch(err => console.warn("[INTEGRITY] Erreur:", err.message));
  } catch {}
});

module.exports = app;