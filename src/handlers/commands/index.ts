import { Bot } from "grammy";
import { MyContext } from "../../types";
import start from "./start";
import message from "./message";
import setupChat from "./setup-chat";
import blocks from "./blocks";
import adminBlocks from "./admin-blocks";

async function setup(bot: Bot<MyContext>) {
  await start.setup(bot);
  await blocks.setup(bot);
  await adminBlocks.setup(bot);
  await setupChat.setup(bot);

  await message.setup(bot);
}

export default { setup };
