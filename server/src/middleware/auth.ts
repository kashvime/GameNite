import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";

type JwtUser = {
  username: string;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (req as any).user = decoded;

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};
