import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { SafeUserInfo } from "@gamenite/shared";
import App from "../src/App.tsx";
import { getUserById } from "../src/services/userService.ts";

const getUserByIdMock = getUserById as MockedFunction<typeof getUserById>;

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    onAny: vi.fn(),
    emit: vi.fn(),
  })),
}));

vi.mock("../src/services/gameService.ts", () => ({
  gameList: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../src/services/threadService.ts", () => ({
  threadList: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../src/services/friendService.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/friendService.ts")>();
  return {
    ...actual,
    getPendingRequests: vi.fn(() => Promise.resolve([])),
  };
});

vi.mock("../src/services/userService.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/userService.ts")>();
  return {
    ...actual,
    getUserById: vi.fn(),
  };
});

/** Minimal JWT-shaped string jwt-decode accepts (payload contains `username`). */
function fakeJwtForUsername(username: string): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ username }));
  return `${header}.${payload}.x`;
}

const mockUser: SafeUserInfo = {
  userId: "id1",
  username: "user1",
  display: "User One",
  createdAt: new Date(),
  onlineStatus: "online",
  totalGamesPlayed: 0,
  winRate: 0,
  favoriteGame: null,
  bio: null,
  avatarUrl: null,
  ratings: { chess: 1000, nim: 1000, guess: 1000 },
  hideFromGlobalLeaderboard: false,
};

describe("App session restore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    getUserByIdMock.mockResolvedValue(mockUser);
  });

  it("does not redirect to login while a stored token is being restored", async () => {
    let resolveUser!: (u: SafeUserInfo) => void;
    const userPromise = new Promise<SafeUserInfo>((resolve) => {
      resolveUser = resolve;
    });
    getUserByIdMock.mockReturnValueOnce(userPromise);

    sessionStorage.setItem("token", fakeJwtForUsername("user1"));
    const view = render(<App />);

    expect(view.getByText("Loading...")).not.toBeNull();
    expect(view.queryByText(/Welcome back!/i)).toBeNull();

    resolveUser(mockUser);

    await waitFor(() => {
      expect(view.queryByText("Loading...")).toBeNull();
    });

    expect(view.queryByText(/Welcome back!/i)).toBeNull();
    expect(view.getByText(/Recent games/i)).not.toBeNull();
  });

  it("shows login when there is no stored token", async () => {
    const view = render(<App />);

    await waitFor(() => {
      expect(view.queryByText("Loading...")).toBeNull();
    });

    expect(view.getByText(/Welcome back!/i)).not.toBeNull();
  });
});
