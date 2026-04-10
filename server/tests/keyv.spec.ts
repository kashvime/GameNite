import { describe, expect, it } from "vitest";
import { setDbInitializer } from "../src/keyv.ts";

describe("keyv — setDbInitializer", () => {
  it("throws when called a second time", () => {
    expect(() =>
      setDbInitializer(() => {
        throw new Error("unused");
      }),
    ).toThrow("Database initializer cannot be set a second time");
  });
});
