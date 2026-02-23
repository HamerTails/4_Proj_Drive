const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  let token = null;
  const authHeader = req.headers["authorization"];

  // 1. Récupération du token (Header ou Query Param)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Token manquant." });
  }

  // 2. Vérification du token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Distinction pour aider le frontend (F1-19) à savoir s'il doit rediriger vers /login
      const message = err.name === "TokenExpiredError" ? "Session expirée" : "Token invalide";
      return res.status(403).json({ error: message });
    }

    // 3. Sécurité : On s'assure que le payload contient bien l'ID
    if (!decoded.id) {
      return res.status(403).json({ error: "Payload du token invalide" });
    }

    // On attache l'utilisateur à la requête
    req.user = decoded;
    next();
  });
};

module.exports = authenticateToken;