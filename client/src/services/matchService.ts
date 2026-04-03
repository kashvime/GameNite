import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { MatchFilter, MatchInfo } from "@gamenite/shared";

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
