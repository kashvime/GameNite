import { describe, expect, it } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

let response: Response;

const TOKEN3 = makeToken("user3");

const userShape = {
  userId: expect.any(String),
  createdAt: expect.anything(),
  onlineStatus: expect.any(String),
  totalGamesPlayed: expect.any(Number),
  winRate: expect.any(Number),
  favoriteGame: null,
  bio: null,
  avatarUrl: null,
  ratings: expect.any(Object),
};

describe("POST /api/game/create", () => {
  it("should return 400 on ill-formed payload or invalid game key", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: 9 });
    expect(response.status).toBe(400);

    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "gameThatDoesNotExist" });
    expect(response.status).toBe(400);
  });

  it("should return 403 with bad auth", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer invalidtoken`)
      .send({ gameKey: "nim" });
    expect(response.status).toBe(401);
  });

  it("should succeed when asked to create a game of nim", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "nim" });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      gameId: expect.anything(),
      chat: expect.anything(),
      type: "nim",
      status: "waiting",
      createdBy: { ...userShape, username: "user3", display: "Frau Drei" },
      createdAt: expect.anything(),
      minPlayers: 2,
      players: [{ ...userShape, username: "user3", display: "Frau Drei" }],
      visibility: "public",
      gameMode: "human",
    });
  });

  it("should create an AI chess game with status active and no AI player visible", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "chess", gameMode: "ai", aiDifficulty: "medium" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      type: "chess",
      status: "active",
      gameMode: "ai",
      aiDifficulty: "medium",
      players: [{ username: "user3" }], // AI_OPPONENT filtered out
    });
    // AI player should not be exposed to the client
    const usernames = (response.body.players as { username: string }[]).map((p) => p.username);
    expect(usernames).not.toContain("AI_OPPONENT");
    expect(usernames).not.toContain("Computer");
  });

  it("should create an AI chess game with easy difficulty", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "chess", gameMode: "ai", aiDifficulty: "easy" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ gameMode: "ai", aiDifficulty: "easy", status: "active" });
  });

  it("should default to human gameMode when not specified", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "chess" });
    expect(response.status).toBe(200);
    expect(response.body.gameMode).toBe("human");
    expect(response.body.status).toBe("waiting");
  });

  it("should return 400 for invalid aiDifficulty", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "chess", gameMode: "ai", aiDifficulty: "impossible" });
    expect(response.status).toBe(400);
  });

  it("should create a private AI chess game", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "chess", gameMode: "ai", aiDifficulty: "hard", visibility: "private" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      gameMode: "ai",
      visibility: "private",
      status: "active",
    });
    expect(response.body.inviteCode).toBeDefined();
  });
});

describe("GET /api/game/:id", () => {
  it("should 404 given a nonexistent id", async () => {
    response = await supertest(app).get(`/api/game/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should succeed if a created game is requested", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "nim" });
    expect(response.status).toBe(200);
    const gameInfo = response.body;

    response = await supertest(app).get(`/api/game/${gameInfo.gameId}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(gameInfo);
  });

  it("should return AI chess game with correct fields", async () => {
    response = await supertest(app)
      .post(`/api/game/create`)
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ gameKey: "chess", gameMode: "ai", aiDifficulty: "hard" });
    const { gameId } = response.body;

    response = await supertest(app).get(`/api/game/${gameId}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ gameMode: "ai", aiDifficulty: "hard", status: "active" });
  });
});

describe("GET /api/game/list", () => {
  it("should return created games in reverse chronological order", async () => {
    response = await supertest(app).get(`/api/game/list`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { type: "nim", status: "waiting", players: [{ username: "user1" }] },
      {
        type: "guess",
        status: "active",
        players: [
          { username: "user1" },
          { username: "user0" },
          { username: "user3" },
          { username: "user2" },
        ],
      },
      {
        type: "nim",
        status: "done",
        createdAt: new Date("2025-04-21").toISOString(),
        players: [{ username: "user2" }, { username: "user3" }],
      },
    ]);
  });
});
