import { randomUUID } from "node:crypto";
import { getUserByUsername } from "./services/auth.service.ts";
import {
  AuthRepo,
  ChatRepo,
  CommentRepo,
  GameRepo,
  MessageRepo,
  ScoreRepo,
  ThreadRepo,
  UserRepo,
} from "./repository.ts";
import type { GameRecord, ThreadRecord } from "./models.ts";
import { createChat } from "./services/chat.service.ts";
import { createUser, updateUser } from "./services/user.service.ts";
import { saveMatchRecords } from "./services/score.service.ts";

/** Reset stored games with example data. */
async function resetStoredGames() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const recently = new Date(new Date().getTime() - 6 * 60 * 60 * 1000);
  const storedGames: { [key: string]: GameRecord } = {
    [randomUUID().toString()]: {
      type: "nim",
      state: { remaining: 0, nextPlayer: 1 },
      done: true,
      chat: (await createChat(new Date("2025-04-21"))).chatId,
      players: [user2id, user3id],
      createdAt: new Date("2025-04-21").toISOString(),
      createdBy: user2id,
    } as GameRecord,
    [randomUUID().toString()]: {
      type: "guess",
      state: { secret: 43, guesses: [null, 2, 99, null] },
      done: false,
      chat: (await createChat(recently)).chatId,
      players: [user1id, user0id, user3id, user2id],
      createdAt: recently.toISOString(),
      createdBy: user1id,
    } as GameRecord,
    [randomUUID().toString()]: {
      type: "nim",
      done: false,
      chat: (await createChat(new Date())).chatId,
      players: [user1id],
      createdAt: new Date().toISOString(),
      createdBy: user1id,
    } as GameRecord,
  };

  await GameRepo.clear();
  await Promise.all(Object.entries(storedGames).map(([id, entry]) => GameRepo.set(id, entry)));
}

/** Reset stored threads with example data */
async function resetStoredThreads() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const storedThreads: { [key: string]: ThreadRecord } = {
    abadcafeabadcafeabadcafe: {
      createdBy: user1id,
      createdAt: new Date().toISOString(),
      title: "Nim?",
      text: "Is anyone around that wants to play Nim? I'll be here for the next hour or so.",
      comments: [],
    },
    deadbeefdeadbeefdeadbeef: {
      createdBy: user1id,
      createdAt: new Date("2025-04-02").toISOString(),
      title: "Hello game knights",
      text: "I'm a big Nim buff and am excited to join this community.",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user3id,
      createdAt: new Date(new Date().getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      title: "Other games?",
      text: "Nim is great, but I'm hoping some new strategy games will get introduced soon.",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user2id,
      createdAt: new Date("2025-04-04").toISOString(),
      title: "Strategy guide?",
      text: "I'm pretty confused about the right strategy for Nim, is there anyone around who can help explain this?",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user0id,
      createdAt: new Date(new Date().getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      title: "New game: multiplayer number guesser!",
      text: "Strategy.town now has an exciting new game: guess! Try it out today: multiple people can join this exciting game, and guess a number between 1 and 100!",
      comments: [],
    },
  };
  await ThreadRepo.clear();
  await Promise.all(Object.entries(storedThreads).map(([id, entry]) => ThreadRepo.set(id, entry)));
}

/** Reset stored users with example data */
async function resetStoredUsers() {
  await UserRepo.clear();

  await createUser("user0", "pwd0000", new Date());
  await createUser("user1", "pwd1111", new Date());
  await createUser("user2", "pwd2222", new Date());
  await createUser("user3", "pwd3333", new Date());

  await updateUser("user0", { display: "The Knight Of Games" });
  await updateUser("user1", { display: "Yāo" });
  await updateUser("user2", { display: "Sénior Dos" });
  await updateUser("user3", { display: "Frau Drei" });

  await createUser("briangriffin", "password", new Date());
  await createUser("loisgriffin", "password", new Date());
  await createUser("petergriffin", "password", new Date());
  await createUser("stewiegrififfin", "password", new Date());
  await createUser("joeswanson", "password", new Date());
  await createUser("clevelandbrown", "password", new Date());
  await createUser("meggriffin", "password", new Date());
  await createUser("glennquagmire", "password", new Date());
  await createUser("tomtucker", "password", new Date());
  await createUser("jameswoods", "password", new Date());
  await createUser("conniedamico", "password", new Date());

  await updateUser("briangriffin", { display: "Brian Griffin" });
  await updateUser("loisgriffin", { display: "Lois Griffin" });
  await updateUser("petergriffin", { display: "Peter Griffin" });
  await updateUser("stewiegrififfin", { display: "Stewie Griffin" });
  await updateUser("joeswanson", { display: "Joe Swanson" });
  await updateUser("clevelandbrown", { display: "Cleveland Brown" });
  await updateUser("meggriffin", { display: "Meg Griffin" });
  await updateUser("glennquagmire", { display: "Glenn Quagmire" });
  await updateUser("tomtucker", { display: "Tom Tucker" });
  await updateUser("jameswoods", { display: "James Woods" });
  await updateUser("conniedamico", { display: "Connie D'Amico" });
}

/** Reset stored scores and ratings with example match data */
async function resetStoredScores() {
  const brianId = (await getUserByUsername("briangriffin"))!.userId;
  const loisId = (await getUserByUsername("loisgriffin"))!.userId;
  const peterId = (await getUserByUsername("petergriffin"))!.userId;
  const stewieId = (await getUserByUsername("stewiegrififfin"))!.userId;
  const joeId = (await getUserByUsername("joeswanson"))!.userId;
  const clevelandId = (await getUserByUsername("clevelandbrown"))!.userId;
  const megId = (await getUserByUsername("meggriffin"))!.userId;
  const quagmireId = (await getUserByUsername("glennquagmire"))!.userId;
  const tomId = (await getUserByUsername("tomtucker"))!.userId;
  const jamesId = (await getUserByUsername("jameswoods"))!.userId;
  const connieId = (await getUserByUsername("conniedamico"))!.userId;

  // chess matches
  await saveMatchRecords([brianId, peterId], "chess", randomUUID(), 0, new Date("2025-01-01"));
  await saveMatchRecords([peterId, loisId], "chess", randomUUID(), 1, new Date("2025-01-03"));
  await saveMatchRecords([quagmireId, brianId], "chess", randomUUID(), 0, new Date("2025-01-05"));
  await saveMatchRecords([stewieId, megId], "chess", randomUUID(), 0, new Date("2025-01-07"));
  await saveMatchRecords([joeId, clevelandId], "chess", randomUUID(), 1, new Date("2025-01-09"));
  await saveMatchRecords([tomId, jamesId], "chess", randomUUID(), 0, new Date("2025-01-11"));
  await saveMatchRecords([connieId, megId], "chess", randomUUID(), 0, new Date("2025-01-13"));
  await saveMatchRecords([brianId, loisId], "chess", randomUUID(), null, new Date("2025-01-15"));
  await saveMatchRecords([peterId, stewieId], "chess", randomUUID(), 1, new Date("2025-01-17"));
  await saveMatchRecords([joeId, quagmireId], "chess", randomUUID(), 0, new Date("2025-01-19"));

  // nim matches
  await saveMatchRecords([brianId, quagmireId], "nim", randomUUID(), 0, new Date("2025-02-01"));
  await saveMatchRecords([peterId, clevelandId], "nim", randomUUID(), 1, new Date("2025-02-03"));
  await saveMatchRecords([loisId, joeId], "nim", randomUUID(), null, new Date("2025-02-05"));
  await saveMatchRecords([stewieId, connieId], "nim", randomUUID(), 0, new Date("2025-02-07"));
  await saveMatchRecords([megId, tomId], "nim", randomUUID(), 1, new Date("2025-02-09"));
  await saveMatchRecords([jamesId, brianId], "nim", randomUUID(), 1, new Date("2025-02-11"));

  // guess matches
  await saveMatchRecords(
    [brianId, peterId],
    "guess",
    randomUUID(),
    0,
    new Date("2025-03-01"),
    [45, 12],
  );
  await saveMatchRecords(
    [loisId, peterId],
    "guess",
    randomUUID(),
    0,
    new Date("2025-03-03"),
    [88, 20],
  );
  await saveMatchRecords(
    [stewieId, megId],
    "guess",
    randomUUID(),
    0,
    new Date("2025-03-05"),
    [99, 30],
  );
  await saveMatchRecords(
    [joeId, clevelandId],
    "guess",
    randomUUID(),
    1,
    new Date("2025-03-10"),
    [40, 77],
  );
  await saveMatchRecords(
    [brianId, jamesId],
    "guess",
    randomUUID(),
    null,
    new Date("2025-03-15"),
    [50, 50],
  );

  // Chess ratings: gold>=1800, silver>=1200, bronze<1200
  // Stewie(1900-gold), Brian(1500), Lois(1400), Tom(1350), Peter(1250), Joe(1200),
  // Cleveland(1150), James(1100), Connie(1050), Quagmire(1000) — Meg has no chess rating
  const chessRatings: Record<string, number> = {
    [stewieId]: 1900,
    [brianId]: 1500,
    [loisId]: 1400,
    [tomId]: 1350,
    [peterId]: 1250,
    [joeId]: 1200,
    [clevelandId]: 1150,
    [jamesId]: 1100,
    [connieId]: 1050,
    [quagmireId]: 1000,
  };
  const nimRatings: Record<string, number> = {
    [stewieId]: 1600,
    [quagmireId]: 1300,
    [brianId]: 1200,
    [loisId]: 1100,
  };

  for (const [userId, rating] of Object.entries(chessRatings)) {
    const record = await UserRepo.get(userId);
    await UserRepo.set(userId, { ...record, ratings: { ...record.ratings, chess: rating } });
  }
  for (const [userId, rating] of Object.entries(nimRatings)) {
    const record = await UserRepo.get(userId);
    await UserRepo.set(userId, { ...record, ratings: { ...record.ratings, nim: rating } });
  }
}

export async function resetEverythingToDefaults() {
  await AuthRepo.clear();
  await ChatRepo.clear();
  await CommentRepo.clear();
  await GameRepo.clear();
  await MessageRepo.clear();
  await ScoreRepo.clear();
  await ThreadRepo.clear();
  await UserRepo.clear();

  await resetStoredUsers();
  await resetStoredThreads();
  await resetStoredGames();
  await resetStoredScores();
}
