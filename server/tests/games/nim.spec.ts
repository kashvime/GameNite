import { describe, expect, it } from "vitest";
import { nimLogic } from "../../src/games/nim.ts";

describe(`Nim's start() logic`, () => {
  it("Should always start a 2 player game with player 0, and should set START_NIM_OBJECTS to 21", () => {
    expect(nimLogic.start(2)).toStrictEqual({ remaining: 21, nextPlayer: 0 });
  });
});

describe(`Nim's update() logic`, () => {
  it("Should reject a poorly-typed move", () => {
    expect(nimLogic.update({ remaining: 4, nextPlayer: 0 }, null, 0)).toBeNull();
  });
  it("Should reject moves that are out of the range 1 to 3", () => {
    expect(nimLogic.update({ remaining: 4, nextPlayer: 0 }, 0, 0)).toBeNull();
    expect(nimLogic.update({ remaining: 4, nextPlayer: 0 }, 4, 0)).toBeNull();
  });
  it("Should reject moves that take more pieces than are still remaining", () => {
    expect(nimLogic.update({ remaining: 2, nextPlayer: 0 }, 3, 0)).toBeNull();
    expect(nimLogic.update({ remaining: 1, nextPlayer: 0 }, 2, 0)).toBeNull();
    expect(nimLogic.update({ remaining: 0, nextPlayer: 0 }, 1, 0)).toBeNull();
  });
  it("Should reject the wrong player moving", () => {
    expect(nimLogic.update({ remaining: 4, nextPlayer: 1 }, 2, 0)).toBeNull();
  });
  it("Should allow all the remaining pieces to be taken", () => {
    expect(nimLogic.update({ remaining: 3, nextPlayer: 0 }, 3, 0)).toStrictEqual({
      remaining: 0,
      nextPlayer: 1,
    });
    expect(nimLogic.update({ remaining: 2, nextPlayer: 0 }, 2, 0)).toStrictEqual({
      remaining: 0,
      nextPlayer: 1,
    });
    expect(nimLogic.update({ remaining: 1, nextPlayer: 0 }, 1, 0)).toStrictEqual({
      remaining: 0,
      nextPlayer: 1,
    });
  });
  it("Should allow fewer than all the remaining pieces to be taken", () => {
    expect(nimLogic.update({ remaining: 15, nextPlayer: 1 }, 3, 1)).toStrictEqual({
      remaining: 12,
      nextPlayer: 0,
    });
  });
  it("Should correctly alternate turns between player 0 and player 1", () => {
    const s1 = nimLogic.update({ remaining: 21, nextPlayer: 0 }, 1, 0)!;
    expect(s1.nextPlayer).toBe(1);
    const s2 = nimLogic.update(s1, 1, 1)!;
    expect(s2.nextPlayer).toBe(0);
  });
  it("Should reject non-integer move values", () => {
    expect(nimLogic.update({ remaining: 10, nextPlayer: 0 }, 1.5, 0)).toBeNull();
    expect(nimLogic.update({ remaining: 10, nextPlayer: 0 }, "2", 0)).toBeNull();
  });
});

describe(`Nim's isDone() logic`, () => {
  it("Should say that only a game with no objects left is done", () => {
    expect(nimLogic.isDone({ remaining: 0, nextPlayer: 0 })).toBe(true);
    expect(nimLogic.isDone({ remaining: 15, nextPlayer: 0 })).toBe(false);
  });
});

describe(`Nim's winner() logic`, () => {
  it("Should return the player who did NOT take the last piece", () => {
    // nextPlayer advances after the last move, so nextPlayer is the winner
    expect(nimLogic.winner({ remaining: 0, nextPlayer: 1 })).toBe(1);
    expect(nimLogic.winner({ remaining: 0, nextPlayer: 0 })).toBe(0);
  });
  it("Should always return nextPlayer regardless of game state", () => {
    // nim.winner always returns nextPlayer — no null check in the logic
    expect(nimLogic.winner({ remaining: 5, nextPlayer: 0 })).toBe(0);
    expect(nimLogic.winner({ remaining: 5, nextPlayer: 1 })).toBe(1);
  });
});

describe(`Nim's viewAs() logic`, () => {
  it("Should view games the same way regardless of who is viewing", () => {
    expect(nimLogic.viewAs({ remaining: 3, nextPlayer: 0 }, -1)).toStrictEqual({
      remaining: 3,
      nextPlayer: 0,
    });
    expect(nimLogic.viewAs({ remaining: 3, nextPlayer: 0 }, 0)).toStrictEqual({
      remaining: 3,
      nextPlayer: 0,
    });
    expect(nimLogic.viewAs({ remaining: 3, nextPlayer: 0 }, 1)).toStrictEqual({
      remaining: 3,
      nextPlayer: 0,
    });
  });
});

describe(`Nim's tagView() logic`, () => {
  it("Should appropriately tag the view", () => {
    expect(nimLogic.tagView({ remaining: 3, nextPlayer: 0 })).toStrictEqual({
      type: "nim",
      view: { remaining: 3, nextPlayer: 0 },
    });
  });
});

describe(`Nim's describeMove() logic`, () => {
  it("Should describe taking one token", () => {
    const state = nimLogic.start(2);
    const newState = nimLogic.update(state, 1, 0)!;
    expect(nimLogic.describeMove(state, newState, 1, 0)).toContain("one token");
  });
  it("Should describe taking two tokens", () => {
    const state = nimLogic.start(2);
    const newState = nimLogic.update(state, 2, 0)!;
    expect(nimLogic.describeMove(state, newState, 2, 0)).toContain("two tokens");
  });
  it("Should describe taking three tokens", () => {
    const state = nimLogic.start(2);
    const newState = nimLogic.update(state, 3, 0)!;
    expect(nimLogic.describeMove(state, newState, 3, 0)).toContain("three tokens");
  });
});
