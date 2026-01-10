import { Bot } from "grammy";
import { MyContext } from "../types";

import commands from "./commands";
import callbackQueries from "./callbackQueries";

import userChat from "./user-chat";

async function setup(bot: Bot<MyContext>) {
  await callbackQueries.setup(bot);
  await userChat.setup(bot);
  await commands.setup(bot);
}

export default { setup };
