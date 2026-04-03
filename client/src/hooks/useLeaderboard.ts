import { useEffect, useState } from "react";
import { getLeaderboard, getMyRank, type LeaderboardEntry } from "../services/matchService.ts";
import useLoginContext from "./useLoginContext.ts";
import useAuth from "./useAuth.ts";

type LeaderboardState =
  | { type: "waiting" }
  | { type: "error"; msg: string }
  | {
      type: "loaded";
      entries: LeaderboardEntry[];
      myRank: { rank: number; wins: number } | null;
    };

export default function useLeaderboard(
  gameType?: string,
  dateRange?: { from: Date; to: Date },
  friendsOnly?: boolean,
) {
  const [state, setState] = useState<LeaderboardState>({ type: "waiting" });
  const [refreshToken, setRefreshToken] = useState(0);
  const { socket } = useLoginContext();
  const auth = useAuth();

  useEffect(() => {
    const handler = () => setRefreshToken((t) => t + 1);
    socket.on("leaderboardUpdated", handler);
    return () => {
      socket.off("leaderboardUpdated", handler);
    };
  }, [socket]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getLeaderboard(auth, gameType, dateRange, friendsOnly),
      getMyRank(auth, gameType, dateRange, friendsOnly),
    ]).then(([leaderboardRes, myRankRes]) => {
      if (cancelled) return;
      if ("error" in leaderboardRes) {
        setState({ type: "error", msg: leaderboardRes.error });
      } else if (myRankRes && "error" in myRankRes) {
        setState({ type: "error", msg: myRankRes.error });
      } else {
        setState({
          type: "loaded",
          entries: leaderboardRes,
          myRank: myRankRes ?? null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth, gameType, friendsOnly, refreshToken, dateRange]);

  return state;
}
