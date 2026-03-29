import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, SafeUserInfo, UserAuth } from "@gamenite/shared";

const FRIEND_API_URL = `/api/friend`;

export const sendFriendRequest = async (auth: UserAuth, toUsername: string): APIResponse<void> => {
  try {
    const res = await api.post<void | ErrorMsg>(`${FRIEND_API_URL}/request`, {
      auth,
      payload: { toUsername },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const respondToFriendRequest = async (
  auth: UserAuth,
  requestId: string,
  accept: boolean,
): APIResponse<void> => {
  try {
    const res = await api.post<void | ErrorMsg>(`${FRIEND_API_URL}/respond`, {
      auth,
      payload: { requestId, accept },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getPendingRequests = async (
  auth: UserAuth,
): APIResponse<Array<{ requestId: string; from: SafeUserInfo }>> => {
  try {
    const res = await api.post<Array<{ requestId: string; from: SafeUserInfo }> | ErrorMsg>(
      `${FRIEND_API_URL}/pending`,
      auth,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getFriends = async (auth: UserAuth): APIResponse<SafeUserInfo[]> => {
  try {
    const res = await api.post<SafeUserInfo[] | ErrorMsg>(`${FRIEND_API_URL}/list`, auth);
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

export const getFriendshipStatus = async (
  auth: UserAuth,
  toUsername: string,
): APIResponse<FriendshipStatus> => {
  try {
    const res = await api.post<FriendshipStatus | ErrorMsg>(`${FRIEND_API_URL}/status`, {
      auth,
      payload: { toUsername },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
