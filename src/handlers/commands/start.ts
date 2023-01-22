import { Bot } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isGroup, isPrivate } from "../../filters/";

async function startPrivate(ctx: MyContext & { chat: Chat.PrivateChat }) {
  await ctx.reply(
    ctx.session.bot.settings.welcome_message.default + "\n\n" + ctx.t("welcome_end"),
    {
      reply_markup: {
        remove_keyboard: true,
      },
      disable_web_page_preview: true,
    }
  );
}

async function startGroup(
  ctx: MyContext & { chat: Chat.SupergroupChat | Chat.GroupChat }
) {
  await ctx.reply(`Cool chat title: <b>${ctx.chat.title}</>`);
}

function escapeHtml(s: string) {
  s = s.replace(/&/g, "&amp;");
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  s = s.replace(/"/g, "&quot;");
  s = s.replace(/\'/g, "&#x27;");
  return s;
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isPrivate).command("start", startPrivate);
  bot.filter(isGroup).command("start", startGroup);
}

export default { setup };
