import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, UserAuth } from "@gamenite/shared";
import type { ScoreRecord } from "../../../server/src/models.ts";

const MATCH_API_URL = `/api/matches`;

/**
 * Sends a POST request to retrieve the authenticated user's match history.
 */
export const getMatchHistory = async (auth: UserAuth): APIResponse<ScoreRecord[]> => {
  try {
    const res = await api.post<ScoreRecord[] | ErrorMsg>(MATCH_API_URL, auth);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
