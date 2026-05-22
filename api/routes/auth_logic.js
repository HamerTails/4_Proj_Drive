const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

// Stockage temporaire des redirections mobiles/web (TTL 10 min)
// Mappe un stateKey OAuth -> URL ou le user doit etre redirige avec son token apres login.
const mobileRedirects = new Map();

// Helper : enregistre une URL de retour, renvoie le stateKey a passer a Google
function rememberReturnUrl(url) {
    const stateKey = Math.random().toString(36).slice(2, 10);
    mobileRedirects.set(stateKey, url);
    setTimeout(() => mobileRedirects.delete(stateKey), 10 * 60 * 1000);
    return stateKey;
}

router.get("/google", (req, res, next) => {
    let stateKey;
    // Si l'appelant fournit une URL de retour (mobile_redirect ou return), on la stocke.
    const returnUrl = req.query.mobile_redirect || req.query.return;
    if (returnUrl) {
        stateKey = rememberReturnUrl(returnUrl);
    }
    return passport.authenticate("google", {
        scope:   ["profile", "email"],
        session: false,
        prompt:  "select_account",
        state:   stateKey,
    })(req, res, next);
});

// Route dediee Expo : accepte ?return=URL (web Expo) ou scheme deep-link (native).
// Si pas de return, fallback sur l'origin de l'appelant (Referer header) puis WEB_URL.
router.get("/google/expo", (req, res, next) => {
    let returnUrl = req.query.return;
    if (!returnUrl) {
        // Fallback : utilise le Referer si dispo (Expo Web), sinon WEB_URL/login
        const ref = req.headers.referer || req.headers.referrer || "";
        if (ref && /^https?:\/\//.test(ref)) {
            try {
                const u = new URL(ref);
                returnUrl = u.origin + "/login";
            } catch {}
        }
    }
    if (!returnUrl) {
        returnUrl = (process.env.WEB_URL || "http://localhost:3001") + "/login";
    }
    const stateKey = rememberReturnUrl(returnUrl);
    return passport.authenticate("google", {
        scope:   ["profile", "email"],
        session: false,
        prompt:  "select_account",
        state:   stateKey,
    })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user) => {
        const webUrl = process.env.WEB_URL || "http://localhost:3001";

        // Recuperer l'URL de retour via le stateKey
        const stateKey = req.query.state;
        const returnUrl = stateKey ? mobileRedirects.get(stateKey) : null;
        if (stateKey) mobileRedirects.delete(stateKey);

        const target = returnUrl || (webUrl + "/login");

        if (err || !user) {
            const sep = target.includes("?") ? "&" : "?";
            return res.redirect(target + sep + "error=oauth_failed");
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, provider: "google" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const sep = target.includes("?") ? "&" : "?";
        return res.redirect(target + sep + "token=" + encodeURIComponent(token));
    })(req, res, next);
});

router.get("/google/logout", (req, res) => {
    const webUrl = process.env.WEB_URL || "http://localhost:3001";
    res.redirect(webUrl + "/login");
});

module.exports = router;