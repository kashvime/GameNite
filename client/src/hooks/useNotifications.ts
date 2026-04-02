import { useEffect, useRef, useState } from "react";
import type { League, SafeUserInfo, UserAuth } from "@gamenite/shared";
import { getPendingRequests } from "../services/friendService";
import useLoginContext from "./useLoginContext";

export interface Notification {
  id: string;
  message: string;
}

/**
 * Polls for pending friend requests every 10 seconds and generates
 * notifications when new ones arrive.
 */
export default function useNotifications(auth: UserAuth) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const seenRequestIds = useRef<Set<string>>(new Set());
  const { socket } = useLoginContext();

  useEffect(() => {
    const poll = async () => {
      const res = await getPendingRequests(auth);
      if (!res || "error" in res) return;

      const newNotifications: Notification[] = [];
      for (const { requestId, from } of res as Array<{
        requestId: string;
        from: SafeUserInfo;
      }>) {
        if (!seenRequestIds.current.has(requestId)) {
          seenRequestIds.current.add(requestId);
          newNotifications.push({
            id: requestId,
            message: `${from.display} (@${from.username}) sent you a friend request!`,
          });
        }
      }
      if (newNotifications.length > 0) {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [auth.username, auth.password, auth]);

  useEffect(() => {
    const handleLeagueChanged = ({
      oldLeague,
      newLeague,
    }: {
      oldLeague: League;
      newLeague: League;
    }) => {
      const promoted = newLeague > oldLeague;
      setNotifications((prev) => [
        ...prev,
        {
          id: `league-${Date.now()}`,
          message: promoted
            ? `You've been promoted to ${newLeague}!`
            : `You've been demoted to ${newLeague}.`,
        },
      ]);
    };

    socket.on("leagueChanged", handleLeagueChanged);
    return () => {
      socket.off("leagueChanged", handleLeagueChanged);
    };
  }, [socket]);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return { notifications, dismiss };
}
