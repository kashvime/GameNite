import { ScoreRepo, UserRepo } from "../repository.ts";
import type { ScoreRecord, RecordId } from "../models.ts";
import {
  computeLeague,
  type GameKey,
  type League,
  type MatchInfo,
  type MatchFilter,
} from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import type { GameServer } from "../types.ts";

/**
 * Saves a completed match record for every player in the game.
 * One ScoreRecord is written per player so each user's match history
 * is queryable by their own userId.
 *
 * @param players - All game players' user IDs
 * @param gameType - The game that was played
 * @param gameId - The game record for this match
 * @param winner - The index of the winning player, or null for a draw
 * @param playedAt - When the match was played
 * @param scores - Array of player scores
 */
export async function saveMatchRecords(
  players: RecordId[],
  gameType: GameKey,
  gameId: RecordId,
  winner: number | null,
  playedAt: Date,
  scores?: number[],
  io?: GameServer,
): Promise<void> {
  await Promise.all(
    players.map((userId, playerIndex) => {
      const opponentIndex = players.length === 2 ? 1 - playerIndex : undefined;
      const record: ScoreRecord = {
        userId,
        opponentId: opponentIndex !== undefined ? players[opponentIndex] : undefined,
        gameType,
        gameId,
        score: scores && scores[playerIndex],
        result: winner === null ? "draw" : winner === playerIndex ? "win" : "loss",
        createdAt: playedAt.toISOString(),
      };
      return ScoreRepo.add(record);
    }),
  );
  io?.emit("leaderboardUpdated");
}

/**
 * Retrieves all match records for a given user, with opponent info populated.
 * Results are sorted by date (newest first by default) and paginated.
 *
 * @param userId - Valid user id
 * @param filter - Optional filter, sort order, and pagination settings
 * @returns the filtered, sorted, and paginated list of match records
 */
export async function getMatchesByUserId(
  userId: RecordId,
  filter?: MatchFilter,
): Promise<MatchInfo[]> {
  const keys = await ScoreRepo.getAllKeys();
  const records = await ScoreRepo.getMany(keys);

  const matches: MatchInfo[] = [];
  for (const record of records) {
    if (record.userId !== userId) continue;
    if (filter?.gameType && record.gameType !== filter.gameType) continue;
    if (filter?.dateRange) {
      const createdAt = new Date(record.createdAt);
      if (createdAt < filter.dateRange.from || createdAt > filter.dateRange.to) continue;
    }
    if (filter?.result && record.result !== filter.result) continue;
    const opponent = record.opponentId ? await populateSafeUserInfo(record.opponentId) : undefined;
    if (filter?.opponentUsername && opponent?.username !== filter.opponentUsername) continue;
    matches.push({
      gameType: record.gameType,
      result: record.result,
      opponent,
      score: record.score,
      createdAt: new Date(record.createdAt),
    });
  }
  // Sort by selected order; default to newest first
  matches.sort((a, b) => {
    if (filter?.sortOrder === "score") {
      return (b.score ?? 0) - (a.score ?? 0);
    }
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return filter?.sortOrder === "oldest" ? -diff : diff;
  });

  // Paginate
  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 20;
  return matches.slice((page - 1) * pageSize, page * pageSize);
}
/**
 * Returns the top users ranked by Elo rating for the given game type.
 *
 * @param gameType - The game type to rank by
 * @param limit - Maximum number of entries to return (default 30)
 * @param userIds - Optional list of user IDs to restrict to (friends-only filter)
 * @returns Ranked list of users with their Elo rating for the game
 */
export async function getLeaderboard(
  gameType: GameKey,
  limit = 30,
  userIds?: RecordId[],
  league?: League,
): Promise<{ user: Awaited<ReturnType<typeof populateSafeUserInfo>>; rating: number }[]> {
  const keys = await UserRepo.getAllKeys();
  const records = await UserRepo.getMany(keys);

  const rated: { userId: RecordId; rating: number }[] = [];
  for (let i = 0; i < keys.length; i++) {
    const record = records[i];
    const rating = record.ratings?.[gameType];
    if (rating === undefined) continue;
    if (userIds && !userIds.includes(keys[i])) continue;
    if (league && computeLeague(rating) !== league) continue;
    rated.push({ userId: keys[i], rating });
  }

  rated.sort((a, b) => b.rating - a.rating);

  const entries = [];
  for (const { userId, rating } of rated.slice(0, limit)) {
    entries.push({ user: await populateSafeUserInfo(userId), rating });
  }
  return entries;
}

/**
 * Returns the authenticated user's rank and Elo rating among all (or filtered) players for a game.
 *
 * @param userId - The user to look up
 * @param gameType - The game type to rank by
 * @param userIds - Optional list of user IDs to restrict ranking to (friends-only filter)
 * @returns The user's rank and rating, or null if they have no rating for this game
 */
export async function getUserRank(
  userId: RecordId,
  gameType: GameKey,
  userIds?: RecordId[],
  league?: League,
): Promise<{ rank: number; rating: number } | null> {
  const keys = await UserRepo.getAllKeys();
  const records = await UserRepo.getMany(keys);

  // Build the filtered pool to determine rank within the current view,
  // but always include the requesting user so their position is visible
  // even when their rating places them outside the selected league.
  const rated: { userId: RecordId; rating: number }[] = [];
  for (let i = 0; i < keys.length; i++) {
    const record = records[i];
    const rating = record.ratings?.[gameType];
    if (rating === undefined) continue;
    if (userIds && !userIds.includes(keys[i])) continue;
    if (league && computeLeague(rating) !== league && keys[i] !== userId) continue;
    rated.push({ userId: keys[i], rating });
  }

  const entry = rated.find((r) => r.userId === userId);
  if (!entry) return null;

  rated.sort((a, b) => b.rating - a.rating);
  const rank = rated.findIndex((r) => r.userId === userId) + 1;
  return { rank, rating: entry.rating };
}
