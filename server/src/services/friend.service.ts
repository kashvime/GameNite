import { type SafeUserInfo } from "@gamenite/shared";
import { getUserByUsername } from "./auth.service.ts";
import { FriendRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import type { RecordId } from "../models.ts";

/**
 * Sends a friend request from one user to another.
 *
 * @param fromUserId - The user sending the request.
 * @param toUsername - The username of the user to send the request to.
 * @returns Resolves when the request has been stored, or an error message.
 */
export async function sendFriendRequest(
  fromUserId: RecordId,
  toUsername: string,
): Promise<void | { error: string }> {
  const toAuth = await getUserByUsername(toUsername);
  if (!toAuth) return { error: `No user ${toUsername}` };

  const toUserId = toAuth.userId;
  if (toUserId === fromUserId) return { error: "Cannot add yourself as a friend" };

  const keys = await FriendRepo.getAllKeys();
  const records = await FriendRepo.getMany(keys);
  const existing = records.find(
    (r) =>
      (r.from === fromUserId && r.to === toUserId) || (r.from === toUserId && r.to === fromUserId),
  );
  if (existing) return { error: "Friend request already exists" };

  await FriendRepo.add({
    from: fromUserId,
    to: toUserId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

/**
 * Accepts or rejects a pending friend request.
 *
 * @param requestId - The ID of the FriendRecord to respond to.
 * @param toUserId - The user responding (must be the recipient of the request).
 * @param accept - Whether to accept or reject the request.
 * @returns Resolves when updated, or an error message.
 */
export async function respondToFriendRequest(
  requestId: RecordId,
  toUserId: RecordId,
  accept: boolean,
): Promise<void | { error: string }> {
  const record = await FriendRepo.find(requestId);
  if (!record) return { error: "Friend request not found" };
  if (record.to !== toUserId) return { error: "Not authorized to respond to this request" };
  if (record.status !== "pending") return { error: "Request is no longer pending" };

  await FriendRepo.set(requestId, {
    ...record,
    status: accept ? "accepted" : "rejected",
    ...(accept ? { acceptedAt: new Date().toISOString() } : {}),
  });
}

/**
 * Returns all pending friend requests sent to a given user.
 *
 * @param userId - The user whose incoming pending requests to fetch.
 * @returns A list of SafeUserInfo for each user who sent a pending request,
 *          paired with the request ID so the recipient can respond.
 */
export async function getPendingRequests(
  userId: RecordId,
): Promise<Array<{ requestId: RecordId; from: SafeUserInfo }>> {
  const keys = await FriendRepo.getAllKeys();
  const records = await FriendRepo.getMany(keys);

  const pending: Array<{ requestId: RecordId; from: SafeUserInfo }> = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.to === userId && record.status === "pending") {
      const from = await populateSafeUserInfo(record.from);
      pending.push({ requestId: keys[i], from });
    }
  }
  return pending;
}

/**
 * Returns all accepted friends for a given user.
 *
 * @param userId - The user whose friend list to fetch.
 * @returns A list of SafeUserInfo for each accepted friend.
 */
export async function getFriends(userId: RecordId): Promise<SafeUserInfo[]> {
  const keys = await FriendRepo.getAllKeys();
  const records = await FriendRepo.getMany(keys);

  const friends: SafeUserInfo[] = [];
  for (const record of records) {
    if (record.status !== "accepted") continue;
    if (record.from === userId) {
      friends.push(await populateSafeUserInfo(record.to));
    } else if (record.to === userId) {
      friends.push(await populateSafeUserInfo(record.from));
    }
  }
  return friends;
}

/**
 * Returns the friendship status between two users.
 *
 * @param fromUserId - The user checking the status (the logged-in user).
 * @param toUsername - The username of the profile being viewed.
 * @returns "friends", "pending_sent", "pending_received", or "not_connected"
 */
export async function getFriendshipStatus(
  fromUserId: RecordId,
  toUsername: string,
): Promise<
  | { status: "friends" }
  | { status: "pending_sent" }
  | { status: "pending_received"; requestId: RecordId }
  | { status: "not_connected" }
  | { error: string }
> {
  const toAuth = await getUserByUsername(toUsername);
  if (!toAuth) return { error: `No user ${toUsername}` };
  const toUserId = toAuth.userId;

  const keys = await FriendRepo.getAllKeys();
  const records = await FriendRepo.getMany(keys);

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const isMatch =
      (record.from === fromUserId && record.to === toUserId) ||
      (record.from === toUserId && record.to === fromUserId);
    if (!isMatch) continue;

    if (record.status === "accepted") return { status: "friends" };
    if (record.status === "pending") {
      if (record.from === fromUserId) return { status: "pending_sent" };
      return { status: "pending_received", requestId: keys[i] };
    }
  }
  return { status: "not_connected" };
}

/**
 * Returns the user IDs of all accepted friends for a given user.
 * Used internally for leaderboard filtering.
 */
export async function getFriendIds(userId: RecordId): Promise<RecordId[]> {
  const keys = await FriendRepo.getAllKeys();
  const records = await FriendRepo.getMany(keys);

  const friendIds: RecordId[] = [];
  for (const record of records) {
    if (record.status !== "accepted") continue;
    if (record.from === userId) friendIds.push(record.to);
    else if (record.to === userId) friendIds.push(record.from);
  }
  return friendIds;
}
