import type { AIDifficulty, GameKey, GameMode } from "@gamenite/shared";

/**
 * Record identifiers used to look up keys in a database. This type
 * abbreviation is intended to suggest that the key should be a randomly
 * generated unique ID.
 */
export type RecordId = string;

/**
 * Actual JavaScript Date objects can't necessarily be stored in a database;
 * this type indicates that the string should be the result of taking a Date
 * object and turning it to a string with the Date.toISOString() method.
 */
export type DateISO = string;

/**
 * Represents a user's authorization record in the database.
 * - `user`: the user ID of the corresponding User model
 * - `password`: the password for this user
 */
export interface AuthRecord {
  userId: RecordId; // References User models
  password: string;
}

/**
 * Represents a chat document in the database.
 * - `messages`: the ordered list of messages in the chat
 * - `moveLog`: the ordered list of move log entries for this chat
 * - `createdAt`: when the chat was created
 */
export interface ChatRecord {
  messages: RecordId[]; // References Message models
  moveLog: MoveLogEntry[];
  createdAt: DateISO;
}

/**
 * Represents a game move log entry stored in a chat.
 * - `moveDescription`: human-readable description of the move
 * - `userId`: the user who made the move
 * - `createdAt`: when the move was made
 */
export interface MoveLogEntry {
  moveDescription: string;
  userId: RecordId;
  createdAt: DateISO;
}

/**
 * Represents a comment in the database.
 * - `text`: comment contents
 * - `createdBy`: username of the commenter
 * - `createdAt`: when the comment was made
 * - `editedAt`: when the comment was last modified
 */
export interface CommentRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
  editedAt?: DateISO;
}

/**
 * Represents a game document in the database.
 * - `type`: picks which game this is
 * - `state`: absent if the game hasn't started, or the id for the game's state
 * - `chat`: id for the game's chat
 * - `players`: active players for the game
 * - `createdAt`: when the game was created
 * - `createdBy`: username of the person who created the game
 * - `visibility`: if the games public or private
 * - `createdBy`: code to join a private game
 */
export interface GameRecord {
  type: GameKey;
  state?: unknown;
  done: boolean;
  chat: RecordId; // References Chat records
  players: RecordId[]; // References User records
  createdAt: DateISO;
  createdBy: RecordId; // References User records
  visibility: "public" | "private";
  inviteCode?: string;
  timeControl?: 5 | 10 | 30 | null;
  gameMode?: GameMode;
  aiDifficulty?: AIDifficulty;
}

/**
 * Represents a message in the database.
 * - `text`: message contents
 * - `createdBy`: username of message sender
 * - `createdAt`: when the message was sent
 */
export interface MessageRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
}

/**
 * Represents a forum post as it's stored in the database.
 * - `title`: post title
 * - `text`: post contents
 * - `createdAt`: when the thread was posted
 * - `createdBy`: username of OP
 * - `comments`: replies to the post
 */
export interface ThreadRecord {
  title: string;
  text: string;
  createdAt: DateISO;
  createdBy: RecordId; // References User records
  comments: RecordId[]; // References Comment records
}

/**
 * Represents a user document in the database.
 * - `password`: user's password
 * - `display`: A display name
 * - `createdAt`: when this user registered.
 * - `totalGamesPlayed`: total number of games played
 * - `winRate`: win rate as a percentage (0-100)
 * - `favoriteGame`: the game the user has played the most
 * - `bio`: optional short user-written bio
 * - `avatarUrl`: optional path to uploaded profile picture
 * - `rating`: the user's current Elo rating (starts at 1000)
 */
export interface UserRecord {
  username: string; // References Auth records
  display: string;
  createdAt: DateISO;
  totalGamesPlayed?: number;
  winRate?: number;
  favoriteGame?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  ratings?: Partial<Record<GameKey, number>>;
}

/**
 * Represents a completed game result in the database.
 * - `userId`: the user who played
 * - `opponentId`: the opponent (null for single-player)
 * - `gameType`: which game was played
 * - `gameId`: the specific game record
 * - `score`: final score for the match
 * - `result`: outcome of the match
 * - `durationSeconds`: how long the match lasted
 * - `createdAt`: when the match completed
 */
export interface ScoreRecord {
  userId: RecordId; // References User records
  opponentId?: RecordId; // References User records (null for single-player)
  gameType: string; // e.g. 'chess', 'nim'
  gameId: RecordId;
  score?: number;
  result: "win" | "loss" | "draw";
  ratingDelta?: number;
  durationSeconds?: number;
  createdAt: DateISO;
}

/**
 * Represents a friend relationship between two users.
 * - `from`: the user who sent the friend request
 * - `to`: the user who received the friend request
 * - `status`: whether the request is pending or accepted
 * - `createdAt`: when the request was sent
 * - `acceptedAt`: when the request was accepted (if applicable)
 */
export interface FriendRecord {
  from: RecordId; // References User records
  to: RecordId; // References User records
  status: "pending" | "accepted" | "rejected";
  createdAt: DateISO;
  acceptedAt?: DateISO;
}
