import {
  type ChatInfo,
  type ChatMoveLogPayload,
  type ChatNewMessagePayload,
  type ChatUserJoinedPayload,
  type ChatUserLeftPayload,
} from "./chat.types.ts";
import { type NewMessagePayload } from "./message.types.ts";
import { type WithToken } from "./auth.types.ts";
import {
  type GameMakeMovePayload,
  type GamePlayInfo,
  type TaggedGameView,
} from "./game.types.ts";
import { type SafeUserInfo } from "./user.types.ts";
import { type League } from "./league.ts";

/** `string` is legacy; prefer `{ gameId, watchId }` so the client can drop out-of-order replies */
export type GameWatchPayload =
  | string
  | {
      gameId: string;
      watchId?: number;
    };

/**
 * The Socket.io interface for client to server communication
 */
export interface ClientToServerEvents {
  chatJoin: (payload: WithToken<string>) => void;
  chatLeave: (payload: WithToken<string>) => void;
  chatSendMessage: (payload: WithToken<NewMessagePayload>) => void;
  gameJoinAsPlayer: (payload: WithToken<string>) => void;
  gameMakeMove: (payload: WithToken<GameMakeMovePayload>) => void;
  gameStart: (payload: WithToken<string>) => void;
  gameWatch: (payload: WithToken<GameWatchPayload>) => void;
}

/**
 * The Socket.io interface for server to client information
 */
export interface ServerToClientEvents {
  chatJoined: (payload: ChatInfo) => void;
  chatMoveLog: (payload: ChatMoveLogPayload) => void;
  chatNewMessage: (payload: ChatNewMessagePayload) => void;
  chatUserJoined: (payload: ChatUserJoinedPayload) => void;
  chatUserLeft: (payload: ChatUserLeftPayload) => void;
  gamePlayersUpdated: (payload: SafeUserInfo[]) => void;
  gameStateUpdated: (payload: TaggedGameView & { forPlayer: boolean }) => void;
  gameWatched: (payload: GamePlayInfo) => void;
  friendRequestReceived: (payload: { from: SafeUserInfo }) => void;
  leagueChanged: (payload: { newLeague: League; oldLeague: League }) => void;
  leaderboardUpdated: () => void;
}
