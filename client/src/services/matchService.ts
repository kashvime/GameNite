import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, MatchInfo, UserAuth } from "@gamenite/shared";

const MATCH_API_URL = `/api/matches`;

/**
 * Sends a POST request to retrieve the authenticated user's match history.
 */
export const getMatchHistory = async (auth: UserAuth): APIResponse<MatchInfo[]> => {
  try {
    const res = await api.post<MatchInfo[] | ErrorMsg>(MATCH_API_URL, auth);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
