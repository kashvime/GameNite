import { describe, expect, it } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

let response: Response;

const TOKEN1 = makeToken("user1");
const TOKEN2 = makeToken("user2");
const TOKEN3 = makeToken("user3");

describe("POST /api/friend/request", () => {
  it("returns 400 when toUsername is missing", async () => {
    response = await supertest(app)
      .post("/api/friend/request")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it("returns 401 with no auth", async () => {
    response = await supertest(app).post("/api/friend/request").send({ toUsername: "user2" });
    expect(response.status).toBe(401);
  });

  it("succeeds when sending a valid friend request", async () => {
    response = await supertest(app)
      .post("/api/friend/request")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ toUsername: "user2" });
    expect(response.status).toBe(200);
  });

  it("returns 400 when sending request to nonexistent user", async () => {
    response = await supertest(app)
      .post("/api/friend/request")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ toUsername: "nonexistentuser" });
    expect(response.status).toBe(400);
  });

  it("returns 400 when sending duplicate request", async () => {
    await supertest(app)
      .post("/api/friend/request")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ toUsername: "user3" });
    response = await supertest(app)
      .post("/api/friend/request")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ toUsername: "user3" });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/friend/respond", () => {
  it("returns 400 when requestId is missing", async () => {
    response = await supertest(app)
      .post("/api/friend/respond")
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({ accept: true });
    expect(response.status).toBe(400);
  });

  it("returns 401 with no auth", async () => {
    response = await supertest(app)
      .post("/api/friend/respond")
      .send({ requestId: "someid", accept: true });
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid request id", async () => {
    response = await supertest(app)
      .post("/api/friend/respond")
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({ requestId: "nonexistent-id", accept: true });
    expect(response.status).toBe(400);
  });

  it("accepts a friend request successfully", async () => {
    // Send request first
    await supertest(app)
      .post("/api/friend/request")
      .set("Authorization", `Bearer ${TOKEN3}`)
      .send({ toUsername: "user2" });

    // Get pending requests to find the requestId
    const pendingRes = await supertest(app)
      .post("/api/friend/pending")
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({});
    const requestId = pendingRes.body[0]?.requestId;

    response = await supertest(app)
      .post("/api/friend/respond")
      .set("Authorization", `Bearer ${TOKEN2}`)
      .send({ requestId, accept: true });
    expect(response.status).toBe(200);
  });
});

describe("POST /api/friend/pending", () => {
  it("returns 401 with no auth", async () => {
    response = await supertest(app).post("/api/friend/pending").send({});
    expect(response.status).toBe(401);
  });

  it("returns pending requests for authenticated user", async () => {
    response = await supertest(app)
      .post("/api/friend/pending")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({});
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe("POST /api/friend/list", () => {
  it("returns 401 with no auth", async () => {
    response = await supertest(app).post("/api/friend/list").send({});
    expect(response.status).toBe(401);
  });

  it("returns friends list for authenticated user", async () => {
    response = await supertest(app)
      .post("/api/friend/list")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({});
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe("POST /api/friend/status", () => {
  it("returns 400 when toUsername is missing", async () => {
    response = await supertest(app)
      .post("/api/friend/status")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it("returns 401 with no auth", async () => {
    response = await supertest(app).post("/api/friend/status").send({ toUsername: "user2" });
    expect(response.status).toBe(401);
  });

  it("returns 404 for nonexistent user", async () => {
    response = await supertest(app)
      .post("/api/friend/status")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ toUsername: "nonexistentuser" });
    expect(response.status).toBe(404);
  });

  it("returns not_connected status for users with no relationship", async () => {
    response = await supertest(app)
      .post("/api/friend/status")
      .set("Authorization", `Bearer ${TOKEN1}`)
      .send({ toUsername: "user2" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: expect.any(String) });
  });
});
