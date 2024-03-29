import { Bot } from "grammy";
import { MyApi, MyContext } from "../types";

import { hydrateApi } from "@grammyjs/hydrate";
import { parseMode } from "@grammyjs/parse-mode";
import { autoRetry } from "@grammyjs/auto-retry";
import { logger } from "../utils";
import throttler from "./throttler";
import loggingApiCalls from "./logging-api-calls";

async function setup(bot: Bot<MyContext, MyApi>) {
  bot.api.config.use(loggingApiCalls);
  bot.api.config.use(throttler);
  bot.api.config.use(hydrateApi());
  bot.api.config.use(parseMode("HTML"));
  bot.api.config.use(autoRetry());
}

export default { setup };
