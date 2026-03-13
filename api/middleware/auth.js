const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  let token = null;
  const authHeader = req.headers["authorization"];

  // Recupération du token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Token manquant." });
  }

  // Verification du token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      const message = err.name === "TokenExpiredError" ? "Session expirée" : "Token invalide";
      return res.status(403).json({ error: message });
    }

    if (!decoded.id) {
      return res.status(403).json({ error: "Payload du token invalide" });
    }

    req.user = decoded;
    next();
  });
};

module.exports = authenticateToken;