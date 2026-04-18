// Validation sans dépendance externe

function isEmail(str) {
    return typeof str === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function validate(schema) {
    return function (req, res, next) {
        var errors = schema(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: "Données invalides", details: errors });
        }
        next();
    };
}

function validateQuery(schema) {
    return function (req, res, next) {
        var errors = schema(req.query);
        if (errors.length > 0) {
            return res.status(400).json({ error: "Paramètres invalides", details: errors });
        }
        next();
    };
}

var schemas = {
    register: function (body) {
        var errors = [];
        if (!body.email) errors.push("Email requis");
        else if (!isEmail(body.email)) errors.push("Adresse email invalide");
        if (!body.password) errors.push("Mot de passe requis");
        else if (body.password.length < 6) errors.push("Le mot de passe doit contenir au moins 6 caractères");
        return errors;
    },

    login: function (body) {
        var errors = [];
        if (!body.email) errors.push("Email requis");
        else if (!isEmail(body.email)) errors.push("Adresse email invalide");
        if (!body.password) errors.push("Mot de passe requis");
        return errors;
    },

    createFolder: function (body) {
        var errors = [];
        if (!body.name || !body.name.trim()) errors.push("Nom du dossier requis");
        else if (body.name.length > 255) errors.push("Nom trop long (255 caractères max)");
        return errors;
    },

    renameNode: function (body) {
        var errors = [];
        if (!body.name || !body.name.trim()) errors.push("Nouveau nom requis");
        else if (body.name.length > 255) errors.push("Nom trop long (255 caractères max)");
        return errors;
    },

    changeEmail: function (body) {
        var errors = [];
        if (!body.email) errors.push("Email requis");
        else if (!isEmail(body.email)) errors.push("Adresse email invalide");
        return errors;
    },

    changePassword: function (body) {
        var errors = [];
        if (!body.password) errors.push("Nouveau mot de passe requis");
        else if (body.password.length < 10) errors.push("Le mot de passe doit contenir au moins 10 caractères");
        return errors;
    },

    preferences: function (body) {
        var errors = [];
        if (body.theme && body.theme !== "light" && body.theme !== "dark") {
            errors.push("Thème invalide (light ou dark)");
        }
        return errors;
    },

    createShare: function (body) {
        var errors = [];
        if (!body.node_id) errors.push("node_id requis");
        else if (typeof body.node_id !== "number" && isNaN(parseInt(body.node_id))) errors.push("node_id doit être un nombre");
        return errors;
    },

    internalShare: function (body) {
        var errors = [];
        if (!body.node_id) errors.push("node_id requis");
        if (!body.email) errors.push("Email requis");
        else if (!isEmail(body.email)) errors.push("Adresse email invalide");
        return errors;
    },

    search: function (query) {
        var errors = [];
        if (!query.q || !query.q.trim()) errors.push("Terme de recherche requis");
        if (query.type && !["image", "video", "audio", "pdf", "text", "document"].includes(query.type)) {
            errors.push("Type invalide");
        }
        if (query.date && !["today", "week", "month", "year"].includes(query.date)) {
            errors.push("Filtre date invalide");
        }
        return errors;
    },
};

module.exports = { validate, validateQuery, schemas };