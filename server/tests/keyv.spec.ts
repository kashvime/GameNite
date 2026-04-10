import { describe, expect, it, vi } from "vitest";
import { Keyv } from "keyv";
import { createRepo, setDbInitializer } from "../src/keyv.ts";

describe("setDbInitializer", () => {
  it("throws when called a second time", () => {
    expect(() =>
      setDbInitializer(() => {
        throw new Error("unused");
      }),
    ).toThrow("Database initializer cannot be set a second time");
  });

  it("passes the repo name to the initializer on first store access", async () => {
    vi.resetModules();
    const { setDbInitializer: freshSetDb, createRepo: freshCreateRepo } =
      await import("../src/keyv.ts");
    const customInit = vi.fn((_name: string) => new Keyv());
    freshSetDb(customInit);
    const repo = freshCreateRepo<string>("my-repo");
    await repo.set("key", "value");
    expect(customInit).toHaveBeenCalledWith("my-repo");
  });
});

describe("createRepo", () => {
  describe("add", () => {
    it("stores the value and returns a non-empty string key", async () => {
      const repo = createRepo<string>("add-repo");
      const key = await repo.add("hello");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
      expect(await repo.get(key)).toBe("hello");
    });

    it("throws when the underlying store fails to write", async () => {
      vi.resetModules();
      const { setDbInitializer: freshSetDb, createRepo: freshCreateRepo } =
        await import("../src/keyv.ts");
      const failingStore = { set: vi.fn().mockResolvedValue(false) };
      freshSetDb(() => failingStore as unknown as Keyv<string>);
      const repo = freshCreateRepo<string>("add-fail-repo");
      await expect(repo.add("value")).rejects.toThrow("Failed to set new key");
    });
  });

  describe("set", () => {
    it("stores a value under the given key", async () => {
      const repo = createRepo<number>("set-repo");
      await repo.set("score", 42);
      expect(await repo.get("score")).toBe(42);
    });

    it("overwrites an existing key with the new value", async () => {
      const repo = createRepo<number>("set-overwrite-repo");
      await repo.set("score", 1);
      await repo.set("score", 2);
      expect(await repo.get("score")).toBe(2);
    });

    it("throws when the underlying store fails to write", async () => {
      vi.resetModules();
      const { setDbInitializer: freshSetDb, createRepo: freshCreateRepo } =
        await import("../src/keyv.ts");
      const failingStore = { set: vi.fn().mockResolvedValue(false) };
      freshSetDb(() => failingStore as unknown as Keyv<number>);
      const repo = freshCreateRepo<number>("set-fail-repo");
      await expect(repo.set("key", 1)).rejects.toThrow("Failed to set key");
    });
  });

  describe("get", () => {
    it("returns the value for an existing key", async () => {
      const repo = createRepo<string>("get-repo");
      await repo.set("name", "alice");
      expect(await repo.get("name")).toBe("alice");
    });

    it("throws when the key does not exist", async () => {
      const repo = createRepo<string>("get-missing-repo");
      await expect(repo.get("missing")).rejects.toThrow("Failed to find key");
    });
  });

  describe("find", () => {
    it("returns the value for an existing key", async () => {
      const repo = createRepo<string>("find-repo");
      await repo.set("name", "alice");
      expect(await repo.find("name")).toBe("alice");
    });

    it("returns null for a missing key", async () => {
      const repo = createRepo<string>("find-missing-repo");
      expect(await repo.find("missing")).toBeNull();
    });
  });

  describe("getMany", () => {
    it("returns all values in the same order as the given keys", async () => {
      const repo = createRepo<string>("getMany-repo");
      await repo.set("a", "alpha");
      await repo.set("b", "beta");
      expect(await repo.getMany(["a", "b"])).toStrictEqual(["alpha", "beta"]);
    });

    it("throws when any requested key is not in the store", async () => {
      const repo = createRepo<string>("getMany-missing-repo");
      await expect(repo.getMany(["missing"])).rejects.toThrow(
        "getMany in repository getMany-missing-repo had undefined keys",
      );
    });
  });

  describe("getAllKeys", () => {
    it("returns every key currently in the store", async () => {
      const repo = createRepo<string>("getAllKeys-repo");
      await repo.set("x", "1");
      await repo.set("y", "2");
      const keys = await repo.getAllKeys();
      expect(keys).toContain("x");
      expect(keys).toContain("y");
    });
  });

  describe("clear", () => {
    it("removes all entries from the store", async () => {
      const repo = createRepo<string>("clear-repo");
      await repo.set("name", "alice");
      await repo.clear();
      expect(await repo.find("name")).toBeNull();
    });

    it("does nothing when the store was never accessed", async () => {
      const repo = createRepo<string>("clear-noop-repo");
      await expect(repo.clear()).resolves.toBeUndefined();
    });
  });
});
