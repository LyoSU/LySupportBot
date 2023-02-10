import { Bot } from "grammy";
import { BotCommand } from "@grammyjs/types";
import { MyContext } from "../types";
import logger from "./logger";
import { BotCommandScope } from "@grammyjs/hydrate/out/deps.node";

type MyBotCommands = {
  ["commands"]: BotCommand[];
  ["scope"]: BotCommandScope;
  ["language_code"]: string | null;
};

const DEFAULT_COMMANDS_PRIVATE: MyBotCommands = {
  commands: [
    {
      command: "start",
      description: "Start the bot in private chat",
    },
  ],
  scope: { type: "all_private_chats" },
  language_code: null,
};

const DEFAULT_COMMANDS_GROUP: MyBotCommands = {
  commands: [
    {
      command: "start",
      description: "Start the bot in group chat",
    },
  ],
  scope: { type: "all_group_chats" },
  language_code: null,
};

async function setup(bot: Bot<MyContext>) {
  const allCommands: MyBotCommands[] = [
    DEFAULT_COMMANDS_PRIVATE,
    DEFAULT_COMMANDS_GROUP,
  ];

  for (const { commands, scope, language_code } of allCommands) {
    bot.api
      .setMyCommands(commands, { scope: scope, language_code: language_code })
      .catch((err) => {
        logger.error(`Could not set commands: ${err}`);
      });
  }
}

export default { setup };
