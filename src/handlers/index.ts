import { Bot } from "grammy";
import { MyContext } from "../types";

import commands from "./commands";
import callbackQueries from "./callbackQueries";
import { logger } from "../utils";

async function setup(bot: Bot<MyContext>) {
  logger.info("Setting up handlers...");

  await commands.setup(bot);
  await callbackQueries.setup(bot);
}

export default { setup };
