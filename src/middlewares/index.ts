import { Bot, session } from "grammy";
import { logger } from "../utils";
import { MyContext, SessionData } from "../types";
import { hydrateContext } from "@grammyjs/hydrate";

import database from "../database";

import loggingUpdates from "./logging";
import { i18n } from "./i18n";
import { userUpdateMiddleware } from "./user-update";
import { botUpdateMiddleware } from "./bot-update";

async function setup(bot: Bot<MyContext>) {
  logger.info("Setting up middlewares...");

  bot.use(loggingUpdates);
  bot.use(hydrateContext());

  function initial(): SessionData {
    return {
      user: undefined,
      bot: undefined,
      state: {},
      data: {},
    };
  }
  bot.use(session({ initial }));

  bot.use(i18n());

  bot.use(database.middleware);
  bot.use(botUpdateMiddleware);
  bot.use(userUpdateMiddleware);
}

export default { setup };
