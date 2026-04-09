/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for controller branches that are unreachable via HTTP
 * because the auth middleware intercepts first. call handlers directly.
 */
import { describe, expect, it, vi } from "vitest";
import { postJoinByCode } from "../src/controllers/game.controller.ts";
import {
  postCreate as threadPostCreate,
  postByIdComment,
} from "../src/controllers/thread.controller.ts";
import { postByUsername } from "../src/controllers/user.controller.ts";

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return res as any;
}

function reqWithNoUser(body: unknown = {}, params: Record<string, string> = {}): any {
  return { body, user: undefined, params };
}

describe("postJoinByCode — no auth (unreachable via HTTP)", () => {
  it("returns 400 on missing code", async () => {
    const res = mockRes();
    await postJoinByCode(reqWithNoUser({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 when jwtUser is missing", async () => {
    const res = mockRes();
    await postJoinByCode(reqWithNoUser({ code: "ABC123" }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("threadPostCreate — no auth (unreachable via HTTP)", () => {
  it("returns 401 when jwtUser is missing", async () => {
    const res = mockRes();
    await threadPostCreate(reqWithNoUser({ title: "Title", text: "Text" }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("postByIdComment — no auth (unreachable via HTTP)", () => {
  it("returns 401 when jwtUser is missing", async () => {
    const res = mockRes();
    await postByIdComment(reqWithNoUser({ payload: "comment" }, { id: "somethread" }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("postByUsername — no auth (unreachable via HTTP)", () => {
  it("returns 401 when jwtUser is missing", async () => {
    const res = mockRes();
    await postByUsername(reqWithNoUser({ display: "New Display" }, { username: "user1" }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
