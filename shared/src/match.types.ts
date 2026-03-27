import { type SafeUserInfo } from "./user.types.ts";

/**
 * Represents a completed match in a user's match history.
 * - `gameType`: which game was played
 * - `result`: outcome of the match from the user's perspective
 * - `opponent`: the opponent's info
 * - `score`: final score for the match
 * - `createdAt`: when the match was played
 */
export interface MatchInfo {
  gameType: string;
  result: "win" | "loss" | "draw";
  opponent?: SafeUserInfo;
  score?: number;
  createdAt: Date;
}
