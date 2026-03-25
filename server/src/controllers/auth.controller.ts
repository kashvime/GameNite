import type { Request, Response } from "express";
import * as authService from "../services/auth.service.ts";

export const ssoLogin = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body as { email: string; name: string };
    const user = await authService.ssoLogin(email, name);

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "SSO login failed" });
  }
};
