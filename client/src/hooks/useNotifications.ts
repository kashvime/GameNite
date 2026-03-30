import { useEffect, useRef, useState } from "react";
import type { SafeUserInfo, UserAuth } from "@gamenite/shared";
import { getPendingRequests } from "../services/friendService";

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

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return { notifications, dismiss };
}
