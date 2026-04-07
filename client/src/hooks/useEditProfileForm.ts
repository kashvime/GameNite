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
  const [err, setErr] = useState<null | string>(null);
  const auth = useAuth();

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>, avatarUrl?: string | null) => {
    e.preventDefault();

    if (
      user.display === display &&
      password === confirm &&
      password === "" &&
      avatarUrl === (user.avatarUrl ?? null)
    ) {
      setErr("No changes to submit");
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
    err,
    handleSubmit,
  };
}
