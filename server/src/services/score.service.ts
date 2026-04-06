/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { ScoreRepo } from "../repository.ts";
import type { ScoreRecord, RecordId } from "../models.ts";
import type { GameKey, MatchInfo, MatchFilter } from "@gamenite/shared";
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
  // Sort by date
  matches.sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return filter?.sortOrder === "oldest" ? -diff : diff;
  });

  // Paginate
  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 20;
  return matches.slice((page - 1) * pageSize, page * pageSize);
}
/**
 * Returns the top users ranked by win count, optionally filtered by game type.
 *
 * @param gameType - Optional game type to filter by
 * @param limit - Maximum number of entries to return (default 10)
 * @returns Ranked list of users with their win counts
 */
export async function getLeaderboard(
  gameType?: GameKey,
  dateRange?: { from: Date; to: Date },
  limit = 30,
  userIds?: RecordId[],
): Promise<{ user: Awaited<ReturnType<typeof populateSafeUserInfo>>; wins: number }[]> {
  const keys = await ScoreRepo.getAllKeys();
  const records = await ScoreRepo.getMany(keys);

  const winCounts = new Map<RecordId, number>();
  for (const record of records) {
    if (record.result !== "win") continue;
    if (gameType && record.gameType !== gameType) continue;
    if (userIds && !userIds.includes(record.userId)) continue;
    if (dateRange) {
      const createdAt = new Date(record.createdAt);
      if (createdAt < dateRange.from || createdAt > dateRange.to) continue;
    }
    winCounts.set(record.userId, (winCounts.get(record.userId) ?? 0) + 1);
  }

  const sorted = [...winCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

  const entries = [];
  for (const [userId, wins] of sorted) {
    entries.push({ user: await populateSafeUserInfo(userId), wins });
  }
  return entries;
}

export async function getUserRank(
  userId: RecordId,
  gameType?: GameKey,
  dateRange?: { from: Date; to: Date },
  userIds?: RecordId[],
): Promise<{ rank: number; wins: number } | null> {
  const keys = await ScoreRepo.getAllKeys();
  const records = await ScoreRepo.getMany(keys);

  const winCounts = new Map<RecordId, number>();
  for (const record of records) {
    if (record.result !== "win") continue;
    if (gameType && record.gameType !== gameType) continue;
    if (userIds && !userIds.includes(record.userId)) continue;
    if (dateRange) {
      const createdAt = new Date(record.createdAt);
      if (createdAt < dateRange.from || createdAt > dateRange.to) continue;
    }
    winCounts.set(record.userId, (winCounts.get(record.userId) ?? 0) + 1);
  }

  if (!winCounts.has(userId)) return null;

  const sorted = [...winCounts.entries()].sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([id]) => id === userId) + 1;
  return { rank, wins: winCounts.get(userId)! };
}
