import { type SafeUserInfo } from "./user.types.ts";
import { z } from "zod";

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

/*** TYPES USED IN THE MATCH API ***/

export const zMatchFilter = z.object({
  gameType: z.string().optional(),
  result: z.enum(["win", "loss", "draw"]).optional(),
  opponentUsername: z.string().optional(),
  dateRange: z
    .object({
      from: z.coerce.date(),
      to: z.coerce.date(),
    })
    .optional(),
  sortOrder: z.enum(["newest", "oldest"]).optional(),
  page: z.number().int().gte(1).optional(),
  pageSize: z.number().int().gte(1).lte(50).optional(),
});
export type MatchFilter = z.infer<typeof zMatchFilter>;
