import { Bot } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isGroup } from "../../filters";

async function setupChat(
  ctx: MyContext & { chat: Chat.SupergroupChat | Chat.GroupChat }
) {
  ctx.session.bot.chat_id = ctx.chat.id;

  ctx.session.bot.settings = {
    welcome_message: {
      default: ctx.t("welcome_message"),
    },
  }

  await ctx.session.bot.save();

  await ctx.reply("Chat setup complete");
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isGroup).command("setup", setupChat);
}

export default { setup };
