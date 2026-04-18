const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { validate, schemas } = require("../middleware/validate");

let googleStrategyConfigured = false;

function configureGoogleStrategy() {
    if (googleStrategyConfigured) return;

    const clientID = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    if (!clientID || !clientSecret) return;

    const callbackURL =
        process.env.OAUTH_CALLBACK_URL ||
        (process.env.API_URL || "http://localhost:3000") + "/api/auth/google/callback";

    passport.use(
        new GoogleStrategy(
            {
                clientID,
                clientSecret,
                callbackURL,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value?.toLowerCase();
                    if (!email) return done(new Error("Email Google introuvable"));

                    const providerId = profile.id;

                    let userRes = await pool.query(
                        "SELECT id, email FROM users WHERE provider = 'google' AND provider_id = $1",
                        [providerId]
                    );

                    if (userRes.rows.length === 0) {
                        userRes = await pool.query(
                            "SELECT id, email FROM users WHERE email = $1",
                            [email]
                        );

                        if (userRes.rows.length > 0) {
                            const existing = userRes.rows[0];
                            await pool.query(
                                "UPDATE users SET provider = 'google', provider_id = $1 WHERE id = $2",
                                [providerId, existing.id]
                            );
                            return done(null, { id: existing.id, email: existing.email });
                        }

                        const created = await pool.query(
                            "INSERT INTO users (email, provider, provider_id) VALUES ($1, 'google', $2) RETURNING id, email",
                            [email, providerId]
                        );

                        return done(null, created.rows[0]);
                    }

                    return done(null, userRes.rows[0]);
                } catch (error) {
                    return done(error);
                }
            }
        )
    );

    googleStrategyConfigured = true;
}

configureGoogleStrategy();

// Inscription
router.post("/register", validate(schemas.register), async (req, res) => {
    try {
        const { email, password } = req.body;

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
router.post("/login", validate(schemas.login), async (req, res) => {
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

router.get("/google", (req, res, next) => {
    if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
        return res.status(500).json({ error: "Google OAuth non configuré sur le serveur" });
    }
    return passport.authenticate("google", {
        scope:   ["profile", "email"],
        session: false,
        prompt:  "select_account",
    })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user) => {
        const webUrl = process.env.WEB_URL || "http://localhost:3001";

        if (err || !user) {
            return res.redirect(webUrl + "/login?error=oauth_failed");
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, provider: "google" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.redirect(webUrl + "/login?token=" + encodeURIComponent(token));
    })(req, res, next);
});

router.get("/google/logout", (req, res) => {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    res.redirect(webUrl + "/login");
});

module.exports = router;