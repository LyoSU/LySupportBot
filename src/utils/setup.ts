import logger from "./logger";
import handlers from "../handlers";
import middlewares from "../middlewares";
import transformers from "../transformers";
import botCommands from "./bot-commands";
import { UserFromGetMe } from "grammy/out/types";
import { Bot } from "grammy";
import { MyApi, MyContext } from "../types";

async function setupBot(bot: Bot<MyContext, MyApi>) {
  logger.info("Setting up the bot...");

  // await botCommands.setup(bot);

  await transformers.setup(bot);

  await middlewares.setup(bot);

  await handlers.setup(bot);
}

export default setupBot;
