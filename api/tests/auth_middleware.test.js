// Tests du middleware authenticateToken (verification JWT).
// jwt.verify utilise un callback : on enveloppe dans une promise.

process.env.JWT_SECRET = "test_secret_pour_jest_only";

const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/auth");

function runMiddleware(req) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(payload) { this.body = payload; resolve({ req, res: this, nextCalled: false }); return this; },
        };
        const next = () => resolve({ req, res, nextCalled: true });
        authenticateToken(req, res, next);
    });
}

describe("authenticateToken", () => {
    test("401 si aucun token", async () => {
        const { res, nextCalled } = await runMiddleware({ headers: {}, query: {} });
        expect(res.statusCode).toBe(401);
        expect(nextCalled).toBe(false);
    });

    test("403 si token invalide", async () => {
        const { res, nextCalled } = await runMiddleware({
            headers: { authorization: "Bearer token.bidon.invalide" },
            query: {},
        });
        expect(res.statusCode).toBe(403);
        expect(nextCalled).toBe(false);
    });

    test("attache req.user et appelle next() si token valide", async () => {
        const token = jwt.sign({ id: 99, email: "u@x.fr" }, process.env.JWT_SECRET);
        const { req, nextCalled } = await runMiddleware({
            headers: { authorization: "Bearer " + token },
            query: {},
        });
        expect(nextCalled).toBe(true);
        expect(req.user.id).toBe(99);
        expect(req.user.email).toBe("u@x.fr");
    });

    test("accepte aussi le token en query param (pour les liens de download)", async () => {
        const token = jwt.sign({ id: 5 }, process.env.JWT_SECRET);
        const { req, nextCalled } = await runMiddleware({
            headers: {},
            query: { token },
        });
        expect(nextCalled).toBe(true);
        expect(req.user.id).toBe(5);
    });
});
