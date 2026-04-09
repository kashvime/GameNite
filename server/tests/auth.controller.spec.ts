import { describe, expect, it, vi, afterEach } from "vitest";
import { googleCallback } from "../src/controllers/auth.controller.ts";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SafeUserInfo } from "@gamenite/shared";

process.env.JWT_SECRET = "test";

const handler = googleCallback[1] as (req: Request, res: Response) => void;

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function mockReq(user?: SafeUserInfo): Request {
  return { user } as unknown as Request;
}

const fakeUser: SafeUserInfo = {
  userId: "abc123",
  username: "testuser",
  display: "Test User",
  createdAt: new Date(),
  onlineStatus: "online",
  totalGamesPlayed: 0,
  winRate: 0,
  favoriteGame: null,
  bio: null,
  avatarUrl: null,
  ratings: {},
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.CLIENT_URL;
});

describe("googleCallback handler", () => {
  it("returns 401 when no user on request", () => {
    const req = mockReq(undefined);
    const res = mockRes();
    handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("redirects with token when user is present and CLIENT_URL is set", () => {
    process.env.CLIENT_URL = "http://localhost:4530";
    const req = mockReq(fakeUser);
    const res = mockRes();
    handler(req, res);
    expect(res.redirect).toHaveBeenCalledOnce();
    const redirectUrl = (res.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(redirectUrl).toContain("/auth-success?token=");
    const token = redirectUrl.split("token=")[1];
    const decoded = jwt.verify(token, "test") as { username: string };
    expect(decoded.username).toBe("testuser");
  });

  it("redirects with token when CLIENT_URL is not set but NODE_ENV is development", () => {
    delete process.env.CLIENT_URL;
    process.env.NODE_ENV = "development";
    const req = mockReq(fakeUser);
    const res = mockRes();
    handler(req, res);
    expect(res.redirect).toHaveBeenCalledOnce();
    const redirectUrl = (res.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(redirectUrl).toContain("http://localhost:4530/auth-success?token=");
    process.env.NODE_ENV = "test";
  });
  it("returns 500 when CLIENT_URL is not set and not in development", () => {
    process.env.CLIENT_URL = "";
    process.env.NODE_ENV = "production";
    const req = mockReq(fakeUser);
    const res = mockRes();
    handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "CLIENT_URL is not configured" });
    process.env.NODE_ENV = "test";
  });

  it("returns 500 when jwt.sign throws", () => {
    process.env.CLIENT_URL = "http://localhost:4530";
    vi.spyOn(jwt, "sign").mockImplementation(() => {
      throw new Error("sign failed");
    });
    const req = mockReq(fakeUser);
    const res = mockRes();
    handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Google auth failed" });
  });
});
