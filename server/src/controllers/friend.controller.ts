import { type SafeUserInfo, withAuth, zUserAuth } from "@gamenite/shared";
import { z } from "zod";
import { checkAuth } from "../services/auth.service.ts";
import {
  sendFriendRequest,
  respondToFriendRequest,
  getPendingRequests,
  getFriends,
  getFriendshipStatus,
} from "../services/friend.service.ts";
import { type RestAPI } from "../types.ts";

const zSendFriendRequest = withAuth(z.object({ toUsername: z.string() }));
const zRespondToFriendRequest = withAuth(z.object({ requestId: z.string(), accept: z.boolean() }));

export const postSendRequest: RestAPI<void> = async (req, res) => {
  const body = zSendFriendRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  const result = await sendFriendRequest(user.userId, body.data.payload.toUsername);
  if (result && "error" in result) {
    res.status(400).send(result);
    return;
  }
  res.send();
};

export const postRespondToRequest: RestAPI<void> = async (req, res) => {
  const body = zRespondToFriendRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  const result = await respondToFriendRequest(
    body.data.payload.requestId,
    user.userId,
    body.data.payload.accept,
  );
  if (result && "error" in result) {
    res.status(400).send(result);
    return;
  }
  res.send();
};

export const postPendingRequests: RestAPI<
  Array<{ requestId: string; from: SafeUserInfo }>
> = async (req, res) => {
  const body = zUserAuth.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  res.send(await getPendingRequests(user.userId));
};

export const postFriends: RestAPI<SafeUserInfo[]> = async (req, res) => {
  const body = zUserAuth.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  res.send(await getFriends(user.userId));
};

export const postFriendshipStatus: RestAPI<
  | { status: "friends" }
  | { status: "pending_sent" }
  | { status: "pending_received"; requestId: string }
  | { status: "not_connected" }
> = async (req, res) => {
  const body = zSendFriendRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  const result = await getFriendshipStatus(user.userId, body.data.payload.toUsername);
  if ("error" in result) {
    res.status(404).send(result);
    return;
  }
  res.send(result);
};
