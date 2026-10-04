import { setUser, readConfig } from "./config.js";
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users.js";
import { fetchFeed } from "./rss.js";
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";
import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feed_follows.js";
import { createFeed, getFeedByUrl, getFeeds, getNextFeedToFetch, markFeedFetched } from "./lib/db/queries/feeds.js";
import { feeds, users } from "./lib/db/schema.js";

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type Feed = typeof feeds.$inferSelect;
export type User = typeof users.$inferSelect;

export function printFeed(feed: Feed, user: User): void {
  console.log("Feed:");
  console.log(`  ID: ${feed.id}`);
  console.log(`  Name: ${feed.name}`);
  console.log(`  URL: ${feed.url}`);
  console.log(`  User ID: ${feed.userId}`);
  console.log(`  User Name: ${user.name}`);
  console.log(`  Created At: ${feed.createdAt}`);
  console.log(`  Updated At: ${feed.updatedAt}`);
}

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName: string, ...args: string[]): Promise<void> => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("No current user");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} does not exist`);
    }

    await handler(cmdName, user, ...args);
  };
}


export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("Username is required");
  }

  if (args.length > 1) {
    throw new Error("Login requires exactly one username");
  }

  const username = args[0];
  const user = await getUserByName(username);

  if (!user) {
    throw new Error(`User ${username} does not exist`);
  }

  setUser(username);

  console.log(`User ${username} has been set.`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("Username is required");
  }

  if (args.length > 1) {
    throw new Error("Register requires exactly one username");
  }

  const username = args[0];

  try {
    const user = await createUser(username);

    setUser(username);

    console.log(`User ${username} has been registered.`);
    console.log(user);
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new Error(`User ${username} already exists`);
    }

    throw err;
  }
}

export async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteAllUsers();
  console.log("Database reset successfully.");
}

export async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const users = await getUsers();
  const config = readConfig();

  for (const user of users) {
    const current = user.name === config.currentUserName ? " (current)" : "";
    console.log(`* ${user.name}${current}`);
  }
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("Name and URL are required");
  }

  if (args.length > 2) {
    throw new Error("addfeed requires exactly two arguments");
  }

  const [name, url] = args;

  try {
    const feed = await createFeed(name, url, user.id);
    const follow = await createFeedFollow(user.id, feed.id);

    console.log(`* ${follow.feedName} - ${follow.userName}`);
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new Error(`Feed with URL ${url} already exists`);
    }

    throw err;
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error("unfollow requires exactly one URL");
  }

  await deleteFeedFollow(user.id, args[0]);
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length > 0) {
    throw new Error("following takes no arguments");
  }

  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error("follow requires exactly one URL");
  }

  const feed = await getFeedByUrl(args[0]);

  if (!feed) {
    throw new Error(`Feed with URL ${args[0]} does not exist`);
  }

  try {
    const follow = await createFeedFollow(user.id, feed.id);

    console.log(`* ${follow.feedName} - ${follow.userName}`);
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new Error(
        `User ${user.name} is already following ${feed.name}`,
      );
    }

    throw err;
  }
}

export async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length > 0) {
    throw new Error("feeds takes no arguments");
  }

  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* ${feed.name} - ${feed.url} - ${feed.userName}`);
  }
}

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration format");
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("Invalid duration unit");
  }
}

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    throw new Error("No feeds available");
  }

  console.log(`Fetching feed: ${feed.name}`);

  const rssFeed = await fetchFeed(feed.url);

  await markFeedFetched(feed.id);

  for (const item of rssFeed.channel.item) {
    const publishedAt = new Date(item.pubDate);

    await createPost(
      item.title,
      item.link,
      item.description,
      isNaN(publishedAt.getTime()) ? null : publishedAt,
      feed.id,
    );
  }
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length > 1) {
    throw new Error("browse takes zero or one argument");
  }

  const limit = args.length === 0 ? 2 : Number(args[0]);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("browse limit must be a positive integer");
  }

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  URL: ${post.url}`);

    if (post.description) {
      console.log(`  Description: ${post.description}`);
    }

    if (post.publishedAt) {
      console.log(`  Published: ${post.publishedAt}`);
    }

    console.log();
  }
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error("agg requires exactly one duration argument");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(`Collecting feeds every ${args[0]}`);

  await scrapeFeeds();

  const interval = setInterval(() => {
    scrapeFeeds().catch((err) => {
      console.error(err);
    });
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

