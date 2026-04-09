import { type SubmitEvent, useState } from "react";
import useLoginContext from "./useLoginContext.ts";
import useAuth from "./useAuth.ts";
import { updateUser } from "../services/userService.ts";
import type { UserUpdateRequest } from "@gamenite/shared";

/**
 * Custom hook to manage profile form logic
 * @returns an object containing
 *  - Form values `display`, `password`, and `confirm`
 *  - Form setters `setDisplay`, `setPassword`, and `setConfirm`
 *  - Possibly-null error message `err`
 *  - Submission handler `handleSubmit`
 */
export default function useEditProfileForm() {
  const { user, updateUser: updateUserContext } = useLoginContext();
  const [display, setDisplay] = useState(user.display);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [bio, setBio] = useState(user.bio ?? "");
  const [hideFromGlobalLeaderboard, setHideFromGlobalLeaderboard] = useState(
    user.hideFromGlobalLeaderboard ?? false,
  );
  const [err, setErr] = useState<null | string>(null);
  const [info, setInfo] = useState<null | string>(null);
  const auth = useAuth();

  const handleSubmit = async (
    e: SubmitEvent<HTMLFormElement>,
    avatarUrl?: string | null,
    bio?: string,
  ) => {
    e.preventDefault();
    setInfo(null);
    setErr(null);

    if (
      user.display === display &&
      password === confirm &&
      password === "" &&
      avatarUrl === (user.avatarUrl ?? null) &&
      bio === (user.bio ?? "") &&
      hideFromGlobalLeaderboard === (user.hideFromGlobalLeaderboard ?? false)
    ) {
      setInfo("No changes to save");
      return;
    }

    if (display.trim() !== display) {
      setErr("Display names can't begin or end with whitespace");
      return;
    }

    if (display.trim() === "") {
      setErr("Please enter a display name");
      return;
    }

    if (password.trim() !== password) {
      setErr("Passwords can't begin or end with whitespace");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords don't match");
      return;
    }

    const updates: UserUpdateRequest = {};
    if (display !== user.display) updates.display = display;
    if (password !== "") updates.password = password;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl ?? undefined;
    if (bio !== undefined && bio !== (user.bio ?? "")) updates.bio = bio;
    if (hideFromGlobalLeaderboard !== (user.hideFromGlobalLeaderboard ?? false)) {
      updates.hideFromGlobalLeaderboard = hideFromGlobalLeaderboard;
    }
    const response = await updateUser(auth, updates);
    if ("error" in response) {
      setErr(response.error);
      return;
    }

    updateUserContext(response);
  };

  return {
    display,
    setDisplay,
    password,
    setPassword,
    confirm,
    setConfirm,
    bio,
    setBio,
    hideFromGlobalLeaderboard,
    setHideFromGlobalLeaderboard,
    err,
    info,
    handleSubmit,
  };
}
