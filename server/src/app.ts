/* eslint no-console: "off" */

import express, { Router } from "express";
import { Server } from "socket.io";
import { z } from "zod";
import * as http from "node:http";
import { requireAuth } from "./middleware/auth.js";
import cors from "cors";

import * as chat from "./controllers/chat.controller.js";
import * as friend from "./controllers/friend.controller.js";
import * as game from "./controllers/game.controller.js";
import * as user from "./controllers/user.controller.js";
import * as thread from "./controllers/thread.controller.js";
import * as score from "./controllers/score.controller.js";

import passport from "./config/passport.js";
import { googleAuth, googleCallback } from "./controllers/auth.controller.js";

import { type GameServer } from "./types.ts";
import jwt from "jsonwebtoken";
import { getUserByUsername } from "./services/auth.service.js";
import { setOnlineStatus } from "./services/user.service.js";

export const app = express();
export const httpServer = http.createServer(app);
const io: GameServer = new Server(httpServer);

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: "http://localhost:4530",
    credentials: true,
  }),
);
app.use(passport.initialize());

app.use(
  "/api",
  Router()
    .use(
      "/scores",
      Router()
        .post("/", score.postMatches)
        .get("/leaderboard", score.getLeaderboardHandler)
        .post("/myrank", requireAuth, score.postMyRank),
    )
    .use(
      "/scores",
      Router().post("/", score.postMatches).get("/leaderboard", score.getLeaderboardHandler),
    )
    .use(
      "/friend",
      Router()
        .post("/request", requireAuth, friend.postSendRequest)
        .post("/respond", requireAuth, friend.postRespondToRequest)
        .post("/pending", requireAuth, friend.getPendingRequestsController)
        .post("/list", requireAuth, friend.getFriendsController)
        .post("/status", requireAuth, friend.postFriendshipStatus),
    )

    .use(
      "/game",
      Router()
        .post("/create", requireAuth, game.postCreate)
        .post("/join-by-code", requireAuth, game.postJoinByCode)
        .get("/list", game.getList)
        .get("/:id", game.getById),
    )

    .use(
      "/thread",
      Router()
        .post("/create", requireAuth, thread.postCreate)
        .get("/list", thread.getList)
        .get("/:id", thread.getById)
        .post("/:id/comment", requireAuth, thread.postByIdComment),
    )
    .use(
      "/user",
      Router()
        .post("/list", user.postList)
        .post("/login", user.postLogin)
        .post("/signup", user.postSignup)
        .post("/:username", requireAuth, user.postByUsername)
        .get("/:username", user.getByUsername),
    )
    .use("/matches", Router().post("/", requireAuth, score.postMatches)),
);

app.get("/auth/google", googleAuth);
app.get("/auth/google/callback", ...googleCallback);

// Maps socket ID → userId so we can set a user offline when their socket disconnects
const socketUserMap = new Map<string, string>();

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    try {
      const { username } = jwt.verify(token, process.env.JWT_SECRET as string) as {
        username: string;
      };
      const user = await getUserByUsername(username);
      if (user) socket.data.userId = user.userId;
    } catch {
      // Unauthenticated socket connections are allowed (e.g. spectators)
    }
  }
  next();
});

io.on("connection", async (socket) => {
  const socketId = socket.id;
  const userId = socket.data.userId;
  console.log(`CONN [${socketId}] connected`);

  if (userId) {
    socketUserMap.set(socketId, userId);
    await setOnlineStatus(userId, "online");
  }

  socket.on("disconnect", async () => {
    console.log(`CONN [${socketId}] disconnected`);
    const uid = socketUserMap.get(socketId);
    if (uid) {
      socketUserMap.delete(socketId);
      await setOnlineStatus(uid, "offline");
    }
  });

  socket.on("chatJoin", chat.socketJoin(socket, io));
  socket.on("chatLeave", chat.socketLeave(socket, io));
  socket.on("chatSendMessage", chat.socketSendMessage(socket, io));

  socket.on("gameJoinAsPlayer", game.socketJoinAsPlayer(socket, io));
  socket.on("gameMakeMove", game.socketMakeMove(socket, io));
  socket.on("gameStart", game.socketStart(socket, io));
  socket.on("gameWatch", game.socketWatch(socket, io));

  socket.onAny((name, payload) => {
    const zPayload = z.object({
      token: z.string(),
      payload: z.any(),
    });

    const checked = zPayload.safeParse(payload);

    if (checked.error) {
      console.log(`RECV [${socketId}] got ${name}`);
    } else {
      console.log(`RECV [${socketId}] got ${name} ${JSON.stringify(checked.data.payload)}`);
    }
  });

  socket.onAnyOutgoing((name) => {
    console.log(`SEND [${socketId}] gets ${name}`);
  });
});
