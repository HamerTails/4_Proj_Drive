// Tests unitaires des schemas de validation.
// Pas besoin de la DB, on appelle directement les fonctions.

const { schemas } = require("../middleware/validate");

describe("schemas.register", () => {
    test("refuse un body vide", () => {
        const errors = schemas.register({});
        expect(errors).toContain("Email requis");
        expect(errors).toContain("Mot de passe requis");
    });

    test("refuse un email mal forme", () => {
        const errors = schemas.register({ email: "pas-un-email", password: "azerty" });
        expect(errors).toContain("Adresse email invalide");
    });

    test("refuse un mot de passe trop court", () => {
        const errors = schemas.register({ email: "a@b.fr", password: "abc" });
        expect(errors.some(e => /au moins 6/.test(e))).toBe(true);
    });

    test("accepte un body valide", () => {
        const errors = schemas.register({ email: "a@b.fr", password: "azerty123" });
        expect(errors).toEqual([]);
    });
});

describe("schemas.createFolder", () => {
    test("refuse un nom vide", () => {
        expect(schemas.createFolder({ name: "" })).toContain("Nom du dossier requis");
        expect(schemas.createFolder({ name: "   " })).toContain("Nom du dossier requis");
    });

    test("refuse un nom > 255 caracteres", () => {
        const longName = "a".repeat(300);
        const errors = schemas.createFolder({ name: longName });
        expect(errors.some(e => /255/.test(e))).toBe(true);
    });

    test("accepte un nom normal", () => {
        expect(schemas.createFolder({ name: "Mes documents" })).toEqual([]);
    });
});

describe("schemas.changePassword", () => {
    test("impose 10 caracteres minimum", () => {
        const errors = schemas.changePassword({ password: "courtmdp" });
        expect(errors.some(e => /au moins 10/.test(e))).toBe(true);
    });

    test("accepte un mot de passe long", () => {
        expect(schemas.changePassword({ password: "monsupermotdepasse" })).toEqual([]);
    });
});

describe("schemas.search", () => {
    test("exige un terme de recherche", () => {
        expect(schemas.search({})).toContain("Terme de recherche requis");
    });

    test("refuse un type invalide", () => {
        expect(schemas.search({ q: "rapport", type: "exe" })).toContain("Type invalide");
    });

    test("refuse un filtre date inconnu", () => {
        expect(schemas.search({ q: "rapport", date: "decennie" })).toContain("Filtre date invalide");
    });

    test("accepte une recherche bien formee", () => {
        expect(schemas.search({ q: "rapport", type: "pdf", date: "week" })).toEqual([]);
    });
});

describe("schemas.preferences", () => {
    test("refuse un theme exotique", () => {
        const errors = schemas.preferences({ theme: "purple" });
        expect(errors.some(e => /light ou dark/.test(e))).toBe(true);
    });

    test("accepte light", () => {
        expect(schemas.preferences({ theme: "light" })).toEqual([]);
    });

    test("accepte dark", () => {
        expect(schemas.preferences({ theme: "dark" })).toEqual([]);
    });
});

describe("schemas.internalShare", () => {
    test("exige node_id et email", () => {
        const errors = schemas.internalShare({});
        expect(errors).toContain("node_id requis");
        expect(errors).toContain("Email requis");
    });

    test("refuse un email mal forme", () => {
        const errors = schemas.internalShare({ node_id: 42, email: "pas-un-email" });
        expect(errors).toContain("Adresse email invalide");
    });

    test("accepte un partage interne valide", () => {
        expect(schemas.internalShare({ node_id: 42, email: "a@b.fr" })).toEqual([]);
    });
});
