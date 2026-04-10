import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameServer, GameServerSocket } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import {
  socketWatch,
  socketJoinAsPlayer,
  socketStart,
  socketMakeMove,
} from "../src/controllers/game.controller.ts";
import { createGame, startGame } from "../src/services/game.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

vi.mock(import("../src/controllers/socket.controller.ts"), () => ({
  logSocketError: vi.fn(),
}));

const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this);
    emit = vi.fn();
  },
);

const MockGameServerSocket = vi.fn(
  class {
    id = "mockSocket";
    rooms = new Set<string>();
    join = vi.fn();
    leave = vi.fn();
    emit = vi.fn();
    to = vi.fn(() => this);
  },
);

const mockServer = new MockGameServer() as unknown as GameServer;
const mockSocket = new MockGameServerSocket() as unknown as GameServerSocket;

const TOKEN3 = makeToken("user3");
const TOKEN1 = makeToken("user1");
const BAD_TOKEN = "invalidtoken";
const GHOST_TOKEN = makeToken("ghostuser"); // valid JWT, user not in DB

afterEach(() => {
  vi.resetAllMocks();
});

// Helper to create a fresh nim game
async function createNimGame() {
  const user = await getUserByUsername("user3");
  return createGame(user!, "nim", new Date());
}

// Helper to create and start a chess game with two players
async function createStartedNimGame() {
  const user3 = await getUserByUsername("user3");
  const user1 = await getUserByUsername("user1");
  const game = await createGame(user3!, "nim", new Date());
  const { joinGame } = await import("../src/services/game.service.ts");
  await joinGame(game.gameId, user1!);
  await startGame(game.gameId, user3!);
  return game;
}

describe("socketWatch", () => {
  it("rejects invalid token", async () => {
    const game = await createNimGame();
    await socketWatch(mockSocket, mockServer)({ token: BAD_TOKEN, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects invalid game id", async () => {
    await socketWatch(mockSocket, mockServer)({ token: TOKEN3, payload: "not-a-real-id" });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("joins game room and emits gameWatched for a valid game", async () => {
    const game = await createNimGame();
    await socketWatch(mockSocket, mockServer)({ token: TOKEN3, payload: game.gameId });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "gameWatched",
      expect.objectContaining({
        gameId: game.gameId,
      }),
    );
  });

  it("handles payload as object with gameId and watchId", async () => {
    const game = await createNimGame();
    await socketWatch(
      mockSocket,
      mockServer,
    )({
      token: TOKEN3,
      payload: { gameId: game.gameId, watchId: 42 },
    });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "gameWatched",
      expect.objectContaining({
        gameId: game.gameId,
        watchId: 42,
      }),
    );
  });

  it("handles payload as object without watchId", async () => {
    const game = await createNimGame();
    await socketWatch(
      mockSocket,
      mockServer,
    )({
      token: TOKEN3,
      payload: { gameId: game.gameId },
    });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "gameWatched",
      expect.objectContaining({
        gameId: game.gameId,
      }),
    );
  });

  it("calls logSocketError when token is valid but user is not in the database", async () => {
    const game = await createNimGame();
    await socketWatch(mockSocket, mockServer)({ token: GHOST_TOKEN, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("joins only the game room when the watcher is not a player", async () => {
    const game = await createNimGame(); // created by user3; user1 is not a player
    await socketWatch(mockSocket, mockServer)({ token: TOKEN1, payload: game.gameId });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "gameWatched",
      expect.objectContaining({ gameId: game.gameId }),
    );
  });

  it("skips socket.join for a room the socket already occupies", async () => {
    const game = await createNimGame();
    mockSocket.rooms.add(game.gameId); // pre-populate so join is skipped for this room
    await socketWatch(mockSocket, mockServer)({ token: TOKEN3, payload: game.gameId });
    expect(logSocketError).not.toHaveBeenCalled();
  });
});

describe("socketJoinAsPlayer", () => {
  it("rejects invalid token", async () => {
    const game = await createNimGame();
    await socketJoinAsPlayer(mockSocket, mockServer)({ token: BAD_TOKEN, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("joins game and emits gamePlayersUpdated", async () => {
    const game = await createNimGame();
    await socketJoinAsPlayer(mockSocket, mockServer)({ token: TOKEN1, payload: game.gameId });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.to).toHaveBeenCalledWith(game.gameId);
    expect(mockServer.emit).toHaveBeenCalledWith("gamePlayersUpdated", expect.any(Array));
  });

  it("starts game and sends view updates when max players reached", async () => {
    const game = await createNimGame();
    // user1 joins — now at maxPlayers (2), game should start
    await socketJoinAsPlayer(mockSocket, mockServer)({ token: TOKEN1, payload: game.gameId });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.emit).toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  });

  it("rejects joining an invalid game", async () => {
    await socketJoinAsPlayer(mockSocket, mockServer)({ token: TOKEN1, payload: "bad-id" });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("calls logSocketError when token is valid but user is not in the database", async () => {
    const game = await createNimGame();
    await socketJoinAsPlayer(mockSocket, mockServer)({ token: GHOST_TOKEN, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("skips socket.join for user room when already a member", async () => {
    const game = await createNimGame();
    const user1 = await getUserByUsername("user1");
    mockSocket.rooms.add(`${game.gameId}-${user1!.userId}`);
    await socketJoinAsPlayer(mockSocket, mockServer)({ token: TOKEN1, payload: game.gameId });
    expect(logSocketError).not.toHaveBeenCalled();
  });
});

describe("socketStart", () => {
  it("rejects invalid token", async () => {
    const game = await createNimGame();
    await socketStart(mockSocket, mockServer)({ token: BAD_TOKEN, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects starting a game with insufficient players", async () => {
    const game = await createNimGame();
    await socketStart(mockSocket, mockServer)({ token: TOKEN3, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects invalid game id", async () => {
    await socketStart(mockSocket, mockServer)({ token: TOKEN3, payload: "bad-id" });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("calls logSocketError when token is valid but user is not in the database", async () => {
    const game = await createNimGame();
    await socketStart(mockSocket, mockServer)({ token: GHOST_TOKEN, payload: game.gameId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });
});

describe("socketMakeMove", () => {
  it("rejects invalid token", async () => {
    const game = await createStartedNimGame();
    await socketMakeMove(
      mockSocket,
      mockServer,
    )({
      token: BAD_TOKEN,
      payload: { gameId: game.gameId, move: 1 },
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects invalid move payload shape", async () => {
    await socketMakeMove(
      mockSocket,
      mockServer,
    )({
      token: TOKEN3,
      payload: "not-valid",
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("applies a valid move and emits gameStateUpdated", async () => {
    const game = await createStartedNimGame();
    await socketMakeMove(
      mockSocket,
      mockServer,
    )({
      token: TOKEN3,
      payload: { gameId: game.gameId, move: 1 },
    });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.emit).toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  });

  it("rejects an invalid game move", async () => {
    const game = await createStartedNimGame();
    await socketMakeMove(
      mockSocket,
      mockServer,
    )({
      token: TOKEN3,
      payload: { gameId: game.gameId, move: 99 },
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("calls logSocketError when token is valid but user is not in the database", async () => {
    const game = await createStartedNimGame();
    await socketMakeMove(
      mockSocket,
      mockServer,
    )({
      token: GHOST_TOKEN,
      payload: { gameId: game.gameId, move: 1 },
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });
});
