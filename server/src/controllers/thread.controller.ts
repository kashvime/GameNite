import {
  addCommentToThread,
  createThread,
  getThreadById,
  getThreadSummaries,
} from "../services/thread.service.ts";
import { type ThreadInfo, type ThreadSummary, zCreateThreadMessage } from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { z } from "zod";
import { getUserByUsername } from "../services/auth.service.ts";
import type { Request } from "express";

type JwtUser = { username: string };
function getJwtUser(req: Request): JwtUser | undefined {
  return (req as Request & { user?: JwtUser }).user;
}

/**
 * Handle GET requests to `/api/thread/list`. Returns all threads in reverse
 * chronological order by creation.
 */
export const getList: RestAPI<ThreadSummary[]> = async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const threads = await getThreadSummaries();
  res.send(limit ? threads.slice(0, limit) : threads);
};

/**
 * Handle GET requests to `/api/thread/:id`. Returns either 404 or a thread
 * info object.
 */
export const getById: RestAPI<ThreadInfo, { id: string }> = async (req, res) => {
  const thread = await getThreadById(req.params.id);
  if (!thread) {
    res.status(404).send({ error: "Thread not found" });
    return;
  }
  res.send(thread);
};

/**
 * Handle POST requests to `/api/thread/create` that post a new thread.
 * Auth via JWT middleware (req.user), not request body.
 */
export const postCreate: RestAPI<ThreadInfo> = async (req, res) => {
  const jwtUser = getJwtUser(req);
  if (!jwtUser) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }

  const body = zCreateThreadMessage.safeParse(
    (req.body as { payload?: unknown })?.payload ?? req.body,
  );
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await getUserByUsername(jwtUser.username);
  if (!user) {
    res.status(403).send({ error: "User not found" });
    return;
  }

  res.send(await createThread(user, body.data, new Date()));
};

/**
 * Handle POST requests to `/api/thread/:id/comment` that post a new
 * comment to a thread.
 * Auth via JWT middleware (req.user), not request body.
 */
export const postByIdComment: RestAPI<ThreadInfo, { id: string }> = async (req, res) => {
  const jwtUser = getJwtUser(req);
  if (!jwtUser) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }

  const body = z.string().safeParse((req.body as { payload?: unknown })?.payload ?? req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await getUserByUsername(jwtUser.username);
  if (!user) {
    res.status(403).send({ error: "User not found" });
    return;
  }

  const thread = await addCommentToThread(req.params.id, user, body.data, new Date());
  if (!thread) {
    res.status(404).send({ error: "Thread not found" });
    return;
  }

  res.send(thread);
};
