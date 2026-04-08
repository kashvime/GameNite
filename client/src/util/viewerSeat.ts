import type { SafeUserInfo } from "@gamenite/shared";

/**
 * Index of `viewer` in the game's `players` roster (-1 if not seated).
 * Prefer `userId` so OAuth / JWT username quirks cannot mis-seat the viewer.
 */
export function viewerSeat(players: SafeUserInfo[], viewer: SafeUserInfo): number {
  if (viewer.userId) {
    const byId = players.findIndex((p) => p.userId === viewer.userId);
    if (byId >= 0) return byId;
  }
  return players.findIndex((p) => p.username === viewer.username);
}

export function isSameUser(a: SafeUserInfo, b: SafeUserInfo): boolean {
  if (a.userId && b.userId) return a.userId === b.userId;
  return a.username === b.username;
}
