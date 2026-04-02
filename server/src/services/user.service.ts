import { type SafeUserInfo, type UserUpdateRequest } from "@gamenite/shared";
import { getUserByUsername, updateAuth } from "./auth.service.ts";
import { UserRepo } from "../repository.ts";

const disallowedUsernames = new Set(["login", "signup", "list"]);

/**
 * Retrieves a single user from the database.
 *
 * @param userId - Valid user id.
 * @returns the found user object (without the password).
 */
export async function populateSafeUserInfo(userId: string): Promise<SafeUserInfo> {
  const record = await UserRepo.get(userId);
  return Promise.resolve({
    username: record.username,
    display: record.display,
    createdAt: new Date(record.createdAt),
    // TODO: wire up to real match history data in Sprint 2
    onlineStatus: "online",
    totalGamesPlayed: record.totalGamesPlayed ?? 0,
    winRate: record.winRate ?? 0,
    favoriteGame: record.favoriteGame ?? null,
    bio: record.bio ?? null,
    avatarUrl: record.avatarUrl ?? null,
    rating: record.rating ?? 1000,
  });
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
  const id = await UserRepo.add({
    username,
    createdAt: createdAt.toISOString(),
    display: username,
    totalGamesPlayed: 0,
    winRate: 0,
    favoriteGame: null,
    bio: null,
    avatarUrl: null,
  });
  await updateAuth(username, password, id);
  return Promise.resolve({
    username,
    createdAt,
    display: username,
    onlineStatus: "online",
    totalGamesPlayed: 0,
    winRate: 0,
    favoriteGame: null,
    bio: null,
    avatarUrl: null,
    rating: 1000,
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
  { display, password, bio, avatarUrl }: UserUpdateRequest,
): Promise<SafeUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);
  if (password !== undefined) await updateAuth(username, password, user.userId);
  const newUser = await UserRepo.get(user.userId);
  if (display !== undefined) newUser.display = display;
  if (bio !== undefined) newUser.bio = bio;
  if (avatarUrl !== undefined) newUser.avatarUrl = avatarUrl;
  await UserRepo.set(user.userId, newUser);
  return populateSafeUserInfo(user.userId);
}

/**
 * Updates a user's Elo rating after a completed match.
 *
 * @param userId - The user whose rating to update
 * @param opponentRating - The opponent's current rating
 * @param result - The outcome of the match from the user's perspective
 */
export async function updateRating(
  userId: string,
  opponentRating: number,
  result: "win" | "loss" | "draw",
): Promise<void> {
  const record = await UserRepo.get(userId);
  const playerRating = record.rating ?? 1000;
  const actualScore = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const expectedScore = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  record.rating = Math.round(playerRating + 32 * (actualScore - expectedScore));
  await UserRepo.set(userId, record);
}
