import type { RequestHandler } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import type { SafeUserInfo } from "@gamenite/shared";

export const googleAuth: RequestHandler = passport.authenticate("google", {
  scope: ["profile", "email"],
}) as RequestHandler;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const googleCallback: RequestHandler[] = [
  passport.authenticate("google", { session: false }) as RequestHandler,

  (req, res) => {
    try {
      const user = req.user as SafeUserInfo | undefined;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = jwt.sign(
        {
          username: user.username,
          display: user.display,
          createdAt: user.createdAt,
          onlineStatus: user.onlineStatus,
          totalGamesPlayed: user.totalGamesPlayed,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" },
      );

      return res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
    } catch {
      return res.status(500).json({ message: "Google auth failed" });
    }
  },
];
