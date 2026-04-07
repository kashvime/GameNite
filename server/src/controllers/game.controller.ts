import { type GameInfo, type League, zGameKey, zGameMakeMovePayload } from "@gamenite/shared";
import { type RestAPI, type GameViewUpdates, type SocketAPI, type GameServer } from "../types.ts";
import {
  createGame,
  gameServices,
  getGameById,
  getGames,
  joinGame,
  joinByInviteCode,
  startGame,
  updateGame,
  viewGame,
} from "../services/game.service.ts";
import { addMoveLogToChat } from "../services/chat.service.ts";
import { z } from "zod";
import { logSocketError } from "./socket.controller.ts";
import { getUserByUsername } from "../services/auth.service.ts";
import jwt from "jsonwebtoken";

type JwtUser = { username: string };

function verifySocketToken(token: unknown): JwtUser {
  if (typeof token !== "string") throw new Error("Missing token");
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
  return decoded;
}

const zSocketPayload = <T extends z.ZodType>(zT: T) => z.object({ token: z.string(), payload: zT });

/**
 * Handle POST requests to `/api/game/create` by creating a game. The game
 * starts with one player, the user who made the POST request.
 */
export const postCreate: RestAPI<GameInfo> = async (req, res) => {
  const body = z
    .object({
      gameKey: zGameKey,
      visibility: z.enum(["public", "private"]).default("public"),
    })
    .safeParse(req.body);
  if (body.error) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const jwtUser = (req as unknown as { user?: { username: string } }).user;
  if (!jwtUser) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }
  const user = await getUserByUsername(jwtUser.username);
  if (!user) {
    res.status(403).send({ error: "User not found" });
    return;
  }
  const game = await createGame(user, body.data.gameKey, new Date(), body.data.visibility);
  res.send(game);
};

export const postJoinByCode: RestAPI<GameInfo> = async (req, res) => {
  const body = z.object({ code: z.string() }).safeParse(req.body);
  if (body.error) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const jwtUser = (req as unknown as { user?: { username: string } }).user;
  if (!jwtUser) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }
  const user = await getUserByUsername(jwtUser.username);
  if (!user) {
    res.status(403).send({ error: "User not found" });
    return;
  }
  try {
    const result: GameInfo | { error: string } = await joinByInviteCode(body.data.code, user);
    if ("error" in result) {
      res.status(400).send(result);
      return;
    }
    res.send(result);
  } catch (e) {
    res.status(500).send({ error: "Internal server error" });
  }
};

export const getById: RestAPI<GameInfo, { id: string }> = async (req, res) => {
  const game = await getGameById(req.params.id);
  if (!game) {
    res.status(404).send({ error: "Game not found" });
    return;
  }
  res.send(game);
};

export const getList: RestAPI<GameInfo[]> = async (req, res) => {
  res.send(await getGames());
};

function userRoom(gameId: string, user: string) {
  return `${gameId}-${user}`;
}

function sendViewUpdates(io: GameServer, gameId: string, updates: GameViewUpdates) {
  io.to(gameId).emit("gameStateUpdated", { ...updates.watchers, forPlayer: false, gameId });
  for (const { userId, view } of updates.players) {
    io.to(userRoom(gameId, userId)).emit("gameStateUpdated", { ...view, forPlayer: true, gameId });
  }
}

export const socketWatch: SocketAPI = (socket) => async (body) => {
  try {
    const parsed = zSocketPayload(z.string()).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    const { isPlayer, view, players } = await viewGame(parsed.payload, user);
    const roomsToJoin = isPlayer
      ? [parsed.payload, userRoom(parsed.payload, user.userId)]
      : [parsed.payload];

    for (const room of roomsToJoin) {
      if (!socket.rooms.has(room)) {
        await socket.join(room);
      }
    }
    await socket.join(roomsToJoin);
    socket.emit("gameWatched", { gameId: parsed.payload, view, players });
  } catch (err) {
    logSocketError(socket, err);
  }
};

export const socketJoinAsPlayer: SocketAPI = (socket, io) => async (body) => {
  try {
    const parsed = zSocketPayload(z.string()).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    const game = await joinGame(parsed.payload, user);
    if (!socket.rooms.has(userRoom(parsed.payload, user.userId))) {
      await socket.join(userRoom(parsed.payload, user.userId));
    }
    io.to(parsed.payload).emit("gamePlayersUpdated", {
      gameId: parsed.payload,
      players: game.players,
    });
    if (game.players.length === gameServices[game.type].maxPlayers) {
      sendViewUpdates(io, parsed.payload, await startGame(parsed.payload, user));
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};

export const socketStart: SocketAPI = (socket, io) => async (body) => {
  try {
    const parsed = zSocketPayload(z.string()).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    sendViewUpdates(io, parsed.payload, await startGame(parsed.payload, user));
  } catch (err) {
    logSocketError(socket, err);
  }
};

export const socketMakeMove: SocketAPI = (socket, io) => async (body) => {
  try {
    const parsed = zSocketPayload(zGameMakeMovePayload).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    const { gameId, move } = parsed.payload;
    const { views, moveDescription, chatId, leagueChanges } = await updateGame(gameId, user, move);
    sendViewUpdates(io, gameId, views);
    for (const change of (leagueChanges ?? []) as {
      userId: string;
      oldLeague: string;
      newLeague: string;
    }[]) {
      const { userId, oldLeague, newLeague } = change;
      io.to(userRoom(gameId, userId)).emit("leagueChanged", {
        oldLeague: oldLeague as League,
        newLeague: newLeague as League,
      });
    }
    const now = new Date();
    const moveLogPayload = await addMoveLogToChat(chatId, moveDescription, user, now);
    io.to(chatId).emit("chatMoveLog", moveLogPayload);
  } catch (err) {
    logSocketError(socket, err);
  }
};
