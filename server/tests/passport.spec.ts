/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, vi, beforeAll } from "vitest";

type DoneCallback = (err: Error | null, user?: object) => void;
type VerifyCallback = (
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: DoneCallback,
) => Promise<void>;

let capturedCallback: VerifyCallback | null = null;

vi.mock("passport-google-oauth20", () => ({
  Strategy: class {
    name = "google";
    static AuthorizationError = class {};
    static TokenError = class {};
    static InternalOAuthError = class {};
    constructor(_opts: object, callback: VerifyCallback) {
      capturedCallback = callback;
    }
    authenticate() {}
  },
}));

vi.mock("../src/services/auth.service.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/auth.service.ts")>();
  return {
    ...actual,
    ssoLogin: vi.fn().mockResolvedValue({ userId: "u1", username: "test@test.com" }),
  };
});

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = "test-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  vi.resetModules();
  await import("../src/config/passport.ts");
});

describe("passport — Google strategy callback", () => {
  it("calls done with error when email is missing", async () => {
    expect(capturedCallback).not.toBeNull();
    const done = vi.fn();
    const profile = { emails: [], displayName: "No Email User" };
    await capturedCallback!("token", "refresh", profile, done);
    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error)?.message).toBe("No email found");
  });

  it("calls done with user when email is present", async () => {
    const done = vi.fn();
    const profile = { emails: [{ value: "test@test.com" }], displayName: "Test User" };
    await capturedCallback!("token", "refresh", profile, done);
    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ username: "test@test.com" }));
  });

  it("calls done with error when ssoLogin throws", async () => {
    const { ssoLogin } = await import("../src/services/auth.service.ts");
    vi.mocked(ssoLogin).mockRejectedValueOnce(new Error("SSO failed"));
    const done = vi.fn();
    const profile = { emails: [{ value: "fail@test.com" }], displayName: "Fail User" };
    await capturedCallback!("token", "refresh", profile, done);
    expect(done).toHaveBeenCalledWith(expect.any(Error));
  });
});
