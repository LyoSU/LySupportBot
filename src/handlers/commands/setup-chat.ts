import { Bot } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isGroup } from "../../filters";

async function setupChat(
  ctx: MyContext & { chat: Chat.SupergroupChat | Chat.GroupChat },
) {
  if (!ctx.session.bot || !ctx.session.user) {
    return;
  }

  if (ctx.session.bot.owner.toString() !== ctx.session.user.id.toString()) {
    return ctx.reply(ctx.t("not_allowed"));
  }

  const chat = await ctx.getChat();

  if (chat["is_forum"] !== true) {
    return ctx.reply(ctx.t("chat_not_forum"));
  }

  const chatMember = await ctx.getChatMember(ctx.me.id);

  if (
    chatMember.status !== "administrator" ||
    !("can_manage_topics" in chatMember) ||
    chatMember.can_manage_topics !== true
  ) {
    return ctx.reply(ctx.t("not_enough_rights"));
  }

  ctx.session.bot.chat_id = ctx.chat.id;

  if (!ctx.session.bot?.settings?.welcome_message) {
    ctx.session.bot.settings = {
      welcome_message: {
        default: ctx.t("welcome_message"),
      },
    };
  }

  await ctx.session.bot.save();

  await ctx.reply(ctx.t("setup_success"));
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isGroup).command("start", setupChat);
  bot.filter(isGroup).command("setup", setupChat);
}

export default { setup };
