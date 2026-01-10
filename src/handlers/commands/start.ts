import { Bot, NextFunction } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isPrivate } from "../../filters/";

async function startPrivate(
  ctx: MyContext & { chat: Chat.PrivateChat },
  next: NextFunction
) {
  if (!ctx.session.bot) {
    return;
  }

  ctx.session.state.contactData = null;

  // Get start parameter if exists
  const startParam = ctx.match as string | undefined;
  if (startParam) {
    ctx.session.state.startParam = startParam;
  }

  if (!ctx.session.bot.chat_id) {
    return ctx.reply(ctx.t("not_configured"));
  }

  await ctx.reply(
    (ctx.session.bot.settings?.welcome_message?.default ?? "") +
    "\n\n" +
    ctx.t("welcome_end"),
    {
      reply_markup: {
        remove_keyboard: true,
      },
      link_preview_options: {
        is_disabled: true,
      }
    }
  );

  if (ctx.session?.bot?.settings?.mainBlock) {
    return next();
  }
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isPrivate).command("start", startPrivate);
}

export default { setup };
