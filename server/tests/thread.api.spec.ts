import { describe, expect, it } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

let response: Response;

const TOKEN1 = makeToken("user1");
const TOKEN2 = makeToken("user2");
const TOKEN_NONEXISTENT = makeToken("nonexistentuser");

const userShape = {
  userId: expect.any(String),
  createdAt: expect.anything(),
  onlineStatus: expect.any(String),
  totalGamesPlayed: expect.any(Number),
  winRate: expect.any(Number),
  favoriteGame: null,
  bio: null,
  avatarUrl: null,
  ratings: {},
};

describe("GET /api/thread/list", () => {
  it("should return all threads", async () => {
    response = await supertest(app).get("/api/thread/list");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(5);
  });

  it("should return the most recent thread first", async () => {
    response = await supertest(app).get("/api/thread/list");
    expect(response.status).toBe(200);
    expect(response.body[0]).toStrictEqual({
      threadId: "abadcafeabadcafeabadcafe",
      comments: 0,
      createdAt: expect.anything(),
      title: "Nim?",
      createdBy: { ...userShape, display: "Yāo", username: "user1" },
    });
  });
});

describe("GET /api/thread/:id", () => {
  it("should return 404 on a bad id", async () => {
    response = await supertest(app).get(`/api/thread/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should return existing ids", async () => {
    response = await supertest(app).get(`/api/thread/deadbeefdeadbeefdeadbeef`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      threadId: "deadbeefdeadbeefdeadbeef",
      title: "Hello game knights",
      text: "I'm a big Nim buff and am excited to join this community.",
      comments: [],
      createdBy: { ...userShape, username: "user1", display: "Yāo" },
      createdAt: new Date("2025-04-02").toISOString(),
    });
  });
});

describe("POST /api/thread/create", () => {
  it("should return 400 on ill-formed payload", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ bad: "payload" });
    expect(response.status).toBe(400);
  });

  it("should return 401 with bad auth", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .set("Authorization", `Bearer invalidtoken`)
      .send({ title: "Evil title", text: "Evil contents" });
    expect(response.status).toBe(401);
  });

  it("should return 401 with no auth", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .send({ title: "Title", text: "Text" });
    expect(response.status).toBe(401);
  });

  it("should return 403 when user is not found", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .set("Authorization", `Bearer ${TOKEN_NONEXISTENT}`)
      .send({ title: "Title", text: "Text" });
    expect(response.status).toBe(403);
  });

  it("should succeed with correct information", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({ title: "Title", text: "Text" });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      threadId: expect.anything(),
      title: "Title",
      text: "Text",
      createdAt: expect.anything(),
      createdBy: { ...userShape, username: "user2", display: expect.any(String) },
      comments: [],
    });
  });
});

describe("POST /api/thread/:id/comment", () => {
  it("should return 400 on ill-formed payload", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send("4");
    expect(response.status).toBe(400);
  });

  it("should return 404 on a bad id", async () => {
    response = await supertest(app)
      .post(`/api/thread/${randomUUID().toString()}/comment`)
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(404);
  });

  it("should return 401 with bad auth", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .set("Authorization", `Bearer invalidtoken`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(401);
  });

  it("should return 401 with no auth", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(401);
  });

  it("should return 403 when user is not found", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .set("Authorization", `Bearer ${TOKEN_NONEXISTENT}`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(403);
  });

  it("should succeed with correct information", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(200);
    expect(response.body?.comments).toStrictEqual([
      {
        commentId: expect.anything(),
        createdAt: expect.anything(),
        text: "FIRST!",
        createdBy: { ...userShape, username: "user2", display: "Sénior Dos" },
      },
    ]);
  });
});
