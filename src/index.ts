import {
  handlerBrowse,
  CommandsRegistry,
  handlerAddFeed,
  handlerFeeds,
  handlerFollow,
  handlerFollowing,
  handlerUnfollow,
  middlewareLoggedIn,
  handlerAgg,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  registerCommand,
  runCommand,
} from "./commands.js";

async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));
registerCommand(registry, "agg", handlerAgg);

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Error: not enough arguments provided");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
}

main();
