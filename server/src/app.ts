/* eslint no-console: "off" */

import express, { Router } from "express";
import { Server } from "socket.io";
import { z } from "zod";
import * as http from "node:http";

import * as chat from "./controllers/chat.controller.js";
import * as friend from "./controllers/friend.controller.js";
import * as game from "./controllers/game.controller.js";
import * as user from "./controllers/user.controller.js";
import * as thread from "./controllers/thread.controller.js";
import * as score from "./controllers/score.controller.js";

import passport from "./config/passport.js";
import { googleAuth, googleCallback } from "./controllers/auth.controller.js";

import { type GameServer } from "./types.ts";

export const app = express();
export const httpServer = http.createServer(app);
const io: GameServer = new Server(httpServer);

// ✅ Middleware
app.use(express.json());
app.use(passport.initialize());

// ✅ API ROUTES (unchanged)
app.use(
  "/api",
  Router()
    .use(
      "/scores",
      Router()
        .post("/", score.postMatches)
        .get("/leaderboard", score.getLeaderboardHandler)
        .post("/myrank", score.postMyRank),
    )
    .use(
      "/scores",
      Router().post("/", score.postMatches).get("/leaderboard", score.getLeaderboardHandler),
    )
    .use(
      "/friend",
      Router()
        .post("/request", friend.postSendRequest)
        .post("/respond", friend.postRespondToRequest)
        .post("/pending", friend.postPendingRequests)
        .post("/list", friend.postFriends)
        .post("/status", friend.postFriendshipStatus),
    )
    .use(
      "/game",
      Router()
        .post("/create", game.postCreate)
        .get("/list", game.getList)
        .get("/:id", game.getById),
    )
    .use(
      "/thread",
      Router()
        .post("/create", thread.postCreate)
        .get("/list", thread.getList)
        .get("/:id", thread.getById)
        .post("/:id/comment", thread.postByIdComment),
    )
    .use(
      "/user",
      Router()
        .post("/list", user.postList)
        .post("/login", user.postLogin)
        .post("/signup", user.postSignup)
        .post("/:username", user.postByUsername)
        .get("/:username", user.getByUsername),
    )
    .use("/matches", Router().post("/", score.postMatches)),
);

app.get("/auth/google", googleAuth);
app.get("/auth/google/callback", ...googleCallback);

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`CONN [${socketId}] connected`);

  socket.on("disconnect", () => {
    console.log(`CONN [${socketId}] disconnected`);
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
      auth: z.object({ username: z.string() }),
      payload: z.any(),
    });

    const checked = zPayload.safeParse(payload);

    if (checked.error) {
      console.log(`RECV error: ${checked.error.message}`);
    } else {
      console.log(
        `RECV [${socketId}] got ${name}${checked.data.auth.username} ${JSON.stringify(
          checked.data.payload,
        )}`,
      );
    }
  });

  socket.onAnyOutgoing((name) => {
    console.log(`SEND [${socketId}] gets ${name}`);
  });
});
