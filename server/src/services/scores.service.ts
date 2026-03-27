import { ScoreRepo } from "../repository.ts";
import type { ScoreRecord, RecordId } from "../models.ts";
import type { GameKey } from "@gamenite/shared";

/**
 * Saves a completed match record for every player in the game.
 * One ScoreRecord is written per player so each user's match history
 * is queryable by their own userId or opponents userID.
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
