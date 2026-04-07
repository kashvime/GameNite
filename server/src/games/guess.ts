import {
  zGuessMove,
  type GuessView,
  type GuessState,
  type UnfinishedGuesView,
} from "@gamenite/shared";
import { GameService } from "./gameServiceManager.ts";
import { type GameLogic } from "./gameLogic.ts";

function allGuessed(guesses: (number | null)[]): guesses is number[] {
  return guesses.every((guess) => guess !== null);
}

export const guessLogic: GameLogic<GuessState, GuessView> = {
  minPlayers: 2,
  maxPlayers: 2,
  start: (numPlayers) => ({
    secret: Math.round(Math.random() * 100) + 1,
    guesses: Array.from({ length: numPlayers }).map(() => null),
  }),
  update: ({ secret, guesses: oldGuesses }, payload, playerIndex) => {
    const move = zGuessMove.safeParse(payload);
    if (oldGuesses[playerIndex] !== null) return null;
    if (move.error) return null;
    const newGuesses = [...oldGuesses];
    newGuesses[playerIndex] = move.data;
    return {
      secret,
      guesses: newGuesses,
    };
  },
  isDone: ({ guesses }) => guesses.every((guess) => guess !== null),

  winner: ({ secret, guesses }) => {
    if (!allGuessed(guesses)) return null;
    const firstPlayerDistance = Math.abs(guesses[0] - secret);
    const secondPlayerDistance = Math.abs(guesses[1] - secret);
    if (firstPlayerDistance === secondPlayerDistance) return null;
    return firstPlayerDistance < secondPlayerDistance ? 0 : 1;
  },

  viewAs: ({ secret, guesses }, playerIndex) => {
    if (allGuessed(guesses)) {
      return { finished: true, secret, guesses };
    }
    // If the game is not done, we only show the player their own guess
    // everyone can see *who* has guessed
    const view: UnfinishedGuesView = {
      finished: false,
      guesses: guesses.map((value) => value !== null),
    };
    if (playerIndex !== -1 && guesses[playerIndex] !== null) {
      view.myGuess = guesses[playerIndex];
    }
    return view;
  },
  tagView: (view) => ({ type: "guess", view }),
  describeMove: (_prevState, newState, payload) => {
    const move = zGuessMove.parse(payload);
    if (allGuessed(newState.guesses)) {
      return ` guessed ${move} — the secret was ${newState.secret}!`;
    }
    return ` made a guess`;
  },
};

export const guessGameService = new GameService<GuessState, GuessView>(guessLogic);
