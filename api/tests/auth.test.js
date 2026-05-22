// Tests d'integration sur /api/auth (register, login, JWT).
// pg est mocke pour ne pas dependre d'une vraie DB.

jest.mock("pg", () => {
    const mQuery = jest.fn();
    const mPool = jest.fn(() => ({
        query: mQuery,
        connect: jest.fn(),
        end: jest.fn(),
    }));
    return { Pool: mPool, __mQuery: mQuery };
});

process.env.JWT_SECRET = "test_secret_pour_jest_only";
process.env.NODE_ENV  = "test";

const request = require("supertest");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

// Recupere la fonction de mock partagee
const mQuery = require("pg").__mQuery;

// On instancie l'app apres le mock
const app = require("../index");

beforeEach(() => mQuery.mockReset());

describe("POST /api/auth/register", () => {
    test("400 si email ou mot de passe manquant", async () => {
        const res = await request(app).post("/api/auth/register").send({});
        expect(res.status).toBe(400);
    });

    test("400 si email invalide", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "pas-un-email", password: "azerty123" });
        expect(res.status).toBe(400);
    });

    test("409 si email deja pris", async () => {
        mQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: "alice@x.fr" }] });
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "alice@x.fr", password: "azerty123" });
        expect(res.status).toBe(409);
    });

    test("201 + JWT valide en cas de succes", async () => {
        mQuery.mockResolvedValueOnce({ rows: [] }); // pas d'utilisateur existant
        mQuery.mockResolvedValueOnce({ rows: [{ id: 42, email: "new@x.fr" }] }); // insertion

        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "new@x.fr", password: "azerty123" });

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe("new@x.fr");

        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
        expect(decoded.id).toBe(42);
        expect(decoded.email).toBe("new@x.fr");
    });
});

describe("POST /api/auth/login", () => {
    test("401 si utilisateur inexistant", async () => {
        mQuery.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "ghost@x.fr", password: "azerty123" });
        expect(res.status).toBe(401);
    });

    test("401 si mot de passe incorrect", async () => {
        // bcrypt hash valide pour "vraibon" mais on envoie "mauvais"
        const bcrypt = require("bcrypt");
        const hash = await bcrypt.hash("vraibon123", 4);

        mQuery.mockResolvedValueOnce({
            rows: [{ id: 1, email: "u@x.fr", password_hash: hash }],
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "u@x.fr", password: "mauvais" });

        expect(res.status).toBe(401);
    });

    test("200 + token si credentials OK", async () => {
        const bcrypt = require("bcrypt");
        const hash = await bcrypt.hash("vraibon123", 4);

        mQuery.mockResolvedValueOnce({
            rows: [{ id: 7, email: "u@x.fr", password_hash: hash }],
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "u@x.fr", password: "vraibon123" });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
        expect(decoded.id).toBe(7);
    });

    test("401 si l'utilisateur n'a pas de password (compte Google only)", async () => {
        mQuery.mockResolvedValueOnce({
            rows: [{ id: 1, email: "g@x.fr", password_hash: null }],
        });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "g@x.fr", password: "n'importe" });

        expect(res.status).toBe(401);
    });
});

describe("GET /api/health", () => {
    test("repond 200 et status ok", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });
});
