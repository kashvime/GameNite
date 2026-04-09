import { describe, expect, it } from "vitest";
import { guessLogic } from "../../src/games/guess.ts";

describe(`Guessing game's start() logic`, () => {
  it("Should always start a game with the provided number of players", () => {
    expect(guessLogic.start(2)).toStrictEqual({ secret: expect.anything(), guesses: [null, null] });
    expect(guessLogic.start(4)).toStrictEqual({
      secret: expect.anything(),
      guesses: [null, null, null, null],
    });
  });
  it("Secret should be between 1 and 100", () => {
    for (let i = 0; i < 10; i++) {
      const { secret } = guessLogic.start(2);
      expect(secret).toBeGreaterThanOrEqual(1);
      expect(secret).toBeLessThanOrEqual(100);
    }
  });
});

describe(`Guessing game's update() logic`, () => {
  it("Should reject a poorly-typed move", () => {
    expect(
      guessLogic.update({ secret: expect.anything(), guesses: [null, null, null] }, null, 0),
    ).toBeNull();
  });
  it("Should reject moves that are out of range 1 to 100", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null, null] }, 0, 0)).toBeNull();
    expect(guessLogic.update({ secret: 44, guesses: [null, null, null] }, 101, 0)).toBeNull();
  });
  it("Forbids guessing twice", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null, 22] }, 10, 2)).toBeNull();
    expect(guessLogic.update({ secret: 44, guesses: [null, null, 22] }, 22, 2)).toBeNull();
  });
  it("Should accept in-range moves and update the correct player", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null, null] }, 10, 0)).toStrictEqual({
      secret: 44,
      guesses: [10, null, null],
    });
    expect(guessLogic.update({ secret: 44, guesses: [null, null, 90] }, 20, 1)).toStrictEqual({
      secret: 44,
      guesses: [null, 20, 90],
    });
    expect(guessLogic.update({ secret: 44, guesses: [99, 98, null] }, 20, 2)).toStrictEqual({
      secret: 44,
      guesses: [99, 98, 20],
    });
  });
  it("Should reject non-integer or non-number move values", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null] }, "50", 0)).toBeNull();
    expect(guessLogic.update({ secret: 44, guesses: [null, null] }, 50.5, 0)).toBeNull();
  });
});

describe(`Guessing game's isDone() logic`, () => {
  it("Should only claim to be done if everyone has guessed", () => {
    expect(guessLogic.isDone({ secret: 44, guesses: [null, null, null] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [null, 10, null] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [30, null, null] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [null, 99, 4] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [3, 99, 4] })).toBe(true);
  });
});

describe(`Guessing game's winner() logic`, () => {
  it("Returns the player whose guess is closest to the secret", () => {
    // secret=44: player0 guesses 40 (distance 4), player1 guesses 46 (distance 2) → player1 wins
    expect(guessLogic.winner({ secret: 44, guesses: [40, 46] })).toBe(1);
    // secret=44: player0 guesses 40 (distance 4), player1 guesses 43 (distance 1) → player1 wins
    expect(guessLogic.winner({ secret: 44, guesses: [40, 43] })).toBe(1);
    // secret=44: player0 guesses 45 (distance 1), player1 guesses 50 (distance 6) → player0 wins
    expect(guessLogic.winner({ secret: 44, guesses: [45, 50] })).toBe(0);
  });
  it("Returns null on a tie", () => {
    expect(guessLogic.winner({ secret: 44, guesses: [42, 46] })).toBeNull();
  });
  it("Returns the winner when one player guesses exactly right", () => {
    expect(guessLogic.winner({ secret: 44, guesses: [44, 20] })).toBe(0);
    expect(guessLogic.winner({ secret: 44, guesses: [20, 44] })).toBe(1);
  });
  it("Returns null when not all players have guessed", () => {
    expect(guessLogic.winner({ secret: 44, guesses: [null, 46] })).toBeNull();
  });
});

describe(`Guessing game's viewAs() logic`, () => {
  it("Should include only who has guessed for anonymous viewers, unless finished", () => {
    expect(guessLogic.viewAs({ secret: 44, guesses: [null, null, 33] }, -1)).toStrictEqual({
      finished: false,
      guesses: [false, false, true],
    });
    expect(guessLogic.viewAs({ secret: 44, guesses: [1, 2, 33] }, -1)).toStrictEqual({
      finished: true,
      secret: 44,
      guesses: [1, 2, 33],
    });
  });
  it("Should include the current player guess, if any, unless finished", () => {
    expect(guessLogic.viewAs({ secret: 44, guesses: [7, null, 33] }, 1)).toStrictEqual({
      finished: false,
      guesses: [true, false, true],
    });
    expect(guessLogic.viewAs({ secret: 44, guesses: [null, null, 33] }, 2)).toStrictEqual({
      finished: false,
      guesses: [false, false, true],
      myGuess: 33,
    });
    expect(guessLogic.viewAs({ secret: 44, guesses: [7, 6, 33] }, 0)).toStrictEqual({
      finished: true,
      secret: 44,
      guesses: [7, 6, 33],
    });
  });
  it("Should not include myGuess if player has not guessed yet", () => {
    const view = guessLogic.viewAs({ secret: 44, guesses: [null, 50] }, 0);
    expect(view).not.toHaveProperty("myGuess");
  });
});

describe(`Guessing game's tagView() logic`, () => {
  it("Should appropriately tag the view", () => {
    expect(guessLogic.tagView({ finished: true, secret: 12, guesses: [1, 2, 3] })).toStrictEqual({
      type: "guess",
      view: { finished: true, secret: 12, guesses: [1, 2, 3] },
    });
  });
});

describe(`Guessing game's describeMove() logic`, () => {
  it("Should describe a guess move", () => {
    const state = guessLogic.start(2);
    const newState = guessLogic.update(state, 42, 0)!;
    const desc = guessLogic.describeMove(state, newState, 42, 0);
    expect(typeof desc).toBe("string");
    expect(desc.length).toBeGreaterThan(0);
  });
});
