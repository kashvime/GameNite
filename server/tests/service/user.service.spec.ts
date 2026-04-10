import { describe, expect, it } from "vitest";
import { updateUser } from "../../src/services/user.service.ts";
import { enforceAuth } from "../../src/services/auth.service.ts";

describe("enforceAuth", () => {
  it("should return a user and id on good auth", async () => {
    const user = await enforceAuth({ username: "user1", password: "pwd1111" });
    expect(user).toStrictEqual({ userId: expect.any(String), username: "user1" });
  });

  it("should raise on bad auth", async () => {
    await expect(enforceAuth({ username: "user1", password: "no" })).rejects.toThrow();
  });
});

describe("updateUser", () => {
  it("should throw if given an invalid user id", async () => {
    await expect(updateUser("fake", { display: "Stacey Fakename" })).rejects.toThrow();
  });
});
