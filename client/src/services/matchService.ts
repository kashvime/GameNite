import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, MatchFilter, MatchInfo, SafeUserInfo, UserAuth } from "@gamenite/shared";

export type LeaderboardEntry = { user: SafeUserInfo; wins: number };

const MATCH_API_URL = `/api/matches`;

/**
 * Sends a POST request to retrieve the authenticated user's match history.
 * Auth is handled via JWT (Authorization header), not request body.
 */

export const getMatchHistory = async (filter?: MatchFilter): APIResponse<MatchInfo[]> => {
  try {
    const res = await api.post(MATCH_API_URL, {
      payload: filter ?? {},
    });

    return res.data as MatchInfo[];
  } catch (error: unknown) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Fetches the leaderboard, optionally filtered by game type.
 */
export const getLeaderboard = async (
  auth: UserAuth,
  gameType?: string,
  dateRange?: { from: Date; to: Date },
  friendsOnly?: boolean,
): APIResponse<LeaderboardEntry[]> => {
  try {
    const params = new URLSearchParams();
    if (gameType) params.set("gameType", gameType);
    if (dateRange) {
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
    }
    if (friendsOnly) {
      params.set("friendsOnly", "true");
      params.set("username", auth.username);
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    const res = await api.get<LeaderboardEntry[] | ErrorMsg>(`/api/scores/leaderboard${query}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getMyRank = async (
  auth: UserAuth,
  gameType?: string,
  dateRange?: { from: Date; to: Date },
  friendsOnly?: boolean,
): APIResponse<{ rank: number; wins: number } | null> => {
  try {
    const params = new URLSearchParams();
    if (gameType) params.set("gameType", gameType);
    if (dateRange) {
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
    }
    if (friendsOnly) params.set("friendsOnly", "true");
    const query = params.size > 0 ? `?${params.toString()}` : "";
    const res = await api.post<{ rank: number; wins: number } | null | ErrorMsg>(
      `/api/scores/myrank${query}`,
      auth,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
