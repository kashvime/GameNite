import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, SafeUserInfo, UserAuth } from "@gamenite/shared";
const FRIEND_API_URL = `/api/friend`;

/**
 * Send a friend request
 */
export const sendFriendRequest = async (
  _auth: UserAuth, // kept for compatibility, but not used anymore
  toUsername: string,
): APIResponse<void> => {
  try {
    const res = await api.post<void | ErrorMsg>(`${FRIEND_API_URL}/request`, { toUsername });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Accept or reject a friend request
 */
export const respondToFriendRequest = async (
  _auth: UserAuth,
  requestId: string,
  accept: boolean,
): APIResponse<void> => {
  try {
    const res = await api.post<void | ErrorMsg>(`${FRIEND_API_URL}/respond`, { requestId, accept });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Get incoming pending friend requests
 */
export const getPendingRequests = async (): Promise<
  Array<{ requestId: string; from: SafeUserInfo }> | ErrorMsg
> => {
  try {
    const res =
      await api.post<Array<{ requestId: string; from: SafeUserInfo }>>("/api/friend/pending");
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Get current friends list
 */

export const getFriends = async (): Promise<SafeUserInfo[] | ErrorMsg> => {
  try {
    const res = await api.post<SafeUserInfo[]>("/api/friend/list");
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Get relationship status between current user and another user
 */
export const getFriendshipStatus = async (
  _auth: UserAuth,
  toUsername: string,
): APIResponse<FriendshipStatus> => {
  try {
    const res = await api.post<FriendshipStatus | ErrorMsg>(`${FRIEND_API_URL}/status`, {
      toUsername,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export type FriendshipStatus =
  | { status: "friends" }
  | { status: "pending_sent" }
  | { status: "pending_received"; requestId: string }
  | { status: "not_connected" };
