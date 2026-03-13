const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Inscription
router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email et mot de passe requis" });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res.status(400).json({ error: "Email invalide" });

        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email.toLowerCase()]
        );
        if (existingUser.rows.length > 0)
            return res.status(409).json({ error: "Cet email est déjà utilisé" });

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email.toLowerCase(), passwordHash]
        );

        const user  = result.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ message: "Utilisateur créé", user, token });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
    }
});

// Connexion
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email.toLowerCase()]
        );

        if (result.rows.length === 0)
            return res.status(401).json({ error: "Identifiants incorrects" });

        const user = result.rows[0];
        if (!user.password_hash)
            return res.status(401).json({ error: "Utilisez la connexion Google" });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(401).json({ error: "Identifiants incorrects" });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Connexion réussie",
            user: { id: user.id, email: user.email },
            token,
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
