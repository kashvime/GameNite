/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  computeLeague,
  type GameKey,
  type League,
  type SafeUserInfo,
  type UserUpdateRequest,
} from "@gamenite/shared";
import { getUserByUsername, updateAuth } from "./auth.service.ts";
import { UserRepo, ScoreRepo } from "../repository.ts";

const disallowedUsernames = new Set(["login", "signup", "list"]);

/**
 * Retrieves a single user from the database.
 *
 * @param userId - Valid user id.
 * @returns the found user object (without the password).
 */
export async function populateSafeUserInfo(userId: string): Promise<SafeUserInfo> {
  // Return a fake profile for the AI player without hitting the database
  if (userId === "AI_OPPONENT") {
    return {
      userId: "AI_OPPONENT",
      username: "Computer",
      display: "Computer",
      createdAt: new Date(0),
      onlineStatus: "online",
      totalGamesPlayed: 0,
      winRate: 0,
      favoriteGame: "chess",
      bio: null,
      avatarUrl: null,
      ratings: {},
      hideFromGlobalLeaderboard: false,
    };
  }
  const record = await UserRepo.get(userId);

  // Calculate real stats from match history
  const keys = await ScoreRepo.getAllKeys();
  const allRecords = await ScoreRepo.getMany(keys);
  const userRecords = allRecords.filter((r) => r.userId === userId);

  const totalGamesPlayed = userRecords.length;
  const wins = userRecords.filter((r) => r.result === "win").length;
  const winRate = totalGamesPlayed > 0 ? Math.round((wins / totalGamesPlayed) * 100) : 0;

  // Favorite game = most played game type
  const gameCounts: Record<string, number> = {};
  for (const r of userRecords) {
    gameCounts[r.gameType] = (gameCounts[r.gameType] ?? 0) + 1;
  }
  const favoriteGame =
    totalGamesPlayed > 0 ? Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0][0] : null;

  // Return a fake profile for the AI player without hitting the database
  if (userId === "AI_OPPONENT") {
    return {
      userId: "AI_OPPONENT",
      username: "Computer",
      display: "Computer",
      createdAt: new Date(0),
      onlineStatus: "online",
      totalGamesPlayed: 0,
      winRate: 0,
      favoriteGame: "chess",
      bio: null,
      avatarUrl: null,
      ratings: {},
      hideFromGlobalLeaderboard: false,
    };
  }
  return {
    userId,
    username: record.username,
    display: record.display,
    createdAt: new Date(record.createdAt),
    onlineStatus: record.onlineStatus ?? "offline",
    totalGamesPlayed,
    winRate,
    favoriteGame,
    bio: record.bio ?? null,
    avatarUrl: record.avatarUrl ?? null,
    ratings: record.ratings ?? {},
    hideFromGlobalLeaderboard: record.hideFromGlobalLeaderboard ?? false,
  };
}

/**
 * Create and store a new user
 *
 * @param newUser - The user object to be saved, containing user details like username, password, etc.
 * @returns Resolves with the saved user object (without the password) or an error message.
 */
export async function createUser(
  username: string,
  password: string,
  createdAt: Date,
): Promise<SafeUserInfo | { error: string }> {
  if ((await getUserByUsername(username)) !== null) {
    return { error: "User already exists" };
  }
  if (disallowedUsernames.has(username)) {
    return { error: "That is not a permitted username" };
  }
  const defaultRatings = { chess: 1000, nim: 1000, guess: 1000 };
  const id = await UserRepo.add({
    username,
    createdAt: createdAt.toISOString(),
    display: username,
    totalGamesPlayed: 0,
    winRate: 0,
    favoriteGame: null,
    bio: null,
    avatarUrl: null,
    hideFromGlobalLeaderboard: false,
    ratings: defaultRatings,
    onlineStatus: "online",
  });
  await updateAuth(username, password, id);
  return Promise.resolve({
    userId: id,
    username,
    createdAt,
    display: username,
    onlineStatus: "online",
    totalGamesPlayed: 0,
    winRate: 0,
    favoriteGame: null,
    bio: null,
    avatarUrl: null,
    hideFromGlobalLeaderboard: false,
    ratings: defaultRatings,
  });
}

/**
 * Retrieves a list of usernames from the database
 *
 * @param usernames - A list of usernames
 * @returns the SafeUserInfo objects corresponding to those users
 * @throws if any of the usernames are not valid
 */
export async function getUsersByUsername(usernames: string[]): Promise<SafeUserInfo[]> {
  return Promise.all(
    usernames.map(async (username) => {
      const user = await getUserByUsername(username);
      if (user === null) {
        throw new Error(`No user ${username}`);
      }
      return populateSafeUserInfo(user.userId);
    }),
  );
}

/**
 * Updates user information in the database
 *
 * @param username - A valid username for the user to update
 * @param updates - An object that defines the fields to be updated and their new values
 * @returns the updated user object (without the password)
 * @throws if the username does not exist in the database
 */
export async function updateUser(
  username: string,
  { display, password, bio, avatarUrl, hideFromGlobalLeaderboard }: UserUpdateRequest,
): Promise<SafeUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);
  if (password !== undefined) await updateAuth(username, password, user.userId);
  const newUser = await UserRepo.get(user.userId);
  if (display !== undefined) newUser.display = display;
  if (bio !== undefined) newUser.bio = bio;
  if (avatarUrl !== undefined) newUser.avatarUrl = avatarUrl;
  if (hideFromGlobalLeaderboard !== undefined)
    newUser.hideFromGlobalLeaderboard = hideFromGlobalLeaderboard;
  await UserRepo.set(user.userId, newUser);
  return populateSafeUserInfo(user.userId);
}

/**
 * Updates a user's Elo rating for a specific game after a completed match.
 *
 * @param userId - The user whose rating to update
 * @param gameType - The game that was played
 * @param opponentRating - The opponent's current rating for this game
 * @param result - The outcome of the match from the user's perspective
 * @returns the league change if one occurred, or null
 */
export async function updateRating(
  userId: string,
  gameType: GameKey,
  opponentRating: number,
  result: "win" | "loss" | "draw",
): Promise<{ oldRating: number; newRating: number; oldLeague: League; newLeague: League } | null> {
  const record = await UserRepo.get(userId);
  const oldRating = record.ratings?.[gameType] ?? 1000;
  const actualScore = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const expectedScore = 1 / (1 + 10 ** ((opponentRating - oldRating) / 400));
  const newRating = Math.round(oldRating + 32 * (actualScore - expectedScore));
  const oldLeague = computeLeague(oldRating);
  const newLeague = computeLeague(newRating);
  record.ratings = { ...record.ratings, [gameType]: newRating };
  await UserRepo.set(userId, record);
  if (oldLeague === newLeague) return null; // ← add this
  return { oldRating, newRating, oldLeague, newLeague };
}
/**
 * Sets the online status for a user in the database.
 *
 * @param userId - The user to update
 * @param status - The new status ("online", "offline", or "in_match")
 */
export async function setOnlineStatus(
  userId: string,
  status: "online" | "offline" | "in_match",
): Promise<void> {
  if (userId === "AI_OPPONENT") return;
  const record = await UserRepo.get(userId);
  record.onlineStatus = status;
  await UserRepo.set(userId, record);
}
