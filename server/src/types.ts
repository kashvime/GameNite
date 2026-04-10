import { type Server, type Socket } from "socket.io";
import { type Request, type Response } from "express";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type TaggedGameView,
} from "@gamenite/shared";

export type SocketAPI = (
  socket: GameServerSocket,
  io: GameServer,
) => (payload: unknown) => Promise<void>;

export type RestAPI<R = unknown, P = { [key: string]: string }> = (
  req: Request<P, R | { error: string }, unknown>,
  res: Response<R | { error: string }>,
) => Promise<void>;

/**
 * Per-socket metadata attached by the auth middleware.
 * Using socket.data (socket.io v4) avoids unsafe `any` casts.
 */
export interface SocketData {
  userId?: string;
}

export type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
export type GameServerSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export interface GameViewUpdates {
  watchers: TaggedGameView;
  players: { userId: string; view: TaggedGameView }[];
}

export interface UserWithId {
  userId: string;
  username: string;
}
