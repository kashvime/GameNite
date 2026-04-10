import type { SafeUserInfo } from "@gamenite/shared";
import useLoginContext from "../hooks/useLoginContext";
import { isSameUser } from "../util/viewerSeat.ts";
import { NavLink } from "react-router-dom";

interface UserLinkProps {
  user: SafeUserInfo;
  capitalize?: boolean;
}

export default function UserLink({ user, capitalize }: UserLinkProps) {
  const loggedInUser = useLoginContext();
  if (isSameUser(user, loggedInUser.user)) {
    return capitalize ? "You" : "you";
  }
  return <NavLink to={`/profile/${user.username}`}>{user.display}</NavLink>;
}
