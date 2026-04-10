import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { io as ioClient } from "socket.io-client";
import { httpServer } from "../src/app.ts";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

vi.mock("../src/services/user.service.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/services/user.service.ts")>();
  return { ...original, setOnlineStatus: vi.fn().mockResolvedValue(undefined) };
});

import * as userService from "../src/services/user.service.ts";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

const TOKEN0 = makeToken("user0");
const TOKEN1 = makeToken("user1");
const TOKEN2 = makeToken("user2");
const GHOST_TOKEN = makeToken("ghostuser");
const BAD_TOKEN = "not.a.valid.jwt";

let port: number;
const OPEN_SOCKETS: ReturnType<typeof ioClient>[] = [];

function connectSocket(opts?: { token?: string }) {
  const socket = ioClient(`http://localhost:${port}`, {
    auth: opts?.token ? { token: opts.token } : {},
    transports: ["websocket"],
    reconnection: false,
  });
  OPEN_SOCKETS.push(socket);
  return socket;
}

function waitForConnect(socket: ReturnType<typeof ioClient>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      port = (httpServer.address() as { port: number }).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()));
  });
});

afterEach(() => {
  for (const socket of OPEN_SOCKETS.splice(0)) {
    if (socket.connected) socket.disconnect();
  }
  vi.clearAllMocks();
});

describe("socket middleware", () => {
  it("connects without a token", async () => {
    const socket = connectSocket();
    await waitForConnect(socket);
    expect(socket.connected).toBe(true);
    expect(userService.setOnlineStatus).not.toHaveBeenCalled();
  });

  it("connects with a malformed token", async () => {
    const socket = connectSocket({ token: BAD_TOKEN });
    await waitForConnect(socket);
    expect(socket.connected).toBe(true);
    expect(userService.setOnlineStatus).not.toHaveBeenCalled();
  });

  it("connects when the username is not in the database", async () => {
    const socket = connectSocket({ token: GHOST_TOKEN });
    await waitForConnect(socket);
    expect(userService.setOnlineStatus).not.toHaveBeenCalled();
  });

  it("sets userId on socket data when the user exists in the database", async () => {
    const socket = connectSocket({ token: TOKEN0 });
    await waitForConnect(socket);
    await vi.waitFor(() => {
      expect(userService.setOnlineStatus).toHaveBeenCalledWith(expect.any(String), "online");
    });
    socket.disconnect();
    await vi.waitFor(() => {
      expect(userService.setOnlineStatus).toHaveBeenCalledWith(expect.any(String), "offline");
    });
  });
});

describe("socket connection handler", () => {
  it("does not set online status for a guest connection", async () => {
    const socket = connectSocket();
    await waitForConnect(socket);
    expect(userService.setOnlineStatus).not.toHaveBeenCalled();
  });

  it("sets user online when an authenticated socket connects", async () => {
    const socket = connectSocket({ token: TOKEN1 });
    await waitForConnect(socket);
    await vi.waitFor(() => {
      expect(userService.setOnlineStatus).toHaveBeenCalledWith(expect.any(String), "online");
    });
    socket.disconnect();
    await vi.waitFor(() => {
      expect(userService.setOnlineStatus).toHaveBeenCalledWith(expect.any(String), "offline");
    });
  });

  it("sets user offline when an authenticated socket disconnects", async () => {
    const socket = connectSocket({ token: TOKEN2 });
    await waitForConnect(socket);
    await vi.waitFor(() => {
      expect(userService.setOnlineStatus).toHaveBeenCalledWith(expect.any(String), "online");
    });
    vi.clearAllMocks();
    socket.disconnect();
    await vi.waitFor(() => {
      expect(userService.setOnlineStatus).toHaveBeenCalledWith(expect.any(String), "offline");
    });
  });

  it("does not set user offline when a guest socket disconnects", async () => {
    const socket = connectSocket();
    await waitForConnect(socket);
    socket.disconnect();
    await vi.waitFor(() => expect(socket.connected).toBe(false));
    expect(userService.setOnlineStatus).not.toHaveBeenCalled();
  });
});

describe("socket onAny logging", () => {
  it("logs the event name and payload when the payload matches {token, payload}", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const socket = connectSocket();
    await waitForConnect(socket);

    socket.emit("testEvent", { token: "t", payload: { score: 99 } });

    await vi.waitFor(() => {
      const logs = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logs.some((msg) => msg.includes("testEvent") && msg.includes('"score":99'))).toBe(
        true,
      );
    });

    consoleSpy.mockRestore();
  });

  it("logs the event name only when the payload does not match {token, payload}", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const socket = connectSocket();
    await waitForConnect(socket);

    socket.emit("testEvent", "bare-string");

    await vi.waitFor(() => {
      const logs = consoleSpy.mock.calls.map((c) => String(c[0]));
      expect(logs.some((msg) => msg.includes("testEvent"))).toBe(true);
    });

    const testEventLogs = consoleSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((msg) => msg.includes("testEvent"));
    expect(testEventLogs.every((msg) => !msg.includes("bare-string"))).toBe(true);

    consoleSpy.mockRestore();
  });
});
