import { Bot, Transformer } from "grammy";
import { MyApi, MyContext } from "../types";

import { hydrateApi } from "@grammyjs/hydrate";
import { autoRetry } from "@grammyjs/auto-retry";
import throttler from "./throttler";
import loggingApiCalls from "./logging-api-calls";

// Default parse_mode transformer
const htmlParseMode: Transformer = (prev, method, payload, signal) => {
  const methodsWithParseMode = [
    "sendMessage",
    "copyMessage",
    "editMessageText",
    "editMessageCaption",
    "sendPhoto",
    "sendAudio",
    "sendDocument",
    "sendVideo",
    "sendAnimation",
    "sendVoice",
    "sendPoll",
  ];

  if (methodsWithParseMode.includes(method)) {
    const p = payload as Record<string, unknown>;
    if (p.parse_mode === undefined) {
      p.parse_mode = "HTML";
    }
  }

  return prev(method, payload, signal);
};

async function setup(bot: Bot<MyContext, MyApi>) {
  bot.api.config.use(loggingApiCalls);
  bot.api.config.use(throttler);
  bot.api.config.use(hydrateApi());
  bot.api.config.use(autoRetry());
  bot.api.config.use(htmlParseMode);
}

export default { setup };
