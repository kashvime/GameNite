import {
  type GameInfo,
  type GameKey,
  type League,
  type TaggedGameView,
  type AIDifficulty,
  type GameMode,
  type ChessState,
} from "@gamenite/shared";
import { createChat } from "./chat.service.ts";
import { populateSafeUserInfo, updateRating, setOnlineStatus } from "./user.service.ts";
import { type GameServicer } from "../games/gameServiceManager.ts";
import { nimGameService } from "../games/nim.ts";
import { guessGameService } from "../games/guess.ts";
import { chessGameService } from "../games/chess.ts";
import { type GameServer, type GameViewUpdates, type UserWithId } from "../types.ts";
import { GameRepo, UserRepo, ChatRepo } from "../repository.ts";
import { saveMatchRecords } from "./score.service.ts";
import { getAIMove } from "../games/chessAI.ts";

/**
 * The service interface for individual games
 */
export const gameServices: { [key in GameKey]: GameServicer } = {
  nim: nimGameService,
  guess: guessGameService,
  chess: chessGameService,
};

/**
 * Expand a stored game
 *
 * @param gameId - Valid game id
 * @returns the expanded game info object
 */
async function populateGameInfo(gameId: string): Promise<GameInfo> {
  const game = await GameRepo.get(gameId);
  return {
    gameId,
    createdBy: await populateSafeUserInfo(game.createdBy),
    chat: game.chat,
    createdAt: new Date(game.createdAt),
    players: await Promise.all(
      game.players
        .filter((id) => game.gameMode !== "ai" || id !== "AI_OPPONENT")
        .map(populateSafeUserInfo),
    ),
    type: game.type,
    status: !game.state ? "waiting" : game.done ? "done" : "active",
    minPlayers: gameServices[game.type].minPlayers,
    visibility: game.visibility ?? "public",
    inviteCode: game.inviteCode,
    gameMode: game.gameMode ?? "human",
    aiDifficulty: game.aiDifficulty,
  };
}

/**
 * Create and store a new game
 *
 * @param user - Initial player in the game's waiting room
 * @param type - Game key
 * @param createdAt - Creation time for this game
 * @param visibility - Whether the game is public or private
 * @param gameMode - Whether the opponent is human or AI
 * @param aiDifficulty - Skill level of the AI opponent (only used when gameMode is 'ai')
 * @returns the new game's info object
 */
export async function createGame(
  user: UserWithId,
  type: GameKey,
  createdAt: Date,
  visibility: "public" | "private" = "public",
  gameMode: GameMode = "human",
  aiDifficulty?: AIDifficulty,
  timeControl?: 5 | 10 | 30 | null,
): Promise<GameInfo> {
  const chat = await createChat(createdAt);
  const inviteCode =
    visibility === "private" ? Math.random().toString(36).slice(2, 8).toUpperCase() : undefined;
  const gameId = await GameRepo.add({
    type,
    done: false,
    chat: chat.chatId,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    players: [user.userId],
    visibility,
    inviteCode,
    gameMode,
    aiDifficulty,
    timeControl,
  });
  return populateGameInfo(gameId);
}

/**
 * Retrieves a single game from the database. If you expect the id to be valid, use `forceGameById`.
 *
 * @param gameId - Ostensible game id
 * @returns the game's info object, or null
 */
export async function getGameById(gameId: string): Promise<GameInfo | null> {
  const game = await GameRepo.find(gameId);
  if (!game) return null;
  return populateGameInfo(gameId);
}

/**
 * Adds a user to a game that hasn't started yet. If the resulting game object has the maximum
 * allowed number of players, it is the responsibility of the caller to start the game.
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the game's info object, with the `user` listed among the players
 * @throws if the game id is not valid, if the game has started, or if the game cannot accept more
 * players
 */
export async function joinGame(gameId: string, user: UserWithId): Promise<GameInfo> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} joining invalid game`);
  if (game.state) throw new Error(`user ${user.username} joining game that started`);
  if (game.players.some((userId) => userId === user.userId))
    throw new Error(`user ${user.username} joining game they are in already`);
  if (game.players.length === gameServices[game.type].maxPlayers)
    throw new Error(`user ${user.username} joining full`);

  game.players = [...game.players, user.userId];
  await GameRepo.set(gameId, game);
  return populateGameInfo(gameId);
}

/**
 * Initializes a game that hasn't started yet
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the necessary views for everyone watching the game
 * @throws if the game id is not valid, if the game already started, or if the game lacks enough
 * players to start
 */
export async function startGame(gameId: string, user: UserWithId): Promise<GameViewUpdates> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} starting invalid game`);
  if (game.state) throw new Error(`user ${user.username} starting game that started`);

  const key: GameKey = game.type;
  if (game.players.length < gameServices[key].minPlayers)
    throw new Error(`user ${user.username} starting underpopulated game`);
  if (!game.players.some((userId) => userId === user.userId))
    throw new Error(`user ${user.username} starting game they're not in`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const options = game.timeControl ? { timeControl: game.timeControl } : undefined;
  const { state, views } = gameServices[key].create(game.players, options);
  game.state = state;
  await GameRepo.set(gameId, game);
  await Promise.all(game.players.map((id) => setOnlineStatus(id, "in_match")));

  return Promise.resolve(views);
}

/**
 * Get a list of all games
 *
 * @returns a list of game summaries, ordered reverse chronologically
 */
export async function getGames(): Promise<GameInfo[]> {
  const keys = await GameRepo.getAllKeys();
  const unsorted = await Promise.all(keys.map(populateGameInfo));
  return unsorted
    .filter((game) => game.visibility === "public")
    .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Represents the result of a game update, including view updates and the
 * move description suffix (the display name is prepended by the caller).
 */
export interface GameUpdateResult {
  views: GameViewUpdates;
  moveDescription: string;
  chatId: string;
  leagueChanges: { userId: string; oldLeague: League; newLeague: League }[];
}

/**
 * Updates a game state and returns the necessary view updates
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @param move - Unsanitized game move
 * @returns the view updates and move description to send to players and watchers
 * @throws if the game id or move is not valid
 */
export async function updateGame(
  gameId: string,
  user: UserWithId,
  move: unknown,
  io?: GameServer,
): Promise<GameUpdateResult> {
  const leagueChanges: { userId: string; oldLeague: League; newLeague: League }[] = [];
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} acted on an invalid game`);
  if (!game.state) throw new Error(`user ${user.username} made a move in game that hadn't started`);

  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  if (playerIndex < 0)
    throw new Error(`user ${user.username} made a move in a game they weren't playing`);

  const result = gameServices[game.type].update(game.state, move, playerIndex, game.players);
  if (!result) throw new Error(`user ${user.username} made an invalid move in ${game.type}`);

  game.state = result.state;
  game.done = game.done || result.done;
  await GameRepo.set(gameId, game);

  if (result.done) {
    await handleGameOver(game, gameId, result, leagueChanges, io);
  } else if (game.gameMode === "ai" && game.type === "chess" && io) {
    // Fire-and-forget: don't await so the human's move response isn't delayed
    void scheduleAIMove(gameId, game.state as ChessState, game.aiDifficulty ?? "medium", io);
  }

  return {
    views: result.views,
    moveDescription: result.moveDescription,
    chatId: game.chat,
    leagueChanges,
  };
}

/**
 * Waits a brief moment then computes and applies the AI's move,
 * broadcasting the result to all clients via Socket.IO.
 *
 * @param gameId - The game to update
 * @param stateAfterHuman - The chess state immediately after the human's move
 * @param difficulty - AI skill level
 * @param io - Socket.IO server instance for broadcasting
 */
async function scheduleAIMove(
  gameId: string,
  stateAfterHuman: ChessState,
  difficulty: AIDifficulty,
  io: GameServer,
): Promise<void> {
  // delay so the move doesn't feel instant
  await new Promise<void>((res) => setTimeout(res, 400 + Math.random() * 400));

  const game = await GameRepo.find(gameId);
  if (!game?.state || game.done) return;

  const aiMove = getAIMove(stateAfterHuman.fen, difficulty);
  // AI is always player index 1 (black) — human created the game and is index 0
  const result = gameServices.chess.update(game.state, aiMove, 1, game.players);
  if (!result) return;

  game.state = result.state;
  game.done = game.done || result.done;
  await GameRepo.set(gameId, game);

  // Broadcast the AI move to watchers and the human player
  io.to(gameId).emit("gameStateUpdated", { ...result.views.watchers, forPlayer: false });
  for (const { userId, view } of result.views.players) {
    if (userId === "AI_OPPONENT") continue;
    io.to(`${gameId}-${userId}`).emit("gameStateUpdated", { ...view, forPlayer: true });
  }

  // Add AI move to chat log and broadcast to chat participants
  const now = new Date();
  const chat = await ChatRepo.find(game.chat);
  if (chat) {
    chat.moveLog = [
      ...chat.moveLog,
      {
        moveDescription: result.moveDescription,
        userId: "AI_OPPONENT",
        createdAt: now.toISOString(),
      },
    ];
    await ChatRepo.set(game.chat, chat);
    io.to(game.chat).emit("chatMoveLog", {
      chatId: game.chat,
      moveDescription: result.moveDescription,
      user: {
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
      },
      createdAt: now,
    });
  }

  if (result.done) {
    await handleGameOver(game, gameId, result, [], io);
  }
}

/**
 * Handles end-of-game logic: saving match records and updating ratings.
 * Extracted to avoid duplication between the human move path and AI move path.
 */
async function handleGameOver(
  game: Awaited<ReturnType<typeof GameRepo.find>> & object,
  gameId: string,
  result: NonNullable<ReturnType<typeof gameServices.chess.update>>,
  leagueChanges: { userId: string; oldLeague: League; newLeague: League }[],
  io?: GameServer,
) {
  const humanPlayers = game.players.filter((id) => id !== "AI_OPPONENT");

  if (humanPlayers.length === 2) {
    const [player0, player1] = await Promise.all([
      UserRepo.get(humanPlayers[0]),
      UserRepo.get(humanPlayers[1]),
    ]);
    const idx0 = game.players.indexOf(humanPlayers[0]);
    const idx1 = game.players.indexOf(humanPlayers[1]);
    const rating0 = player0.ratings?.[game.type] ?? 1000;
    const rating1 = player1.ratings?.[game.type] ?? 1000;
    const result0 = result.winner === null ? "draw" : result.winner === idx0 ? "win" : "loss";
    const result1 = result.winner === null ? "draw" : result.winner === idx1 ? "win" : "loss";
    const [change0, change1] = await Promise.all([
      updateRating(humanPlayers[0], game.type, rating1, result0),
      updateRating(humanPlayers[1], game.type, rating0, result1),
    ]);
    const delta0 = change0.newRating - change0.oldRating;
    const delta1 = change1.newRating - change1.oldRating;

    await saveMatchRecords(
      game.players,
      game.type,
      gameId,
      result.winner,
      new Date(),
      undefined,
      io,
      game.visibility ?? "public",
      { [humanPlayers[0]]: delta0, [humanPlayers[1]]: delta1 },
    );

    if (change0.oldLeague !== change0.newLeague)
      leagueChanges.push({
        userId: humanPlayers[0],
        oldLeague: change0.oldLeague,
        newLeague: change0.newLeague,
      });
    if (change1.oldLeague !== change1.newLeague)
      leagueChanges.push({
        userId: humanPlayers[1],
        oldLeague: change1.oldLeague,
        newLeague: change1.newLeague,
      });

    if (io) {
      io.to(gameId).emit("gameRatingUpdated", {
        changes: [
          {
            userId: humanPlayers[0],
            username: player0.username,
            display: player0.display,
            oldRating: change0.oldRating,
            newRating: change0.newRating,
            delta: delta0,
          },
          {
            userId: humanPlayers[1],
            username: player1.username,
            display: player1.display,
            oldRating: change1.oldRating,
            newRating: change1.newRating,
            delta: delta1,
          },
        ],
      });
    }
  } else {
    await saveMatchRecords(
      game.players,
      game.type,
      gameId,
      result.winner,
      new Date(),
      undefined,
      io,
      game.visibility ?? "public",
    );
  }
  await Promise.all(humanPlayers.map((id) => setOnlineStatus(id, "online")));
}

/**
 * View a game as a specific user
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns A boolean for whether that user is a player, the player's view, and the list of players
 */
export async function viewGame(gameId: string, user: UserWithId) {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} viewed an invalid game id`);
  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  let view: TaggedGameView | null = null;
  if (game.state) {
    view = gameServices[game.type].view(game.state, playerIndex);
  }
  return {
    isPlayer: playerIndex >= 0,
    view,
    players: await Promise.all(
      game.players
        .filter((id) => game.gameMode !== "ai" || id !== "AI_OPPONENT")
        .map(populateSafeUserInfo),
    ),
    yourPlayerIndex: playerIndex,
  };
}

export async function joinByInviteCode(
  code: string,
  user: UserWithId,
): Promise<GameInfo | { error: string }> {
  const keys = await GameRepo.getAllKeys();
  const records = await GameRepo.getMany(keys);
  const idx = records.findIndex((r) => r.inviteCode === code.toUpperCase());
  if (idx < 0) return { error: "Invalid invite code" };
  const gameId = keys[idx];
  try {
    return await joinGame(gameId, user);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not join game" };
  }
}
