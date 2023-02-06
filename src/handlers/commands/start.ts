import { Bot, NextFunction } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isPrivate } from "../../filters/";

async function startPrivate(
  ctx: MyContext & { chat: Chat.PrivateChat },
  next: NextFunction
) {
  ctx.session.state.contactData = null;

  if (!ctx.session.bot.chat_id) {
    return ctx.reply(ctx.t("not_configured"));
  }

  await ctx.reply(
    ctx.session.bot.settings.welcome_message.default +
      "\n\n" +
      ctx.t("welcome_end"),
    {
      reply_markup: {
        remove_keyboard: true,
      },
      disable_web_page_preview: true,
    }
  );

  return next();
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isPrivate).command("start", startPrivate);
}

export default { setup };
