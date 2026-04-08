import { useMemo, useState } from "react";
import type { SafeUserInfo } from "@gamenite/shared";
import useAuth from "./useAuth.ts";
import useFriends from "./useFriends.ts";

/**
 * Deterministic chat room id for two users.
 * Both sides must compute the same string so they land in the same socket room.
 */
export function makeDirectChatId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

export default function useDirectMessages() {
  const auth = useAuth();
  const { state } = useFriends(auth);

  const [selectedFriend, setSelectedFriend] = useState<SafeUserInfo | null>(null);

  const chatId = useMemo(() => {
    if (!selectedFriend) return null;
    return makeDirectChatId(auth.username, selectedFriend.username);
  }, [auth.username, selectedFriend]);

  return { friendsState: state, selectedFriend, setSelectedFriend, chatId };
}
