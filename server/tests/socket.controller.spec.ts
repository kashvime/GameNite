import { describe, expect, it, vi } from "vitest";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import type { GameServerSocket } from "../src/types.ts";

const mockSocket = {
  id: "test-socket-id",
} as unknown as GameServerSocket;

describe("logSocketError", () => {
  it("logs an Error message", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logSocketError(mockSocket, new Error("something went wrong"));
    expect(spy).toHaveBeenCalledWith(`ERR! [test-socket-id] error message: "something went wrong"`);
    spy.mockRestore();
  });

  it("logs a non-Error value as JSON", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logSocketError(mockSocket, { code: 42 });
    expect(spy).toHaveBeenCalledWith(`ERR! [test-socket-id] unexpected error {"code":42}`);
    spy.mockRestore();
  });
});
