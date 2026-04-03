/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { SafeUserInfo } from "@gamenite/shared";
import {
  sendFriendRequest,
  respondToFriendRequest,
  getPendingRequests,
  getFriends,
  getFriendshipStatus,
} from "../services/friend.service.ts";
import { getUserByUsername } from "../services/auth.service.ts";
import type { RestAPI } from "../types.ts";

/**
 * Send a friend request
 */
export const postSendRequest: RestAPI<void> = async (req, res) => {
  const { toUsername } = req.body as { toUsername: string };

  if (!toUsername) {
    res.status(400).send({ error: "Missing toUsername" });
    return;
  }

  const username = (req as any).user.username;

  const user = await getUserByUsername(username);
  if (!user) {
    res.status(400).send({ error: "User not found" });
    return;
  }

  const result = await sendFriendRequest(user.userId, toUsername);

  if (result?.error) {
    res.status(400).send(result);
    return;
  }

  res.send();
};

/**
 * Accept or reject a friend request
 */
export const postRespondToRequest: RestAPI<void> = async (req, res) => {
  const { requestId, accept } = req.body as {
    requestId: string;
    accept: boolean;
  };

  if (!requestId) {
    res.status(400).send({ error: "Missing requestId" });
    return;
  }

  const username = (req as any).user.username;

  const user = await getUserByUsername(username);
  if (!user) {
    res.status(400).send({ error: "User not found" });
    return;
  }

  const result = await respondToFriendRequest(requestId, user.userId, accept);

  if (result?.error) {
    res.status(400).send(result);
    return;
  }

  res.send();
};

/**
 * Get incoming pending requests
 */
export const getPendingRequestsController: RestAPI<
  Array<{ requestId: string; from: SafeUserInfo }>
> = async (req, res) => {
  const username = (req as any).user.username;

  const user = await getUserByUsername(username);
  if (!user) {
    res.status(400).send({ error: "User not found" });
    return;
  }

  const pending = await getPendingRequests(user.userId);
  res.send(pending);
};

/**
 * Get friends list
 */
export const getFriendsController: RestAPI<SafeUserInfo[]> = async (req, res) => {
  const username = (req as any).user.username;

  const user = await getUserByUsername(username);
  if (!user) {
    res.status(400).send({ error: "User not found" });
    return;
  }

  const friends = await getFriends(user.userId);
  res.send(friends);
};

/**
 * Get friendship status
 */
export const postFriendshipStatus: RestAPI<
  | { status: "friends" }
  | { status: "pending_sent" }
  | { status: "pending_received"; requestId: string }
  | { status: "not_connected" }
> = async (req, res) => {
  const { toUsername } = req.body as { toUsername: string };

  if (!toUsername) {
    res.status(400).send({ error: "Missing toUsername" });
    return;
  }

  const username = (req as any).user.username;

  const user = await getUserByUsername(username);
  if (!user) {
    res.status(400).send({ error: "User not found" });
    return;
  }

  const result = await getFriendshipStatus(user.userId, toUsername);

  if ("error" in result) {
    res.status(404).send(result);
    return;
  }

  res.send(result);
};
