import { zNewMessageRequest } from "@gamenite/shared";
import { type SocketAPI } from "../types.ts";
import { z } from "zod";
import { addMessageToChat, forceChatById } from "../services/chat.service.ts";
import { populateSafeUserInfo } from "../services/user.service.ts";
import { createMessage } from "../services/message.service.ts";
import { logSocketError } from "./socket.controller.ts";
import { getUserByUsername } from "../services/auth.service.ts";
import jwt from "jsonwebtoken";

type JwtUser = { username: string };

function verifySocketToken(token: unknown): JwtUser {
  if (typeof token !== "string") throw new Error("Missing token");
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
}

const zSocketPayload = <T extends z.ZodType>(zT: T) => z.object({ token: z.string(), payload: zT });

/**
 * Handle a socket request to join a chat: send the connection the chat's
 * current contents and signal to everyone in the chat that the user has
 * joined.
 */
export const socketJoin: SocketAPI = (socket) => async (body) => {
  try {
    const parsed = zSocketPayload(z.string()).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    const chat = await forceChatById(parsed.payload, user);
    await socket.join(parsed.payload);
    socket.emit("chatJoined", chat);
    socket.to(parsed.payload).emit("chatUserJoined", {
      chatId: parsed.payload,
      user: await populateSafeUserInfo(user.userId),
    });
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle a socket request to leave a chat: stop sending that socket messages
 * about the chat and send everyone else a message that they left.
 */
export const socketLeave: SocketAPI = (socket) => async (body) => {
  try {
    const parsed = zSocketPayload(z.string()).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    if (!socket.rooms.has(parsed.payload)) {
      throw new Error(`user ${user.username} left chat they weren't in`);
    }
    await socket.leave(parsed.payload);
    socket.to(parsed.payload).emit("chatUserLeft", {
      chatId: parsed.payload,
      user: await populateSafeUserInfo(user.userId),
    });
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle a socket request to send a message to the chat: store the message
 * and let everyone know about the new message.
 */
export const socketSendMessage: SocketAPI = (socket, io) => async (body) => {
  try {
    const parsed = zSocketPayload(zNewMessageRequest).parse(body);
    const jwtUser = verifySocketToken(parsed.token);
    const user = await getUserByUsername(jwtUser.username);
    if (!user) throw new Error("User not found");
    const { chatId, text } = parsed.payload;
    const now = new Date();
    const message = await createMessage(user, text, now);
    await addMessageToChat(chatId, user, message.messageId);
    io.to(chatId).emit("chatNewMessage", { chatId, message });
  } catch (err) {
    logSocketError(socket, err);
  }
};
