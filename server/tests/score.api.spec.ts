import { describe, expect, it } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

let response: Response;

const BRIAN_TOKEN = makeToken("briangriffin");
const STEWIE_TOKEN = makeToken("stewiegrififfin");

describe("GET /api/scores/leaderboard", () => {
  it("should return chess leaderboard sorted by rating", async () => {
    response = await supertest(app).get("/api/scores/leaderboard?gameType=chess");
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(15);
    expect(response.body[0].user.username).toBe("stewiegrififfin");
    expect(response.body[0].rating).toBe(1900);
    expect(response.body[1].user.username).toBe("briangriffin");
    expect(response.body[1].rating).toBe(1500);
  });

  it("should limit the number of results", async () => {
    response = await supertest(app).get("/api/scores/leaderboard?gameType=chess&limit=2");
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(2);
    expect(response.body[0].user.username).toBe("stewiegrififfin");
  });

  it("should filter leaderboard by league", async () => {
    response = await supertest(app).get("/api/scores/leaderboard?gameType=chess&league=gold");
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(1);
    expect(response.body[0].user.username).toBe("stewiegrififfin");
  });

  it("should return empty list when filtering to friends with none", async () => {
    response = await supertest(app).get(
      "/api/scores/leaderboard?gameType=chess&friendsOnly=true&username=briangriffin",
    );
    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual([]);
  });
});

describe("POST /api/scores/myrank", () => {
  it("should return 401 when no token is provided", async () => {
    response = await supertest(app).post("/api/scores/myrank");
    expect(response.status).toBe(401);
  });

  it("should return 401 when token is invalid", async () => {
    response = await supertest(app)
      .post("/api/scores/myrank")
      .set("Authorization", "Bearer badtoken");
    expect(response.status).toBe(401);
  });

  it("should return 403 when user does not exist", async () => {
    response = await supertest(app)
      .post("/api/scores/myrank")
      .set("Authorization", `Bearer ${makeToken("nobody")}`);
    expect(response.status).toBe(403);

    expect(response.body).toStrictEqual({ error: "User not found" });
  });

  it("should return rank and rating for a valid user", async () => {
    response = await supertest(app)
      .post("/api/scores/myrank?gameType=chess")
      .set("Authorization", `Bearer ${STEWIE_TOKEN}`);
    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual({
      rank: 1,
      rating: 1900,
    });
  });

  it("should return empty object when user has no rating", async () => {
    response = await supertest(app)
      .post("/api/scores/myrank?gameType=chess")
      .set("Authorization", `Bearer ${makeToken("meggriffin")}`);
    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual({ rank: expect.any(Number), rating: 1000 });
  });

  it("should return empty object when filtering to friends with none", async () => {
    response = await supertest(app)
      .post("/api/scores/myrank?friendsOnly=true")
      .set("Authorization", `Bearer ${STEWIE_TOKEN}`);
    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual({});
  });

  it("should return rating even when outside league filter", async () => {
    response = await supertest(app)
      .post("/api/scores/myrank?gameType=chess&league=gold")
      .set("Authorization", `Bearer ${makeToken("glennquagmire")}`);
    expect(response.status).toBe(200);

    expect(response.body.rating).toBe(1000);
  });
});

describe("POST /api/scores", () => {
  it("should return 401 when no token is provided", async () => {
    response = await supertest(app).post("/api/scores/").send({});
    expect(response.status).toBe(401);
    expect(response.body).toStrictEqual({ error: "Unauthorized" });
  });

  it("should return 400 on a poorly-formed filter", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({ result: "tie" });
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: "Poorly-formed request" });
  });
});

describe("POST /api/matches", () => {
  it("should return 401 when no token is provided", async () => {
    response = await supertest(app).post("/api/matches");
    expect(response.status).toBe(401);
  });

  it("should return 401 when token is invalid", async () => {
    response = await supertest(app).post("/api/matches").set("Authorization", "Bearer badtoken");
    expect(response.status).toBe(401);
  });

  it("should return 403 when user does not exist", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${makeToken("nobody")}`)
      .send({});
    expect(response.status).toBe(403);

    expect(response.body).toStrictEqual({ error: "User not found" });
  });

  it("should return all matches for a user", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({});
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(7);
  });

  it("should filter matches by game type", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({ gameType: "chess" });
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(3);
  });

  it("should filter matches by result", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({ result: "win" });
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(4);
  });

  it("should filter matches by opponent", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({ opponentUsername: "glennquagmire" });
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(2);
  });

  it("should return matches sorted by score", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({ sortOrder: "score" });
    expect(response.status).toBe(200);

    expect(response.body[0].score).toBe(50);
  });

  it("should return correct number of results per page", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({ pageSize: 3, page: 1 });
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(3);
  });

  it("should return only matches within a given date range", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${BRIAN_TOKEN}`)
      .send({
        dateRange: { from: "2025-01-01", to: "2025-01-31" },
      });
    expect(response.status).toBe(200);

    expect(response.body.length).toBe(3);
  });

  it("should return empty array when no matches exist", async () => {
    response = await supertest(app)
      .post("/api/matches")
      .set("Authorization", `Bearer ${makeToken("tomtucker")}`)
      .send({ gameType: "guess" });
    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual([]);
  });
});
