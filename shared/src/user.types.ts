import { z } from "zod";

/**
 * Represents a "safe" user object that excludes sensitive information like
 * the password, suitable for exposing to clients,
 * - `username`: unique username of the user
 * - `display`: A display name
 * - `createdAt`: when this when the user registered.
 * - `onlineStatus`: current online status of the user
 * - `totalGamesPlayed`: total number of games played
 * - `winRate`: win rate as a percentage (0-100)
 * - `favoriteGame`: the game the user has played the most
 * - `bio`: optional short user-written bio
 * - `avatarUrl`: optional path to uploaded profile picture
 * - `rating`: the user's current Elo rating
 */

export interface SafeUserInfo {
  username: string;
  display: string;
  createdAt: Date;
  onlineStatus: "online" | "offline" | "in_match";
  totalGamesPlayed: number;
  winRate: number;
  favoriteGame: string | null;
  bio: string | null;
  avatarUrl: string | null;
  rating: number;
}

/*** TYPES USED IN THE USER API ***/

/**
 * Represents allowed updates to a user.
 */
export type UserUpdateRequest = z.infer<typeof zUserUpdateRequest>;
export const zUserUpdateRequest = z.object({
  password: z.string().optional(),
  display: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});
