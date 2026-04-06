import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, MatchFilter, MatchInfo, SafeUserInfo, UserAuth } from "@gamenite/shared";

export type LeaderboardEntry = { user: SafeUserInfo; rating: number };

const MATCH_API_URL = "/api/matches";

/**
 * Sends a POST request to retrieve the authenticated user's match history.
 */
export const getMatchHistory = async (
  auth: UserAuth,
  filter?: MatchFilter,
): APIResponse<MatchInfo[]> => {
  try {
    const res = await api.post<MatchInfo[] | ErrorMsg>(MATCH_API_URL, {
      auth,
      payload: filter ?? {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Fetches the leaderboard ranked by Elo rating for the given game type.
 */
export const getLeaderboard = async (
  auth: UserAuth,
  gameType: string,
  friendsOnly?: boolean,
): APIResponse<LeaderboardEntry[]> => {
  try {
    const params = new URLSearchParams({ gameType });
    if (friendsOnly) {
      params.set("friendsOnly", "true");
      params.set("username", auth.username);
    }
    const res = await api.get<LeaderboardEntry[] | ErrorMsg>(
      `/api/scores/leaderboard?${params.toString()}`,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Fetches the authenticated user's rank in the leaderboard for the given game type.
 * @param auth the user's authentication information
 * @param gameType the game type to fetch the leaderboard for
 * @param friendsOnly whether to only consider friends in the leaderboard (friends only toggle)
 * @returns 
 */
export const getMyRank = async (
  auth: UserAuth,
  gameType: string,
  friendsOnly?: boolean,
): APIResponse<{ rank: number; rating: number } | null> => {
  try {
    const params = new URLSearchParams({ gameType });
    if (friendsOnly) params.set("friendsOnly", "true");
    const res = await api.post<{ rank: number; rating: number } | null | ErrorMsg>(
      `/api/scores/myrank?${params.toString()}`,
      auth,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
