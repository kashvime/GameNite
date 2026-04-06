import { useCallback, useEffect, useState } from "react";
import type { SafeUserInfo, UserAuth } from "@gamenite/shared";
import {
  getFriends,
  getPendingRequests,
  respondToFriendRequest,
  sendFriendRequest,
} from "../services/friendService.ts";

type FriendsState =
  | { type: "waiting" }
  | { type: "error"; msg: string }
  | {
      type: "loaded";
      friends: SafeUserInfo[];
      pending: Array<{ requestId: string; from: SafeUserInfo }>;
    };

export default function useFriends(auth: UserAuth) {
  const [state, setState] = useState<FriendsState>({ type: "waiting" });
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setState({ type: "waiting" });
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFriends(), getPendingRequests()]).then(([friendsRes, pendingRes]) => {
      if (cancelled) return;
      if ("error" in friendsRes) {
        setState({ type: "error", msg: friendsRes.error });
      } else if ("error" in pendingRes) {
        setState({ type: "error", msg: pendingRes.error });
      } else {
        setState({ type: "loaded", friends: friendsRes, pending: pendingRes });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth, refreshToken]);

  const send = async (toUsername: string): Promise<string | null> => {
    const res = await sendFriendRequest(auth, toUsername);
    if (res && "error" in res) return res.error;
    refresh();
    return null;
  };

  const respond = async (requestId: string, accept: boolean): Promise<string | null> => {
    const res = await respondToFriendRequest(auth, requestId, accept);
    if (res && "error" in res) return res.error;
    refresh();
    return null;
  };

  return { state, send, respond };
}
