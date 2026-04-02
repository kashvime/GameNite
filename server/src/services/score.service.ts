import { ScoreRepo } from "../repository.ts";
import type { ScoreRecord, RecordId } from "../models.ts";
import type { GameKey, MatchInfo, MatchFilter } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
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
